import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Dialog,
  AppBar,
  Toolbar,
  DialogContent,
  Switch,
  FormControlLabel,
  Stack
} from '@mui/material';
import { Fullscreen, Close } from '@mui/icons-material';

interface ActivityResult {
  id: string;
  userName: string;
  activity: string;
  value: number;
  date: string;
}

interface ActivityGraphProps {
  results: ActivityResult[];
  selectedActivities: string[];
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number | null;
}

interface ActivityRange {
  min: number;
  max: number;
  range: number;
}

// Define a color palette for different activities
const colorPalette = [
  '#3BB982', // NOCO Performance green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#4CAF50', // Green
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#FFC107', // Amber
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#9E9E9E', // Grey
];

// Generate color for a user-activity combination
const getColorForCombination = (activity: string, userName: string, allCombinations: Array<{ activity: string; userName: string }>): string => {
  // Get unique activities and users
  const uniqueActivities = Array.from(new Set(allCombinations.map(c => c.activity))).sort();
  const uniqueUsers = Array.from(new Set(allCombinations.map(c => c.userName))).sort();
  
  // If single user, use activity-based coloring
  if (uniqueUsers.length === 1) {
    const activityIndex = uniqueActivities.indexOf(activity);
    return colorPalette[activityIndex % colorPalette.length];
  }
  
  // Multiple users: use a combination of activity and user index
  const activityIndex = uniqueActivities.indexOf(activity);
  const userIndex = uniqueUsers.indexOf(userName);
  
  // Create a more varied color palette by combining activity and user indices
  const baseColorIndex = (activityIndex * uniqueUsers.length + userIndex) % colorPalette.length;
  return colorPalette[baseColorIndex];
};

const ActivityGraph: React.FC<ActivityGraphProps> = ({ results, selectedActivities }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNormalized, setIsNormalized] = useState(false);
  const [isCurved, setIsCurved] = useState(true);
  const [useStatisticalView, setUseStatisticalView] = useState(false);

  // Process data for the graph
  const { chartData, activityRanges, userActivityCombinations } = useMemo(() => {
    // Get all unique users from results
    const uniqueUsers = Array.from(new Set(results.map(r => r.userName))).sort();
    const hasMultipleUsers = uniqueUsers.length > 1;
    
    // Get all unique dates
    const dateMap = new Map<string, { [key: string]: number | null }>();
    
    // Calculate ranges for normalization (per activity, across all users)
    const ranges: { [key: string]: ActivityRange } = {};
    selectedActivities.forEach(activity => {
      const activityResults = results.filter(r => r.activity === activity);
      if (activityResults.length > 0) {
        const values = activityResults.map(r => r.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        ranges[activity] = {
          min,
          max,
          range: max - min
        };
      }
    });
    
    // Initialize with all dates having null values for all user-activity combinations
    results.forEach(result => {
      const dateStr = new Date(result.date).toLocaleDateString();
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {});
        // Create keys for each user-activity combination if multiple users, otherwise just activity
        if (hasMultipleUsers) {
          selectedActivities.forEach(activity => {
            uniqueUsers.forEach(userName => {
              dateMap.get(dateStr)![`${activity}_${userName}_normalized`] = null;
              dateMap.get(dateStr)![`${activity}_${userName}_original`] = null;
            });
          });
        } else {
          selectedActivities.forEach(activity => {
            dateMap.get(dateStr)![`${activity}_normalized`] = null;
            dateMap.get(dateStr)![`${activity}_original`] = null;
          });
        }
      }
    });

    // Fill in actual values and normalized values
    results.forEach(result => {
      const dateStr = new Date(result.date).toLocaleDateString();
      if (selectedActivities.includes(result.activity)) {
        const range = ranges[result.activity];
        
        if (hasMultipleUsers) {
          // Store with user-specific keys
          dateMap.get(dateStr)![`${result.activity}_${result.userName}_original`] = result.value;
          
          if (range) {
            // Calculate normalized value (0-100 scale)
            const normalizedValue = range.range === 0 
              ? 50 // If min and max are the same, set to middle of scale
              : ((result.value - range.min) / range.range) * 100;
            dateMap.get(dateStr)![`${result.activity}_${result.userName}_normalized`] = normalizedValue;
          }
        } else {
          // Single user mode - use activity-only keys (backward compatible)
          dateMap.get(dateStr)![`${result.activity}_original`] = result.value;
          
          if (range) {
            // Calculate normalized value (0-100 scale)
            const normalizedValue = range.range === 0 
              ? 50 // If min and max are the same, set to middle of scale
              : ((result.value - range.min) / range.range) * 100;
            dateMap.get(dateStr)![`${result.activity}_normalized`] = normalizedValue;
          }
        }
      }
    });

    // Convert to array and sort by date
    const data = Array.from(dateMap.entries())
      .map(([date, values]) => ({
        date,
        ...values
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate list of user-activity combinations for rendering lines
    const combinations: Array<{ activity: string; userName: string }> = [];
    if (hasMultipleUsers) {
      selectedActivities.forEach(activity => {
        uniqueUsers.forEach(userName => {
          // Only add if there's data for this combination
          const hasData = results.some(r => r.activity === activity && r.userName === userName);
          if (hasData) {
            combinations.push({ activity, userName });
          }
        });
      });
    } else {
      selectedActivities.forEach(activity => {
        const hasData = results.some(r => r.activity === activity);
        if (hasData) {
          combinations.push({ activity, userName: uniqueUsers[0] || '' });
        }
      });
    }

    return { 
      chartData: data as ChartDataPoint[], 
      activityRanges: ranges,
      userActivityCombinations: combinations
    };
  }, [results, selectedActivities]);

  // Calculate statistical data (min, median, max) for each date/activity when multiple users are selected
  const statisticalData = useMemo(() => {
    const uniqueUsers = Array.from(new Set(results.map(r => r.userName))).sort();
    const hasMultipleUsers = uniqueUsers.length > 1;
    
    if (!hasMultipleUsers || !useStatisticalView) {
      return [];
    }

    // Group results by date and activity
    const dateActivityMap = new Map<string, Map<string, number[]>>();
    
    results.forEach(result => {
      if (selectedActivities.includes(result.activity)) {
        const dateStr = new Date(result.date).toLocaleDateString();
        if (!dateActivityMap.has(dateStr)) {
          dateActivityMap.set(dateStr, new Map());
        }
        const activityMap = dateActivityMap.get(dateStr)!;
        if (!activityMap.has(result.activity)) {
          activityMap.set(result.activity, []);
        }
        activityMap.get(result.activity)!.push(result.value);
      }
    });

    // Calculate statistics for each date/activity combination
    const statsData: Array<{
      date: string;
      [key: string]: string | number | null;
    }> = [];

    const allDates = Array.from(dateActivityMap.keys()).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    allDates.forEach(dateStr => {
      const activityMap = dateActivityMap.get(dateStr)!;
      const dataPoint: { date: string; [key: string]: string | number | null } = { date: dateStr };
      
      selectedActivities.forEach(activity => {
        const values = activityMap.get(activity);
        if (values && values.length > 0) {
          // Sort values for median calculation
          const sortedValues = [...values].sort((a, b) => a - b);
          const min = sortedValues[0];
          const max = sortedValues[sortedValues.length - 1];
          
          // Calculate median (50th percentile)
          let median: number;
          const mid = Math.floor(sortedValues.length / 2);
          if (sortedValues.length % 2 === 0) {
            median = (sortedValues[mid - 1] + sortedValues[mid]) / 2;
          } else {
            median = sortedValues[mid];
          }
          
          dataPoint[`${activity}_min`] = min;
          dataPoint[`${activity}_median`] = median;
          dataPoint[`${activity}_max`] = max;
        } else {
          dataPoint[`${activity}_min`] = null;
          dataPoint[`${activity}_median`] = null;
          dataPoint[`${activity}_max`] = null;
        }
      });
      
      statsData.push(dataPoint);
    });

    return statsData;
  }, [results, selectedActivities, useStatisticalView]);

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleNormalizeToggle = () => {
    setIsNormalized(!isNormalized);
  };

  const handleCurveToggle = () => {
    setIsCurved(!isCurved);
  };

  const handleStatisticalViewToggle = () => {
    setUseStatisticalView(!useStatisticalView);
  };

  const statisticalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {label}
          </Typography>
          {selectedActivities.map(activity => {
            const minEntry = payload.find((p: any) => p.dataKey === `${activity}_min`);
            const medianEntry = payload.find((p: any) => p.dataKey === `${activity}_median`);
            const maxEntry = payload.find((p: any) => p.dataKey === `${activity}_max`);
            
            if (!minEntry && !medianEntry && !maxEntry) {
              return null;
            }

            return (
              <Box key={activity} sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {activity}
                </Typography>
                <Typography variant="body2" style={{ color: '#F44336' }}>
                  Min: {minEntry?.value?.toFixed(2) ?? 'N/A'}
                </Typography>
                <Typography variant="body2" style={{ color: medianEntry?.color || '#3BB982' }}>
                  Median: {medianEntry?.value?.toFixed(2) ?? 'N/A'}
                </Typography>
                <Typography variant="body2" style={{ color: '#2196F3' }}>
                  Max: {maxEntry?.value?.toFixed(2) ?? 'N/A'}
                </Typography>
              </Box>
            );
          })}
        </Paper>
      );
    }
    return null;
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" color="textSecondary">
            {label}
          </Typography>
          {payload.map((entry: any) => {
            const isNormalizedValue = entry.dataKey.endsWith('_normalized');
            let baseKey = isNormalizedValue 
              ? entry.dataKey.replace('_normalized', '')
              : entry.dataKey.replace('_original', '');
            
            // Check if this is a user-specific key (format: activity_userName)
            const userMatch = baseKey.match(/^(.+)_(.+)$/);
            let activityName: string;
            let userName: string | null = null;
            
            if (userMatch) {
              // Check if the second part is actually a user name (by checking if it exists in results)
              const potentialActivity = userMatch[1];
              const potentialUser = userMatch[2];
              const hasUserData = results.some(r => r.userName === potentialUser && r.activity === potentialActivity);
              
              if (hasUserData) {
                activityName = potentialActivity;
                userName = potentialUser;
              } else {
                // Not a user-specific key, treat as activity-only
                activityName = baseKey;
              }
            } else {
              activityName = baseKey;
            }
            
            if ((isNormalized && !isNormalizedValue) || (!isNormalized && isNormalizedValue)) {
              return null;
            }

            const value = entry.value;
            const originalKey = isNormalized 
              ? (userName ? `${activityName}_${userName}_original` : `${activityName}_original`)
              : null;
            const originalValue = isNormalized && originalKey
              ? payload.find((p: any) => p.dataKey === originalKey)?.value
              : null;

            const displayName = userName ? `${activityName} (${userName})` : activityName;

            return (
              <Typography
                key={entry.dataKey}
                variant="body2"
                style={{ color: entry.color }}
              >
                {displayName}: {isNormalized 
                  ? `${value?.toFixed(1)}% (${originalValue?.toFixed(2)})`
                  : value?.toFixed(2)}
              </Typography>
            );
          }).filter(Boolean)}
        </Paper>
      );
    }
    return null;
  };

  // Check if multiple users are selected
  const uniqueUsers = Array.from(new Set(results.map(r => r.userName))).sort();
  const hasMultipleUsers = uniqueUsers.length > 1;
  const showStatisticalView = hasMultipleUsers && useStatisticalView;

  const graphContent = (
    <Box sx={{ 
      height: '100%', 
      bgcolor: '#f5f5f5',
      borderRadius: 1,
      p: 2 
    }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        {hasMultipleUsers && (
          <FormControlLabel
            control={
              <Switch
                checked={useStatisticalView}
                onChange={handleStatisticalViewToggle}
                color="primary"
              />
            }
            label="Statistical View (Min/Median/Max)"
          />
        )}
        {!showStatisticalView && (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={isNormalized}
                  onChange={handleNormalizeToggle}
                  color="primary"
                />
              }
              label="Normalize Values (0-100%)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isCurved}
                  onChange={handleCurveToggle}
                  color="primary"
                />
              }
              label="Smooth Lines"
            />
          </>
        )}
      </Stack>
      <ResponsiveContainer width="100%" height="90%">
        {showStatisticalView ? (
          <ComposedChart
            data={statisticalData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              label={{ 
                value: 'Value', 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip content={statisticalTooltip} />
            <Legend />
            {selectedActivities.map((activity, index) => {
              const color = colorPalette[index % colorPalette.length];
              return (
                <React.Fragment key={activity}>
                  <Bar
                    dataKey={`${activity}_median`}
                    name={`${activity} (Median)`}
                    fill={color}
                    opacity={0.8}
                  />
                  <Line
                    type="linear"
                    dataKey={`${activity}_min`}
                    name={`${activity} (Min)`}
                    stroke="#F44336"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="linear"
                    dataKey={`${activity}_max`}
                    name={`${activity} (Max)`}
                    stroke="#2196F3"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                  />
                </React.Fragment>
              );
            })}
          </ComposedChart>
        ) : (
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              yAxisId="left"
              orientation="left"
              domain={isNormalized ? [0, 100] : ['auto', 'auto']}
              label={{ 
                value: isNormalized ? 'Normalized Value (%)' : 'Value', 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip content={customTooltip} />
            <Legend />

            {userActivityCombinations.map((combination) => {
              const { activity, userName } = combination;
              const uniqueUsers = Array.from(new Set(results.map(r => r.userName))).sort();
              const hasMultipleUsers = uniqueUsers.length > 1;
              
              // Determine data key based on whether we have multiple users
              const dataKey = hasMultipleUsers
                ? (isNormalized ? `${activity}_${userName}_normalized` : `${activity}_${userName}_original`)
                : (isNormalized ? `${activity}_normalized` : `${activity}_original`);
              
              // Determine display name
              const displayName = hasMultipleUsers ? `${activity} (${userName})` : activity;
              
              // Get color for this combination
              const color = getColorForCombination(activity, userName, userActivityCombinations);
              
              return (
                <Line
                  key={dataKey}
                  type={isCurved ? "monotone" : "linear"}
                  dataKey={dataKey}
                  name={displayName}
                  stroke={color}
                  yAxisId="left"
                  connectNulls
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                  strokeWidth={3}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    </Box>
  );

  if (results.length === 0 || selectedActivities.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" align="center">
          {selectedActivities.length === 0 
            ? 'Select one or more activities to display'
            : 'No data available for selected activities'}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <IconButton onClick={handleFullscreenToggle} size="small">
            <Fullscreen />
          </IconButton>
        </Box>
        <Box sx={{ height: 400 }}>
          {graphContent}
        </Box>
      </Paper>

      <Dialog
        fullScreen
        open={isFullscreen}
        onClose={handleFullscreenToggle}
      >
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Activity Progress
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleFullscreenToggle}
              aria-label="close"
            >
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
          p: 3
        }}>
          {graphContent}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityGraph; 