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
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface UserListProps {
  onUserSelect: (userName: string) => void;
}

const UserList: React.FC<UserListProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      // Create a Map to store unique users, with name as the key
      const uniqueUsers = new Map();
      
      querySnapshot.docs.forEach(doc => {
        const userData = doc.data();
        // Only add this user if we haven't seen this name before
        if (!uniqueUsers.has(userData.name)) {
          uniqueUsers.set(userData.name, {
            id: doc.id,
            name: userData.name
          });
        }
      });

      // Convert Map values to array and sort by name
      const usersList = Array.from(uniqueUsers.values())
        .sort((a, b) => a.name.localeCompare(b.name));

      setUsers(usersList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserClick = (userName: string) => {
    onUserSelect(userName);
    navigate('/tracker');
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        width: '100%',
        maxWidth: 300,
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Users
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
            <ListItem key={user.id} disablePadding>
              <ListItemButton onClick={() => handleUserClick(user.name)}>
                <ListItemText primary={user.name} />
              </ListItemButton>
            </ListItem>
          ))}
          {filteredUsers.length === 0 && (
            <ListItem>
              <ListItemText 
                primary="No users found" 
                secondary={searchTerm ? "Try a different search term" : "Register a new user to get started"}
              />
            </ListItem>
          )}
        </List>
      )}
    </Paper>
  );
};

export default UserList;