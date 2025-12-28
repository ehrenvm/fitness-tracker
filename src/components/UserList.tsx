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
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { collection, getDocs, query, orderBy, where, addDoc, deleteDoc } from 'firebase/firestore';
import { db, logAnalyticsEvent } from '../firebase';
import { useUser } from '../contexts/UserContext';

interface UserListProps {
  onAdminClick: () => void;
  onUserSelect: (userNames: string[]) => void;
  selectedUsers: string[];
  refreshTrigger?: number;
}

interface UserDoc {
  id: string;
  name: string;
  createdAt: string;
  tags?: string[];
  gender?: string;
  birthdate?: string;
}

const UserList: React.FC<UserListProps> = ({ onAdminClick, onUserSelect, selectedUsers, refreshTrigger }) => {
  const { userName, setUserName } = useUser();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [newUserGender, setNewUserGender] = useState<string>('');
  const [newUserBirthdate, setNewUserBirthdate] = useState<string>('');
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

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
          createdAt: userData.createdAt,
          tags: userData.tags || [],
          gender: userData.gender,
          birthdate: userData.birthdate
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

      // Update state with unique users (sorted by name)
      const uniqueUsers = Array.from(userMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setUsers(uniqueUsers);
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

      const newUser: any = {
        name: normalizedName,
        createdAt: new Date().toISOString(),
        tags: []
      };
      
      if (newUserGender) {
        newUser.gender = newUserGender;
      }
      
      if (newUserBirthdate) {
        // Validate and format birthdate (MM/DD/YYYY)
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (dateRegex.test(newUserBirthdate)) {
          newUser.birthdate = newUserBirthdate;
        } else {
          setRegistrationError('Birthdate must be in MM/DD/YYYY format');
          return;
        }
      }
      
      const userDoc = await addDoc(usersRef, newUser);
      
      logAnalyticsEvent('user_registration', {
        user_id: userDoc.id,
        user_name: newUser.name,
        registration_date: newUser.createdAt
      });

      setShowRegisterDialog(false);
      setRegistrationError(null);
      setNewUserGender('');
      setNewUserBirthdate('');
      setUserName(newUser.name);
      setSearchTerm('');
      await loadUsers();
    } catch (error) {
      console.error('Error registering user:', error);
      setRegistrationError('An error occurred while registering. Please try again.');
    }
  };

  // Get all unique tags from all users
  const allTags = Array.from(
    new Set(users.flatMap(user => user.tags || []))
  ).sort();

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTagFilter || (user.tags || []).includes(selectedTagFilter);
    return matchesSearch && matchesTag;
  });

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
          Users{filteredUsers.length > 0 ? ` (${filteredUsers.length}${selectedTagFilter ? ` of ${users.length}` : ''})` : users.length > 0 ? ` (${users.length})` : ''}
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
          sx={{ mb: 1 }}
        />
        <FormControl fullWidth size="small">
          <InputLabel>Filter by Tag</InputLabel>
          <Select
            value={selectedTagFilter}
            label="Filter by Tag"
            onChange={(e) => setSelectedTagFilter(e.target.value)}
          >
            <MenuItem value="">All Users</MenuItem>
            {allTags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                {tag}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List sx={{ overflow: 'auto', flexGrow: 1 }}>
          {filteredUsers.map((user, index) => {
            const isSelected = selectedUsers.includes(user.name);
            return (
              <ListItem key={user.id} disablePadding>
                <ListItemButton 
                  selected={isSelected}
                  onClick={(e) => {
                    e.preventDefault();
                    const newSelectedUsers = [...selectedUsers];
                    const currentIndex = filteredUsers.findIndex(u => u.id === user.id);
                    
                    if (e.ctrlKey || e.metaKey) {
                      // Ctrl/Cmd+click: toggle selection
                      if (isSelected) {
                        const removeIndex = newSelectedUsers.indexOf(user.name);
                        if (removeIndex > -1) {
                          newSelectedUsers.splice(removeIndex, 1);
                        }
                      } else {
                        newSelectedUsers.push(user.name);
                      }
                      setLastSelectedIndex(currentIndex);
                    } else if (e.shiftKey && lastSelectedIndex !== null) {
                      // Shift+click: select range
                      const start = Math.min(lastSelectedIndex, currentIndex);
                      const end = Math.max(lastSelectedIndex, currentIndex);
                      const rangeUsers = filteredUsers.slice(start, end + 1).map(u => u.name);
                      // Merge with existing selection
                      const combined = Array.from(new Set([...newSelectedUsers, ...rangeUsers]));
                      newSelectedUsers.splice(0, newSelectedUsers.length, ...combined);
                    } else {
                      // Regular click: single selection
                      newSelectedUsers.splice(0, newSelectedUsers.length, user.name);
                      setLastSelectedIndex(currentIndex);
                    }
                    
                    // Update the first selected user in UserContext for backward compatibility
                    if (newSelectedUsers.length > 0) {
                      setUserName(newSelectedUsers[0]);
                    }
                    
                    onUserSelect(newSelectedUsers);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <ListItemText 
                    primary={user.name}
                    secondary={
                      user.tags && user.tags.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {user.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          ))}
                        </Box>
                      ) : null
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
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
          setNewUserGender('');
          setNewUserBirthdate('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Register New User</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Register "{searchTerm.trim()}" as a new user
          </Typography>
          {registrationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registrationError}
            </Alert>
          )}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Gender (Optional)</InputLabel>
            <Select
              value={newUserGender}
              label="Gender (Optional)"
              onChange={(e: SelectChangeEvent) => setNewUserGender(e.target.value)}
            >
              <MenuItem value="">Not specified</MenuItem>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Non-Binary">Non-Binary</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Birthdate (Optional)"
            placeholder="MM/DD/YYYY"
            value={newUserBirthdate}
            onChange={(e) => {
              let value = e.target.value;
              // Allow only digits and forward slashes
              value = value.replace(/[^\d/]/g, '');
              // Auto-format as user types
              if (value.length > 2 && value[2] !== '/') {
                value = value.slice(0, 2) + '/' + value.slice(2);
              }
              if (value.length > 5 && value[5] !== '/') {
                value = value.slice(0, 5) + '/' + value.slice(5);
              }
              // Limit to MM/DD/YYYY format (10 characters)
              if (value.length <= 10) {
                setNewUserBirthdate(value);
              }
            }}
            helperText="Format: MM/DD/YYYY (e.g., 01/15/2000)"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowRegisterDialog(false);
            setRegistrationError(null);
            setNewUserGender('');
            setNewUserBirthdate('');
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