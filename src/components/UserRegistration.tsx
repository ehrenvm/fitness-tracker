import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Container, Alert } from '@mui/material';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface UserRegistrationProps {
  onUserSelect: (userName: string) => void;
}

const UserRegistration: React.FC<UserRegistrationProps> = ({ onUserSelect }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    
    try {
      // Check if user already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('name', '==', name.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError('This name is already registered. Please select it from the list on the left.');
        return;
      }

      // Register new user
      const newUser = {
        name: name.trim(),
        createdAt: new Date().toISOString()
      };
      
      await addDoc(usersRef, newUser);
      onUserSelect(newUser.name);
      setName('');
      setError(null);
      navigate('/tracker');
    } catch (error) {
      console.error('Error registering user:', error);
      setError('An error occurred while registering. Please try again.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Register New User
        </Typography>
        
        <Typography variant="body1" color="text.secondary" gutterBottom>
          To get started, either select your name from the list on the left or register as a new user below.
        </Typography>
        
        <TextField
          label="Enter Your Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          fullWidth
          error={!!error}
          helperText={error}
        />
        
        <Button
          variant="contained"
          onClick={handleRegister}
          fullWidth
          size="large"
        >
          Register New User
        </Button>
      </Box>
    </Container>
  );
};

export default UserRegistration;