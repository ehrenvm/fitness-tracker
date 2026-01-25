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
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ACTIVITIES } from './ActivityTracker';

type ViewMode = 'all' | 'max' | 'min';
type Order = 'asc' | 'desc';
type SortableColumn = 'userName' | 'value' | 'date';

interface Result {
  id: string;
  userName: string;
  activity: string;
  value: number;
  date: string;
}

interface ProcessedResult {
  userName: string;
  value: number;
  date: string;
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (orderBy === 'date') {
    return new Date(b[orderBy] as string).getTime() - new Date(a[orderBy] as string).getTime();
  }
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(
  order: Order,
  orderBy: SortableColumn
): (a: ProcessedResult, b: ProcessedResult) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

const ActivityLeaderboard: React.FC = () => {
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [results, setResults] = useState<Result[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<SortableColumn>('value');
  const [activities, setActivities] = useState<string[]>(ACTIVITIES);

  // Load activities from Firebase
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const activitiesRef = doc(db, 'config', 'activities');
        const activitiesDoc = await getDoc(activitiesRef);
        if (activitiesDoc.exists()) {
          const data = activitiesDoc.data();
          // data is guaranteed to exist when exists() is true
          if ('list' in data && Array.isArray(data.list)) {
            setActivities(data.list as string[]);
          }
        }
      } catch (error) {
        console.error('Error loading activities:', error);
      }
    };

    void loadActivities();
  }, []);

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
      void loadResults(selectedActivity);
    }
  }, [selectedActivity]);

  const handleRequestSort = (property: SortableColumn) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const processResults = (results: Result[]): ProcessedResult[] => {
    if (!selectedActivity) return [];

    const activityResults = results.filter(r => r.activity === selectedActivity);

    if (viewMode === 'all') {
      return activityResults.map(result => ({
        userName: result.userName,
        value: result.value,
        date: result.date
      }));
    }

    const userGroups = activityResults.reduce<{ [key: string]: Result[] }>((groups, result) => {
      // Initialize array if it doesn't exist
      if (!(result.userName in groups)) {
        groups[result.userName] = [];
      }
      groups[result.userName].push(result);
      return groups;
    }, {});

    return Object.entries(userGroups).map(([, userResults]) => {
      let selectedResult: Result;
      
      switch (viewMode) {
        case 'max':
          selectedResult = userResults.reduce((max, current) => 
            current.value > max.value ? current : max
          );
          break;
        case 'min':
          selectedResult = userResults.reduce((min, current) => 
            current.value < min.value ? current : min
          );
          break;
        default:
          throw new Error('Unexpected view mode');
      }

      return {
        userName: selectedResult.userName,
        value: selectedResult.value,
        date: selectedResult.date
      };
    });
  };

  const sortedResults = processResults(results).sort(getComparator(order, orderBy));

  const handleActivityChange = (event: SelectChangeEvent) => {
    setSelectedActivity(event.target.value);
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Activity Leaderboard
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Select Activity</InputLabel>
              <Select
                value={selectedActivity}
                onChange={handleActivityChange}
                label="Select Activity"
              >
                <MenuItem value="">
                  <em>Select an activity</em>
                </MenuItem>
                {activities.map((activity) => (
                  <MenuItem key={activity} value={activity}>
                    {activity}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
              size="small"
            >
              <ToggleButton value="all" aria-label="show all entries">
                All Entries
              </ToggleButton>
              <ToggleButton value="max" aria-label="show maximum">
                Personal Max
              </ToggleButton>
              <ToggleButton value="min" aria-label="show minimum">
                Personal Min
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>

        {selectedActivity && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'userName'}
                      direction={orderBy === 'userName' ? order : 'asc'}
                      onClick={() => handleRequestSort('userName')}
                    >
                      User
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'value'}
                      direction={orderBy === 'value' ? order : 'asc'}
                      onClick={() => handleRequestSort('value')}
                    >
                      Value
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'date'}
                      direction={orderBy === 'date' ? order : 'asc'}
                      onClick={() => handleRequestSort('date')}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedResults.map((result, index) => (
                  <TableRow key={`${result.userName}-${result.date}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{result.userName}</TableCell>
                    <TableCell>{result.value}</TableCell>
                    <TableCell>{new Date(result.date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {sortedResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No data available for {selectedActivity}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};

export default ActivityLeaderboard; 