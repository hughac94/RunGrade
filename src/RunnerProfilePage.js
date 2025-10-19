import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Batchanalyser from './RunGradeBatch/Batchanalyser'; // Import Batchanalyser directly

const RunnerProfilePage = () => {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Title and Description */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
          🏃‍♂️ PERSONAL GRADE ADJUSTED RUNNING ANALYSER
        </Typography>
        <Typography variant="body1" sx={{ color: '#666' }}>
          📁 Upload multiple GPX or FIT files, set filters, and analyse... to see how your pace adjusts with gradient over multiple runs!
        </Typography>
      </Box>

      {/* Batchanalyser Component */}
      <Batchanalyser />
    </Box>
  );
};

export default RunnerProfilePage;