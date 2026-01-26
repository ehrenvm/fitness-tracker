import React, { useState, useEffect, useCallback } from 'react';
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
import { collection, getDocs, doc, updateDoc, deleteDoc, orderBy, query, getDoc, setDoc, where, Timestamp } from 'firebase/firestore';
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

  const loadAllResults = useCallback(async () => {
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
  }, []);

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

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadAllResults();
    }
  }, [isAuthenticated, loadAllResults]);

  useEffect(() => {
    console.log('Results updated:', results);
  }, [results]);

  const handleEdit = useCallback((result: Result) => {
    setSelectedResult(result);
    setEditValue(result.value.toString());
    setEditDialog(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
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
  }, [selectedResult, editValue, loadAllResults]);

  const handleDeleteResult = useCallback(async (resultId: string) => {
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
  }, [loadAllResults]);

  const handleLogin = useCallback(async () => {
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
  }, [password]);

  const handleAddActivity = useCallback(async () => {
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
  }, [newActivity, activities]);

  const handleDeleteActivity = useCallback(async (activity: string) => {
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
  }, [activities]);

  const handleEditActivity = useCallback((activity: string) => {
    setActivityToEdit(activity);
    setEditActivityName(activity);
    setEditActivityDialog(true);
  }, []);

  const handleSaveActivity = useCallback(async () => {
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
  }, [activityToEdit, editActivityName, activities, loadAllResults]);

  // Load activities from Firebase on component mount
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

  const loadTags = useCallback(async () => {
    try {
      const tagsRef = collection(db, 'tags');
      const querySnapshot = await getDocs(tagsRef);
      const tagsFromCollection = querySnapshot.docs.map(doc => doc.id);
      
      // Also extract tags from users (for backward compatibility with existing data)
      const tagsFromUsers = Array.from(
        new Set(users.flatMap(user => user.tags ?? []))
      );
      
      // Combine both sources and remove duplicates
      const allTags = Array.from(
        new Set([...tagsFromCollection, ...tagsFromUsers])
      ).sort();
      setAllExistingTags(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
      // Fallback to extracting from users only
      const tagsFromUsers = Array.from(
        new Set(users.flatMap(user => user.tags ?? []))
      ).sort();
      setAllExistingTags(tagsFromUsers);
    }
  }, [users]);

  const loadUsers = useCallback(async () => {
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
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated) {
      void loadUsers();
    }
  }, [isAuthenticated, loadUsers]);

  useEffect(() => {
    if (isAuthenticated && users.length > 0) {
      void loadTags();
    }
  }, [isAuthenticated, users, loadTags]);

  const handleDeleteUser = useCallback(async (user: User) => {
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
  }, [onUserDeleted]);

  const handleEditTags = useCallback((user: User) => {
    setSelectedUserForTags(user);
    setUserTags(user.tags ?? []);
    setEditTagsDialog(true);
  }, []);

  const handleEditTag = useCallback((tag: string) => {
    setTagToEdit(tag);
    setEditTagName(tag);
    setEditTagDialog(true);
  }, []);

  const handleSaveTag = useCallback(async () => {
    if (!tagToEdit || !editTagName.trim()) return;

    const newName = editTagName.trim();
    if (newName === tagToEdit) {
      setEditTagDialog(false);
      return;
    }

    // Check if new name already exists
    if (allExistingTags.includes(newName)) {
      setError(`Tag "${newName}" already exists.`);
      return;
    }

    try {
      // Find all users with this tag
      const usersWithTag = users.filter(user => user.tags?.includes(tagToEdit));

      // Update tag document in Firestore (delete old, create new)
      const oldTagRef = doc(db, 'tags', tagToEdit);
      const newTagRef = doc(db, 'tags', newName);
      
      // Get the old tag document to preserve createdAt if needed
      const oldTagDoc = await getDoc(oldTagRef);
      const oldTagData = oldTagDoc.data() as { createdAt?: Timestamp } | undefined;
      
      // Create new tag document
      await setDoc(newTagRef, {
        name: newName,
        createdAt: oldTagData?.createdAt ?? Timestamp.now()
      });
      
      // Delete old tag document
      await deleteDoc(oldTagRef);

      // Update all users with this tag
      if (usersWithTag.length > 0) {
        const updatePromises = usersWithTag.map(user => {
          const userRef = doc(db, 'users', user.id);
          // tags is guaranteed to exist because usersWithTag only contains users with the tag
          const updatedTags = (user.tags ?? []).map(tag => tag === tagToEdit ? newName : tag);
          return updateDoc(userRef, { tags: updatedTags });
        });

        await Promise.all(updatePromises);
      }

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'rename_tag',
        oldName: tagToEdit,
        newName: newName,
        usersUpdated: usersWithTag.length
      });

      // Reload tags and users to reflect changes
      await loadTags();
      await loadUsers();
      
      setEditTagDialog(false);
      setTagToEdit(null);
      setEditTagName('');
      setError(null);
    } catch (error) {
      console.error('Error renaming tag:', error);
      setError('Failed to rename tag. Please try again.');
    }
  }, [tagToEdit, editTagName, users, allExistingTags, loadTags, loadUsers]);

  const handleDeleteTag = useCallback(async (tag: string) => {
    try {
      // Find all users with this tag
      const usersWithTag = users.filter(user => user.tags?.includes(tag));

      // Remove tag from all users
      if (usersWithTag.length > 0) {
        const updatePromises = usersWithTag.map(user => {
          const userRef = doc(db, 'users', user.id);
          // tags is guaranteed to exist because usersWithTag only contains users with the tag
          const updatedTags = (user.tags ?? []).filter(t => t !== tag);
          return updateDoc(userRef, { tags: updatedTags });
        });

        await Promise.all(updatePromises);
      }

      // Delete tag document from Firestore
      const tagRef = doc(db, 'tags', tag);
      await deleteDoc(tagRef);

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'delete_tag',
        tagName: tag,
        usersUpdated: usersWithTag.length
      });

      // Reload tags and users to reflect changes
      await loadTags();
      await loadUsers();
      
      setConfirmDeleteTag(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError('Failed to delete tag. Please try again.');
    }
  }, [users, loadTags, loadUsers]);

  const handleToggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(userId)) {
        newSelected.delete(userId);
      } else {
        newSelected.add(userId);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAllUsers = useCallback(() => {
    setSelectedUsers(prev => {
      if (prev.size === users.length) {
        return new Set();
      } else {
        return new Set(users.map(u => u.id));
      }
    });
  }, [users]);

  const handleBulkAddTag = useCallback(async () => {
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
  }, [bulkTagToAdd, selectedUsers, users, loadUsers]);

  const handleAddTag = useCallback(async () => {
    if (!newTagName.trim()) return;

    const tagName = newTagName.trim();

    // Check if tag already exists
    if (allExistingTags.includes(tagName)) {
      setError(`Tag "${tagName}" already exists.`);
      return;
    }

    try {
      // Create tag document in Firestore (using tag name as document ID)
      const tagRef = doc(db, 'tags', tagName);
      await setDoc(tagRef, {
        name: tagName,
        createdAt: Timestamp.now()
      });

      logAnalyticsEvent(ANALYTICS_EVENTS.ADMIN_ACTION, {
        action: 'create_tag',
        tagName: tagName
      });

      // Reload tags to reflect the new tag
      await loadTags();
      
      // Close the dialog and clear the input
      setAddTagDialog(false);
      setNewTagName('');
      setError(null);
    } catch (error) {
      console.error('Error creating tag:', error);
      setError('Failed to create tag. Please try again.');
    }
  }, [newTagName, allExistingTags, loadTags]);

  const handleSaveTags = useCallback(async () => {
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
  }, [selectedUserForTags, userTags]);

  const handleEditUser = useCallback((user: User) => {
    setSelectedUserForEdit(user);
    // firstName and lastName are required fields, so no nullish coalescing needed
    setEditUserFirstName(user.firstName);
    setEditUserLastName(user.lastName);
    setEditUserGender(user.gender ?? '');
    setEditUserBirthdate(user.birthdate ?? '');
    setEditUserDialog(true);
  }, []);

  const handleSaveUser = useCallback(async () => {
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
            // Convert empty strings to undefined for optional fields
            gender: editUserGender || undefined,
            birthdate: editUserBirthdate || undefined
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
  }, [selectedUserForEdit, editUserFirstName, editUserLastName, editUserGender, editUserBirthdate, loadAllResults]);

  const handleLoginFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void handleLogin();
  }, [handleLogin]);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handlePasswordKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleLogin();
    }
  }, [handleLogin]);

  const handleLoginClick = useCallback(() => {
    void handleLogin();
  }, [handleLogin]);

  const handleTabChange = useCallback((_event: unknown, newValue: number) => {
    setSelectedTab(newValue);
  }, []);

  const createSortHandler = useCallback((field: SortField) => {
    return () => {
      handleSort(field);
    };
  }, [handleSort]);

  const createDeleteResultHandler = useCallback((resultId: string) => {
    return () => {
      void handleDeleteResult(resultId);
    };
  }, [handleDeleteResult]);

  const createEditResultHandler = useCallback((result: Result) => {
    return () => {
      handleEdit(result);
    };
  }, [handleEdit]);

  const createDeleteActivityHandler = useCallback((activity: string) => {
    return () => {
      setRemoveActivityDialog(true);
      void handleDeleteActivity(activity);
    };
  }, [handleDeleteActivity]);

  const createEditActivityHandler = useCallback((activity: string) => {
    return () => {
      handleEditActivity(activity);
    };
  }, [handleEditActivity]);

  const createDeleteUserHandler = useCallback((user: User) => {
    return () => {
      setConfirmDeleteUser(user);
    };
  }, []);

  const createEditUserHandler = useCallback((user: User) => {
    return () => {
      handleEditUser(user);
    };
  }, [handleEditUser]);

  const createEditTagsHandler = useCallback((user: User) => {
    return () => {
      handleEditTags(user);
    };
  }, [handleEditTags]);

  const createEditTagHandler = useCallback((tag: string) => {
    return () => {
      handleEditTag(tag);
    };
  }, [handleEditTag]);

  const createDeleteTagHandler = useCallback((tag: string) => {
    return () => {
      setConfirmDeleteTag(tag);
    };
  }, []);

  const handleCloseConfirmDeleteUser = useCallback(() => {
    setConfirmDeleteUser(null);
  }, []);

  const handleConfirmDeleteUser = useCallback(() => {
    if (confirmDeleteUser) {
      void handleDeleteUser(confirmDeleteUser);
    }
  }, [confirmDeleteUser, handleDeleteUser]);

  const handleCloseAddActivityDialog = useCallback(() => {
    setAddActivityDialog(false);
  }, []);

  const handleNewActivityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewActivity(e.target.value);
  }, []);

  const handleAddActivityClick = useCallback(() => {
    void handleAddActivity();
  }, [handleAddActivity]);

  const handleCloseRemoveActivityDialog = useCallback(() => {
    setRemoveActivityDialog(false);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialog(false);
  }, []);

  const handleEditValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  const handleSaveEditClick = useCallback(() => {
    void handleSaveEdit();
  }, [handleSaveEdit]);

  const handleCloseEditTagsDialog = useCallback(() => {
    setEditTagsDialog(false);
    setSelectedUserForTags(null);
    setUserTags([]);
  }, []);

  const handleUserTagsChange = useCallback((_event: unknown, newValue: string[]) => {
    setUserTags(newValue);
  }, []);

  const renderUserTags = useCallback((value: string[], getTagProps: (options: { index: number }) => { key: number; className: string; disabled: boolean; 'data-tag-index': number; tabIndex: number; onDelete: (event: unknown) => void }) => (
    value.map((option, index) => {
      const { key: _key, ...tagProps } = getTagProps({ index });
      return (
        <Chip
          variant="outlined"
          label={option}
          {...tagProps}
          key={option}
          color="primary"
        />
      );
    })
  ), []);

  const renderUserTagsInput = useCallback((params: unknown) => (
    <TextField
      {...(params as Record<string, unknown>)}
      label="Tags"
      placeholder="Select existing tags"
      helperText="Select from existing tags. To create new tags, go to the Tags panel."
    />
  ), []);

  const handleSaveTagsClick = useCallback(() => {
    void handleSaveTags();
  }, [handleSaveTags]);

  const handleCloseEditUserDialog = useCallback(() => {
    setEditUserDialog(false);
    setSelectedUserForEdit(null);
    setEditUserFirstName('');
    setEditUserLastName('');
    setEditUserGender('');
    setEditUserBirthdate('');
  }, []);

  const handleEditUserFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditUserFirstName(e.target.value);
  }, []);

  const handleEditUserLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditUserLastName(e.target.value);
  }, []);

  const handleEditUserGenderChange = useCallback((e: SelectChangeEvent) => {
    setEditUserGender(e.target.value);
  }, []);

  const handleEditUserBirthdateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^\d/]/g, '');
    if (value.length > 2 && value[2] !== '/') {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length > 5 && value[5] !== '/') {
      value = value.slice(0, 5) + '/' + value.slice(5);
    }
    if (value.length <= 10) {
      setEditUserBirthdate(value);
    }
  }, []);

  const handleSaveUserClick = useCallback(() => {
    void handleSaveUser();
  }, [handleSaveUser]);

  const handleCloseEditActivityDialog = useCallback(() => {
    setEditActivityDialog(false);
    setActivityToEdit(null);
    setEditActivityName('');
  }, []);

  const handleEditActivityNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditActivityName(e.target.value);
  }, []);

  const handleSaveActivityClick = useCallback(() => {
    void handleSaveActivity();
  }, [handleSaveActivity]);

  const handleCloseEditTagDialog = useCallback(() => {
    setEditTagDialog(false);
    setTagToEdit(null);
    setEditTagName('');
  }, []);

  const handleEditTagNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditTagName(e.target.value);
  }, []);

  const handleSaveTagClick = useCallback(() => {
    void handleSaveTag();
  }, [handleSaveTag]);

  const handleCloseConfirmDeleteTag = useCallback(() => {
    setConfirmDeleteTag(null);
  }, []);

  const handleConfirmDeleteTag = useCallback(() => {
    if (confirmDeleteTag) {
      void handleDeleteTag(confirmDeleteTag);
    }
  }, [confirmDeleteTag, handleDeleteTag]);

  const handleBulkTagToAddAutocompleteChange = useCallback((_event: unknown, newValue: string | null) => {
    setBulkTagToAdd(newValue ?? '');
  }, []);

  const handleBulkTagToAddInputChange = useCallback((_event: unknown, newInputValue: string) => {
    setBulkTagToAdd(newInputValue);
  }, []);

  const renderBulkTagInput = useCallback((params: unknown) => (
    <TextField
      {...(params as Record<string, unknown>)}
      label="Tag"
      placeholder="Type to add tag or select existing"
      helperText="Select from existing tags or type to create a new one"
      autoFocus
    />
  ), []);

  const handleBulkAddTagClick = useCallback(() => {
    void handleBulkAddTag();
  }, [handleBulkAddTag]);

  const handleCloseBulkAddTagDialog = useCallback(() => {
    setBulkAddTagDialog(false);
    setBulkTagToAdd('');
  }, []);

  const handleOpenBulkAddTagDialog = useCallback(() => {
    setBulkAddTagDialog(true);
  }, []);

  const handleOpenAddActivityDialog = useCallback(() => {
    setAddActivityDialog(true);
  }, []);

  const handleOpenAddTagDialog = useCallback(() => {
    setAddTagDialog(true);
  }, []);

  const handleNewTagNameAutocompleteChange = useCallback((_event: unknown, newValue: string | null) => {
    setNewTagName(newValue ?? '');
  }, []);

  const handleNewTagNameInputChange = useCallback((_event: unknown, newInputValue: string) => {
    setNewTagName(newInputValue);
  }, []);

  const renderNewTagInput = useCallback((params: unknown) => (
    <TextField
      {...(params as Record<string, unknown>)}
      label="Tag Name"
      placeholder="Enter tag name"
      helperText="Select from existing tags or type to create a new one"
      autoFocus
      error={allExistingTags.includes(newTagName.trim()) && newTagName.trim() !== ''}
    />
  ), [allExistingTags, newTagName]);

  const handleCloseAddTagDialog = useCallback(() => {
    setAddTagDialog(false);
    setNewTagName('');
    setError(null);
  }, []);

  const handleAddTagClick = useCallback(() => {
    void handleAddTag();
  }, [handleAddTag]);

  const createToggleUserSelectionHandler = useCallback((userId: string) => {
    return () => {
      handleToggleUserSelection(userId);
    };
  }, [handleToggleUserSelection]);

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
          <Box component="form" onSubmit={handleLoginFormSubmit}>
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              onKeyPress={handlePasswordKeyPress}
              margin="normal"
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleLoginClick}
              sx={{ mt: 2 }}
            >
              Login
            </Button>
            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}
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

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
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
                        onClick={createSortHandler('userName')}
                      >
                        User
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'activity'}
                        direction={sortField === 'activity' ? sortDirection : 'asc'}
                        onClick={createSortHandler('activity')}
                      >
                        Activity
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'value'}
                        direction={sortField === 'value' ? sortDirection : 'asc'}
                        onClick={createSortHandler('value')}
                      >
                        Value
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'date'}
                        direction={sortField === 'date' ? sortDirection : 'asc'}
                        onClick={createSortHandler('date')}
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
                          onClick={createEditResultHandler(result)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={createDeleteResultHandler(result.id)}
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
              {selectedUsers.size > 0 ? (
                <Button
                  variant="contained"
                  startIcon={<TagIcon />}
                  onClick={handleOpenBulkAddTagDialog}
                >
                  Add Tag to Selected
                </Button>
              ) : null}
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
                        onChange={createToggleUserSelectionHandler(user.id)}
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
                          onClick={createEditUserHandler(user)}
                          size="small"
                        >
                          Edit
                        </Button>
                        <Button
                          startIcon={<TagIcon />}
                          color="primary"
                          onClick={createEditTagsHandler(user)}
                          size="small"
                        >
                          Tags
                        </Button>
                        <Button
                          startIcon={<DeleteIcon />}
                          color="error"
                          onClick={createDeleteUserHandler(user)}
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
              onClick={handleOpenAddActivityDialog}
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
                    onClick={createEditActivityHandler(activity)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={createDeleteActivityHandler(activity)}
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
              onClick={handleOpenAddTagDialog}
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
                        onClick={createEditTagHandler(tag)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={createDeleteTagHandler(tag)}
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
        onClose={handleCloseConfirmDeleteUser}
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
          <Button onClick={handleCloseConfirmDeleteUser}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteUser}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog
        open={addActivityDialog}
        onClose={handleCloseAddActivityDialog}
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
            onChange={handleNewActivityChange}
            placeholder="e.g., Running (km) or Height (ft/in)"
            helperText="For compound units, use format: Activity (unit1/unit2)"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddActivityDialog}>Cancel</Button>
          <Button
            onClick={handleAddActivityClick}
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
        onClose={handleCloseRemoveActivityDialog}
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
                    onClick={createDeleteActivityHandler(activity)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveActivityDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialog} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit Result</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Value"
            type="number"
            fullWidth
            value={editValue}
            onChange={handleEditValueChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSaveEditClick} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Tags Dialog */}
      <Dialog
        open={editTagsDialog ? selectedUserForTags !== null : false}
        onClose={handleCloseEditTagsDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Tags for {selectedUserForTags ? getFullName(selectedUserForTags) : ''}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Add tags to group users (e.g., #teamstars2026, #event2026). Tags are case-sensitive. To create new tags, go to the Tags panel.
          </Typography>

          <Autocomplete
            multiple
            freeSolo
            options={allExistingTags}
            value={userTags}
            onChange={handleUserTagsChange}
            renderTags={renderUserTags}
            renderInput={renderUserTagsInput}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditTagsDialog}>
            Cancel
          </Button>
          <Button onClick={handleSaveTagsClick} color="primary" variant="contained">
            Save Tags
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editUserDialog ? selectedUserForEdit !== null : false}
        onClose={handleCloseEditUserDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit User: {selectedUserForEdit ? getFullName(selectedUserForEdit) : ''}
        </DialogTitle>
        <DialogContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <TextField
            fullWidth
            label="First Name *"
            value={editUserFirstName}
            onChange={handleEditUserFirstNameChange}
            margin="dense"
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Last Name"
            value={editUserLastName}
            onChange={handleEditUserLastNameChange}
            margin="dense"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Gender</InputLabel>
            <Select
              value={editUserGender}
              label="Gender"
              onChange={handleEditUserGenderChange}
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
            onChange={handleEditUserBirthdateChange}
            helperText="Format: MM/DD/YYYY (e.g., 01/15/2000)"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditUserDialog}>
            Cancel
          </Button>
          <Button onClick={handleSaveUserClick} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* Edit Activity Dialog */}
      <Dialog
        open={editActivityDialog}
        onClose={handleCloseEditActivityDialog}
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
            onChange={handleEditActivityNameChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditActivityDialog}>Cancel</Button>
          <Button
            onClick={handleSaveActivityClick}
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
        onClose={handleCloseEditTagDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rename Tag</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Renaming this tag will update all users that have this tag.
          </Typography>
          {tagToEdit ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Current tag: <strong>{tagToEdit}</strong>
            </Typography>
          ) : null}
          <TextField
            autoFocus
            margin="dense"
            label="New Tag Name"
            fullWidth
            value={editTagName}
            onChange={handleEditTagNameChange}
            helperText="This will update all users with this tag"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditTagDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTagClick}
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
        onClose={handleCloseConfirmDeleteTag}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Tag Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the tag <strong>&quot;{confirmDeleteTag}&quot;</strong>?
          </Typography>
          {confirmDeleteTag ? (
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
                {users.filter(user => user.tags?.includes(confirmDeleteTag)).length > 10 ? (
                  <li>
                    <Typography variant="body2" color="text.secondary">
                      ... and {users.filter(user => user.tags?.includes(confirmDeleteTag)).length - 10} more
                    </Typography>
                  </li>
                ) : null}
              </Box>
            </Box>
          ) : null}
          <Typography color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDeleteTag}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteTag}
          >
            Delete Tag
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Add Tag Dialog */}
      <Dialog
        open={bulkAddTagDialog}
        onClose={handleCloseBulkAddTagDialog}
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
            onChange={handleBulkTagToAddAutocompleteChange}
            onInputChange={handleBulkTagToAddInputChange}
            renderInput={renderBulkTagInput}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBulkAddTagDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkAddTagClick}
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
        onClose={handleCloseAddTagDialog}
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
            onChange={handleNewTagNameAutocompleteChange}
            onInputChange={handleNewTagNameInputChange}
            renderInput={renderNewTagInput}
            sx={{ mt: 1 }}
          />
          {allExistingTags.includes(newTagName.trim()) && newTagName.trim() !== '' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This tag already exists.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddTagDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleAddTagClick}
            color="primary"
            variant="contained"
            disabled={!newTagName.trim() || allExistingTags.includes(newTagName.trim())}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel; 