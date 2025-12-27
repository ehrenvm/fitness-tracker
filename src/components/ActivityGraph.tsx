import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
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
];

const ActivityGraph: React.FC<ActivityGraphProps> = ({ results, selectedActivities }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNormalized, setIsNormalized] = useState(false);
  const [isCurved, setIsCurved] = useState(true);

  // Process data for the graph
  const { chartData, activityRanges } = useMemo(() => {
    // Get all unique dates
    const dateMap = new Map<string, { [key: string]: number | null }>();
    
    // Calculate ranges for normalization
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
    
    // Initialize with all dates having null values for all activities
    results.forEach(result => {
      const dateStr = new Date(result.date).toLocaleDateString();
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {});
        selectedActivities.forEach(activity => {
          dateMap.get(dateStr)![`${activity}_normalized`] = null;
          dateMap.get(dateStr)![`${activity}_original`] = null;
        });
      }
    });

    // Fill in actual values and normalized values
    results.forEach(result => {
      const dateStr = new Date(result.date).toLocaleDateString();
      if (selectedActivities.includes(result.activity)) {
        const range = ranges[result.activity];
        dateMap.get(dateStr)![`${result.activity}_original`] = result.value;
        
        if (range) {
          // Calculate normalized value (0-100 scale)
          const normalizedValue = range.range === 0 
            ? 50 // If min and max are the same, set to middle of scale
            : ((result.value - range.min) / range.range) * 100;
          dateMap.get(dateStr)![`${result.activity}_normalized`] = normalizedValue;
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

    return { chartData: data as ChartDataPoint[], activityRanges: ranges };
  }, [results, selectedActivities]);

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleNormalizeToggle = () => {
    setIsNormalized(!isNormalized);
  };

  const handleCurveToggle = () => {
    setIsCurved(!isCurved);
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
            const baseActivityName = isNormalizedValue 
              ? entry.dataKey.replace('_normalized', '')
              : entry.dataKey.replace('_original', '');
            
            if ((isNormalized && !isNormalizedValue) || (!isNormalized && isNormalizedValue)) {
              return null;
            }

            const value = entry.value;
            const originalValue = isNormalized 
              ? payload.find((p: any) => p.dataKey === `${baseActivityName}_original`)?.value
              : null;

            return (
              <Typography
                key={entry.dataKey}
                variant="body2"
                style={{ color: entry.color }}
              >
                {baseActivityName}: {isNormalized 
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

  const graphContent = (
    <Box sx={{ 
      height: '100%', 
      bgcolor: '#f5f5f5',
      borderRadius: 1,
      p: 2 
    }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
      </Stack>
      <ResponsiveContainer width="100%" height="90%">
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

          {selectedActivities.map((activity, index) => (
            <Line
              key={activity}
              type={isCurved ? "monotone" : "linear"}
              dataKey={isNormalized ? `${activity}_normalized` : `${activity}_original`}
              name={activity}
              stroke={colorPalette[index % colorPalette.length]}
              yAxisId="left"
              connectNulls
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
              strokeWidth={3}
            />
          ))}
        </LineChart>
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