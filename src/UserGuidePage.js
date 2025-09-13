import React from 'react';
import Typography from '@mui/material/Typography';
import PageContainer from './Components/Styles';

export default function UserGuidePage() {
  return (
    <PageContainer>
      <Typography
        variant="h2"
        className="rungrade-flash"
        sx={{
          fontWeight: 800,
          letterSpacing: 2,
          fontSize: { xs: 28, sm: 36, md: 44 },
          textAlign: 'center',
          userSelect: 'none',
          fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
          lineHeight: 1.1,
          mb: 3,
        }}
      >
        RunGrade
      </Typography>
      <Typography sx={{ mb: 2, fontSize: 'inherit' }}>
  This app uses <b>Grade Adjusted Pace (GAP)</b> to power a suite of tools for planning your next ultra or race, and for analyzing your performance.
</Typography>
      <div
  style={{
    paddingLeft: 24,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 24,
    fontSize: 'inherit',
  }}
>
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
    <span role="img" aria-label="Single GPX" style={{ minWidth: 28, fontSize: 'inherit', marginRight: 16 }}>🏠</span>
    <span style={{ fontSize: 'inherit' }}><b>Single GPX:</b> Plan your next ultra – estimate total time, checkpoint splits, climb times, predict the weather through the race, and more!</span>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
    <span role="img" aria-label="Two GPX" style={{ minWidth: 28, fontSize: 'inherit', marginRight: 16 }}>🚀</span>
    <span style={{ fontSize: 'inherit' }}><b>Two GPX Files:</b> Compare two runners or runs side-by-side... who's climbed better? how big was the gap after an hour?</span>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
    <span role="img" aria-label="Racing Snakes" style={{ minWidth: 28, fontSize: 'inherit', marginRight: 16 }}>🐍</span>
    <span style={{ fontSize: 'inherit' }}><b>Racing Snakes:</b> Visualize races with up to 5 runners... a 10 hour race in 30 seconds!</span>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
    <span role="img" aria-label="Runner Profile" style={{ minWidth: 28, fontSize: 'inherit', marginRight: 16 }}>👤</span>
    <span style={{ fontSize: 'inherit' }}><b>Runner Profile:</b> Create your own grade adjusted pace model and understand where you could improve</span>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
    <span role="img" aria-label="GAP Detail" style={{ minWidth: 28, fontSize: 'inherit', marginRight: 16 }}>📐</span>
    <span style={{ fontSize: 'inherit' }}><b>G-A-P Detail:</b> Unpick the maths behind grade-adjusted pace.</span>
  </div>
</div>
      <Typography sx={{ mb: 2, fontSize: 'inherit' }}>
        <b>Tip:</b> Use <a href="https://www.sauce.llc/" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>Strava Sauce</a> to download others' race files.
      </Typography>
      <Typography sx={{ mb: 2, fontSize: 'inherit' }}>
  Need help? <a href="https://www.instagram.com/hughs_there/?hl=en" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>Contact Hugh</a>...<br />
  And consider supporting the effort (link bottom right)!
</Typography>
    </PageContainer>
  );
}