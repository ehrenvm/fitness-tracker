import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip
} from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import { formatActivityValueDisplay } from '../utils/formatActivityValue';
import type { ActivityResult } from '../types/activity';

interface PersonalRecordsProps {
  results: ActivityResult[];
  userName: string;
  activityPrDirection: Record<string, boolean>;
}

interface PR {
  activity: string;
  value: number;
  date: string;
  higherIsBetter: boolean;
}

const PersonalRecords: React.FC<PersonalRecordsProps> = ({ results, userName, activityPrDirection }) => {
  const personalRecords = useMemo(() => {
    const userResults = results.filter(r => r.userName === userName);
    if (userResults.length === 0) return [];

    const grouped = new Map<string, ActivityResult[]>();
    for (const result of userResults) {
      const existing = grouped.get(result.activity);
      if (existing) {
        existing.push(result);
      } else {
        grouped.set(result.activity, [result]);
      }
    }

    const prs: PR[] = [];
    for (const [activity, activityResults] of grouped) {
      const higherIsBetter = activityPrDirection[activity] !== false;

      let best = activityResults[0];
      for (let i = 1; i < activityResults.length; i++) {
        const current = activityResults[i];
        if (higherIsBetter ? current.value > best.value : current.value < best.value) {
          best = current;
        }
      }

      prs.push({
        activity,
        value: best.value,
        date: best.date,
        higherIsBetter
      });
    }

    prs.sort((a, b) => a.activity.localeCompare(b.activity));
    return prs;
  }, [results, userName, activityPrDirection]);

  if (personalRecords.length === 0) return null;

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <EmojiEvents sx={{ color: '#FFD700' }} />
        <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
          Personal Records
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {personalRecords.map((pr) => (
          <Chip
            key={pr.activity}
            label={`${pr.activity}: ${formatActivityValueDisplay(pr.activity, pr.value)}`}
            variant="outlined"
            sx={{
              fontSize: { xs: '0.8rem', md: '0.875rem' },
              height: 'auto',
              py: 0.75,
              '& .MuiChip-label': {
                whiteSpace: 'normal',
                lineHeight: 1.4
              },
              borderColor: '#FFD700',
              color: 'text.primary',
              bgcolor: 'rgba(255, 215, 0, 0.08)'
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};

export default PersonalRecords;
