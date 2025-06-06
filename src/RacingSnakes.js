import React, { useState, useRef, useEffect } from 'react';
import MapView from './Components/MapView';
import GPXParser from 'gpxparser';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Box
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useCesiumIframe } from './Components/CesiumRecentre';

const COLORS = ['orange', 'blue', 'red', 'green', 'purple'];


function formatElapsed(ms) {
  if (ms == null) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
}


export default function RacingSnakes() {
  const [show3D, setShow3D] = useState(false);
  const [routes, setRoutes] = useState([[], [], [], [], []]);
  const [distances, setDistances] = useState([[], [], [], [], []]);
  const [runnerNames, setRunnerNames] = useState([
    'Runner 1', 'Runner 2', 'Runner 3', 'Runner 4', 'Runner 5'
  ]);
  const [elapsedArr, setElapsedArr] = useState(['', '', '', '', '']);
  const [distanceArr, setDistanceArr] = useState(['', '', '', '', '']);
  const [sliderValue, setSliderValue] = useState(0);
  const [showPolyline, setShowPolyline] = useState([true, true, true, true, true]);
  

// Calculate max duration (ms) among all loaded runners
const maxDurationMs = Math.max(
  ...routes.map(route =>
    route.length > 1
      ? new Date(route[route.length - 1].time) - new Date(route[0].time)
      : 0
  )
);
  
const [gpxFileNames, setGpxFileNames] = useState(['', '', '', '', '']);

  // GPX file handler for each runner
  const handleFileChange = idx => e => {
    const file = e.target.files[0];
    if (!file) return;
    setGpxFileNames(prev => {
      const next = [...prev];
      next[idx] = file.name;
      return next;
    });
    const reader = new FileReader();
    reader.onload = function(event) {
      const gpx = new GPXParser();
      gpx.parse(event.target.result);
      const points = gpx.tracks[0]?.points || [];
      const routeData = points.map(pt => ({
        lat: pt.lat,
        lon: pt.lon,
        ele: pt.ele,
        time: pt.time,
      }));
      setRoutes(prev => {
        const next = [...prev];
        next[idx] = routeData;
        return next;
      });

      // Calculate distances
      let dists = [0];
      for (let i = 1; i < routeData.length; i++) {
        const R = 6371;
        const dLat = (routeData[i].lat - routeData[i-1].lat) * Math.PI / 180;
        const dLon = (routeData[i].lon - routeData[i-1].lon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(routeData[i-1].lat * Math.PI / 180) * Math.cos(routeData[i].lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        dists.push(dists[dists.length-1] + R * c);
      }
      setDistances(prev => {
        const next = [...prev];
        next[idx] = dists;
        return next;
      });
      setSliderValue(0);
    };
    reader.readAsText(file);
  };

  // Name input handler for each runner
  const handleNameChange = idx => e => {
    setRunnerNames(prev => {
      const next = [...prev];
      next[idx] = e.target.value;
      return next;
    });
  };

  // Calculate elapsed time and distance for slider for all runners
  useEffect(() => {
    setElapsedArr(prev => prev.map((_, idx) => {
      const route = routes[idx];
      if (route.length < 2) return '';
      const posIdx = Math.round(sliderValue * (route.length - 1));
      const start = route[0]?.time ? new Date(route[0].time) : null;
      const now = route[posIdx]?.time ? new Date(route[posIdx].time) : null;
      return start && now ? formatElapsed(now - start) : '';
    }));
    setDistanceArr(prev => prev.map((_, idx) => {
      const dists = distances[idx];
      const route = routes[idx];
      if (route.length < 2) return '';
      const posIdx = Math.round(sliderValue * (route.length - 1));
      return dists[posIdx] ? dists[posIdx].toFixed(2) : '0.00';
    }));
  }, [sliderValue, routes, distances]);

 

  // Prepare runners array for MapView
  const runners = [0,1,2,3,4].map(idx => {
    const route = routes[idx];
    const dists = distances[idx];
    if (!route.length) return {
      route, distances: dists, runnerName: runnerNames[idx], elapsed: '', distance: '', color: COLORS[idx], showPolyline: showPolyline[idx], posIdx: 0
    };

    


    // Find the point at (start time + sliderValue)
    let posIdx = 0;
    if (route.length > 1) {
      const startTime = new Date(route[0].time);
      const targetTime = new Date(startTime.getTime() + sliderValue);
      for (let i = 1; i < route.length; i++) {
        if (new Date(route[i].time) > targetTime) {
          posIdx = i - 1;
          break;
        }
        posIdx = i;
      }
    }




    // Calculate elapsed and distance for this runner at posIdx
    const start = route[0]?.time ? new Date(route[0].time) : null;
    const now = route[posIdx]?.time ? new Date(route[posIdx].time) : null;
    const elapsed = start && now ? formatElapsed(now - start) : '';
    const distance = dists[posIdx] ? dists[posIdx].toFixed(2) : '0.00';

    return {
      route,
      distances: dists,
      runnerName: runnerNames[idx],
      elapsed,
      distance,
      color: COLORS[idx],
      showPolyline: showPolyline[idx],
      posIdx,
    };
  });

  const { iframeRef, iframeLoaded, setIframeLoaded } = useCesiumIframe({
    show3D,
    runners,
    sliderValue,
    });


  // At least one route loaded?
  const anyRouteLoaded = routes.some(r => r.length > 1);

  return (
    <div style={{ maxWidth: 1200, margin: '32px auto', padding: 16 }}>
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
  <Typography variant="subtitle1" sx={{ fontWeight: 500, color: "#333", mr: 1, whiteSpace: 'nowrap', }}>
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
      whiteSpace: 'nowrap', // ensures text stays on one line
      transition: 'background 0.2s',
    }}
  >
    {show3D ? "Show 2D Map" : "Show 3D Map"}
  </Button>
</Box>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <input
          type="range"
          min={0}
          max={maxDurationMs}
          step={1000}
          value={sliderValue}
          disabled={!anyRouteLoaded}
          onChange={e => setSliderValue(Number(e.target.value))}
          style={{ width: 1200 }}
        />
        <span style={{ marginLeft: 8 }}>
          {formatElapsed(sliderValue)}
        </span>
      </div>
      <div style={{ marginBottom: 12 }}>
        {runners.map((runner, idx) =>
          runner.route.length > 1 ? (
            <span key={idx} style={{ marginRight: 18, color: COLORS[idx], fontWeight: 500 }}>
              {runner.runnerName}: {runner.distance} km ({runner.elapsed})
            </span>
          ) : null
        )}
      </div>
      <div
  style={{
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 16,
    marginBottom: 16,
    overflowX: 'auto',
    width: '100%',
  }}
>
  {[0,1,2,3,4].map(idx => (
    <Card key={idx} sx={{ minWidth: 170, maxWidth: 190, background: '#f7f7fa', boxShadow: 2, flex: '0 0 auto' }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: COLORS[idx], fontWeight: 700, mb: 1 }}>
          Runner {idx + 1}
        </Typography>
        <Button
          variant={gpxFileNames[idx] ? "contained" : "outlined"}
          color={gpxFileNames[idx] ? "success" : "primary"}
          component="label"
          startIcon={<UploadFileIcon />}
          sx={{ mb: 1, width: '100%' }}
        >
          {gpxFileNames[idx] ? gpxFileNames[idx] : "Upload GPX"}
          <input
            type="file"
            accept=".gpx"
            hidden
            onChange={handleFileChange(idx)}
          />
        </Button>
        <TextField
          label="Name"
          size="small"
          value={runnerNames[idx]}
          onChange={handleNameChange(idx)}
          fullWidth
          sx={{ mb: 1 }}
          InputProps={{
            style: { borderColor: COLORS[idx] }
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showPolyline[idx]}
              onChange={e => {
                setShowPolyline(prev => {
                  const next = [...prev];
                  next[idx] = e.target.checked;
                  return next;
                });
              }}
              sx={{ color: COLORS[idx] }}
            />
          }
          label="Show Polyline"
        />
      </CardContent>
    </Card>
  ))}
</div>
      <div style={{ width: '100%', height: 600, borderRadius: 8, overflow: 'hidden' }}>
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
            runners={runners}
            sliderValue={sliderValue}
            downsample={false}
            checkpoints={[]}
          />
        )}
      </div>
    </div>
  );
}