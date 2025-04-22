import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserRegistration from '../../components/UserRegistration';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Mock Firestore functions
const mockCollection = collection as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;

describe('UserRegistration Component', () => {
  const mockOnUserSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({ name: 'Test User', email: 'test@test.com' }),
          id: '1'
        }
      ]
    });
  });

  it('renders registration form', () => {
    render(<UserRegistration onUserSelect={mockOnUserSelect} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('allows name input', () => {
    render(<UserRegistration onUserSelect={mockOnUserSelect} />);
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    expect(nameInput).toHaveValue('John Doe');
  });

  it('allows email input', () => {
    render(<UserRegistration onUserSelect={mockOnUserSelect} />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    expect(emailInput).toHaveValue('john@example.com');
  });

  it('handles form submission', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'newUser' });

    render(<UserRegistration onUserSelect={mockOnUserSelect} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /register/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com'
        })
      );
    });
  });

  it('displays validation errors for empty fields', async () => {
    render(<UserRegistration onUserSelect={mockOnUserSelect} />);
    
    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('displays validation error for invalid email', async () => {
    render(<UserRegistration onUserSelect={mockOnUserSelect} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: /register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });
});
