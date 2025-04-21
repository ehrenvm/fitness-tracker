import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import UserRegistration from './components/UserRegistration';
import ActivityTracker from './components/ActivityTracker';
import AdminPanel from './components/AdminPanel';
import UserList from './components/UserList';
import { AppBackground, ContentContainer } from './styles/background';

const theme = createTheme({
  palette: {
    primary: {
      main: '#056c01', // NOCO Performance green
    },
    secondary: {
      main: '#f50057',
    },
  },
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const handleUserSelect = (userName: string) => {
    setCurrentUser(userName);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBackground>
          <ContentContainer>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <AppBar position="static">
                <Toolbar>
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Fitness Tracker
                  </Typography>
                  <Button color="inherit" component={Link} to="/">
                    Home
                  </Button>
                  {currentUser && (
                    <Button color="inherit" component={Link} to="/tracker">
                      Track Activity
                    </Button>
                  )}
                  <Button color="inherit" component={Link} to="/admin">
                    Admin
                  </Button>
                </Toolbar>
              </AppBar>

              <Box sx={{ 
                display: 'flex', 
                flexGrow: 1,
                mt: 2,
                gap: 2,
                px: 2,
                height: 'calc(100vh - 64px - 16px)'
              }}>
                <Box sx={{ 
                  width: 300, 
                  flexShrink: 0,
                  display: { xs: 'none', md: 'block' }
                }}>
                  <UserList onUserSelect={handleUserSelect} />
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                  <Routes>
                    <Route 
                      path="/" 
                      element={
                        <UserRegistration 
                          onUserSelect={handleUserSelect}
                        />
                      } 
                    />
                    <Route 
                      path="/tracker" 
                      element={
                        currentUser ? (
                          <ActivityTracker userName={currentUser} />
                        ) : (
                          <Typography>Please register or select a user first</Typography>
                        )
                      } 
                    />
                    <Route path="/admin" element={<AdminPanel />} />
                  </Routes>
                </Box>
              </Box>
            </Box>
          </ContentContainer>
        </AppBackground>
      </Router>
    </ThemeProvider>
  );
};

export default App;
