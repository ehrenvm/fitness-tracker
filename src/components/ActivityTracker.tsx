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
  ToggleButtonGroup,
  Chip,
  OutlinedInput
} from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, logAnalyticsEvent, auth } from '../firebase';
import { ANALYTICS_EVENTS } from '../constants/analytics';
import ActivityGraph from './ActivityGraph';
import { useAuthState } from 'react-firebase-hooks/auth';
import CompoundValueInput from './CompoundValueInput';

// Default activities list (will be updated from Firebase)
// eslint-disable-next-line react-refresh/only-export-components
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
  userNames: string[];
}

type SortField = 'date' | 'value';
type SortDirection = 'asc' | 'desc';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

interface ActivityValue {
  value1: string;
  value2: string;
}

const isCompoundUnit = (activity: string): boolean => {
  const match = activity.match(/\((.*?)\)/);
  return match ? match[1].includes('/') : false;
};

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ userNames }) => {
  const [user] = useAuthState(auth);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [value, setValue] = useState<ActivityValue>({ value1: '', value2: '' });
  const [results, setResults] = useState<ActivityResult[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [filteredResults, setFilteredResults] = useState<ActivityResult[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activities, setActivities] = useState<string[]>(ACTIVITIES);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [entryDate, setEntryDate] = useState<string>("");
  const [userGender, setUserGender] = useState<string | undefined>(undefined);
  const [userBirthdate, setUserBirthdate] = useState<string | undefined>(undefined);

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

  // Load user data (gender and birthdate) from Firebase - only for single user
  useEffect(() => {
    const loadUserData = async () => {
      if (userNames.length !== 1) {
        setUserGender(undefined);
        setUserBirthdate(undefined);
        return;
      }
      
      try {
        const usersRef = collection(db, 'users');
        // userName is now in format "firstName lastName"
        const userNameParts = userNames[0].trim().split(/\s+/);
        let firstName = '';
        let lastName = '';
        
        if (userNameParts.length === 1) {
          firstName = userNameParts[0];
          lastName = '';
        } else if (userNameParts.length > 1) {
          lastName = userNameParts[userNameParts.length - 1];
          firstName = userNameParts.slice(0, -1).join(' ');
        }
        
        // Fetch all users and filter in memory to avoid composite index requirement
        // This is acceptable since we're only doing this for a single user lookup
        const allUsersSnapshot = await getDocs(usersRef);
        const matchingUser = allUsersSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.firstName === firstName && data.lastName === lastName;
        });
        
        if (matchingUser) {
          const userData = matchingUser.data() as { gender?: string; birthdate?: string };
          setUserGender(userData.gender);
          setUserBirthdate(userData.birthdate);
        } else {
          setUserGender(undefined);
          setUserBirthdate(undefined);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUserGender(undefined);
        setUserBirthdate(undefined);
      }
    };

    void loadUserData();
  }, [userNames]);

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
      if (userNames.length === 0) {
        setResults([]);
        setFilteredResults([]);
        return;
      }

      console.log('Loading results for users:', userNames);
      const resultsRef = collection(db, 'results');
      
      // Fetch results for all selected users
      const queries = userNames.map(userName => 
        query(
          resultsRef,
          where('userName', '==', userName),
          orderBy('date', 'desc')
        )
      );
      
      const querySnapshots = await Promise.all(queries.map(q => getDocs(q)));
      const loadedResults: ActivityResult[] = [];
      
      querySnapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          loadedResults.push({
            id: doc.id,
            ...doc.data()
          } as ActivityResult);
        });
      });
      
      console.log('Found results:', loadedResults);
      setResults(loadedResults);
      
      // Filter results based on selected activities
      let filtered = loadedResults;
      if (selectedActivities.length > 0) {
        filtered = filtered.filter(result => selectedActivities.includes(result.activity));
      }
      
      // Apply current sorting
      setFilteredResults(sortResults(filtered));
    } catch (error) {
      console.error('Error loading results:', error);
    }
  }, [userNames, selectedActivities, sortResults]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const handleActivityChange = (event: SelectChangeEvent<string>) => {
    setSelectedActivity(event.target.value);
    setValue({ value1: '', value2: '' }); // Reset both values when activity changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedActivity) return;

    try {
      const isCompound = selectedActivity.match(/\((.*?)\)/) !== null;
      let finalValue: number;

      if (isCompound) {
        if (selectedActivity.includes('ft/in')) {
          finalValue = (parseFloat(value.value1) * 12) + parseFloat(value.value2 || '0');
        } else if (selectedActivity.includes('min/sec')) {
          finalValue = (parseFloat(value.value1) * 60) + parseFloat(value.value2 || '0');
        } else {
          finalValue = parseFloat(value.value1 + '.' + (value.value2 || '0'));
        }
      } else {
        finalValue = parseFloat(value.value1);
      }

      if (isNaN(finalValue)) {
        throw new Error('Invalid value entered');
      }

      // Use selected date or today's date
      let dateToUse: Date;
      if (entryDate) {
        // Parse the date string (YYYY-MM-DD) and create a date at noon local time
        // This prevents timezone conversion issues when converting to ISO string
        const [year, month, day] = entryDate.split('-').map(Number);
        dateToUse = new Date(year, month - 1, day, 12, 0, 0, 0); // Noon local time
      } else {
        dateToUse = new Date();
      }
      // Store as ISO string for consistency
      // Use the first selected user for new entries (or the single user if only one is selected)
      const userNameForEntry = userNames.length > 0 ? userNames[0] : '';
      
      const result = {
        activity: selectedActivity,
        value: finalValue,
        originalValue: isCompound ? value : undefined,
        date: dateToUse.toISOString(),
        userId: user.uid,
        userName: userNameForEntry
      };

      const docRef = await addDoc(collection(db, 'results'), result);
      
      // Log analytics for new activity data
      logAnalyticsEvent(ANALYTICS_EVENTS.ACTIVITY_DATA_ADDED, {
        userId: user.uid,
        userName: userNameForEntry,
        activity: selectedActivity,
        value: finalValue,
        isCompound,
        resultId: docRef.id
      });

      // Check for performance milestones
      const userResults = results.filter(r => r.activity === selectedActivity && r.userName === userNameForEntry);
      if (userResults.length > 0) {
        const personalBest = Math.max(...userResults.map(r => r.value));
        if (finalValue > personalBest) {
          logAnalyticsEvent(ANALYTICS_EVENTS.PERFORMANCE_MILESTONE, {
            userId: user.uid,
            userName: userNameForEntry,
            activity: selectedActivity,
            value: finalValue,
            type: 'personal_best',
            previousBest: personalBest
          });
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setValue({ value1: '', value2: '' });
      setEntryDate("");
      void loadResults();
    } catch (error) {
      console.error('Error adding result:', error);
      setError('Failed to add result. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCheckActivity = useCallback(() => {
    let filtered = [...results];
    
    if (selectedActivities.length > 0) {
      filtered = filtered.filter(result => selectedActivities.includes(result.activity));
    }

    setFilteredResults(sortResults(filtered));
  }, [results, selectedActivities, sortResults]);

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
          {userNames.length === 0 ? (
            'Select a user to view their activity tracker'
          ) : userNames.length === 1 ? (
            <>
              Welcome, {userNames[0]}!
              {(() => {
                const genderAbbr = userGender === 'Male' ? 'M' : userGender === 'Female' ? 'F' : userGender === 'Non-Binary' ? 'NB' : null;
                let age: number | null = null;
                
                if (userBirthdate) {
                  try {
                    // Parse MM/DD/YYYY format
                    const [month, day, year] = userBirthdate.split('/').map(Number);
                    const birthDate = new Date(year, month - 1, day);
                    const today = new Date();
                    age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                      age--;
                    }
                  } catch (e) {
                    console.error('Error calculating age:', e);
                  }
                }
                
                const infoParts: string[] = [];
                if (genderAbbr) infoParts.push(genderAbbr);
                if (age !== null) infoParts.push(`${age} years`);
                
                return infoParts.length > 0 ? (
                  <Typography component="span" sx={{ fontSize: '0.6em' }}>
                    {' '}({infoParts.join(', ')})
                  </Typography>
                ) : null;
              })()}
            </>
          ) : (
            `Viewing ${userNames.length} users: ${userNames.join(', ')}`
          )}
        </Typography>

        <Grid container spacing={3}>
          {/* Left Column - Activity Entry and Query */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Add New Activity
                </Typography>
                <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(e); }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Activity</InputLabel>
                    <Select
                      value={selectedActivity}
                      onChange={handleActivityChange}
                      label="Activity"
                    >
                      {activities.slice().sort((a, b) => a.localeCompare(b)).map((act) => (
                        <MenuItem key={act} value={act}>
                          {act}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedActivity && (
                    isCompoundUnit(selectedActivity) ? (
                      <CompoundValueInput
                        activity={selectedActivity}
                        value={value}
                        onChange={setValue}
                      />
                    ) : (
                      <TextField
                        type="number"
                        label="Value"
                        value={value.value1}
                        onChange={(e) => setValue({ value1: e.target.value, value2: '' })}
                        fullWidth
                        sx={{ mb: 2 }}
                      />
                    )
                  )}

                  {/* Date input for entry date */}
                  <TextField
                    label="Date"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                    InputLabelProps={{ shrink: true }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={!selectedActivity || !value.value1}
                  >
                    Track Activity
                  </Button>
                </form>
              </Paper>

              <Paper elevation={3} sx={{ p: 3, mt: 2, borderRadius: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Filter Activities
                </Typography>
                
                <FormControl fullWidth>
                  <InputLabel>Select Activities</InputLabel>
                  <Select
                    multiple
                    value={selectedActivities}
                    onChange={(e) => setSelectedActivities(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput label="Select Activities" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.sort((a, b) => a.localeCompare(b)).map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                    MenuProps={MenuProps}
                  >
                    {activities.slice().sort((a, b) => a.localeCompare(b)).map((act) => (
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
            <Paper elevation={3} sx={{ p: 3, height: '100%', borderRadius: 4 }}>
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

              <ActivityGraph 
                results={filteredResults}
                selectedActivities={selectedActivities}
              />

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
                            {userNames.length > 1 && (
                              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                ({result.userName})
                              </Typography>
                            )}
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

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Activity tracked successfully!
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default ActivityTracker; 