import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { collection, getDocs, query, orderBy, where, addDoc, deleteDoc } from 'firebase/firestore';
import { db, logAnalyticsEvent } from '../firebase';
import { useUser } from '../contexts/UserContext';

interface UserListProps {
  onAdminClick: () => void;
  onUserSelect: (userName: string) => void;
  selectedUser: string | null;
  refreshTrigger?: number;
}

interface UserDoc {
  id: string;
  name: string;
  createdAt: string;
}

const UserList: React.FC<UserListProps> = ({ onAdminClick, onUserSelect, selectedUser, refreshTrigger }) => {
  const { userName, setUserName } = useUser();
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      // Create a map to store users by name with their documents
      const userMap = new Map<string, UserDoc>();
      
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        const user: UserDoc = {
          id: doc.id,
          name: userData.name,
          createdAt: userData.createdAt
        };
        
        // If we find a duplicate, keep the older entry
        const existingUser = userMap.get(userData.name);
        if (!existingUser || new Date(existingUser.createdAt) > new Date(user.createdAt)) {
          userMap.set(userData.name, user);
        }
      });

      // Clean up duplicates
      const deletionPromises: Promise<void>[] = [];
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        const keepingUser = userMap.get(userData.name);
        if (keepingUser && keepingUser.id !== doc.id) {
          deletionPromises.push(deleteDoc(doc.ref));
        }
      });

      // Wait for all deletions to complete
      if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        console.log(`Cleaned up ${deletionPromises.length} duplicate users`);
      }

      // Update state with unique users
      setUsers(Array.from(userMap.keys()).sort());
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [refreshTrigger]);

  const handleRegister = async () => {
    if (!searchTerm.trim()) {
      setRegistrationError('Please enter a name');
      return;
    }
    
    try {
      const normalizedName = searchTerm.trim();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('name', '==', normalizedName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setRegistrationError('This name is already registered');
        return;
      }

      const newUser = {
        name: normalizedName,
        createdAt: new Date().toISOString()
      };
      
      const userDoc = await addDoc(usersRef, newUser);
      
      logAnalyticsEvent('user_registration', {
        user_id: userDoc.id,
        user_name: newUser.name,
        registration_date: newUser.createdAt
      });

      setShowRegisterDialog(false);
      setRegistrationError(null);
      setUserName(newUser.name);
      setSearchTerm('');
      await loadUsers();
    } catch (error) {
      console.error('Error registering user:', error);
      setRegistrationError('An error occurred while registering. Please try again.');
    }
  };

  const filteredUsers = users.filter(user =>
    user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          Users
        </Typography>
        <IconButton onClick={onAdminClick} color="primary" size="small">
          <AdminPanelSettingsIcon />
        </IconButton>
      </Box>
      
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search or enter new name..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setRegistrationError(null);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List sx={{ overflow: 'auto', flexGrow: 1 }}>
          {filteredUsers.map((user) => (
            <ListItem key={user} disablePadding>
              <ListItemButton 
                selected={userName === user}
                onClick={() => {
                  setUserName(user);
                  onUserSelect(user);
                }}
              >
                <ListItemText primary={user} />
              </ListItemButton>
            </ListItem>
          ))}
          {filteredUsers.length === 0 && searchTerm.trim() && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                No users found with that name
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setShowRegisterDialog(true)}
              >
                Register "{searchTerm.trim()}"
              </Button>
            </Box>
          )}
          {filteredUsers.length === 0 && !searchTerm.trim() && (
            <ListItem>
              <ListItemText 
                primary="Start typing to search or register" 
                secondary="Enter a name to search for existing users or register as new"
              />
            </ListItem>
          )}
        </List>
      )}

      <Dialog 
        open={showRegisterDialog} 
        onClose={() => {
          setShowRegisterDialog(false);
          setRegistrationError(null);
        }}
      >
        <DialogTitle>Register New User</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Would you like to register "{searchTerm.trim()}" as a new user?
          </Typography>
          {registrationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registrationError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowRegisterDialog(false);
            setRegistrationError(null);
          }}>
            Cancel
          </Button>
          <Button onClick={handleRegister} variant="contained">
            Register
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserList;