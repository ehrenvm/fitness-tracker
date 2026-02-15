import React, { useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { AdminPanelSettings as AdminIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface AppHeaderProps {
  onAdminClick: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onAdminClick }) => {
  const [user] = useAuthState(auth);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const handleLogoutClick = useCallback(() => {
    void handleLogout();
  }, [handleLogout]);

  return (
    <AppBar position="static" sx={{ bgcolor: 'primary.main', mb: { xs: 0, md: 3 } }}>
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1, minWidth: 0 }}>
          <Avatar
            src="/favicon_io/favicon-32x32.png"
            alt="Performance Tracker"
            sx={{ width: 32, height: 32, flexShrink: 0 }}
          />
          <Typography variant={isMobile ? 'subtitle1' : 'h6'} component="div" noWrap>
            {isMobile ? 'PerfTracker' : 'Performance Tracker'}{' '}
            <Typography component="span" sx={{ fontSize: '0.7em', opacity: 0.8 }}>
              2026
            </Typography>
          </Typography>
        </Box>
        
        {user && !isMobile ? (
          <Typography variant="body1" sx={{ mr: 2 }} noWrap>
            {user.email ?? user.displayName ?? 'User'}
          </Typography>
        ) : null}

        <Box sx={{ display: 'flex', gap: { xs: 0, sm: 1 }, flexShrink: 0 }}>
          <IconButton
            color="inherit"
            onClick={onAdminClick}
            size={isMobile ? 'medium' : 'large'}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <AdminIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={handleLogoutClick}
            size={isMobile ? 'medium' : 'large'}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;
