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
  TableSortLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Tab,
  Tabs,
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon, Person as PersonIcon, LocalOffer as TagIcon } from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, deleteDoc, orderBy, query, getDoc, setDoc, where } from 'firebase/firestore';
import { db, logAnalyticsEvent } from '../firebase';
import ActivityLeaderboard from './ActivityLeaderboard';
import { ACTIVITIES } from './ActivityTracker';
import { auth } from '../firebase';
import { ANALYTICS_EVENTS } from '../constants/analytics';

interface Result {
  id: string;
  activity: string;
  value: number;
  date: string;
  userName: string;
}

type SortField = 'userName' | 'activity' | 'date' | 'value';
type SortDirection = 'asc' | 'desc';

interface AdminPanelProps {
  onBack: () => void;
  onUserDeleted?: () => void;
}

interface User {
  id: string;
  name: string;
  createdAt: string;
  tags?: string[];
  gender?: string;
  birthdate?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onUserDeleted }) => {
  const [results, setResults] = useState<Result[]>([]);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [addActivityDialog, setAddActivityDialog] = useState(false);
  const [newActivity, setNewActivity] = useState('');
  const [removeActivityDialog, setRemoveActivityDialog] = useState(false);
  const [activities, setActivities] = useState<string[]>(ACTIVITIES);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);
  const [editTagsDialog, setEditTagsDialog] = useState(false);
  const [selectedUserForTags, setSelectedUserForTags] = useState<User | null>(null);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [editUserGender, setEditUserGender] = useState<string>('');
  const [editUserBirthdate, setEditUserBirthdate] = useState<string>('');

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
      const oldValue = selectedResult.value;
      await updateDoc(resultRef, {
        value: Number(editValue)
      });

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'edit_result',
        resultId: selectedResult.id,
        activity: selectedResult.activity,
        userName: selectedResult.userName,
        oldValue,
        newValue: Number(editValue)
      });

      setEditDialog(false);
      await loadAllResults();
      setError(null);
    } catch (err) {
      console.error('Error updating result:', err);
      setError('Failed to update result. Please try again.');
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    try {
      const resultRef = doc(db, 'results', resultId);
      const resultDoc = await getDoc(resultRef);
      const resultData = resultDoc.data();
      
      await deleteDoc(resultRef);
      
      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'delete_result',
        resultId,
        activity: resultData?.activity,
        userName: resultData?.userName,
        value: resultData?.value
      });
      
      await loadAllResults();
    } catch (error) {
      console.error('Error deleting result:', error);
      setError('Failed to delete result. Please try again.');
    }
  };

  const handleLogin = async () => {
    try {
      // Get the current user's ID token
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in to access admin features');
        return;
      }

      // Call the setAdminClaim function with the correct URL
      const response = await fetch('https://setadminclaim-liblf2ovdq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          adminPassword: password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set admin claim');
      }

      // Force token refresh to get the new claims
      await user.getIdToken(true);
      
      // Get the fresh token and verify admin claim
      const idTokenResult = await user.getIdTokenResult();
      
      if (idTokenResult.claims.admin) {
        setIsAuthenticated(true);
        setError(null);
      } else {
        throw new Error('Admin claim not set after successful response');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to authenticate as admin');
      setIsAuthenticated(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setResults([]);
    setError(null);
  };

  const handleAddActivity = async () => {
    if (!newActivity.trim()) return;

    try {
      const activitiesRef = doc(db, 'config', 'activities');
      const newActivities = [...activities, newActivity.trim()];
      await setDoc(activitiesRef, { list: newActivities });

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'add_activity',
        activityName: newActivity.trim(),
        totalActivities: newActivities.length
      });

      setActivities(newActivities);
      setNewActivity('');
      setAddActivityDialog(false);
    } catch (error) {
      console.error('Error adding activity:', error);
      setError('Failed to add activity. Please try again.');
    }
  };

  const handleDeleteActivity = async (activity: string) => {
    try {
      const activitiesRef = doc(db, 'config', 'activities');
      const newActivities = activities.filter(a => a !== activity);
      await setDoc(activitiesRef, { list: newActivities });

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'delete_activity',
        activityName: activity,
        totalActivities: newActivities.length
      });

      setActivities(newActivities);
      setRemoveActivityDialog(false);
    } catch (error) {
      console.error('Error deleting activity:', error);
      setError('Failed to delete activity. Please try again.');
    }
  };

  // Load activities from Firebase on component mount
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const activitiesRef = doc(db, 'config', 'activities');
        const activitiesDoc = await getDoc(activitiesRef);
        if (activitiesDoc.exists()) {
          setActivities(activitiesDoc.data().list);
        } else {
          // Initialize activities in Firebase if they don't exist
          await setDoc(activitiesRef, { list: ACTIVITIES });
        }
      } catch (err) {
        console.error('Error loading activities:', err);
        setError('Failed to load activities. Please try again.');
      }
    };

    if (isAuthenticated) {
      loadActivities();
    }
  }, [isAuthenticated]);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      const loadedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(loadedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated]);

  const handleDeleteUser = async (user: User) => {
    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', user.id));
      
      // Delete all user's results
      const resultsRef = collection(db, 'results');
      const q = query(resultsRef, where('userName', '==', user.name));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'delete_user',
        userId: user.id,
        userName: user.name,
        resultsDeleted: querySnapshot.size
      });

      setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
      setConfirmDeleteUser(null);
      if (onUserDeleted) onUserDeleted();
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user. Please try again.');
    }
  };

  const handleEditTags = (user: User) => {
    setSelectedUserForTags(user);
    setUserTags(user.tags || []);
    setNewTag('');
    setEditTagsDialog(true);
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !userTags.includes(tag)) {
      setUserTags([...userTags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setUserTags(userTags.filter(tag => tag !== tagToRemove));
  };

  const handleSaveTags = async () => {
    if (!selectedUserForTags) return;

    try {
      const userRef = doc(db, 'users', selectedUserForTags.id);
      await updateDoc(userRef, {
        tags: userTags
      });

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'update_user_tags',
        userId: selectedUserForTags.id,
        userName: selectedUserForTags.name,
        tags: userTags
      });

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === selectedUserForTags.id ? { ...u, tags: userTags } : u
        )
      );

      setEditTagsDialog(false);
      setSelectedUserForTags(null);
      setUserTags([]);
      setNewTag('');
    } catch (error) {
      console.error('Error updating tags:', error);
      setError('Failed to update tags. Please try again.');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUserForEdit(user);
    setEditUserGender(user.gender || '');
    setEditUserBirthdate(user.birthdate || '');
    setEditUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUserForEdit) return;

    try {
      const userRef = doc(db, 'users', selectedUserForEdit.id);
      const updateData: any = {};
      
      if (editUserGender) {
        updateData.gender = editUserGender;
      } else {
        updateData.gender = null; // Remove gender if empty
      }
      
      if (editUserBirthdate) {
        // Validate birthdate format
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (dateRegex.test(editUserBirthdate)) {
          updateData.birthdate = editUserBirthdate;
        } else {
          setError('Birthdate must be in MM/DD/YYYY format');
          return;
        }
      } else {
        updateData.birthdate = null; // Remove birthdate if empty
      }
      
      await updateDoc(userRef, updateData);

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'update_user_info',
        userId: selectedUserForEdit.id,
        userName: selectedUserForEdit.name
      });

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === selectedUserForEdit.id ? { 
            ...u, 
            gender: editUserGender || undefined,
            birthdate: editUserBirthdate || undefined
          } : u
        )
      );

      setEditUserDialog(false);
      setSelectedUserForEdit(null);
      setEditUserGender('');
      setEditUserBirthdate('');
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <IconButton onClick={onBack} color="primary">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h2">
              Admin Login
            </Typography>
          </Box>
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
      <Box sx={{ mt: 4, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onBack} color="primary">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Admin Panel
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="Activity History" />
          <Tab label="Users" />
          <Tab label="Activities" />
        </Tabs>
      </Box>

      {selectedTab === 0 && (
        <>
          <ActivityLeaderboard />
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              All Activities Log
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
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
                          onClick={() => handleDeleteResult(result.id)}
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
        </>
      )}

      {selectedTab === 1 && (
        <Paper elevation={3} sx={{ borderRadius: 4 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User Name</TableCell>
                  <TableCell>Gender</TableCell>
                  <TableCell>Birthdate</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.gender || '-'}</TableCell>
                    <TableCell>{user.birthdate || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {user.tags && user.tags.length > 0 ? (
                          user.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No tags
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          startIcon={<EditIcon />}
                          color="primary"
                          onClick={() => handleEditUser(user)}
                          size="small"
                        >
                          Edit
                        </Button>
                        <Button
                          startIcon={<TagIcon />}
                          color="primary"
                          onClick={() => handleEditTags(user)}
                          size="small"
                        >
                          Tags
                        </Button>
                        <Button
                          startIcon={<DeleteIcon />}
                          color="error"
                          onClick={() => setConfirmDeleteUser(user)}
                          size="small"
                        >
                          Remove
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {selectedTab === 2 && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Manage Activities</Typography>
            <Button
              variant="contained"
              onClick={() => setAddActivityDialog(true)}
            >
              Add Activity
            </Button>
          </Box>
          <List>
            {activities.map((activity) => (
              <ListItem key={activity}>
                <ListItemText primary={activity} />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteActivity(activity)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Confirm Delete User Dialog */}
      <Dialog
        open={Boolean(confirmDeleteUser)}
        onClose={() => setConfirmDeleteUser(null)}
      >
        <DialogTitle>Confirm User Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {confirmDeleteUser?.name}? This will permanently delete:
          </Typography>
          <Box component="ul" sx={{ mt: 1 }}>
            <li>The user's profile</li>
            <li>All of their activity history</li>
          </Box>
          <Typography color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteUser(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => confirmDeleteUser && handleDeleteUser(confirmDeleteUser)}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog 
        open={addActivityDialog} 
        onClose={() => setAddActivityDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Activity</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Activity name formats:
            • Single unit: "Activity (unit)" - e.g., "Running (km)", "Deadlift (lbs)"
            • Compound units: "Activity (unit1/unit2)" - e.g., "Height (ft/in)", "Duration (min/sec)"
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Activity Name"
            fullWidth
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
            placeholder="e.g., Running (km) or Height (ft/in)"
            helperText="For compound units, use format: Activity (unit1/unit2)"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddActivityDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddActivity} 
            color="primary"
            disabled={!newActivity.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Activity Dialog */}
      <Dialog
        open={removeActivityDialog}
        onClose={() => setRemoveActivityDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove Activity</DialogTitle>
        <DialogContent>
          <List>
            {activities.map((activity) => (
              <ListItem key={activity}>
                <ListItemText primary={activity} />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteActivity(activity)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveActivityDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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

      {/* Edit Tags Dialog */}
      <Dialog
        open={editTagsDialog}
        onClose={() => {
          setEditTagsDialog(false);
          setSelectedUserForTags(null);
          setUserTags([]);
          setNewTag('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Tags for {selectedUserForTags?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Add tags to group users (e.g., #teamstars2025, #event2025). Tags are case-sensitive.
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="New Tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="e.g., #teamstars2025"
              />
              <Button
                variant="contained"
                onClick={handleAddTag}
                disabled={!newTag.trim() || userTags.includes(newTag.trim())}
              >
                Add
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: 60, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {userTags.length > 0 ? (
                userTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    color="primary"
                    variant="outlined"
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tags added yet
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditTagsDialog(false);
              setSelectedUserForTags(null);
              setUserTags([]);
              setNewTag('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveTags} color="primary" variant="contained">
            Save Tags
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editUserDialog}
        onClose={() => {
          setEditUserDialog(false);
          setSelectedUserForEdit(null);
          setEditUserGender('');
          setEditUserBirthdate('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit User: {selectedUserForEdit?.name}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Gender</InputLabel>
            <Select
              value={editUserGender}
              label="Gender"
              onChange={(e: SelectChangeEvent) => setEditUserGender(e.target.value)}
            >
              <MenuItem value="">Not specified</MenuItem>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Non-Binary">Non-Binary</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Birthdate"
            placeholder="MM/DD/YYYY"
            value={editUserBirthdate}
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
                setEditUserBirthdate(value);
              }
            }}
            helperText="Format: MM/DD/YYYY (e.g., 01/15/2000)"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditUserDialog(false);
              setSelectedUserForEdit(null);
              setEditUserGender('');
              setEditUserBirthdate('');
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveUser} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel; 