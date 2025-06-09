import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import ConfigPanel from './Components/ConfigPanel';
import Divider from '@mui/material/Divider';
import PaceByGradientScatter from './Components/PaceByGradientChart';
import Box from '@mui/material/Box';
import KeyComparisonStats from './Components/KeyComparisonStats';
import { getAnalysisBins } from './Components/GPXGapanalysis';
import { haversine } from './Components/gpxAnalysis';
import GPXParser from 'gpxparser';
import GradeAdjustedPaceBySegmentChart from './Components/GradeAdjustedPaceBySegmentChart';
import {
  getTotalDistance,
  getTotalTime,
  getTotalElevationGain,
  getAveragePace,
  removePauses,
  smoothElevations
} from './Components/gpxAnalysis';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import { useStravaPolyCoeffs } from './Components/StravadataCleaner';
import CheckpointsComparisonTable from './Components/CheckpointsComparisonTable';

// helper functions for trimming and snapping

function filterByDistance(points, startKm, endKm) {
  return points.filter(pt =>
    typeof pt.distance === 'number' &&
    pt.distance >= startKm * 1000 &&
    pt.distance <= endKm * 1000
  );
}





// Helper to add cumulative distance to each point
function addCumulativeDistance(points) {
  let total = 0;
  return points.map((pt, i, arr) => {
    if (i > 0) {
      total += haversine(arr[i - 1].lat, arr[i - 1].lon, pt.lat, pt.lon);
    }
    return { ...pt, distance: total };
  });
}

export default function GPXComparisonPage() {
  // State for File 1 - Remove unused file1 state
  // const [file1, setFile1] = useState(null);  // Remove this line
  const [file1Name, setFile1Name] = useState('');
  const [fullRoute1, setFullRoute1] = useState([]);
  const [route1Base, setRoute1Base] = useState([]);
  const [route1, setRoute1] = useState([]);
  const [stats1, setStats1] = useState(null);
  const [downsample1, setDownsample1] = useState(false);
  const [downsampleFactor1, setDownsampleFactor1] = useState(5);
  const [binLength1, setBinLength1] = useState(50);
  const [removePauses1, setRemovePauses1] = useState(false);
  const [pauseThreshold1, setPauseThreshold1] = useState(120);
  const [smoothElevation1, setSmoothElevation1] = useState(false);
  const [smoothingWindow1, setSmoothingWindow1] = useState(5);
  const [polyCoeffs] = useStravaPolyCoeffs();
  const [inputGapMin1, setInputGapMin1] = useState(4);
  const [inputGapSec1, setInputGapSec1] = useState(30);
  const [inputGapPaceMs1, setInputGapPaceMs1] = useState(0);
  const [bins1, setBins1] = useState([]);
  
  // State for File 2 - Remove unused file2 state
  // const [file2, setFile2] = useState(null);  // Remove this line
  const [file2Name, setFile2Name] = useState('');
  const [fullRoute2, setFullRoute2] = useState([]);
  const [route2Base, setRoute2Base] = useState([]);
  const [route2, setRoute2] = useState([]);
  const [stats2, setStats2] = useState(null);
  const [downsample2, setDownsample2] = useState(false);
  const [downsampleFactor2, setDownsampleFactor2] = useState(5);
  const [binLength2, setBinLength2] = useState(50);
  const [removePauses2, setRemovePauses2] = useState(false);
  const [pauseThreshold2, setPauseThreshold2] = useState(120);
  const [smoothElevation2, setSmoothElevation2] = useState(false);
  const [smoothingWindow2, setSmoothingWindow2] = useState(5);
  const [inputGapMin2, setInputGapMin2] = useState(4);
  const [inputGapSec2, setInputGapSec2] = useState(30);
  const [inputGapPaceMs2, setInputGapPaceMs2] = useState(0);
  const [bins2, setBins2] = useState([]);
  const [snapAndTrim, setSnapAndTrim] = useState(false);
  const [range, setRange] = useState([0, 1]); // [startKm, endKm]

  const [runner1Name, setRunner1Name] = useState('Runner 1');
  const [runner2Name, setRunner2Name] = useState('Runner 2');

  const FILE1_COLOR = '#1976d2'; // Blue
  const FILE2_COLOR = '#43a047'; // Green 

// Not needed for maths, but ensure bins are defined 
useEffect(() => {
  const totalSeconds = Number(inputGapMin1) * 60 + Number(inputGapSec1);
  setInputGapPaceMs1(totalSeconds > 0 ? 1000 / totalSeconds : 3.7); // 3.7 m/s = 4:30 min/km default
}, [inputGapMin1, inputGapSec1]);
useEffect(() => {
  const totalSeconds = Number(inputGapMin2) * 60 + Number(inputGapSec2);
  setInputGapPaceMs2(totalSeconds > 0 ? 1000 / totalSeconds : 3.7);
}, [inputGapMin2, inputGapSec2]);

  // GPX file upload and parsing for File 1
  const handleFileChange1 = (e) => {
    const file = e.target.files[0];
    // setFile1(file);  // Remove this line
    setFile1Name(file ? file.name : '');
    if (!file) {
      setFullRoute1([]);
      setStats1(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const gpx = new GPXParser();
        gpx.parse(event.target.result);
        console.log('gpx.tracks:', gpx.tracks);
        let rawPoints = gpx.tracks?.[0]?.points;
        console.log('rawPoints:', rawPoints);
        if (rawPoints && rawPoints.length) {
          console.log('rawPoints[0]:', rawPoints[0]);
        } else {
          console.warn('No points found in GPX file!');
        }
        let points = Array.isArray(rawPoints)
          ? rawPoints.map(pt => ({
              ...pt,
              time: pt.time ? new Date(pt.time) : null
            }))
          : [];
        points = addCumulativeDistance(points);
        setFullRoute1(points);
      } catch (err) {
        setFullRoute1([]);
        setStats1(null);
      }
    };
    reader.readAsText(file);
  };

  // GPX file upload and parsing for File 2
  const handleFileChange2 = (e) => {
    const file = e.target.files[0];
    // setFile2(file);  // Remove this line
    setFile2Name(file ? file.name : '');
    if (!file) {
      setFullRoute2([]);
      setStats2(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const gpx = new GPXParser();
        gpx.parse(event.target.result);
        let rawPoints = gpx.tracks?.[0]?.points;
        let points = Array.isArray(rawPoints)
          ? rawPoints.map(pt => ({
              ...pt,
              time: pt.time ? new Date(pt.time) : null
            }))
          : [];
        points = addCumulativeDistance(points);
        setFullRoute2(points);
      } catch (err) {
        setFullRoute2([]);
        setStats2(null);
      }
    };
    reader.readAsText(file);
  };

  
  // Process File 1
  useEffect(() => {
    let pts = fullRoute1;
    if (downsample1 && downsampleFactor1 > 1) {
      pts = pts.filter((_, idx) => idx % downsampleFactor1 === 0);
    }
    if (removePauses1 && pts.length > 1) {
      pts = removePauses(pts, pauseThreshold1);
    }
    if (smoothElevation1) {
      pts = smoothElevations(pts, smoothingWindow1);
    }
    setRoute1Base(pts);
  }, [fullRoute1, downsample1, downsampleFactor1, removePauses1, pauseThreshold1, smoothElevation1, smoothingWindow1]);

  // Process File 2
  useEffect(() => {
    let pts = fullRoute2;
    if (downsample2 && downsampleFactor2 > 1) {
      pts = pts.filter((_, idx) => idx % downsampleFactor2 === 0);
    }
    if (removePauses2 && pts.length > 1) {
      pts = removePauses(pts, pauseThreshold2);
    }
    if (smoothElevation2) {
      pts = smoothElevations(pts, smoothingWindow2);
    }
    setRoute2Base(pts);
  }, [fullRoute2, downsample2, downsampleFactor2, removePauses2, pauseThreshold2, smoothElevation2, smoothingWindow2]);

  

  // Process route2 when toggles/settings change
  useEffect(() => {
    let pts1 = route1Base;
    let pts2 = route2Base;
    if (snapAndTrim && pts1.length && pts2.length) {
      // Trim both to the shorter distance
      const dist1 = pts1[pts1.length - 1].distance || 0;
      const dist2 = pts2[pts2.length - 1].distance || 0;
      const minDist = Math.min(dist1, dist2);

      const trimRoute = (route) => route.filter(pt => (pt.distance || 0) <= minDist);

      const trimmed1 = trimRoute(pts1);
      const trimmed2 = trimRoute(pts2);

      // For each point in trimmed2 (file 2, the shorter), find the closest point in trimmed1 (file 1) by distance
      const snapped2 = trimmed2.map(pt2 => {
        let closest = trimmed1[0];
        let minDelta = Math.abs((pt2.distance || 0) - (closest.distance || 0));
        for (let i = 1; i < trimmed1.length; i++) {
          const delta = Math.abs((pt2.distance || 0) - (trimmed1[i].distance || 0));
          if (delta < minDelta) {
            minDelta = delta;
            closest = trimmed1[i];
          }
        }
        // Use file 1's lat/lon/ele/distance, but file 2's time
        return {
          ...pt2,
          lat: closest.lat,
          lon: closest.lon,
          ele: closest.ele,
          distance: closest.distance
        };
      });

      setRoute1(trimmed1);    // trimmed file 1 (reference)
      setRoute2(snapped2);    // file 2: time from file 2, elevation/distance from file 1
    } else {
      setRoute1(route1Base);
      setRoute2(route2Base);
    }
  }, [route1Base, route2Base, snapAndTrim]);

  useEffect(() => {
  console.log('route1 for bins', route1);
  console.log('polyCoeffs', polyCoeffs);
  console.log('binLength1', binLength1);
    if (route1.length && polyCoeffs) {
      const safeRoute1 = route1.map(pt => ({
        ...pt,
        time: pt.time instanceof Date ? pt.time : (pt.time ? new Date(pt.time) : null)
      }));
      setBins1(getAnalysisBins(safeRoute1, binLength1, polyCoeffs, inputGapPaceMs1));
    } else {
      setBins1([]);
    }
  }, [route1, binLength1, polyCoeffs, inputGapPaceMs1]);

  useEffect(() => {
    if (route2.length && polyCoeffs) {
      const safeRoute2 = route2.map(pt => ({
        ...pt,
        time: pt.time instanceof Date ? pt.time : (pt.time ? new Date(pt.time) : null)
      }));
      setBins2(getAnalysisBins(safeRoute2, binLength2, polyCoeffs, inputGapPaceMs2));
    } else {
      setBins2([]);
    }
  }, [route2, binLength2, polyCoeffs, inputGapPaceMs2]);

  

  useEffect(() => {
  
  setStats1(route1.length ? {
    distance: getTotalDistance(route1),
    time: getTotalTime(route1),
    elevationGain: getTotalElevationGain(route1),
    avgPace: getAveragePace(route1)
  } : null);
}, [route1]);

useEffect(() => {
  
  setStats2(route2.length ? {
    distance: getTotalDistance(route2),
    time: getTotalTime(route2),
    elevationGain: getTotalElevationGain(route2),
    avgPace: getAveragePace(route2)
  } : null);
}, [route2]);

  // After loading both routes, set slider max to the shorter route's max distance
  const maxDistance = Math.min(
    fullRoute1.length ? fullRoute1[fullRoute1.length - 1].distance || 0 : 0,
    fullRoute2.length ? fullRoute2[fullRoute2.length - 1].distance || 0 : 0
  ) / 1000; // in km

  useEffect(() => {
    if (maxDistance > 10) {
      setRange([5, 10]);
    } else if (maxDistance > 1) {
      setRange([0, Math.floor(maxDistance)]);
    }
  }, [maxDistance]);

const section1 = filterByDistance(fullRoute1, range[0], range[1]);
const section2 = filterByDistance(fullRoute2, range[0], range[1]);

const sectionBins1 = getAnalysisBins(section1, binLength1, polyCoeffs, inputGapPaceMs1);
const sectionBins2 = getAnalysisBins(section2, binLength2, polyCoeffs, inputGapPaceMs2);

const sectionStats1 = section1.length ? {
  distance: getTotalDistance(section1),
  time: getTotalTime(section1),
  elevationGain: getTotalElevationGain(section1),
  avgPace: getAveragePace(section1)
} : null;

const sectionStats2 = section2.length ? {
  distance: getTotalDistance(section2),
  time: getTotalTime(section2),
  elevationGain: getTotalElevationGain(section2),
  avgPace: getAveragePace(section2)
} : null;

  return (
    <div
      style={{
        maxWidth: 1200,
        minWidth: 320,
        margin: '32px auto',
        padding: 0,
      }}
    >
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box sx={{ flex: 1 }}>
          
          <TextField
            label="Runner 1 Name"
            value={runner1Name}
            onChange={e => setRunner1Name(e.target.value)}
            variant="outlined"
            fullWidth
            sx={{
              mb: 2,
              input: { color: FILE1_COLOR, fontWeight: 700, fontSize: 22, textAlign: 'center' },
              label: { color: FILE1_COLOR }
            }}
          />
          <ConfigPanel
            title=""
            showGapInput={false}
            handleFileChange={handleFileChange1}
            selectedFileName={file1Name}
            inputGapMin={inputGapMin1}
            setInputGapMin={setInputGapMin1}
            inputGapSec={inputGapSec1}
            setInputGapSec={setInputGapSec1}
            inputGapPaceMs={inputGapPaceMs1}
            downsample={downsample1}
            setDownsample={setDownsample1}
            downsampleFactor={downsampleFactor1}
            setDownsampleFactor={setDownsampleFactor1}
            binLength={binLength1}
            setBinLength={setBinLength1}
            removePauses={removePauses1}
            setRemovePauses={setRemovePauses1}
            pauseThreshold={pauseThreshold1}
            setPauseThreshold={setPauseThreshold1}
            smoothElevation={smoothElevation1}
            setSmoothElevation={setSmoothElevation1}
            smoothingWindow={smoothingWindow1}
            setSmoothingWindow={setSmoothingWindow1}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
         
          <TextField
            label="Runner 2 Name"
            value={runner2Name}
            onChange={e => setRunner2Name(e.target.value)}
            variant="outlined"
            fullWidth
            sx={{
              mb: 2,
              input: { color: FILE2_COLOR, fontWeight: 700, fontSize: 22, textAlign: 'center' },
              label: { color: FILE2_COLOR }
            }}
          />
          <ConfigPanel
            title=""
            showGapInput={false}
            handleFileChange={handleFileChange2}
            selectedFileName={file2Name}
            inputGapMin={inputGapMin2}
            setInputGapMin={setInputGapMin2}
            inputGapSec={inputGapSec2}
            setInputGapSec={setInputGapSec2}
            inputGapPaceMs={inputGapPaceMs2}
            downsample={downsample2}
            setDownsample={setDownsample2}
            downsampleFactor={downsampleFactor2}
            setDownsampleFactor={setDownsampleFactor2}
            binLength={binLength2}
            setBinLength={setBinLength2}
            removePauses={removePauses2}
            setRemovePauses={setRemovePauses2}
            pauseThreshold={pauseThreshold2}
            setPauseThreshold={setPauseThreshold2}
            smoothElevation={smoothElevation2}
            setSmoothElevation={setSmoothElevation2}
            smoothingWindow={smoothingWindow2}
            setSmoothingWindow={setSmoothingWindow2}
            snapAndTrim={snapAndTrim}
            setSnapAndTrim={setSnapAndTrim}
          />
        </Box>
      </Box>
      
      <Divider sx={{ my: 4, width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw' }} />
     <KeyComparisonStats
  stats1={stats1}
  stats2={stats2}
  bins1={bins1}
  bins2={bins2}
  fullRoute1={fullRoute1}
  fullRoute2={fullRoute2}
  pauseThreshold1={pauseThreshold1}
  pauseThreshold2={pauseThreshold2}
  label1={runner1Name}
  label2={runner2Name}
/>
   
      <Box sx={{ display: 'flex', gap: 4, my: 4 }}>
        <Box sx={{ flex: 1 }}>
        <PaceByGradientScatter bins1={bins1} bins2={bins2} label1={runner1Name} label2={runner2Name} />
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />
      <Typography sx={{ textAlign: 'center', color: '#888', mt: 2 }}>
      </Typography>

      <Box sx={{ my: 6, p: 3, background: '#f8fafc', borderRadius: 4 }}>
  
  
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Typography
          gutterBottom
          variant="h5" // Makes the title bigger
          sx={{
            fontWeight: 700,
            fontSize: { xs: 22, sm: 28 }, // Even bigger if you want
            mb: 2,
            letterSpacing: 1,
            color: 'primary.main'
          }}
        >
          Select Range (km)
        </Typography>
        <Slider
          value={range}
          min={0}
          max={Math.floor(maxDistance)}
          step={0.1}
          onChange={(_, newValue) => setRange(newValue)}
          valueLabelDisplay="auto"
          marks={[
            { value: 0, label: '0 km' },
            { value: Math.floor(maxDistance), label: `${Math.floor(maxDistance)} km` }
          ]}
          sx={{
            width: 500, // Make the slider wider
            mb: 2,
            '& .MuiSlider-thumb': {
              height: 32,
              width: 32,
            },
            '& .MuiSlider-track': {
              height: 8,
            },
            '& .MuiSlider-rail': {
              height: 8,
            },
            '& .MuiSlider-markLabel': {
              fontSize: 18,
              fontWeight: 600,
            }
          }}
          disabled={maxDistance === 0}
        />
      </Box>
  <Typography align="center" sx={{ mb: 2 }}>
    Comparing from <b>{range[0].toFixed(1)} km</b> to <b>{range[1].toFixed(1)} km</b>
  </Typography>
  <KeyComparisonStats
    stats1={sectionStats1}
    stats2={sectionStats2}
    bins1={sectionBins1}
    bins2={sectionBins2}
    fullRoute1={section1}
    fullRoute2={section2}
    label1={runner1Name}
    label2={runner2Name}
  />
</Box>
<Box sx={{ my: 6, p: 3, background: '#f8fafc', borderRadius: 4 }}>
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
    Grade Adjusted Pace by Segment
  </Typography>
  <GradeAdjustedPaceBySegmentChart
    bins1={bins1}
    bins2={bins2}
    segmentLengthKm={5}
    color1={FILE1_COLOR}
    color2={FILE2_COLOR}
  label1={runner1Name}
  label2={runner2Name}
    
  />
</Box>
      <CheckpointsComparisonTable
        route1={route1}
        route2={route2}
        distances1={route1.map(pt => pt.distance || 0)}
        distances2={route2.map(pt => pt.distance || 0)}
        label1={runner1Name}
        label2={runner2Name}
      />
    </div>
    
  )
}
