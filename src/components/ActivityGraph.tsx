import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Dialog,
  AppBar,
  Toolbar,
  DialogContent
} from '@mui/material';
import { Fullscreen, FullscreenExit, Close } from '@mui/icons-material';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ActivityResult {
  id: string;
  userName: string;
  activity: string;
  value: number;
  date: string;
}

interface ActivityGraphProps {
  results: ActivityResult[];
  activity: string;
}

const ActivityGraph: React.FC<ActivityGraphProps> = ({ results, activity }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sort results by date
  const sortedResults = [...results].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const data = {
    labels: sortedResults.map(result => 
      new Date(result.date).toLocaleDateString()
    ),
    datasets: [
      {
        label: activity,
        data: sortedResults.map(result => result.value),
        borderColor: '#3BB982', // NOCO Performance green
        backgroundColor: 'rgba(59, 185, 130, 0.1)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${activity} Progress Over Time`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: activity.includes('(') 
            ? activity.split('(')[1].replace(')', '') 
            : 'Count',
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
  };

  if (results.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" align="center">
          No data available for {activity}
        </Typography>
      </Paper>
    );
  }

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const graphContent = (
    <Box sx={{ 
      height: '100%', 
      bgcolor: '#f5f5f5', // Light grey background
      borderRadius: 1,
      p: 2 
    }}>
      <Line options={options} data={data} />
    </Box>
  );

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
              {activity} Progress
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
          height: 'calc(100vh - 64px)', // Subtract AppBar height
          p: 3
        }}>
          {graphContent}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityGraph;