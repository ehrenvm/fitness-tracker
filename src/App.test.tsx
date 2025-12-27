import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

// Mock Firebase
jest.mock('./firebase', () => ({
  auth: {},
  db: {},
}));

// Mock AuthContext values
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    currentUser: null,
    loading: false,
    signup: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe('App Component', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      );
    });
    // Look specifically for the app title in the navigation bar
    const appTitle = screen.getByText('Performance Tracker', { selector: '.MuiTypography-h6' });
    expect(appTitle).toBeInTheDocument();
  });
}); 