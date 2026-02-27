import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  OutlinedInput,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { ArrowUpward, ArrowDownward, CalendarToday, PictureAsPdf, EmojiEvents } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, logAnalyticsEvent, auth } from '../firebase';
import { ANALYTICS_EVENTS } from '../constants/analytics';
import ActivityGraph from './ActivityGraph';
import { useAuthState } from 'react-firebase-hooks/auth';
import CompoundValueInput from './CompoundValueInput';
import PersonalRecords from './PersonalRecords';
import { formatActivityValueDisplay } from '../utils/formatActivityValue';
import { triggerPrCelebration } from '../utils/prCelebration';
import type { ActivityResult, ActivityValue } from '../types/activity';

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

const isCompoundUnit = (activity: string): boolean => {
  const match = activity.match(/\((.*?)\)/);
  return match ? match[1].includes('/') : false;
};

const getTodayString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [activityPrDirection, setActivityPrDirection] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [entryDate, setEntryDate] = useState<string>(getTodayString);
  const [userGender, setUserGender] = useState<string | undefined>(undefined);
  const [userBirthdate, setUserBirthdate] = useState<string | undefined>(undefined);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const reportSectionRef = useRef<HTMLDivElement>(null);
  const [futureDateDialogOpen, setFutureDateDialogOpen] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [prCelebration, setPrCelebration] = useState<string | null>(null);

  // Load activities from Firebase
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const activitiesRef = doc(db, 'config', 'activities');
        const activitiesDoc = await getDoc(activitiesRef);
        if (activitiesDoc.exists()) {
          const data = activitiesDoc.data();
          if ('list' in data && Array.isArray(data.list)) {
            setActivities(data.list as string[]);
          }
          if ('prDirection' in data && typeof data.prDirection === 'object' && data.prDirection !== null) {
            setActivityPrDirection(data.prDirection as Record<string, boolean>);
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

  const handleActivityChange = useCallback((event: SelectChangeEvent) => {
    setSelectedActivity(event.target.value);
    setValue({ value1: '', value2: '' });
  }, []);

  const handleSubmit = useCallback(async () => {
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

      // Check for personal records
      const higherIsBetter = activityPrDirection[selectedActivity] !== false;
      const userResults = results.filter(r => r.activity === selectedActivity && r.userName === userNameForEntry);
      let isNewPR = userResults.length === 0;
      if (userResults.length > 0) {
        const currentBest = higherIsBetter
          ? Math.max(...userResults.map(r => r.value))
          : Math.min(...userResults.map(r => r.value));
        isNewPR = higherIsBetter ? finalValue > currentBest : finalValue < currentBest;
        if (isNewPR) {
          logAnalyticsEvent(ANALYTICS_EVENTS.PERFORMANCE_MILESTONE, {
            userId: user.uid,
            userName: userNameForEntry,
            activity: selectedActivity,
            value: finalValue,
            type: 'personal_best',
            previousBest: currentBest
          });
        }
      }

      if (isNewPR) {
        setPrCelebration(selectedActivity);
        triggerPrCelebration();
        setTimeout(() => setPrCelebration(null), 3500);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setValue({ value1: '', value2: '' });
      setEntryDate(getTodayString());
      void loadResults();
    } catch (error) {
      console.error('Error adding result:', error);
      setError('Failed to add result. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  }, [user, selectedActivity, value, entryDate, userNames, results, loadResults, activityPrDirection]);

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

  const handleSortChange = useCallback((field: SortField) => {
    if (field === sortField) {
      // If clicking the same field, toggle direction
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      // If clicking a new field, set it with default desc direction
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const handleSortDate = useCallback(() => {
    handleSortChange('date');
  }, [handleSortChange]);

  const handleSortValue = useCallback(() => {
    handleSortChange('value');
  }, [handleSortChange]);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue({ value1: e.target.value, value2: '' });
  }, []);

  const handleEntryDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEntryDate(e.target.value);
  }, []);

  const handleCalendarIconClick = useCallback(() => {
    // Focus and click the date input to open the calendar picker
    if (dateInputRef.current) {
      dateInputRef.current.focus();
      // showPicker() is available in modern browsers for date inputs
      if ('showPicker' in dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
        void dateInputRef.current.showPicker();
      } else {
        // Fallback: trigger click on the input
        dateInputRef.current.click();
      }
    }
  }, []);

  const handleSelectedActivitiesChange = useCallback((e: SelectChangeEvent<string[]>) => {
    setSelectedActivities(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value);
  }, []);

  const handleRemoveActivity = useCallback((activity: string) => {
    setSelectedActivities(prev => prev.filter(a => a !== activity));
  }, []);

  const handleActivityChipMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent Select from opening on mousedown
    const activity = (e.currentTarget as HTMLDivElement).getAttribute('data-activity');
    if (activity) {
      handleRemoveActivity(activity);
    }
  }, [handleRemoveActivity]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedActivity) {
      return;
    }

    // Use selected date or today's date to check for future date
    let dateToUse: Date;
    if (entryDate) {
      const [year, month, day] = entryDate.split('-').map(Number);
      dateToUse = new Date(year, month - 1, day, 12, 0, 0, 0); // Noon local time
    } else {
      dateToUse = new Date();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCompare = new Date(dateToUse);
    dateToCompare.setHours(0, 0, 0, 0);

    if (dateToCompare.getTime() > today.getTime()) {
      setFutureDateDialogOpen(true);
      return;
    }

    void handleSubmit();
  }, [user, selectedActivity, entryDate, handleSubmit]);

  const handleConfirmFutureDate = useCallback(() => {
    setFutureDateDialogOpen(false);
    void handleSubmit();
  }, [handleSubmit]);

  const handleCancelFutureDate = useCallback(() => {
    setFutureDateDialogOpen(false);
  }, []);

  const getAgeFromBirthdate = useCallback((birthdate: string | undefined): number | null => {
    if (!birthdate) return null;
    try {
      const [month, day, year] = birthdate.split('/').map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  }, []);

  const handleGenerateReport = useCallback(async () => {
    const element = reportSectionRef.current;
    if (!element) return;

    setReportGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 20;

      // Title
      doc.setFontSize(18);
      doc.text('Performance Report', margin, y);
      y += 12;

      // Athlete summary
      doc.setFontSize(11);
      const athleteName = userNames.length === 1 ? userNames[0] : userNames.join(', ');
      doc.text(`Athlete(s): ${athleteName}`, margin, y);
      y += 7;

      if (userNames.length === 1) {
        const genderLabel = userGender ? `Gender: ${userGender}` : null;
        const age = getAgeFromBirthdate(userBirthdate);
        const ageLabel = age !== null ? `Age: ${age} years` : null;
        const parts = [genderLabel, ageLabel].filter(Boolean);
        if (parts.length > 0) {
          doc.text(parts.join('  |  '), margin, y);
          y += 7;
        }
      }

      if (selectedActivities.length > 0) {
        doc.text(`Activities: ${selectedActivities.sort((a, b) => a.localeCompare(b)).join(', ')}`, margin, y);
        y += 10;
      }

      y += 4;

      // Capture chart + history section
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - y - margin;

      let imgWidth = (canvas.width * maxWidth) / canvas.width;
      let imgHeight = (canvas.height * maxWidth) / canvas.width;

      if (imgHeight > maxHeight) {
        const scale = maxHeight / imgHeight;
        imgHeight = maxHeight;
        imgWidth = imgWidth * scale;
      }

      doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);

      const fileName = userNames.length === 1
        ? `performance-report-${userNames[0].replace(/\s+/g, '-')}.pdf`
        : 'performance-report.pdf';
      doc.save(fileName);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate PDF report.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setReportGenerating(false);
    }
  }, [userNames, userGender, userBirthdate, selectedActivities, getAgeFromBirthdate]);

  const onReportClick = useCallback(() => {
    void handleGenerateReport();
  }, [handleGenerateReport]);

  const renderSelectedActivities = useCallback((selected: string[]) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {selected.sort((a, b) => a.localeCompare(b)).map((value) => (
        <Chip
          key={value}
          label={value}
          data-activity={value}
          onMouseDown={handleActivityChipMouseDown}
          sx={{ cursor: 'pointer' }}
        />
      ))}
    </Box>
  ), [handleActivityChipMouseDown]);

  // Don't render anything if no users are selected - let parent handle the message
  if (userNames.length === 0) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ mt: { xs: 2, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
          Activity Tracker
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
          {userNames.length === 1 ? (
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

        <Grid container spacing={{ xs: 2, md: 3 }}>
          {/* Top Row - Add Activity and Filter Activities */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: 2, md: 4 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                Add New Activity
              </Typography>
              <form onSubmit={handleFormSubmit}>
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

                {selectedActivity ? (
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
                      onChange={handleValueChange}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                  )
                ) : null}

                {/* Date input for entry date */}
                <TextField
                  label="Date"
                  type="date"
                  value={entryDate}
                  onChange={handleEntryDateChange}
                  inputRef={dateInputRef}
                  fullWidth
                  sx={{ mb: 2 }}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <CalendarToday 
                          sx={{ color: 'action.active', cursor: 'pointer' }} 
                          onClick={handleCalendarIconClick}
                        />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Click the calendar icon to select a date"
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={!selectedActivity || !value.value1}
                  sx={{ minHeight: 48, fontSize: { xs: '0.95rem', md: '1rem' } }}
                >
                  Track Activity
                </Button>
              </form>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: 2, md: 4 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                Filter Activities
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Activities</InputLabel>
                <Select
                  multiple
                  value={selectedActivities}
                  onChange={handleSelectedActivitiesChange}
                  input={<OutlinedInput label="Select Activities" />}
                  renderValue={renderSelectedActivities}
                  MenuProps={MenuProps}
                >
                  {activities.slice().sort((a, b) => a.localeCompare(b)).map((act) => (
                    <MenuItem key={act} value={act}>
                      {act}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={onReportClick}
                disabled={selectedActivities.length === 0 || reportGenerating}
                fullWidth
                sx={{ minHeight: 44 }}
              >
                {reportGenerating ? 'Generating…' : 'Generate Report (PDF)'}
              </Button>
            </Paper>
          </Grid>

          {/* Personal Records - only for single user */}
          {userNames.length === 1 && (
            <Grid item xs={12}>
              <PersonalRecords
                results={results}
                userName={userNames[0]}
                activityPrDirection={activityPrDirection}
              />
            </Grid>
          )}

          {/* Chart and History - wrapped for PDF report capture */}
          <Grid item xs={12}>
            <Box ref={reportSectionRef}>
              <ActivityGraph 
                results={filteredResults}
                selectedActivities={selectedActivities}
              />
              <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: 2, md: 4 }, mt: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
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
                      onClick={handleSortDate}
                      sx={{ textTransform: 'none' }}
                    >
                      Date {sortField === 'date' ? (
                        sortDirection === 'desc' ? <ArrowDownward /> : <ArrowUpward />
                      ) : null}
                    </ToggleButton>
                    <ToggleButton 
                      value="value"
                      onClick={handleSortValue}
                      sx={{ textTransform: 'none' }}
                    >
                      Value {sortField === 'value' ? (
                        sortDirection === 'desc' ? <ArrowDownward /> : <ArrowUpward />
                      ) : null}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>

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
                              Value: {formatActivityValueDisplay(result.activity, result.value)} |
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
            </Box>
          </Grid>
        </Grid>

        {prCelebration ? (
          <Alert
            severity="success"
            icon={<EmojiEvents sx={{ color: '#FFD700' }} />}
            sx={{
              mt: 2,
              bgcolor: 'rgba(255, 215, 0, 0.12)',
              border: '2px solid #FFD700',
              '& .MuiAlert-message': { fontWeight: 'bold', fontSize: '1.1rem' }
            }}
          >
            New Personal Record for {prCelebration}!
          </Alert>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
        
        {success && !prCelebration ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Activity tracked successfully!
          </Alert>
        ) : null}
      </Box>

      {/* Future date confirmation dialog */}
      <Dialog
        open={futureDateDialogOpen}
        onClose={handleCancelFutureDate}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Future Date</DialogTitle>
        <DialogContent>
          <Typography>
            The selected date is in the future. Do you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelFutureDate}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmFutureDate}
            color="primary"
            variant="contained"
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActivityTracker; 