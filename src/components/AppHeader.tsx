import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar
} from '@mui/material';
import { AdminPanelSettings as AdminIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface AppHeaderProps {
  onAdminClick: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onAdminClick }) => {
  const [user] = useAuthState(auth);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AppBar position="static" sx={{ bgcolor: 'primary.main', mb: 3 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
          <Avatar
            src="/favicon_io/favicon-32x32.png"
            alt="Performance Tracker"
            sx={{ width: 32, height: 32 }}
          />
          <Typography variant="h6" component="div">
            Performance Tracker{' '}
            <Typography component="span" sx={{ fontSize: '0.7em', opacity: 0.8 }}>
              2026
            </Typography>
          </Typography>
        </Box>
        
        {user && (
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.email || user.displayName || 'User'}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            color="inherit"
            onClick={onAdminClick}
            size="large"
          >
            <AdminIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={handleLogout}
            size="large"
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader; 