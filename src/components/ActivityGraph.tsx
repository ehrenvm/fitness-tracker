import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
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
  const { chartData, userActivityCombinations } = useMemo(() => {
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
        const dateEntry: { [key: string]: number | null } = {};
        dateMap.set(dateStr, dateEntry);
        // Create keys for each user-activity combination if multiple users, otherwise just activity
        if (hasMultipleUsers) {
          selectedActivities.forEach(activity => {
            uniqueUsers.forEach(userName => {
              dateEntry[`${activity}_${userName}_normalized`] = null;
              dateEntry[`${activity}_${userName}_original`] = null;
            });
          });
        } else {
          selectedActivities.forEach(activity => {
            dateEntry[`${activity}_normalized`] = null;
            dateEntry[`${activity}_original`] = null;
          });
        }
      }
    });

    // Fill in actual values and normalized values
    results.forEach(result => {
      const dateStr = new Date(result.date).toLocaleDateString();
      if (selectedActivities.includes(result.activity)) {
        const dateEntry = dateMap.get(dateStr);
        if (!dateEntry) return;
        
        const range = ranges[result.activity];
        
        if (hasMultipleUsers) {
          // Store with user-specific keys
          dateEntry[`${result.activity}_${result.userName}_original`] = result.value;
          
          // Calculate normalized value (0-100 scale)
          // Range is guaranteed to exist because we only process activities with results
          const normalizedValue = range.range === 0 
            ? 50 // If min and max are the same, set to middle of scale
            : ((result.value - range.min) / range.range) * 100;
          dateEntry[`${result.activity}_${result.userName}_normalized`] = normalizedValue;
        } else {
          // Single user mode - use activity-only keys (backward compatible)
          dateEntry[`${result.activity}_original`] = result.value;
          
          // Calculate normalized value (0-100 scale)
          // Range is guaranteed to exist because we only process activities with results
          const normalizedValue = range.range === 0 
            ? 50 // If min and max are the same, set to middle of scale
            : ((result.value - range.min) / range.range) * 100;
          dateEntry[`${result.activity}_normalized`] = normalizedValue;
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

    // Helper function to get consistent date string (YYYY-MM-DD)
    const getDateKey = (dateStr: string): string => {
      try {
        const date = new Date(dateStr);
        // Handle timezone issues by using UTC methods
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        console.error('Error parsing date:', dateStr, e);
        return '';
      }
    };

    // Helper function to format date for display
    const formatDateForDisplay = (dateKey: string): string => {
      const [year, month, day] = dateKey.split('-');
      return `${month}/${day}/${year}`;
    };

    // Group results by date and activity
    const dateActivityMap = new Map<string, Map<string, number[]>>();
    
    results.forEach(result => {
      if (selectedActivities.includes(result.activity)) {
        const dateKey = getDateKey(result.date);
        if (!dateKey) return; // Skip invalid dates
        
        if (!dateActivityMap.has(dateKey)) {
          dateActivityMap.set(dateKey, new Map());
        }
        const activityMap = dateActivityMap.get(dateKey);
        if (!activityMap) return;
        if (!activityMap.has(result.activity)) {
          activityMap.set(result.activity, []);
        }
        const activityValues = activityMap.get(result.activity);
        if (activityValues) {
          activityValues.push(result.value);
        }
      }
    });

    // Calculate statistics for each date/activity combination
    const statsData: Array<{
      date: string;
      [key: string]: string | number | null;
    }> = [];

    const allDates = Array.from(dateActivityMap.keys()).sort((a, b) => 
      a.localeCompare(b)
    );

    allDates.forEach(dateKey => {
      const activityMap = dateActivityMap.get(dateKey);
      if (!activityMap) return;
      const dataPoint: { date: string; [key: string]: string | number | null } = { 
        date: formatDateForDisplay(dateKey) 
      };
      
      selectedActivities.forEach(activity => {
        const values = activityMap.get(activity);
        // Only calculate stats if we have at least 2 values (from different users)
        if (values && values.length >= 2) {
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
        } else if (values?.length === 1) {
          // Single value - min, median, and max are all the same
          const singleValue = values[0];
          dataPoint[`${activity}_min`] = singleValue;
          dataPoint[`${activity}_median`] = singleValue;
          dataPoint[`${activity}_max`] = singleValue;
        } else {
          dataPoint[`${activity}_min`] = null;
          dataPoint[`${activity}_median`] = null;
          dataPoint[`${activity}_max`] = null;
        }
      });
      
      // Only add data point if it has at least one activity with non-null values
      const hasData = selectedActivities.some(activity => {
        const min = dataPoint[`${activity}_min`];
        // min is typed as string | number | null, so we only need to check for null
        return min !== null;
      });
      
      if (hasData) {
        statsData.push(dataPoint);
      }
    });

    return statsData;
  }, [results, selectedActivities, useStatisticalView]);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleNormalizeToggle = useCallback(() => {
    setIsNormalized(prev => !prev);
  }, []);

  const handleCurveToggle = useCallback(() => {
    setIsCurved(prev => !prev);
  }, []);

  const handleStatisticalViewToggle = useCallback(() => {
    setUseStatisticalView(prev => !prev);
  }, []);

  const statisticalTooltip = useCallback(({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload?.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {label}
          </Typography>
          {selectedActivities.map(activity => {
            // payload is guaranteed to be defined due to the check above
            const minEntry = payload.find((p) => String(p.dataKey) === `${activity}_min`);
            const medianEntry = payload.find((p) => String(p.dataKey) === `${activity}_median`);
            const maxEntry = payload.find((p) => String(p.dataKey) === `${activity}_max`);
            
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
                <Typography variant="body2" style={{ color: medianEntry?.color ?? '#3BB982' }}>
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
  }, [selectedActivities]);

  const customTooltip = useCallback(({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload?.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" color="textSecondary">
            {label}
          </Typography>
          {payload.map((entry) => {
            const dataKey = String(entry.dataKey ?? '');
            const isNormalizedValue = dataKey.endsWith('_normalized');
            const baseKey = isNormalizedValue 
              ? dataKey.replace('_normalized', '')
              : dataKey.replace('_original', '');
            
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
              ? payload.find((p) => String(p.dataKey) === originalKey)?.value
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
  }, [isNormalized, results]);

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
        {hasMultipleUsers ? (
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
        ) : null}
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
      <Box sx={{ width: '100%', height: 350, overflow: 'hidden' }}>
        {showStatisticalView ? (
          statisticalData.length > 0 ? (
            (() => {
              // Build all lines for all activities
              const lines: React.ReactElement[] = [];
              
              selectedActivities.forEach((activity, index) => {
                const color = colorPalette[index % colorPalette.length];
                const medianKey = `${activity}_median`;
                const minKey = `${activity}_min`;
                const maxKey = `${activity}_max`;
                
                // Check if this activity has any data
                const hasData = statisticalData.some(d => {
                  const median = d[medianKey];
                  // median is typed as string | number | null, so we check for null and valid number
                  return median !== null && typeof median === 'number' && !isNaN(median);
                });
                
                if (!hasData) return;
                
                // Min line
                lines.push(
                  <Line
                    key={`min-line-${activity}`}
                    type="monotone"
                    dataKey={minKey}
                    name={`${activity} (Min)`}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                );
                
                // Max line
                lines.push(
                  <Line
                    key={`max-line-${activity}`}
                    type="monotone"
                    dataKey={maxKey}
                    name={`${activity} (Max)`}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                );
                
                // Median line - the primary line
                lines.push(
                  <Line
                    key={`median-line-${activity}`}
                    type="monotone"
                    dataKey={medianKey}
                    name={`${activity} (Median)`}
                    stroke={color}
                    strokeWidth={4}
                    dot={{ r: 6, fill: color }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                );
              });
              
              return (
                <LineChart
                  data={statisticalData}
                  width={Math.max(500, statisticalData.length * 100)}
                  height={300}
                  margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    label={{ 
                      value: 'Value', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                  />
                  <Tooltip content={statisticalTooltip} />
                  <Legend />
                  {lines}
                </LineChart>
              );
            })()
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 2 }}>
              <Typography variant="body2" color="textSecondary">
                No statistical data available.
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Ensure multiple users have data for the same dates and activities.
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Users: {uniqueUsers.join(', ')} | Activities: {selectedActivities.join(', ')} | Data points: {statisticalData.length}
              </Typography>
            </Box>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
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
          </ResponsiveContainer>
        )}
      </Box>
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
      <Paper elevation={3} sx={{ p: 3, mt: 2, borderRadius: 4 }}>
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
          p: 3,
          overflow: 'hidden'
        }}>
          {graphContent}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityGraph; 