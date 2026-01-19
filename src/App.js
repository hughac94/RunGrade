import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import MainPage from './MainPage';
import GPXComparisonPage from './GPXComparisonPage';
import GAPDetailpage from './GAPDetailpage';
import RacingSnakes from './RacingSnakes';
import RunnerProfilePage from './RunnerProfilePage';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import UserGuidePage from './UserGuidePage';
import { formatPoly4 } from './Components/StravadataCleaner';
import { useStravaPolyCoeffs } from './Components/StravadataCleaner';
import TreadmillCalculator from './TreadmillCalculator';


// --- Support Button and Popup ---
function SupportButtonAndPopup() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('bmcPopupShown');
    if (!alreadyShown) {
      const timer = setTimeout(() => {
        setShowPopup(true);
        sessionStorage.setItem('bmcPopupShown', 'true');
      }, 180000); // 3 minutes
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      {/* Permanent button */}
      <a
        href="https://www.buymeacoffee.com/hughchat"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          background: '#FFDD00',
          color: '#333',
    padding: '12px 22px',
    borderRadius: 24,
    fontWeight: 700,
    boxShadow: '0 2px 8px #0002',
    textDecoration: 'none',
    fontSize: 16,
    textAlign: 'center', // <-- center align
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
        }}
      >
  Enjoying the app? <br />
  <span style={{ fontSize: 18, marginTop: 4 }}>
    💷 Click here to contribute
  </span>
</a>

      {/* Timed pop-up */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          padding: 32,
          borderRadius: 16,
          boxShadow: '0 4px 32px #0003',
          zIndex: 1001,
          maxWidth: 340,
          textAlign: 'center',
        }}>
          <h3 style={{ marginTop: 0 }}>Enjoying RunGrade?</h3>
          <p>I hope so! I've put a  bunch of hours into building the tool. Please consider supporting!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <a
              href="https://www.buymeacoffee.com/hughchat"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: '#FFDD00',
                color: '#333',
                padding: '10px 18px',
                borderRadius: 20,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 18,
              }}
            >
              💷 Click here to contribute
            </a>
            <button
              onClick={() => setShowPopup(false)}
              style={{
                padding: '10px 18px',
                borderRadius: 20,
                border: 'none',
                background: '#eee',
                color: '#333',
                fontWeight: 500,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              No thanks, not right now
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// --- Main App ---
function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [polyCoeffs] = useStravaPolyCoeffs();

  const tabRoutes = ['/user-guide', '/single-gpx', '/multi-gpx', '/racing-snakes', '/runner-profile', '/detail', '/treadmill'];
  const tabValue = tabRoutes.indexOf(location.pathname);
  const safeTabValue = tabValue === -1 ? 0 : tabValue;

  return (
    <>
      <AppBar
  position="sticky"
  color="transparent"
  elevation={0}
  sx={{
    mb: 4,
    borderRadius: 0,
    maxWidth: 'none',
    mx: 0,
    mt: 3,
    background: 'transparent',
    boxShadow: 'none',
  }}
>
  <Toolbar sx={{ minHeight: 64, px: 2 }}>
    {/* Center the tabs by constraining width */}
    <Box sx={{ width: '100%' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Tabs
          value={safeTabValue}
          onChange={(_, v) => navigate(tabRoutes[v])}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          sx={{
            px: 0,
            '.MuiTabs-flexContainer': { gap: 4 },
            '.MuiTab-root': {
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: 0.3,
              borderRadius: 2,
              minWidth: 140,
              px: 2,
              py: 1.2,
              textTransform: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
            },
            '.Mui-selected': {
              background: 'transparent',
              color: 'primary.main',
              boxShadow: 'none',
            },
          }}
          TabIndicatorProps={{ style: { height: 4, borderRadius: 2 } }}
        >
          <Tab label={<span>📖 User Guide</span>} />
          <Tab label={<span>🏠 Single GPX</span>} />
          <Tab label={<span>🚀 Two GPX Files</span>} />
          <Tab label={<span>🐍 Racing Snakes</span>} />
          <Tab label={<span>👤 Runner Profile</span>} />
          <Tab label={<span>📐 "G-A-P" Detail</span>} />
          <Tab label={<span>🏃‍♂️ Treadmill Calculator</span>} />
        </Tabs>
      </Box>
    </Box>
  </Toolbar>
</AppBar>
      <Routes>
        <Route path="/" element={<Navigate to="/user-guide" replace />} />
        <Route path="/user-guide" element={<UserGuidePage />} />
        <Route path="/single-gpx" element={<MainPage />} />
        <Route path="/multi-gpx" element={<GPXComparisonPage />} />
        <Route path="/racing-snakes" element={<RacingSnakes />} />
        <Route path="/runner-profile" element={<RunnerProfilePage />} />
        <Route
          path="/detail"
          element={
            <GAPDetailpage
              polyCoeffs={polyCoeffs}
              formatPoly4={formatPoly4}
            />
          }
        />
        <Route path="/treadmill" element={<TreadmillCalculator />} />
        <Route path="*" element={<Navigate to="/user-guide" replace />} />
      </Routes>
      <SupportButtonAndPopup />
    </>
  );
}

export default App;