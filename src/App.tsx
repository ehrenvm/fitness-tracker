import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Button, Box, ThemeProvider } from '@mui/material';
import ActivityTracker from './components/ActivityTracker';
import UserRegistration from './components/UserRegistration';
import UserList from './components/UserList';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BackgroundContainer } from './styles/background';
import { theme } from './theme';

const NavigationBar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ mr: 12, minWidth: '150px' }}>
          Fitness Tracker
        </Typography>
        {currentUser && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Button 
              color="inherit" 
              onClick={handleHomeClick}
              sx={{ textTransform: 'none' }}
            >
              Home
            </Button>
            <Button 
              color="inherit" 
              onClick={handleAdminClick}
              sx={{ textTransform: 'none' }}
            >
              Admin
            </Button>
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                {currentUser.email}
              </Typography>
              <Button 
                color="inherit" 
                onClick={handleLogout}
                sx={{ textTransform: 'none' }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

const App: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showActivityTracker, setShowActivityTracker] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <BackgroundContainer>
            <NavigationBar />
            <Container>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Box sx={{ display: 'flex', mt: 3 }}>
                        <Box sx={{ width: '250px', mr: 3 }}>
                          {selectedUser && !showActivityTracker && (
                            <Button
                              variant="contained"
                              fullWidth
                              sx={{ mb: 3 }}
                              onClick={() => setShowActivityTracker(true)}
                            >
                              Open Activity Tracker
                            </Button>
                          )}
                          <UserList onUserSelect={setSelectedUser} />
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          {!showActivityTracker ? (
                            <UserRegistration onUserSelect={setSelectedUser} />
                          ) : (
                            selectedUser && (
                              <>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="h5">Activity Tracker</Typography>
                                  <Button
                                    variant="outlined"
                                    onClick={() => setShowActivityTracker(false)}
                                  >
                                    Close Activity Tracker
                                  </Button>
                                </Box>
                                <ActivityTracker selectedUser={selectedUser} />
                              </>
                            )
                          )}
                        </Box>
                      </Box>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Container>
          </BackgroundContainer>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;