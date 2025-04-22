import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActivityTracker from '../../components/ActivityTracker';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';

// Mock Firestore functions
const mockCollection = collection as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;
const mockQuery = query as jest.Mock;

describe('ActivityTracker Component', () => {
  const mockSelectedUser = 'testUser';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Firestore responses
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            activity: 'Running',
            value: '5',
            date: new Date().toISOString(),
            userId: mockSelectedUser
          }),
          id: '1'
        }
      ]
    });
  });

  it('renders activity form', () => {
    render(<ActivityTracker selectedUser={mockSelectedUser} />);
    expect(screen.getByLabelText(/activity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('allows activity input', () => {
    render(<ActivityTracker selectedUser={mockSelectedUser} />);
    const activityInput = screen.getByLabelText(/activity/i);
    fireEvent.change(activityInput, { target: { value: 'Running' } });
    expect(activityInput).toHaveValue('Running');
  });

  it('allows value input', () => {
    render(<ActivityTracker selectedUser={mockSelectedUser} />);
    const valueInput = screen.getByLabelText(/value/i);
    fireEvent.change(valueInput, { target: { value: '5' } });
    expect(valueInput).toHaveValue('5');
  });

  it('handles form submission', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'newDoc' });

    render(<ActivityTracker selectedUser={mockSelectedUser} />);
    
    const activityInput = screen.getByLabelText(/activity/i);
    const valueInput = screen.getByLabelText(/value/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    fireEvent.change(activityInput, { target: { value: 'Running' } });
    fireEvent.change(valueInput, { target: { value: '5' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          activity: 'Running',
          value: '5',
          userId: mockSelectedUser
        })
      );
    });
  });

  it('displays activity history', async () => {
    render(<ActivityTracker selectedUser={mockSelectedUser} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('handles empty activity history', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    render(<ActivityTracker selectedUser={mockSelectedUser} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });
});
