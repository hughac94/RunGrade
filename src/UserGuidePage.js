import React from 'react';
import Box from '@mui/material/Box';
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
      <Typography sx={{ mb: 2, fontWeight: 600, fontSize: 'inherit' }}>
        Welcome to RunGrade - Hugh's GPX analysis app for ultrarunning!
      </Typography>
      <Typography sx={{ mb: 3, fontSize: 'inherit' }}>
        The app is broken up into a few pages:
      </Typography>
      <ol style={{ paddingLeft: 24, fontSize: 'inherit' }}>
        <li style={{ marginBottom: 16 }}>
          <b>Single GPX File:</b> Upload and analyze a single run you have done or route you have yet to do. See key route stats, 2d and 3d visualisations, analyse the key climbs, see time spent at different gradients, predict checkpoint and route times using GAP / Grade-Adjusted Pace!
        </li>
        <li style={{ marginBottom: 16 }}>
          <b>Two GPX Files:</b> Compare two runs side-by-side. You vs. past you? You vs. the race winner? See differences in pace, time, uphill/downhill speeds, and relative speed as the race progressed.
        </li>
        <li style={{ marginBottom: 16 }}>
          <b>Racing Snakes:</b> Visualize in 2 or 3d a past race with up to 5 runners, using a slider to see how the race unfolded and where people were at key points. Dive into a 3d mode to see exactly where all the runners were at any point.
        </li>
        <li style={{ marginBottom: 16 }}>
          <b>GAP Maths Detail:</b> Dive into the math behind GAP, or grade-adjusted pace, calculations. These power estimations for time taken on hilly mountainous routes when GCSE maths won't cut it!
        </li>
      </ol>
      <Typography sx={{ mb: 3, fontSize: 'inherit' }}>
        <b>Tips:</b>
        <ul style={{ paddingLeft: 24, fontSize: 'inherit' }}>
          <li>Some GPX files are notty and full of bugs. The app has some in-built, 'advanced' cleaning and parsing tools which often - not always! - help</li>
          <li>In 3D maps, hold ctrl and click and drag to change your N-S orientation and see mountains side on</li>
          <li>Remember GAP is just an estimate based on data, it's never going to account for all the nuances of a race or course</li>
        </ul>
      </Typography>
      <Typography sx={{ mb: 3, fontSize: 'inherit' }}>
        <b>Pro Tips:</b> <i>- Where just normal tips don't cut it</i>
        <ul style={{ paddingLeft: 24, fontSize: 'inherit' }}>
          <li style={{ marginBottom: 16 }}>
            <b>Finding GPX files:</b> Use <a href="https://www.sauce.llc/" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>Strava Sauce</a> to find and download GPX files from your friends, enemies, idols, and competitors from their Strava pages
          </li>
        </ul>
      </Typography>
      <Typography sx={{ mb: 3, fontSize: 'inherit' }}>
        For more help, contact Hugh!
      </Typography>
    </PageContainer>
  );
}