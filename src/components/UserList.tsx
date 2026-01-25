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
  SelectChangeEvent,
  Autocomplete
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
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
  firstName: string;
  lastName: string;
  createdAt: string;
  tags?: string[];
  gender?: string;
  birthdate?: string;
}

interface FirebaseUserData {
  firstName?: string;
  lastName?: string;
  name?: string;
  createdAt?: string;
  tags?: string[];
  gender?: string;
  birthdate?: string;
}

// Helper function to get full name
const getFullName = (user: UserDoc): string => {
  return `${user.firstName} ${user.lastName}`.trim();
};

const UserList: React.FC<UserListProps> = ({ onAdminClick, onUserSelect, selectedUsers, refreshTrigger }) => {
  const { setUserName } = useUser();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [newUserGender, setNewUserGender] = useState<string>('');
  const [newUserBirthdate, setNewUserBirthdate] = useState<string>('');
  const [newUserFirstName, setNewUserFirstName] = useState<string>('');
  const [newUserLastName, setNewUserLastName] = useState<string>('');
  const [newUserTags, setNewUserTags] = useState<string[]>([]);
  const [allExistingTags, setAllExistingTags] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      // Create a map to store users by full name with their documents
      const userMap = new Map<string, UserDoc>();
      
      snapshot.docs.forEach(doc => {
        try {
          const userData = doc.data() as FirebaseUserData;
          // Handle migration: support both old (name) and new (firstName/lastName) format
          let firstName = userData.firstName ?? '';
          let lastName = userData.lastName ?? '';
          
          // If old format exists, split it
          if (!firstName && !lastName && userData.name) {
            const nameStr = String(userData.name);
            const parts = nameStr.trim().split(/\s+/);
            if (parts.length === 1) {
              firstName = parts[0] ?? '';
              lastName = '';
            } else if (parts.length > 1) {
              lastName = parts[parts.length - 1] ?? '';
              firstName = parts.slice(0, -1).join(' ');
            }
          }
          
          // Ensure we have at least a firstName
          if (!firstName && !lastName) {
            console.warn(`User ${doc.id} has no name data, skipping`);
            return;
          }
          
          const user: UserDoc = {
            id: doc.id,
            // firstName and lastName are already strings (assigned with ?? '' above)
            firstName,
            lastName,
            createdAt: userData.createdAt ?? new Date().toISOString(),
            tags: userData.tags ?? [],
            gender: userData.gender,
            birthdate: userData.birthdate
          };
          
          const fullName = getFullName(user);
          
          // If we find a duplicate, keep the older entry
          const existingUser = userMap.get(fullName);
          if (!existingUser || new Date(existingUser.createdAt) > new Date(user.createdAt)) {
            userMap.set(fullName, user);
          }
        } catch (error) {
          console.error(`Error processing user ${doc.id}:`, error);
        }
      });

      // Clean up duplicates
      const deletionPromises: Promise<void>[] = [];
      snapshot.docs.forEach(doc => {
        try {
          const userData = doc.data() as FirebaseUserData;
          let firstName = userData.firstName ?? '';
          let lastName = userData.lastName ?? '';
          
          if (!firstName && !lastName && userData.name) {
            const nameStr = String(userData.name);
            const parts = nameStr.trim().split(/\s+/);
            if (parts.length === 1) {
              firstName = parts[0] ?? '';
              lastName = '';
            } else if (parts.length > 1) {
              lastName = parts[parts.length - 1] ?? '';
              firstName = parts.slice(0, -1).join(' ');
            }
          }
          
          const fullName = `${firstName} ${lastName}`.trim();
          if (!fullName) return; // Skip if no name
          
          const keepingUser = userMap.get(fullName);
          if (keepingUser && keepingUser.id !== doc.id) {
            deletionPromises.push(deleteDoc(doc.ref));
          }
        } catch (error) {
          console.error(`Error processing duplicate check for user ${doc.id}:`, error);
        }
      });

      // Wait for all deletions to complete
      if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        console.log(`Cleaned up ${deletionPromises.length} duplicate users`);
      }

      // Update state with unique users (sorted by last name, then first name)
      const uniqueUsers = Array.from(userMap.values()).sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });
      setUsers(uniqueUsers);
      
      // Extract all unique tags from all users
      const allTags = Array.from(
        new Set(uniqueUsers.flatMap(user => user.tags ?? []))
      ).sort();
      setAllExistingTags(allTags);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [refreshTrigger]);

  const handleRegister = async () => {
    const firstName = newUserFirstName.trim();
    const lastName = newUserLastName.trim();
    
    if (!firstName) {
      setRegistrationError('Please enter a first name');
      return;
    }
    
    try {
      const usersRef = collection(db, 'users');
      
      // Check if user with same firstName and lastName already exists
      // Fetch all users and check in memory to avoid index requirements
      const allUsersSnapshot = await getDocs(usersRef);
      const existingUser = allUsersSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.firstName === firstName && data.lastName === lastName;
      });
      
      if (existingUser) {
        setRegistrationError('This name is already registered');
        return;
      }

      const newUser: Omit<UserDoc, 'id'> = {
        firstName,
        lastName,
        createdAt: new Date().toISOString(),
        tags: newUserTags
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
      const fullName = `${firstName} ${lastName}`.trim();
      
      logAnalyticsEvent('user_registration', {
        user_id: userDoc.id,
        user_name: fullName,
        registration_date: newUser.createdAt
      });

      setShowRegisterDialog(false);
      setRegistrationError(null);
      setNewUserGender('');
      setNewUserBirthdate('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserTags([]);
      setUserName(fullName);
      setSearchTerm('');
      await loadUsers();
    } catch (error) {
      console.error('Error registering user:', error);
      setRegistrationError('An error occurred while registering. Please try again.');
    }
  };

  // Get all unique tags from all users
  const allTags = Array.from(
        new Set(users.flatMap(user => user.tags ?? []))
  ).sort();

  const filteredUsers = users.filter(user => {
    const fullName = getFullName(user);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      fullName.toLowerCase().includes(searchLower) ||
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower);
    const matchesTag = !selectedTagFilter || (user.tags ?? []).includes(selectedTagFilter);
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
          placeholder="Search by name..."
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
          {filteredUsers.map((user) => {
            const fullName = getFullName(user);
            const isSelected = selectedUsers.includes(fullName);
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
                        const removeIndex = newSelectedUsers.indexOf(fullName);
                        if (removeIndex > -1) {
                          newSelectedUsers.splice(removeIndex, 1);
                        }
                      } else {
                        newSelectedUsers.push(fullName);
                      }
                      setLastSelectedIndex(currentIndex);
                    } else if (e.shiftKey && lastSelectedIndex !== null) {
                      // Shift+click: select range
                      const start = Math.min(lastSelectedIndex, currentIndex);
                      const end = Math.max(lastSelectedIndex, currentIndex);
                      const rangeUsers = filteredUsers.slice(start, end + 1).map(u => getFullName(u));
                      // Merge with existing selection
                      const combined = Array.from(new Set([...newSelectedUsers, ...rangeUsers]));
                      newSelectedUsers.splice(0, newSelectedUsers.length, ...combined);
                    } else {
                      // Regular click: single selection
                      newSelectedUsers.splice(0, newSelectedUsers.length, fullName);
                      setLastSelectedIndex(currentIndex);
                    }
                    
                    // Update the first selected user in UserContext for backward compatibility
                    if (newSelectedUsers.length > 0) {
                      setUserName(newSelectedUsers[0]);
                    }
                    
                    // Only scroll to top when:
                    // 1. Regular click (not Ctrl/Shift) that results in single selection
                    // 2. OR switching from multi-select back to single select
                    const isRegularClick = !e.ctrlKey && !e.metaKey && !e.shiftKey;
                    const isSingleSelect = newSelectedUsers.length === 1;
                    const wasMultiSelect = selectedUsers.length > 1;
                    const switchingToSingle = wasMultiSelect && isSingleSelect;
                    
                    if (isRegularClick && (isSingleSelect || switchingToSingle)) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    
                    onUserSelect(newSelectedUsers);
                  }}
                >
                  <ListItemText 
                    primary={fullName}
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
                onClick={() => {
                  // Try to split search term into firstName and lastName
                  const parts = searchTerm.trim().split(/\s+/);
                  if (parts.length > 0) {
                    setNewUserFirstName(parts[0]);
                    setNewUserLastName(parts.slice(1).join(' ') || '');
                  }
                  setShowRegisterDialog(true);
                }}
              >
                Register &quot;{searchTerm.trim()}&quot;
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
          setNewUserFirstName('');
          setNewUserLastName('');
          setNewUserTags([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Register New User</DialogTitle>
        <DialogContent>
          {registrationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registrationError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="First Name *"
            value={newUserFirstName}
            onChange={(e) => setNewUserFirstName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Last Name"
            value={newUserLastName}
            onChange={(e) => setNewUserLastName(e.target.value)}
            sx={{ mb: 2 }}
          />
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
          <Autocomplete
            multiple
            freeSolo
            options={allExistingTags}
            value={newUserTags}
            onChange={(event, newValue) => {
              setNewUserTags(newValue);
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags (Optional)"
                placeholder="Type to add tags or select existing"
                helperText="Add tags to group users. Existing tags are shown as suggestions."
              />
            )}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowRegisterDialog(false);
            setRegistrationError(null);
            setNewUserGender('');
            setNewUserBirthdate('');
            setNewUserFirstName('');
            setNewUserLastName('');
            setNewUserTags([]);
          }}>
            Cancel
          </Button>
          <Button onClick={() => { void handleRegister(); }} variant="contained">
            Register
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserList; 