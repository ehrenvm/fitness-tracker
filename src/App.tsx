import React, { useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Container, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContextProvider';
import UserList from './components/UserList';
import AdminPanel from './components/AdminPanel';
import ActivityTracker from './components/ActivityTracker';
import AppHeader from './components/AppHeader';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { theme } from './theme';
import { Typography, CircularProgress } from '@mui/material';
import { BackgroundContainer, ContentContainer } from './styles/background';

// Space reserved for header, padding, and other chrome above the main content
const HEADER_AND_PADDING = 200;

// AdminRoute component to check for admin privileges
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [highlight, setHighlight] = useState(false);
  const highlightTimeout = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleUserSelect = useCallback((userNames: string[]): void => {
    setSelectedUsers(userNames);
    if (userNames.length > 0) {
      setHighlight(true);
      if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
      highlightTimeout.current = setTimeout(() => setHighlight(false), 2500);
    }
  }, []);

  const handleUserDeleted = useCallback((): void => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedUsers([]);
  }, []);

  const handleAdminClick = useCallback((): void => {
    navigate('/admin');
  }, [navigate]);

  const handleBackClick = useCallback((): void => {
    navigate('/');
  }, [navigate]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <UserProvider>
          <BackgroundContainer>
            <ContentContainer>
              <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {location.pathname !== '/login' && <AppHeader onAdminClick={handleAdminClick} />}
                <Box sx={{ flex: 1 }}>
                  <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={
                      <ProtectedRoute>
                        <Container maxWidth="lg" sx={{ py: 3 }}>
                          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                            <Box sx={{ 
                              width: '25%', 
                              borderRadius: 4, 
                              overflow: 'hidden', 
                              bgcolor: 'background.paper',
                              height: `calc(100vh - ${HEADER_AND_PADDING}px)`,
                              display: 'flex',
                              flexDirection: 'column',
                              minHeight: 0
                            }}>
                              <UserList
                                onUserSelect={handleUserSelect}
                                selectedUsers={selectedUsers}
                                refreshTrigger={refreshTrigger}
                                onAdminClick={handleAdminClick}
                              />
                            </Box>
                            <Box 
                              sx={{ 
                                width: '75%', 
                                borderRadius: 4,
                                bgcolor: 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: `calc(100vh - ${HEADER_AND_PADDING}px)`,
                                justifyContent: 'flex-start',
                                ...(selectedUsers.length === 0 && { paddingTop: '10%' })
                              }}
                              className={highlight ? 'highlight-activity-tracker' : ''}
                            >
                              {selectedUsers.length > 0 ? (
                                <ActivityTracker userNames={selectedUsers} />
                              ) : (
                                <Box sx={{
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  p: 3
                                }}>
                                  <Typography variant="h6" color="textSecondary" fontWeight="bold">
                                    Select a user to view their activities or add a result.
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Container>
                      </ProtectedRoute>
                    } />

                    <Route path="/admin" element={
                      <ProtectedRoute>
                        <AdminRoute>
                          <AdminPanel
                            onBack={handleBackClick}
                            onUserDeleted={handleUserDeleted}
                          />
                        </AdminRoute>
                      </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Box>
              </Box>
            </ContentContainer>
          </BackgroundContainer>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

const AppWrapper: React.FC = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;
