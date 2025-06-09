import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function RunnerProfilePage() {
  return (
    <Box sx={{ 
      maxWidth: 1200, 
      mx: 'auto', 
      p: 3,
      textAlign: 'center'
    }}>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 700,
          mb: 4,
          color: '#1976d2'
        }}
      >
        Runner Profile
      </Typography>
      
      <Typography
        variant="h6"
        sx={{
          color: '#666',
          fontStyle: 'italic',
          mb: 2
        }}
      >
        Coming Soon!
      </Typography>
      
      <Typography
        variant="body1"
        sx={{
          color: '#888',
          maxWidth: 600,
          mx: 'auto'
        }}
      >
        This page will allow you to create and manage your runner profile, 
        including personal records, training history, and performance analytics.
      </Typography>
    </Box>
  );
}

export default RunnerProfilePage;