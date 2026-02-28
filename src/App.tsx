import React, { useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Container, CssBaseline, useMediaQuery, Collapse, Chip } from '@mui/material';
import { ExpandMore, ExpandLess, PersonSearch } from '@mui/icons-material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContextProvider';
import UserList from './components/UserList';
import AdminPanel from './components/AdminPanel';
import ActivityTracker from './components/ActivityTracker';
import OverallLeaderboard from './components/OverallLeaderboard';
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
  const [leaderboardRefreshTrigger, setLeaderboardRefreshTrigger] = useState<number>(0);
  const [highlight, setHighlight] = useState(false);
  const [mobileUserListOpen, setMobileUserListOpen] = useState(true);
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleResultAdded = useCallback(() => {
    setLeaderboardRefreshTrigger((t) => t + 1);
  }, []);

  const handleReturnToLeaderboard = useCallback(() => {
    setSelectedUsers([]);
  }, []);

  const handleUserSelect = useCallback((userNames: string[]): void => {
    setSelectedUsers(userNames);
    if (userNames.length > 0) {
      setHighlight(true);
      if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
      highlightTimeout.current = setTimeout(() => setHighlight(false), 2500);
      // Auto-collapse user list on mobile after selection
      if (isMobile) {
        setMobileUserListOpen(false);
      }
    }
  }, [isMobile]);

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

  const toggleMobileUserList = useCallback((): void => {
    setMobileUserListOpen(prev => !prev);
  }, []);

  const handleMobileUserListKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setMobileUserListOpen(prev => !prev);
    }
  }, []);

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
                        <Container maxWidth="lg" sx={{ py: { xs: 1, md: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
                          <Box sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            gap: { xs: 1.5, md: 3 },
                            alignItems: 'flex-start',
                          }}>
                            {/* User List Panel */}
                            <Box sx={{
                              width: { xs: '100%', md: '25%' },
                              borderRadius: { xs: 2, md: 4 },
                              overflow: 'hidden',
                              bgcolor: 'background.paper',
                              // On desktop: fixed height sidebar
                              ...(!isMobile && {
                                height: `calc(100vh - ${HEADER_AND_PADDING}px)`,
                              }),
                              display: 'flex',
                              flexDirection: 'column',
                              minHeight: 0,
                            }}>
                              {/* Mobile: collapsible header for user list */}
                              {isMobile ? (
                                <Box
                                  role="button"
                                  tabIndex={0}
                                  aria-expanded={mobileUserListOpen}
                                  aria-label={mobileUserListOpen ? 'Collapse athlete list' : 'Expand athlete list'}
                                  onClick={toggleMobileUserList}
                                  onKeyDown={handleMobileUserListKeyDown}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: 2,
                                    py: 1.5,
                                    cursor: 'pointer',
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    minHeight: 48,
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                                    <PersonSearch fontSize="small" />
                                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                                      {selectedUsers.length > 0
                                        ? `Selected: ${selectedUsers.join(', ')}`
                                        : 'Select Athlete'}
                                    </Typography>
                                    {selectedUsers.length > 1 && (
                                      <Chip
                                        label={selectedUsers.length}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', ml: 0.5 }}
                                      />
                                    )}
                                  </Box>
                                  {mobileUserListOpen ? <ExpandLess /> : <ExpandMore />}
                                </Box>
                              ) : null}

                              {/* Desktop: always visible; Mobile: collapsible */}
                              {isMobile ? (
                                <Collapse in={mobileUserListOpen}>
                                  <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                                    <UserList
                                      onUserSelect={handleUserSelect}
                                      selectedUsers={selectedUsers}
                                      refreshTrigger={refreshTrigger}
                                      onAdminClick={handleAdminClick}
                                    />
                                  </Box>
                                </Collapse>
                              ) : (
                                <UserList
                                  onUserSelect={handleUserSelect}
                                  selectedUsers={selectedUsers}
                                  refreshTrigger={refreshTrigger}
                                  onAdminClick={handleAdminClick}
                                />
                              )}
                            </Box>

                            {/* Activity Tracker / Leaderboard Panel */}
                            <Box
                              sx={{
                                width: { xs: '100%', md: '75%' },
                                borderRadius: { xs: 2, md: 4 },
                                bgcolor: 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: { xs: 'auto', md: `calc(100vh - ${HEADER_AND_PADDING}px)` },
                                justifyContent: 'flex-start',
                              }}
                              className={highlight ? 'highlight-activity-tracker' : ''}
                            >
                              {selectedUsers.length > 0 ? (
                                <ActivityTracker
                                  userNames={selectedUsers}
                                  onResultAdded={handleResultAdded}
                                  onReturnToLeaderboard={handleReturnToLeaderboard}
                                />
                              ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, md: 0 }, pt: { md: 1 } }}>
                                  <Typography
                                    variant={isMobile ? 'body1' : 'h6'}
                                    color="textSecondary"
                                    fontWeight="bold"
                                    textAlign="center"
                                  >
                                    Select a user to view their activities or add a result.
                                  </Typography>
                                  <OverallLeaderboard refreshTrigger={leaderboardRefreshTrigger} />
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
