import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import MainPage from './MainPage';
import GPXComparisonPage from './GPXComparisonPage';
import GAPDetailpage from './GAPDetailpage';
import RacingSnakes from './RacingSnakes';
import RunnerProfilePage from './RunnerProfilePage'; // 🆕 Import new page
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import UserGuidePage from './UserGuidePage';
import { formatPoly4 } from './Components/StravadataCleaner';
import { useStravaPolyCoeffs } from './Components/StravadataCleaner';

// main app

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [polyCoeffs] = useStravaPolyCoeffs();

  // Map each route to a tab index - 🆕 Add runner-profile route
  const tabRoutes = ['/user-guide', '/single-gpx', '/multi-gpx', '/racing-snakes', '/runner-profile', '/detail'];
  const tabValue = tabRoutes.indexOf(location.pathname);
  const safeTabValue = tabValue === -1 ? 0 : tabValue;

  // --- Password Lock State ---
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('unlocked') === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Simple password (change as needed)
  const CORRECT_PASSWORD = 'EliteTrailTeam!';

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setUnlocked(true);
      localStorage.setItem('unlocked', 'true');
    } else {
      setError('Incorrect password');
    }
  };

  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <form onSubmit={handleUnlock} style={{ background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 16px #0001', minWidth: 320 }}>
          <h2 style={{ marginBottom: 16 }}>Enter Password</h2>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            style={{ width: '100%', padding: 8, fontSize: 18, marginBottom: 12, borderRadius: 4, border: '1px solid #ccc' }}
            autoFocus
          />
          <button type="submit" style={{ width: '100%', padding: 10, fontSize: 18, borderRadius: 4, background: '#1976d2', color: '#fff', border: 'none' }}>
            Unlock
          </button>
          {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
        </form>
      </div>
    );
  }

  return (
    <>
      <AppBar
        position="sticky"
        color="default"
        elevation={2}
        sx={{
          mb: 4,
          borderRadius: 3,
          maxWidth: 1200,
          mx: 'auto',
          mt: 3,
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 4px 24px rgba(30,41,59,0.07)',
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Tabs
              value={safeTabValue}
              onChange={(_, v) => navigate(tabRoutes[v])}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                '.MuiTab-root': {
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: 0.5,
                  borderRadius: 2,
                  minWidth: 180,
                  px: 3,
                  py: 1.5,
                  transition: 'background 0.2s',
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                },
                '.Mui-selected': {
                  background: 'rgba(37,99,235,0.10)',
                  color: 'primary.main',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
                },
              }}
              TabIndicatorProps={{
                style: { height: 4, borderRadius: 2 }
              }}
            >
              <Tab label={<span>📖 User Guide</span>} />
              <Tab label={<span>🏠 Single GPX File</span>} />
              <Tab label={<span>🚀 Two GPX Files</span>} />
              <Tab label={<span>🐍 Racing Snakes</span>} />
              <Tab label={<span>👤 Runner Profile</span>} /> {/* 🆕 New tab */}
              <Tab label={<span>📐 GAP Maths Detail</span>} />
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<Navigate to="/user-guide" replace />} />
        <Route path="/user-guide" element={<UserGuidePage />} />
        <Route path="/single-gpx" element={<MainPage />} />
        <Route path="/multi-gpx" element={<GPXComparisonPage />} />
        <Route path="/racing-snakes" element={<RacingSnakes />} />
        <Route path="/runner-profile" element={<RunnerProfilePage />} /> {/* 🆕 New route */}
        <Route
          path="/detail"
          element={
            <GAPDetailpage
              polyCoeffs={polyCoeffs}
              formatPoly4={formatPoly4}
            />
          }
        />
        {/* Catch-all route for any unmatched paths */}
        <Route path="*" element={<Navigate to="/user-guide" replace />} />
      </Routes>
    </>
  );
}

export default App;