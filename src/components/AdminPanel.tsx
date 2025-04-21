import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel
} from '@mui/material';
import { collection, getDocs, doc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import ActivityLeaderboard from './ActivityLeaderboard';

interface Result {
  id: string;
  activity: string;
  value: number;
  date: string;
  userName: string;
}

type SortField = 'userName' | 'activity' | 'date' | 'value';
type SortDirection = 'asc' | 'desc';

const AdminPanel: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const loadAllResults = async () => {
    try {
      const resultsRef = collection(db, 'results');
      const q = query(resultsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedResults = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Result[];
      console.log('Fetched results:', fetchedResults);
      setResults(fetchedResults);
      setError(null);
    } catch (err) {
      console.error('Error loading results:', err);
      setError('Failed to load results. Please try again.');
    }
  };

  // Sort results based on current sort field and direction
  const sortedResults = [...results].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'userName':
        comparison = a.userName.localeCompare(b.userName);
        break;
      case 'activity':
        comparison = a.activity.localeCompare(b.activity);
        break;
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'value':
        comparison = a.value - b.value;
        break;
      default:
        comparison = 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllResults();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    console.log('Results updated:', results);
  }, [results]);

  const handleEdit = (result: Result) => {
    setSelectedResult(result);
    setEditValue(result.value.toString());
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedResult) return;

    try {
      const resultRef = doc(db, 'results', selectedResult.id);
      await updateDoc(resultRef, {
        value: Number(editValue)
      });
      setEditDialog(false);
      await loadAllResults();
      setError(null);
    } catch (err) {
      console.error('Error updating result:', err);
      setError('Failed to update result. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this result?')) {
      try {
        const resultRef = doc(db, 'results', id);
        await deleteDoc(resultRef);
        await loadAllResults();
        setError(null);
      } catch (err) {
        console.error('Error deleting result:', err);
        setError('Failed to delete result. Please try again.');
      }
    }
  };

  const handleLogin = () => {
    const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD;
    if (password === adminPassword) {
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('Invalid password');
    }
    setPassword('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setResults([]);
    setError(null);
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Admin Login
          </Typography>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              margin="normal"
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleLogin}
              sx={{ mt: 2 }}
            >
              Login
            </Button>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Admin Panel
          </Typography>
          <Button variant="outlined" color="primary" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <ActivityLeaderboard />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            All Activities Log
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'userName'}
                      direction={sortField === 'userName' ? sortDirection : 'asc'}
                      onClick={() => handleSort('userName')}
                    >
                      User
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'activity'}
                      direction={sortField === 'activity' ? sortDirection : 'asc'}
                      onClick={() => handleSort('activity')}
                    >
                      Activity
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'value'}
                      direction={sortField === 'value' ? sortDirection : 'asc'}
                      onClick={() => handleSort('value')}
                    >
                      Value
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'date'}
                      direction={sortField === 'date' ? sortDirection : 'asc'}
                      onClick={() => handleSort('date')}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ minWidth: '200px' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.userName}</TableCell>
                    <TableCell>{result.activity}</TableCell>
                    <TableCell>{result.value}</TableCell>
                    <TableCell>{new Date(result.date).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => handleEdit(result)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(result.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Dialog open={editDialog} onClose={() => setEditDialog(false)}>
          <DialogTitle>Edit Result</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Value"
              type="number"
              fullWidth
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default AdminPanel;