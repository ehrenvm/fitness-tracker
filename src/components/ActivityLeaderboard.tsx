import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ACTIVITIES } from './ActivityTracker';

interface Result {
  id: string;
  userName: string;
  activity: string;
  value: number;
  date: string;
}

type Order = 'asc' | 'desc';
type OrderBy = 'userName' | 'value' | 'date';

const ActivityLeaderboard: React.FC = () => {
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [results, setResults] = useState<Result[]>([]);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('value');

  const loadResults = async (activity: string) => {
    if (!activity) return;

    try {
      const resultsRef = collection(db, 'results');
      const q = query(resultsRef, where('activity', '==', activity));
      const querySnapshot = await getDocs(q);
      const fetchedResults = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Result[];
      setResults(fetchedResults);
    } catch (error) {
      console.error('Error loading results:', error);
    }
  };

  useEffect(() => {
    if (selectedActivity) {
      loadResults(selectedActivity);
    }
  }, [selectedActivity]);

  const handleActivityChange = (event: SelectChangeEvent) => {
    setSelectedActivity(event.target.value);
  };

  const handleSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedResults = [...results].sort((a, b) => {
    const multiplier = order === 'asc' ? 1 : -1;

    switch (orderBy) {
      case 'userName':
        return multiplier * a.userName.localeCompare(b.userName);
      case 'value':
        return multiplier * (a.value - b.value);
      case 'date':
        return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
      default:
        return 0;
    }
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Activity Leaderboard
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Select Activity</InputLabel>
            <Select
              value={selectedActivity}
              onChange={handleActivityChange}
              label="Select Activity"
            >
              <MenuItem value="">
                <em>Select an activity</em>
              </MenuItem>
              {ACTIVITIES.map((activity) => (
                <MenuItem key={activity} value={activity}>
                  {activity}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {selectedActivity && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'userName'}
                      direction={orderBy === 'userName' ? order : 'asc'}
                      onClick={() => handleSort('userName')}
                    >
                      User
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'value'}
                      direction={orderBy === 'value' ? order : 'asc'}
                      onClick={() => handleSort('value')}
                    >
                      Value
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'date'}
                      direction={orderBy === 'date' ? order : 'asc'}
                      onClick={() => handleSort('date')}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.userName}</TableCell>
                    <TableCell>{result.value}</TableCell>
                    <TableCell>{new Date(result.date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};

export default ActivityLeaderboard;