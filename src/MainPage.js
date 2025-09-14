import React, { useState, useMemo, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Typography from '@mui/material/Typography';
import ConfigPanel from './Components/ConfigPanel';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  findMajorClimbs,
  getTotalTime,
  getTotalDistance,
  getTotalElevationGain,
  getAveragePace,
  smoothElevations 
} from './Components/gpxAnalysis';
import ElevationProfile from './Components/ElevationProfile';
import MapView from './Components/MapView';
import ClimbsTable from './Components/ClimbsTable';
import CheckpointsTable from './Components/CheckpointsTable';
import { formatPoly4 } from './Components/StravadataCleaner';
import { getAnalysisBins } from './Components/GPXGapanalysis';
import PaceAnalysisPlot from './Components/PaceAnalysisPlot';
import StatsSummary from './Components/StatsSummary';
import GPXParser from "gpxparser";
import { useStravaPolyCoeffs } from './Components/StravadataCleaner';
import { useCesiumIframe } from './Components/CesiumRecentre';
import WeatherPredictor from './Components/WeatherPredictor';

function MainPage() {
  const [route, setRoute] = useState([]); // single route
  const [fullRoute, setFullRoute] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [minGain, setMinGain] = useState(50);
  const [maxLoss, setMaxLoss] = useState(20);
  const [checkpoints, setCheckpoints] = useState([]);
  const [downsample, setDownsample] = useState(false);
  const [downsampleFactor, setDownsampleFactor] = useState(20);
  const [bins, setBins] = useState([]);
  const [removePauses, setRemovePauses] = useState(false);
  const [pauseThreshold, setPauseThreshold] = useState(120); // default 120 seconds
  const [pauseTimeRemoved, setPauseTimeRemoved] = useState(0);
  const [inputGapMin, setInputGapMin] = useState(5); 
  const [inputGapSec, setInputGapSec] = useState(0); 
  const [selectedFileName, setSelectedFileName] = useState('');
  const [binLength, setBinLength] = useState(50); // default 50m
  const [smoothElevation, setSmoothElevation] = useState(false);
  const [smoothingWindow, setSmoothingWindow] = useState(7);
  const [climbs, setClimbs] = useState([]); // Only declare once
  const [polyCoeffs] = useStravaPolyCoeffs();
  const [show3D, setShow3D] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [noTimeData, setNoTimeData] = useState(false);

  // Convert input pace (min:sec/km) to m/s
  const inputGapPaceMs = useMemo(() => {
    const totalSeconds = Number(inputGapMin) * 60 + Number(inputGapSec);
    return totalSeconds > 0 ? 1000 / totalSeconds : 0;
  }, [inputGapMin, inputGapSec]);

  // GPX file upload and parsing
  const handleFileChange = (e) => {
    console.log("File upload handler running. removePauses:", removePauses);
    const file = e.target.files[0];
    setSelectedFileName(file ? file.name : '');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const gpx = new GPXParser();
      gpx.parse(event.target.result);

      // Use the first track's points
      let rawPoints = gpx.tracks?.[0]?.points || [];
      if (!rawPoints.length && gpx.routes?.[0]?.points?.length) {
        rawPoints = gpx.routes[0].points;
      }
      if (!rawPoints.length) {
        alert('No track or route data found in GPX file.');
        setFullRoute([]);
        setStats(null);
        setBins([]);
        return;
      }

      // Convert time strings to Date objects if possible
      // When mapping points, allow time to be null if missing
      let points = rawPoints.map(pt => ({
        ...pt,
        time: pt.time
          ? (typeof pt.time === 'string'
              ? new Date(pt.time)
              : pt.time instanceof Date
                ? pt.time
                : null)
          : null // <-- allow null time
      }));

      // Remove pauses if enabled
      if (removePauses && points.length > 1) {
        console.log("Pause removal block entered. Points:", points.length);
        let adjustedPoints = [points[0]];
        let totalPause = 0;
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          if (
            prev.time instanceof Date &&
            curr.time instanceof Date &&
            !isNaN(prev.time) &&
            !isNaN(curr.time)
          ) {
            const delta = (curr.time - prev.time) / 1000;
            if (delta > pauseThreshold) {
              totalPause += delta;
              console.log(`Pause detected: ${delta}s between point ${i-1} and ${i}`);
            }
            adjustedPoints.push({
              ...curr,
              time: new Date(curr.time.getTime() - totalPause * 1000)
            });
          } else {
            adjustedPoints.push(curr);
          }
        }
        points = adjustedPoints;
        setPauseTimeRemoved(totalPause);
        console.log(`Total pause time removed: ${totalPause}s`);
      } else {
        setPauseTimeRemoved(0); // No pauses removed
      }

      setFullRoute(points);

      // Use gpxAnalysis helpers for stats
      setStats({
        totalTime: getTotalTime(points),
        distance: getTotalDistance(points),
        elevationGain: getTotalElevationGain(points),
        averagePace: getAveragePace(points)
      });
    };
    reader.readAsText(file);
    e.target.value = null; // Reset file input so same file can be re-uploaded
  };

  // Memoized processed route (downsampling and smoothing)
  const processedRoute = useMemo(() => {
    let pts = fullRoute;
    if (downsample && downsampleFactor > 1) {
      pts = pts.filter((_, idx) => idx % downsampleFactor === 0);
    }
    if (smoothElevation) {
      pts = smoothElevations(pts, smoothingWindow);
    }
    return pts;
  }, [fullRoute, downsample, downsampleFactor, smoothElevation, smoothingWindow]);

  // Memoized bins
  const binsMemo = useMemo(() =>
    getAnalysisBins(processedRoute, binLength, polyCoeffs, inputGapPaceMs),
    [processedRoute, binLength, polyCoeffs, inputGapPaceMs]
  );

  // Memoized climbs
  const climbsMemo = useMemo(() =>
    (processedRoute.length > 0 && processedRoute.every(pt => typeof pt === 'object'))
      ? findMajorClimbs(
          processedRoute.map(pt => [pt.lat, pt.lon, pt.ele, pt.time]),
          { minGain, maxLoss }
        )
      : [],
    [processedRoute, minGain, maxLoss]
  );

  // Memoized stats
  const statsMemo = useMemo(() => ({
    totalTime: getTotalTime(processedRoute),
    distance: getTotalDistance(processedRoute),
    elevationGain: getTotalElevationGain(processedRoute),
    averagePace: getAveragePace(processedRoute)
  }), [processedRoute]);

  // Update route when processedRoute changes
  useEffect(() => {
    setRoute(processedRoute);
  }, [processedRoute]);

  // Update bins, climbs, stats when processedRoute or config changes
  useEffect(() => {
    setBins(binsMemo);
    setClimbs(climbsMemo);
    setStats(statsMemo);
  }, [binsMemo, climbsMemo, statsMemo]);

  // Calculate distances
  const distances = useMemo(() => {
    const toRad = deg => deg * Math.PI / 180;
    let totalDist = 0;
    const filteredPoints = route.filter(pt => typeof pt.lat === 'number' && typeof pt.lon === 'number');
    return filteredPoints.map((pt, i, arr) => {
      if (i > 0) {
        const R = 6371000;
        const dLat = toRad(pt.lat - arr[i-1].lat);
        const dLon = toRad(pt.lon - arr[i-1].lon);
        const a = Math.sin(dLat/2)**2 +
          Math.cos(toRad(arr[i-1].lat)) * Math.cos(toRad(pt.lat)) *
          Math.sin(dLon/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDist += R * c;
      }
      return totalDist / 1000; // in km
    });
  }, [route]);

  
  // Reset map zoom flag on component mount
  useEffect(() => {
    if (window.mapHasZoomedToStart) {
      window.mapHasZoomedToStart.current = false;
    }
  }, []);



  // Auto-populate checkpoints when route changes
  useEffect(() => {
    if (route.length > 0) {
      const start = { km: 0, name: 'Start' };
      const end = { km: Number((distances[distances.length - 1] || 0).toFixed(2)), name: 'End' };
      // Only add if not already present
      setCheckpoints(prev => {
        const hasStart = prev.some(cp => cp.name === 'Start');
        const hasEnd = prev.some(cp => cp.name === 'End');
        let newCps = [...prev];
        if (!hasStart) newCps = [start, ...newCps];
        if (!hasEnd) newCps = [...newCps, end];
        return newCps;
      });
    }
  }, [route, distances]);

  const runners = [{
    route,
    distances,
    runnerName: selectedFileName || "Route",
    color: "blue",
    showPolyline: true,
    posIdx: route.length - 1,
  }];

  const { iframeRef, setIframeLoaded } = useCesiumIframe({
    show3D,
    runners, 
    sliderValue: 0,    // or actual slider value
    selectedFileName,
    route,
    distances,
  });

  return (
    <div style={{ width: '100vw', padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <ToggleButtonGroup
          value={noTimeData ? "planning" : "reviewing"}
          exclusive
          onChange={(_, value) => {
            if (value === "planning") setNoTimeData(true);
            if (value === "reviewing") setNoTimeData(false);
          }}
          sx={{
            background: 'linear-gradient(90deg, #e3f2fd 0%, #f8fafc 100%)',
            borderRadius: 2,
            boxShadow: 1,
            px: 2,
            py: 1,
          }}
        >
          <ToggleButton
            value="planning"
            selected={noTimeData}
            sx={{
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1.2,
              backgroundColor: noTimeData ? 'primary.main' : 'transparent',
              color: noTimeData ? '#fff' : '#333',
              border: noTimeData ? '2px solid #1976d2' : '2px solid transparent',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: '#fff',
                border: '2px solid #1976d2',
              },
              '&:hover': {
                backgroundColor: noTimeData ? '#1565c0' : '#e3f2fd',
              },
            }}
          >
            Planning a run
          </ToggleButton>
          <ToggleButton
            value="reviewing"
            selected={!noTimeData}
            sx={{
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1.2,
              backgroundColor: !noTimeData ? 'primary.main' : 'transparent',
              color: !noTimeData ? '#fff' : '#333',
              border: !noTimeData ? '2px solid #1976d2' : '2px solid transparent',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: '#fff',
                border: '2px solid #1976d2',
              },
              '&:hover': {
                backgroundColor: !noTimeData ? '#1565c0' : '#e3f2fd',
              },
            }}
          >
            Reviewing a run
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'primary.main',
          textAlign: 'center',
          px: 2,
          py: 1,
          borderRadius: 2,
          background: 'linear-gradient(90deg, #e3f2fd 0%, #f8fafc 100%)',
          boxShadow: 1,
          fontSize: { xs: 20, sm: 26 },
          mb: 3,
        }}
      >
        File Upload
      </Typography>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
       
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start', // <-- ensures tops are aligned
          justifyContent: 'center',
          gap: 40,
          width: '100%',
          maxWidth: 1200,
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: 0,
        }}
      >
        {/* Logo on the left */}
        <div
          style={{
            minHeight: 500,
            maxHeight: 500,
            minWidth: 280,
            maxWidth: 280,
            display: 'flex',
            alignItems: 'flex-start', // <-- aligns image to top
            justifyContent: 'center',
            background: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          <img
            src={process.env.PUBLIC_URL + '/logo192.png'}
            alt="RunGrade Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              display: 'block',
            }}
          />
        </div>

        {/* Config panel on the right */}
        <ConfigPanel
          showGapInput={true}
          handleFileChange={handleFileChange}
          selectedFileName={selectedFileName}
          inputGapMin={inputGapMin}
          setInputGapMin={setInputGapMin}
          inputGapSec={inputGapSec}
          setInputGapSec={setInputGapSec}
          inputGapPaceMs={inputGapPaceMs}
          downsample={downsample}
          setDownsample={setDownsample}
          downsampleFactor={downsampleFactor}
          setDownsampleFactor={setDownsampleFactor}
          removePauses={removePauses}
          setRemovePauses={setRemovePauses}
          pauseThreshold={pauseThreshold}
          panelMinHeight={500}
          setPauseThreshold={setPauseThreshold}
          smoothElevation={smoothElevation}
          setSmoothElevation={setSmoothElevation}
          smoothingWindow={smoothingWindow}
          setSmoothingWindow={setSmoothingWindow}
          binLength={binLength}
          setBinLength={setBinLength}
        />
      </div>

      {stats && <StatsSummary stats={stats} bins={bins} route={route} pauseTimeRemoved={pauseTimeRemoved} checkpoints={checkpoints} noTimeData={noTimeData} />}

      <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
        <div>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 3,
              p: 2,
              borderRadius: 2,
              boxShadow: 2,
              background: '#f8fafc',
              maxWidth: 300,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: "#333", mr: 1, whiteSpace: 'nowrap' }}>
              Toggle map:
            </Typography>
            <Button
              variant="contained"
              color={show3D ? "success" : "primary"}
              onClick={() => setShow3D(v => !v)}
              sx={{
                fontWeight: 700,
                fontSize: 16,
                px: 3,
                py: 1.2,
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
            >
              {show3D ? "Show 2D Map" : "Show 3D Map"}
            </Button>
          </Box>
          <div style={{ width: '100%', minHeight: 240, height: '48vh', marginBottom: 24 }}>
            {show3D ? (
              <iframe
                ref={iframeRef}
                src={process.env.PUBLIC_URL + '/racing-snakes-cesium.html'}
                title="Racing Snakes Cesium"
                style={{ width: '100%', height: '100%', border: 'none' }}
                onLoad={() => setIframeLoaded(true)}
              />
            ) : (
              <MapView
                route={route.filter(pt => typeof pt.lat === 'number' && typeof pt.lon === 'number')}
                distances={distances}
                selectedIdx={selectedIdx}
                setSelectedIdx={setSelectedIdx}
                downsample={downsample}
                downsampleFactor={downsampleFactor}
                checkpoints={checkpoints}
                selectedSection={selectedSection}
              />
            )}
          </div>
          <ElevationProfile
              points={fullRoute.map(pt => [pt.lat, pt.lon, pt.ele])}
              fullRoute={fullRoute}
              selectedLat={selectedIdx != null ? fullRoute[selectedIdx].lat : null}
              selectedLon={selectedIdx != null ? fullRoute[selectedIdx].lon : null}
              checkpoints={checkpoints}
              onPointSelect={setSelectedIdx}
              onSectionSelect={setSelectedSection}
              />
        </div>
      </div>

      <div style={{ width: '100%', margin: '32px auto 0 auto' }}>
        <CheckpointsTable
          checkpoints={checkpoints}
          setCheckpoints={setCheckpoints}
          route={route}
          distances={distances}
          bins={bins}
          inputGapMin={inputGapMin}
          inputGapSec={inputGapSec}
          noTimeData={noTimeData}
        />
      </div>
      <ClimbsTable
        climbs={climbs}
        minGain={minGain}
        setMinGain={setMinGain}
        maxLoss={maxLoss}
        setMaxLoss={setMaxLoss}
        route={fullRoute}
        bins={bins}
        newAdjustedVelocity={inputGapPaceMs}
        noTimeData={noTimeData}
      />

      {/* Grey line separator */}
      <hr style={{
        width: '100%',
        margin: '32px auto 24px auto',
        border: 0,
        borderTop: '2px solid #e0e0e0'
      }} />

      {/* Pace Analysis Section */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '0' }}>
        <div style={{ width: '100%' }}>
          <PaceAnalysisPlot bins={bins} route={route} polyCoeffs={polyCoeffs} formatPoly4={formatPoly4} checkpoints={checkpoints} noTimeData={noTimeData} />
        </div>
      </div>

      {/* Grey line separator */}
      <hr style={{
        width: '100%',
        maxWidth: 1800,
        margin: '32px auto 24px auto',
        border: 0,
        borderTop: '2px solid #e0e0e0'
      }} />

      {/* Weather Predictor Section */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '0' }}>
        <div style={{ width: '100%' }}>
          <WeatherPredictor 
            route={route}
            bins={bins}
            checkpoints={checkpoints}
          />
        </div>
      </div>

      
    </div>
  );
}

export default MainPage;