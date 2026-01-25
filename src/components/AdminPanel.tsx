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
  Tab,
  Tabs,
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Checkbox
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon, LocalOffer as TagIcon } from '@mui/icons-material';
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
  firstName: string;
  lastName: string;
  createdAt: string;
  tags?: string[];
  gender?: string;
  birthdate?: string;
}

// Helper function to get full name
const getFullName = (user: User | null): string => {
  if (!user) return '';
  return `${user.firstName} ${user.lastName}`.trim();
};

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
  const [allExistingTags, setAllExistingTags] = useState<string[]>([]);
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [editUserGender, setEditUserGender] = useState<string>('');
  const [editUserBirthdate, setEditUserBirthdate] = useState<string>('');
  const [editUserFirstName, setEditUserFirstName] = useState<string>('');
  const [editUserLastName, setEditUserLastName] = useState<string>('');
  const [editActivityDialog, setEditActivityDialog] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<string | null>(null);
  const [editActivityName, setEditActivityName] = useState('');
  const [editTagDialog, setEditTagDialog] = useState(false);
  const [tagToEdit, setTagToEdit] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAddTagDialog, setBulkAddTagDialog] = useState(false);
  const [bulkTagToAdd, setBulkTagToAdd] = useState<string>('');
  const [addTagDialog, setAddTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState<string>('');

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
      void loadAllResults();
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
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error ?? 'Failed to set admin claim');
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

  const handleEditActivity = (activity: string) => {
    setActivityToEdit(activity);
    setEditActivityName(activity);
    setEditActivityDialog(true);
  };

  const handleSaveActivity = async () => {
    if (!activityToEdit || !editActivityName.trim()) return;

    const newName = editActivityName.trim();
    if (newName === activityToEdit) {
      setEditActivityDialog(false);
      return;
    }

    try {
      // 1. Update activity list in config
      const activitiesRef = doc(db, 'config', 'activities');
      const newActivities = activities.map(a => a === activityToEdit ? newName : a);
      await setDoc(activitiesRef, { list: newActivities });

      // 2. Update all results with this activity name
      const resultsRef = collection(db, 'results');
      const q = query(resultsRef, where('activity', '==', activityToEdit));
      const querySnapshot = await getDocs(q);

      const updatePromises = querySnapshot.docs.map(doc => updateDoc(doc.ref, { activity: newName }));
      await Promise.all(updatePromises);

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'edit_activity',
        oldName: activityToEdit,
        newName: newName,
        resultsUpdated: querySnapshot.size
      });

      // Update local state
      setActivities(newActivities);
      setEditActivityDialog(false);
      setActivityToEdit(null);
      setEditActivityName('');

      // Reload results to reflect changes in the table
      await loadAllResults();
    } catch (error) {
      console.error('Error updating activity:', error);
      setError('Failed to update activity. Please try again.');
    }
  };

  // Load activities from Firebase on component mount
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const activitiesRef = doc(db, 'config', 'activities');
        const activitiesDoc = await getDoc(activitiesRef);
        if (activitiesDoc.exists()) {
          const data = activitiesDoc.data();
          if (data && 'list' in data && Array.isArray(data.list)) {
            setActivities(data.list as string[]);
          }
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
      void loadActivities();
    }
  }, [isAuthenticated]);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const loadedUsers = querySnapshot.docs.map(doc => {
        const data = doc.data() as {
          firstName?: string;
          lastName?: string;
          name?: string;
          createdAt?: string;
          tags?: string[];
          gender?: string;
          birthdate?: string;
        };
        // Handle migration: support both old and new format
        let firstName = data.firstName ?? '';
        let lastName = data.lastName ?? '';
        
        if (!firstName && !lastName && data.name) {
          const nameStr = String(data.name);
          const parts = nameStr.trim().split(/\s+/);
          if (parts.length === 1) {
            firstName = parts[0] ?? '';
            lastName = '';
          } else if (parts.length > 1) {
            lastName = parts[parts.length - 1] ?? '';
            firstName = parts.slice(0, -1).join(' ');
          }
        }
        
        return {
          id: doc.id,
          firstName,
          lastName,
          createdAt: data.createdAt ?? new Date().toISOString(),
          tags: data.tags ?? [],
          gender: data.gender,
          birthdate: data.birthdate
        };
      }) as User[];
      
      // Sort by last name, then first name
      loadedUsers.sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });
      
      setUsers(loadedUsers);
      
      // Extract all unique tags from all users
      const allTags = Array.from(
        new Set(loadedUsers.flatMap(user => user.tags ?? []))
      ).sort();
      setAllExistingTags(allTags);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    }
  };
  useEffect(() => {
    if (isAuthenticated) {
      void loadUsers();
    }
  }, [isAuthenticated]);

  const handleDeleteUser = async (user: User) => {
    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', user.id));

      // Delete all user's results
      const resultsRef = collection(db, 'results');
      const q = query(resultsRef, where('userName', '==', getFullName(user)));
      const querySnapshot = await getDocs(q);

      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'delete_user',
        userId: user.id,
        userName: getFullName(user),
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
    setUserTags(user.tags ?? []);
    setEditTagsDialog(true);
  };

  const handleEditTag = (tag: string) => {
    setTagToEdit(tag);
    setEditTagName(tag);
    setEditTagDialog(true);
  };

  const handleSaveTag = async () => {
    if (!tagToEdit || !editTagName.trim()) return;

    const newName = editTagName.trim();
    if (newName === tagToEdit) {
      setEditTagDialog(false);
      return;
    }

    try {
      // Find all users with this tag
      const usersWithTag = users.filter(user => user.tags?.includes(tagToEdit));
      
      if (usersWithTag.length === 0) {
        setEditTagDialog(false);
        return;
      }

      // Update all users with this tag
      const updatePromises = usersWithTag.map(user => {
        const userRef = doc(db, 'users', user.id);
        const updatedTags = user.tags!.map(tag => tag === tagToEdit ? newName : tag);
        return updateDoc(userRef, { tags: updatedTags });
      });

      await Promise.all(updatePromises);

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'rename_tag',
        oldName: tagToEdit,
        newName: newName,
        usersUpdated: usersWithTag.length
      });

      // Reload users to reflect changes
      await loadUsers();
      
      setEditTagDialog(false);
      setTagToEdit(null);
      setEditTagName('');
    } catch (error) {
      console.error('Error renaming tag:', error);
      setError('Failed to rename tag. Please try again.');
    }
  };

  const handleDeleteTag = async (tag: string) => {
    try {
      // Find all users with this tag
      const usersWithTag = users.filter(user => user.tags?.includes(tag));
      
      if (usersWithTag.length === 0) {
        setConfirmDeleteTag(null);
        return;
      }

      // Remove tag from all users
      const updatePromises = usersWithTag.map(user => {
        const userRef = doc(db, 'users', user.id);
        const updatedTags = user.tags!.filter(t => t !== tag);
        return updateDoc(userRef, { tags: updatedTags });
      });

      await Promise.all(updatePromises);

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'delete_tag',
        tagName: tag,
        usersUpdated: usersWithTag.length
      });

      // Reload users to reflect changes
      await loadUsers();
      
      setConfirmDeleteTag(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError('Failed to delete tag. Please try again.');
    }
  };

  const handleToggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkAddTag = async () => {
    if (!bulkTagToAdd.trim() || selectedUsers.size === 0) return;

    const tagToAdd = bulkTagToAdd.trim();

    try {
      const selectedUserObjects = users.filter(user => selectedUsers.has(user.id));
      const updatePromises = selectedUserObjects.map(user => {
        const userRef = doc(db, 'users', user.id);
        const currentTags = user.tags ?? [];
        // Only add tag if it doesn't already exist
        if (!currentTags.includes(tagToAdd)) {
          const updatedTags = [...currentTags, tagToAdd];
          return updateDoc(userRef, { tags: updatedTags });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'bulk_add_tag',
        tagName: tagToAdd,
        usersUpdated: selectedUsers.size
      });

      // Reload users to reflect changes
      await loadUsers();
      
      setBulkAddTagDialog(false);
      setBulkTagToAdd('');
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Error adding tag to users:', error);
      setError('Failed to add tag to users. Please try again.');
    }
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    const tagName = newTagName.trim();

    // Check if tag already exists
    if (allExistingTags.includes(tagName)) {
      setError(`Tag "${tagName}" already exists.`);
      return;
    }

    // Close the add tag dialog and open bulk add dialog with the tag pre-filled
    // This allows them to immediately assign it to users
    setAddTagDialog(false);
    setBulkTagToAdd(tagName);
    setNewTagName('');
    
    // Switch to Users tab and open bulk add dialog
    setSelectedTab(1);
    // Small delay to ensure tab switch completes
    setTimeout(() => {
      setBulkAddTagDialog(true);
    }, 100);
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
        userName: getFullName(selectedUserForTags),
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
    } catch (error) {
      console.error('Error updating tags:', error);
      setError('Failed to update tags. Please try again.');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUserForEdit(user);
    setEditUserFirstName(user.firstName ?? '');
    setEditUserLastName(user.lastName ?? '');
    setEditUserGender(user.gender ?? '');
    setEditUserBirthdate(user.birthdate ?? '');
    setEditUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUserForEdit) return;
  
    const newFirstName = editUserFirstName.trim();
    const newLastName = editUserLastName.trim();
    
    if (!newFirstName) {
      setError('Please enter a first name');
      return;
    }
  
    try {
      const userRef = doc(db, 'users', selectedUserForEdit.id);
      const updateData: Partial<User> & { gender?: string; birthdate?: string } = {};
  
      const oldFullName = getFullName(selectedUserForEdit);
      const newFullName = `${newFirstName} ${newLastName}`.trim();
  
      if (newFirstName !== selectedUserForEdit.firstName || newLastName !== selectedUserForEdit.lastName) {
        updateData.firstName = newFirstName;
        updateData.lastName = newLastName;
      }
  
      if (editUserGender) {
        updateData.gender = editUserGender;
      } else {
        updateData.gender = undefined;
      }
  
      if (editUserBirthdate) {
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (dateRegex.test(editUserBirthdate)) {
          updateData.birthdate = editUserBirthdate;
        } else {
          setError('Birthdate must be in MM/DD/YYYY format');
          return;
        }
      } else {
        updateData.birthdate = undefined;
      }
  
      await updateDoc(userRef, updateData);
  
      // If name changed, update all results
      if (oldFullName !== newFullName) {
        const resultsRef = collection(db, 'results');
        const q = query(resultsRef, where('userName', '==', oldFullName));
        const querySnapshot = await getDocs(q);
  
        const updatePromises = querySnapshot.docs.map(doc => 
          updateDoc(doc.ref, { 
            userName: newFullName,
            userFirstName: newFirstName,
            userLastName: newLastName
          })
        );
        await Promise.all(updatePromises);
      }
  
      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'update_user_info',
        userId: selectedUserForEdit.id,
        userName: oldFullName,
        newName: newFullName
      });
  
      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === selectedUserForEdit.id ? {
            ...u,
            firstName: newFirstName,
            lastName: newLastName,
            gender: editUserGender ?? undefined,
            birthdate: editUserBirthdate ?? undefined
          } : u
        )
      );
  
      // Reload results if name changed to ensure consistency in the table
      if (oldFullName !== newFullName) {
        await loadAllResults();
      }
  
      setEditUserDialog(false);
      setSelectedUserForEdit(null);
      setEditUserFirstName('');
      setEditUserLastName('');
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
          <Box component="form" onSubmit={(e) => { e.preventDefault(); void handleLogin(); }}>
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleLogin(); } }}
              margin="normal"
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => { void handleLogin(); }}
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
          <Tab label="Tags" />
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
                          onClick={() => { handleEdit(result); }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => { void handleDeleteResult(result.id); }}
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
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Users {selectedUsers.size > 0 && `(${selectedUsers.size} selected)`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedUsers.size > 0 && (
                <Button
                  variant="contained"
                  startIcon={<TagIcon />}
                  onClick={() => setBulkAddTagDialog(true)}
                >
                  Add Tag to Selected
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleSelectAllUsers}
              >
                {selectedUsers.size === users.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedUsers.size > 0 && selectedUsers.size < users.length}
                      checked={users.length > 0 && selectedUsers.size === users.length}
                      onChange={handleSelectAllUsers}
                    />
                  </TableCell>
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
                  <TableRow key={user.id} selected={selectedUsers.has(user.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleToggleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>{getFullName(user)}</TableCell>
                    <TableCell>{user.gender ?? '-'}</TableCell>
                    <TableCell>{user.birthdate ?? '-'}</TableCell>
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
                    aria-label="edit"
                    onClick={() => handleEditActivity(activity)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
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

      {selectedTab === 3 && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Manage Tags</Typography>
            <Button
              variant="contained"
              startIcon={<TagIcon />}
              onClick={() => setAddTagDialog(true)}
            >
              Add Tag
            </Button>
          </Box>
          {allExistingTags.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No tags exist yet. Click &quot;Add Tag&quot; to create your first tag.
            </Typography>
          ) : (
            <List>
              {allExistingTags.map((tag) => {
                // Count how many users have this tag
                const userCount = users.filter(user => user.tags?.includes(tag)).length;
                return (
                  <ListItem key={tag}>
                    <ListItemText 
                      primary={tag}
                      secondary={`Used by ${userCount} user${userCount !== 1 ? 's' : ''}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleEditTag(tag)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => setConfirmDeleteTag(tag)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
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
            Are you sure you want to remove {confirmDeleteUser ? getFullName(confirmDeleteUser) : ''}? This will permanently delete:
          </Typography>
          <Box component="ul" sx={{ mt: 1 }}>
            <li>The user&apos;s profile</li>
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
            onClick={() => { if (confirmDeleteUser) { void handleDeleteUser(confirmDeleteUser); } }}
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
            • Single unit: &quot;Activity (unit)&quot; - e.g., &quot;Running (km)&quot;, &quot;Deadlift (lbs)&quot;
            • Compound units: &quot;Activity (unit1/unit2)&quot; - e.g., &quot;Height (ft/in)&quot;, &quot;Duration (min/sec)&quot;
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
            onClick={() => { void handleAddActivity(); }}
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
          <Button onClick={() => { void handleSaveEdit(); }} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Tags Dialog */}
      <Dialog
        open={editTagsDialog && selectedUserForTags !== null}
        onClose={() => {
          setEditTagsDialog(false);
          setSelectedUserForTags(null);
          setUserTags([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Tags for {selectedUserForTags ? getFullName(selectedUserForTags) : ''}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Add tags to group users (e.g., #teamstars2026, #event2026). Tags are case-sensitive. Existing tags are shown as suggestions.
          </Typography>

          <Autocomplete
            multiple
            freeSolo
            options={allExistingTags}
            value={userTags}
            onChange={(event, newValue) => {
              setUserTags(newValue);
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                  color="primary"
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder="Type to add tags or select existing"
                helperText="Select from existing tags or type to create a new one"
              />
            )}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditTagsDialog(false);
              setSelectedUserForTags(null);
              setUserTags([]);
            }}
          >
            Cancel
          </Button>
          <Button onClick={() => { void handleSaveTags(); }} color="primary" variant="contained">
            Save Tags
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editUserDialog && selectedUserForEdit !== null}
        onClose={() => {
          setEditUserDialog(false);
          setSelectedUserForEdit(null);
          setEditUserFirstName('');
          setEditUserLastName('');
          setEditUserGender('');
          setEditUserBirthdate('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit User: {selectedUserForEdit ? getFullName(selectedUserForEdit) : ''}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="First Name *"
            value={editUserFirstName}
            onChange={(e) => setEditUserFirstName(e.target.value)}
            margin="dense"
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Last Name"
            value={editUserLastName}
            onChange={(e) => setEditUserLastName(e.target.value)}
            margin="dense"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
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
              setEditUserFirstName('');
              setEditUserLastName('');
              setEditUserGender('');
              setEditUserBirthdate('');
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={() => { void handleSaveUser(); }} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* Edit Activity Dialog */}
      <Dialog
        open={editActivityDialog}
        onClose={() => setEditActivityDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Renaming an activity will update all existing records for this activity.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Activity Name"
            fullWidth
            value={editActivityName}
            onChange={(e) => setEditActivityName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditActivityDialog(false)}>Cancel</Button>
          <Button
            onClick={() => { void handleSaveActivity(); }}
            color="primary"
            variant="contained"
            disabled={!editActivityName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog
        open={editTagDialog}
        onClose={() => {
          setEditTagDialog(false);
          setTagToEdit(null);
          setEditTagName('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rename Tag</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Renaming this tag will update all users that have this tag.
          </Typography>
          {tagToEdit && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Current tag: <strong>{tagToEdit}</strong>
            </Typography>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="New Tag Name"
            fullWidth
            value={editTagName}
            onChange={(e) => setEditTagName(e.target.value)}
            helperText="This will update all users with this tag"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditTagDialog(false);
              setTagToEdit(null);
              setEditTagName('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => { void handleSaveTag(); }}
            color="primary"
            variant="contained"
            disabled={!editTagName.trim() || editTagName.trim() === tagToEdit}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Tag Dialog */}
      <Dialog
        open={Boolean(confirmDeleteTag)}
        onClose={() => setConfirmDeleteTag(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Tag Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the tag <strong>&quot;{confirmDeleteTag}&quot;</strong>?
          </Typography>
          {confirmDeleteTag && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                This will remove the tag from all users that have it. The following users will be affected:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                {users
                  .filter(user => user.tags?.includes(confirmDeleteTag))
                  .slice(0, 10)
                  .map(user => (
                    <li key={user.id}>{getFullName(user)}</li>
                  ))}
                {users.filter(user => user.tags?.includes(confirmDeleteTag)).length > 10 && (
                  <li>
                    <Typography variant="body2" color="text.secondary">
                      ... and {users.filter(user => user.tags?.includes(confirmDeleteTag)).length - 10} more
                    </Typography>
                  </li>
                )}
              </Box>
            </Box>
          )}
          <Typography color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteTag(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { if (confirmDeleteTag) { void handleDeleteTag(confirmDeleteTag); } }}
          >
            Delete Tag
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Add Tag Dialog */}
      <Dialog
        open={bulkAddTagDialog}
        onClose={() => {
          setBulkAddTagDialog(false);
          setBulkTagToAdd('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Tag to Selected Users</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            This will add the tag to {selectedUsers.size} selected user{selectedUsers.size !== 1 ? 's' : ''}. 
            Existing tags are shown as suggestions.
          </Typography>
          <Autocomplete
            freeSolo
            options={allExistingTags}
            value={bulkTagToAdd}
            onChange={(event, newValue) => {
              setBulkTagToAdd(newValue ?? '');
            }}
            onInputChange={(event, newInputValue) => {
              setBulkTagToAdd(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tag"
                placeholder="Type to add tag or select existing"
                helperText="Select from existing tags or type to create a new one"
                autoFocus
              />
            )}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setBulkAddTagDialog(false);
              setBulkTagToAdd('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => { void handleBulkAddTag(); }}
            color="primary"
            variant="contained"
            disabled={!bulkTagToAdd.trim() || selectedUsers.size === 0}
          >
            Add Tag
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog
        open={addTagDialog}
        onClose={() => {
          setAddTagDialog(false);
          setNewTagName('');
          setError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Tag</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Create a new tag name. After creating, you&apos;ll be able to assign it to users.
          </Typography>
          <Autocomplete
            freeSolo
            options={allExistingTags}
            value={newTagName}
            onChange={(event, newValue) => {
              setNewTagName(newValue ?? '');
            }}
            onInputChange={(event, newInputValue) => {
              setNewTagName(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tag Name"
                placeholder="Enter tag name"
                helperText="Select from existing tags or type to create a new one"
                autoFocus
                error={allExistingTags.includes(newTagName.trim()) && newTagName.trim() !== ''}
              />
            )}
            sx={{ mt: 1 }}
          />
          {allExistingTags.includes(newTagName.trim()) && newTagName.trim() !== '' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This tag already exists.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddTagDialog(false);
              setNewTagName('');
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddTag}
            color="primary"
            variant="contained"
            disabled={!newTagName.trim() || allExistingTags.includes(newTagName.trim())}
          >
            Create & Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel; 