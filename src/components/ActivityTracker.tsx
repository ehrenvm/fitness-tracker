import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  SelectChangeEvent,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ActivityGraph from './ActivityGraph';

// Predefined list of activities
export const ACTIVITIES = [
  'Push-ups',
  'Pull-ups',
  'Squats',
  'Running (km)',
  'Plank (seconds)',
  'Deadlift (lbs)',
  'Bench Press (lbs)'
];

interface ActivityResult {
  id: string;
  userName: string;
  activity: string;
  value: number;
  date: string;
}

interface ActivityTrackerProps {
  userName: string;
}

type SortField = 'date' | 'value';
type SortDirection = 'asc' | 'desc';

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ userName }) => {
  const [activity, setActivity] = useState('');
  const [value, setValue] = useState('');
  const [results, setResults] = useState<ActivityResult[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [filteredResults, setFilteredResults] = useState<ActivityResult[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Add a shared sorting function
  const sortResults = useCallback((data: ActivityResult[]) => {
    return [...data].sort((a, b) => {
      if (sortField === 'date') {
        return sortDirection === 'desc' 
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return sortDirection === 'desc' 
          ? b.value - a.value
          : a.value - b.value;
      }
    });
  }, [sortField, sortDirection]);

  const loadResults = useCallback(async () => {
    try {
      console.log('Loading results for user:', userName);
      const resultsRef = collection(db, 'results');
      const q = query(
        resultsRef,
        where('userName', '==', userName),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const loadedResults = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityResult[];
      console.log('Found results:', loadedResults);
      setResults(loadedResults);
      
      // Filter results based on selected activity
      let filtered = loadedResults;
      if (selectedActivity) {
        filtered = filtered.filter(result => result.activity === selectedActivity);
      }
      
      // Apply current sorting
      setFilteredResults(sortResults(filtered));
    } catch (error) {
      console.error('Error loading results:', error);
    }
  }, [userName, selectedActivity, sortResults]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleActivityChange = (event: SelectChangeEvent) => {
    setActivity(event.target.value);
  };

  const handleAddResult = async () => {
    if (!activity || !value) return;

    const valueNum = parseFloat(value);
    if (isNaN(valueNum) || valueNum <= 0) {
      alert('Please enter a valid value');
      return;
    }

    try {
      const resultsRef = collection(db, 'results');
      await addDoc(resultsRef, {
        userName,
        activity,
        date: new Date().toISOString(),
        value: valueNum
      });
      
      setActivity('');
      setValue('');
      loadResults();
    } catch (error) {
      console.error('Error adding result:', error);
    }
  };

  const handleCheckActivity = useCallback(() => {
    let filtered = [...results];
    
    if (selectedActivity) {
      filtered = filtered.filter(result => result.activity === selectedActivity);
    }

    setFilteredResults(sortResults(filtered));
  }, [results, selectedActivity, sortResults]);

  // Update filtered results when sort options change
  useEffect(() => {
    handleCheckActivity();
  }, [handleCheckActivity]);

  const handleSortChange = (field: SortField) => {
    if (field === sortField) {
      // If clicking the same field, toggle direction
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      // If clicking a new field, set it with default desc direction
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Activity Tracker
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Welcome, {userName}!
        </Typography>

        <Grid container spacing={3}>
          {/* Left Column - Activity Entry and Query */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Add New Activity
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Activity</InputLabel>
                  <Select
                    value={activity}
                    onChange={handleActivityChange}
                    label="Activity"
                  >
                    {ACTIVITIES.map((act) => (
                      <MenuItem key={act} value={act}>
                        {act}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  sx={{ mt: 2 }}
                  label="Value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  fullWidth
                />

                <Button
                  sx={{ mt: 2 }}
                  variant="contained"
                  onClick={handleAddResult}
                  fullWidth
                >
                  Add Result
                </Button>
              </Paper>

              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Filter Activities
                </Typography>
                
                <FormControl fullWidth>
                  <InputLabel>Select Activity</InputLabel>
                  <Select
                    value={selectedActivity}
                    onChange={(e) => setSelectedActivity(e.target.value)}
                    label="Select Activity"
                  >
                    <MenuItem value="">All Activities</MenuItem>
                    {ACTIVITIES.map((act) => (
                      <MenuItem key={act} value={act}>
                        {act}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Paper>
            </Box>
          </Grid>

          {/* Right Column - Activity History */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Activity History
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <ToggleButtonGroup
                    exclusive
                    value={sortField}
                    size="small"
                  >
                    <ToggleButton 
                      value="date"
                      onClick={() => handleSortChange('date')}
                      sx={{ textTransform: 'none' }}
                    >
                      Date {sortField === 'date' && (
                        sortDirection === 'desc' ? <ArrowDownward /> : <ArrowUpward />
                      )}
                    </ToggleButton>
                    <ToggleButton 
                      value="value"
                      onClick={() => handleSortChange('value')}
                      sx={{ textTransform: 'none' }}
                    >
                      Value {sortField === 'value' && (
                        sortDirection === 'desc' ? <ArrowDownward /> : <ArrowUpward />
                      )}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>

              {selectedActivity && (
                <ActivityGraph 
                  results={filteredResults}
                  activity={selectedActivity}
                />
              )}

              {filteredResults.length === 0 ? (
                <Alert severity="info">No activities found</Alert>
              ) : (
                <List>
                  {filteredResults.map((result) => (
                    <ListItem 
                      key={result.id}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1">
                            {result.activity}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span" color="text.secondary">
                              Value: {result.value} | 
                            </Typography>
                            <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 1 }}>
                              Date: {new Date(result.date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ActivityTracker;