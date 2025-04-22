import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Mock Firebase auth functions
const mockCreateUser = createUserWithEmailAndPassword as jest.Mock;
const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockSignOut = signOut as jest.Mock;

// Test component that uses auth context
const TestComponent = () => {
  const { currentUser, signup, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user-email">{currentUser?.email || 'No user'}</div>
      <button onClick={() => signup('test@test.com', 'password')}>Sign Up</button>
      <button onClick={() => login('test@test.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides authentication context to children', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByText('No user')).toBeInTheDocument();
  });

  it('handles signup successfully', async () => {
    mockCreateUser.mockResolvedValueOnce({ user: { email: 'test@test.com' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Sign Up'));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.anything(),
        'test@test.com',
        'password'
      );
    });
  });

  it('handles login successfully', async () => {
    mockSignIn.mockResolvedValueOnce({ user: { email: 'test@test.com' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        expect.anything(),
        'test@test.com',
        'password'
      );
    });
  });

  it('handles logout successfully', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('handles authentication errors', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Auth error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });
});
