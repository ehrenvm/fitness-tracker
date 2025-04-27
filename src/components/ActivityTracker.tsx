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

// ... rest of the imports and interfaces ...

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ userName }) => {
  // ... existing state declarations ...

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

      const result = {
        activity: selectedActivity,
        value: finalValue,
        originalValue: isCompound ? value : undefined,
        date: new Date().toISOString(),
        userId: user.uid,
        userName: userName
      };

      const docRef = await addDoc(collection(db, 'results'), result);
      
      // Log analytics for new activity data
      logAnalyticsEvent(ANALYTICS_EVENTS.ACTIVITY_DATA_ADDED, {
        userId: user.uid,
        userName: userName,
        activity: selectedActivity,
        value: finalValue,
        isCompound,
        resultId: docRef.id
      });

      // Check for performance milestones
      const userResults = results.filter(r => r.activity === selectedActivity);
      if (userResults.length > 0) {
        const personalBest = Math.max(...userResults.map(r => r.value));
        if (finalValue > personalBest) {
          logAnalyticsEvent(ANALYTICS_EVENTS.PERFORMANCE_MILESTONE, {
            userId: user.uid,
            userName: userName,
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
      loadResults();
    } catch (error) {
      console.error('Error adding result:', error);
      setError('Failed to add result. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // ... rest of the component code ...
};