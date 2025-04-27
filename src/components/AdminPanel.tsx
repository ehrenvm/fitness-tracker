import React, { useState, useEffect } from 'react';
// ... existing imports ...
import { db, logAnalyticsEvent } from '../firebase';
import { ANALYTICS_EVENTS } from '../constants/analytics';

// ... existing interfaces ...

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onUserDeleted }) => {
  // ... existing state declarations ...

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

  // ... rest of the component code ...
};