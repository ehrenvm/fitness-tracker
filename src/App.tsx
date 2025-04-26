import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Container, Grid, CssBaseline } from '@mui/material';
import { UserContext } from './contexts/UserContext';
import UserList from './components/UserList';
import AdminPanel from './components/AdminPanel';
import ActivityTracker from './components/ActivityTracker';
import AppHeader from './components/AppHeader';
import { theme } from './theme';
import { Typography } from '@mui/material';

const App: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);

  const handleUserSelect = (userName: string) => {
    setSelectedUser(userName);
  };

  const handleUserDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedUser(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserContext.Provider value={{ userName: selectedUser, setUserName: setSelectedUser }}>
        <Box>
          <AppHeader onAdminClick={() => setShowAdmin(true)} />
          {showAdmin ? (
            <Box sx={{ p: 2 }}>
              <AdminPanel 
                onBack={() => setShowAdmin(false)}
                onUserDeleted={handleUserDeleted}
              />
            </Box>
          ) : (
            <Container maxWidth="lg">
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <UserList 
                    onUserSelect={handleUserSelect}
                    selectedUser={selectedUser}
                    refreshTrigger={refreshTrigger}
                    onAdminClick={() => setShowAdmin(true)}
                  />
                </Grid>
                <Grid item xs={12} md={9}>
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
                </Grid>
              </Grid>
            </Container>
          )}
        </Box>
      </UserContext.Provider>
    </ThemeProvider>
  );
};

export default App;
