import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import { loadLeaderboards, refreshLeaderboards } from '../utils/leaderboardService';
import { formatActivityValueDisplay } from '../utils/formatActivityValue';
import type { LeaderboardsData, AgeCategory } from '../types/leaderboard';
import { AGE_CATEGORIES } from '../types/leaderboard';

interface OverallLeaderboardProps {
  refreshTrigger?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  overall: 'Overall',
  '0-19': '0-19',
  '20-29': '20-29',
  '30-39': '30-39',
  '40-49': '40-49',
  '50-59': '50-59',
  '60-69': '60-69',
  '70-79': '70-79',
  '80+': '80+'
};

const OverallLeaderboard: React.FC<OverallLeaderboardProps> = ({ refreshTrigger = 0 }) => {
  const [leaderboards, setLeaderboards] = useState<LeaderboardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('overall');

  const fetchLeaderboards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadLeaderboards();
      setLeaderboards(data);
    } catch (err) {
      console.error('Error loading leaderboards:', err);
      setError('Failed to load leaderboards.');
    } finally {
      setLoading(false);
    }
  }, []);

  const recomputeLeaderboards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await refreshLeaderboards();
      setLeaderboards(data);
    } catch (err) {
      console.warn('Could not refresh leaderboards (admin may need to run backfill):', err);
      try {
        const data = await loadLeaderboards();
        setLeaderboards(data);
      } catch (fallbackErr) {
        console.error('Could not load leaderboards:', fallbackErr);
        setError('Failed to load leaderboards.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCategoryChange = useCallback((e: SelectChangeEvent) => {
    setSelectedCategory(e.target.value);
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      void recomputeLeaderboards();
    } else {
      void fetchLeaderboards();
    }
  }, [fetchLeaderboards, recomputeLeaderboards, refreshTrigger]);

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 3, borderRadius: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 3, borderRadius: { xs: 2, md: 4 } }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!leaderboards || Object.keys(leaderboards).length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, borderRadius: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmojiEvents sx={{ color: '#FFD700' }} />
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
            Top PRs
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          No leaderboard data yet. Add activities and results to see top performers.
        </Typography>
      </Paper>
    );
  }

  const activities = Object.keys(leaderboards).sort();

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <EmojiEvents sx={{ color: '#FFD700' }} />
        <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
          Top PRs
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={handleCategoryChange}
          >
            {AGE_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {activities.map((activity) => {
          const activityLeaderboard = leaderboards[activity];
          const categoryData = activityLeaderboard[selectedCategory as AgeCategory];

          const maleEntries = categoryData.Male;
          const femaleEntries = categoryData.Female;
          const hasData = maleEntries.length > 0 || femaleEntries.length > 0;
          if (!hasData) return null;

          return (
            <Box
              key={activity}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.5,
                bgcolor: 'rgba(255, 215, 0, 0.04)'
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                {activity}
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {maleEntries.length > 0 && (
                  <Box sx={{ minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="medium">
                      Male
                    </Typography>
                    <Box component="ol" sx={{ m: 0, pl: 2.5, '& li': { py: 0.25 } }}>
                      {maleEntries.map((entry, i) => (
                        <li key={`${entry.userName}-${entry.value}-${entry.date}`}>
                          <Typography variant="body2">
                            #{i + 1} {entry.userName} — {formatActivityValueDisplay(activity, entry.value)}
                          </Typography>
                        </li>
                      ))}
                    </Box>
                  </Box>
                )}
                {femaleEntries.length > 0 && (
                  <Box sx={{ minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="medium">
                      Female
                    </Typography>
                    <Box component="ol" sx={{ m: 0, pl: 2.5, '& li': { py: 0.25 } }}>
                      {femaleEntries.map((entry, i) => (
                        <li key={`${entry.userName}-${entry.value}-${entry.date}`}>
                          <Typography variant="body2">
                            #{i + 1} {entry.userName} — {formatActivityValueDisplay(activity, entry.value)}
                          </Typography>
                        </li>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default OverallLeaderboard;
