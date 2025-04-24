import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import ActivityGraph from './ActivityGraph';
import ActivityLeaderboard from './ActivityLeaderboard';

interface ActivityResult {
  id: string;
  userName: string;
  activity: string;
  value: number;
  date: string;
}

const ActivityTracker: React.FC = () => {
  const [activities, setActivities] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [value, setValue] = useState('');
  const [results, setResults] = useState<ActivityResult[]>([]);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const activitiesRef = collection(db, 'config/activities/list');
        const snapshot = await getDocs(activitiesRef);
        const activityList = snapshot.docs.map(doc => doc.data().name);
        setActivities(activityList);
      } catch (error) {
        console.error('Error fetching activities:', error);
        setError('Failed to load activities');
      }
    };

    fetchActivities();
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!currentUser) return;

      try {
        const resultsRef = collection(db, 'results');
        const q = query(resultsRef, where('userName', '==', currentUser.email));
        const snapshot = await getDocs(q);
        const fetchedResults = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ActivityResult[];
        setResults(fetchedResults);
      } catch (error) {
        console.error('Error fetching results:', error);
        setError('Failed to load results');
      }
    };

    fetchResults();
  }, [currentUser]);

  const handleActivityChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedActivities(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !selectedActivities.length || !value) return;

    try {
      const resultsRef = collection(db, 'results');
      const newResult = {
        userName: currentUser.email,
        activity: selectedActivities[0], // Use first selected activity for adding new result
        value: parseFloat(value),
        date: new Date().toISOString()
      };

      await addDoc(resultsRef, newResult);
      setResults([...results, { id: 'temp', ...newResult }]);
      setValue('');
      setError('');
    } catch (error) {
      console.error('Error adding result:', error);
      setError('Failed to add result');
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Track Your Activity
        </Typography>
        <form onSubmit={handleSubmit}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="activity-select-label">Select Activities</InputLabel>
            <Select
              labelId="activity-select-label"
              multiple
              value={selectedActivities}
              onChange={handleActivityChange}
              input={<OutlinedInput label="Select Activities" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {activities.map((activity) => (
                <MenuItem key={activity} value={activity}>
                  {activity}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!selectedActivities.length || !value}
          >
            Add Result
          </Button>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </form>
      </Paper>

      <ActivityGraph
        results={results}
        selectedActivities={selectedActivities}
      />

      <ActivityLeaderboard />
    </Box>
  );
};

export default ActivityTracker;