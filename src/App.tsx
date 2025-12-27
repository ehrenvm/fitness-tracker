import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Container, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import UserList from './components/UserList';
import AdminPanel from './components/AdminPanel';
import ActivityTracker from './components/ActivityTracker';
import AppHeader from './components/AppHeader';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { theme } from './theme';
import { Typography, CircularProgress } from '@mui/material';
import { BackgroundContainer, ContentContainer } from './styles/background';

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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [highlight, setHighlight] = useState(false);
  const highlightTimeout = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const handleUserSelect = (userName: string): void => {
    setSelectedUser(userName);
    setHighlight(true);
    if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
    highlightTimeout.current = setTimeout(() => setHighlight(false), 2500);
  };

  const handleUserDeleted = (): void => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedUser(null);
  };

  const handleAdminClick = (): void => {
    navigate('/admin');
  };

  const handleBackClick = (): void => {
    navigate('/');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BackgroundContainer>
          <ContentContainer>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <AppHeader onAdminClick={handleAdminClick} />
              <Box sx={{ flex: 1 }}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Container maxWidth="lg">
                        <Box sx={{ display: 'flex', gap: 3 }}>
                          <Box sx={{ width: '25%', borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
                            <UserList 
                              onUserSelect={handleUserSelect}
                              selectedUser={selectedUser}
                              refreshTrigger={refreshTrigger}
                              onAdminClick={handleAdminClick}
                            />
                          </Box>
                          <Box sx={{ width: '75%', borderRadius: 4 }}
                            className={highlight ? 'highlight-activity-tracker' : ''}
                          >
                            {selectedUser ? (
                              <ActivityTracker userName={selectedUser} />
                            ) : (
                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                height: '100%',
                                p: 3
                              }}>
                                <Typography variant="h6" color="textSecondary">
                                  Select a user to view their activity tracker
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
