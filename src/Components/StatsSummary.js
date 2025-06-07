import React from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { getGradeAdjustedPaceFromBins } from './gpxAnalysis';

function getAvgPaceFromBins(bins) {
  if (!bins || bins.length === 0) return null;
  // Sum total time in seconds
  const totalTimeSecs = bins
    .map(bin => {
      // bin.timeTaken is usually "h:mm:ss"
      if (!bin.timeTaken) return 0;
      const parts = bin.timeTaken.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return 0;
    })
    .reduce((a, b) => a + b, 0);
  // Sum total distance in meters
  const totalDistMeters = bins
    .map(bin => typeof bin.distance === 'number' ? bin.distance : 0)
    .reduce((a, b) => a + b, 0);
  if (totalDistMeters === 0) return null;
  const totalTimeMins = totalTimeSecs / 60;
  const totalDistKm = totalDistMeters / 1000;
  return totalTimeMins / totalDistKm; // min/km
}

// Use this everywhere you need min:sec formatting
function formatMinSec(decimalMinutes) {
  if (!isFinite(decimalMinutes) || decimalMinutes <= 0) return 'n/a';
  let min = Math.floor(decimalMinutes);
  let sec = Math.round((decimalMinutes - min) * 60);
  if (sec === 60) {
    min += 1;
    sec = 0;
  }
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function timeStringToSeconds(str) {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

// Helper: is pace value valid (not negative, not > 20 min/km, not NaN)
function isValidPace(pace) {
  return typeof pace === 'number' && isFinite(pace) && pace > 0 && pace < 20;
}

// Helper: is time data valid (all bins have valid timeTaken and positive, and at least one bin)
function hasValidTimeData(bins) {
  if (!Array.isArray(bins) || bins.length === 0) return false;
  return bins.every(bin => {
    if (!bin.timeTaken) return false;
    const secs = timeStringToSeconds(bin.timeTaken);
    return isFinite(secs) && secs > 0 && secs < 60 * 60 * 24 * 7;
  });
}

export default function StatsSummary({ stats, bins, route, pauseTimeRemoved, checkpoints }) {


  // Elapsed time: first to last timestamp
  let elapsedTime = null;
  if (route && route.length > 1 && route[0].time && route[route.length - 1].time) {
    elapsedTime =
      (new Date(route[route.length - 1].time).getTime() -
        new Date(route[0].time).getTime()) /
      1000;
  } else if (stats.totalTime) {
    elapsedTime = stats.totalTime;
  }


  // Calculate paces
  const overallGradeAdjPace = getGradeAdjustedPaceFromBins(bins);
  const avgPace = getAvgPaceFromBins(bins);

  // Check for valid time data and valid paces
  const validTime = hasValidTimeData(bins);
  const validOverallGradeAdjPace = isValidPace(overallGradeAdjPace);
  const validAvgPace = isValidPace(avgPace);

  const avgPaceStr = validTime && validAvgPace
    ? `${formatMinSec(avgPace)} min/km`
    : 'no time data';

  // Calculate total adjusted time for new GAP (sum of adjustedTime in all bins)
  let adjTotalTimeSecs = 0;
  if (bins && bins.length > 0) {
    if (checkpoints && checkpoints.length > 0) {
      const lastCheckpointKm = checkpoints[checkpoints.length - 1]?.km;
      let cumDist = 0;
      for (const bin of bins) {
        if (cumDist <= lastCheckpointKm) {
          if (typeof bin.adjustedTime === 'number' && isFinite(bin.adjustedTime) && bin.adjustedTime > 0) {
            adjTotalTimeSecs += bin.adjustedTime;
          }
        } else {
          break;
        }
        cumDist += (bin.distance || 0) / 1000; // meters to km
      }
    } else {
      adjTotalTimeSecs = bins
        .map(bin => typeof bin.adjustedTime === 'number' && isFinite(bin.adjustedTime) && bin.adjustedTime > 0 ? bin.adjustedTime : 0)
        .reduce((a, b) => a + b, 0);
    }
  }

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  

  const theme = useTheme();

  // Assign a unique color to each box for better distinction
  const colorPalette = [
    "#1a73e8", // Distance - blue
    "#34a853", // Elevation Gain - green
    "#ea4335", // Elapsed Time - red
    "#fbbc04", // Time Removed Due to Pauses - yellow/orange
    "#9c27b0", // Overall Grade Adjusted Pace - purple
    "#00bcd4", // Average Pace - teal
    "#ff5722"  // Adj Total Time for new GAP - deep orange
  ];

  // Build the boxes as an array
  const boxes = [
    {
      icon: "📏",
      value: stats.distance != null ? `${Number(stats.distance).toFixed(1)} km` : 'n/a',
      color: colorPalette[0],
      label: "Distance"
    },
    {
      icon: "⛰️",
      value: `${stats.elevationGain} m`,
      color: colorPalette[1],
      label: "Elevation Gain"
    },
    {
      icon: "⏱️",
      value: elapsedTime != null ? formatTime(elapsedTime) : 'no time data',
      color: colorPalette[2],
      label: "Total Elapsed Time"
    },
    ...(pauseTimeRemoved > 0
      ? [{
          icon: "⏸️",
          value: formatTime(pauseTimeRemoved),
          color: colorPalette[3],
          label: "Time Removed Due to Pauses"
        }]
      : []),
    {
      icon: "🏃‍♂️",
      value: validTime && validOverallGradeAdjPace
        ? formatMinSec(overallGradeAdjPace) + " min/km"
        : 'no time data',
      color: colorPalette[4],
      label: "Overall Grade Adjusted Pace"
    },
    {
      icon: "⏩",
      value: avgPaceStr,
      color: colorPalette[5],
      label: "Average Pace"
    },
    {
      icon: "⚡",
      value: formatTime(adjTotalTimeSecs),
      color: colorPalette[6],
      label: "Adj Total Time for new GAP"
    }
  ];

  // Split into two rows: first 3, rest
  const firstRow = boxes.slice(0, 3);
  const secondRow = boxes.slice(3);

  

  // Defensive: only sum up to last checkpoint's km if checkpoints exist
  if (bins && bins.length > 0 && checkpoints && checkpoints.length > 0) {
    const lastCheckpointKm = checkpoints[checkpoints.length - 1]?.km;
    let cumDist = 0;
    for (const bin of bins) {
      // Only include bins whose *start* is before or at the last checkpoint
      if (cumDist <= lastCheckpointKm) {
        if (typeof bin.adjustedTime === 'number' && isFinite(bin.adjustedTime) && bin.adjustedTime > 0) {
          adjTotalTimeSecs += bin.adjustedTime;
        }
      } else {
        break;
      }
      cumDist += (bin.distance || 0) / 1000; // meters to km
    }
  }

  return (
    <>
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
          width: '100%',
        }}
      >
        Stats &amp; Map
      </Typography>
      <Paper
        elevation={4}
        sx={{
          margin: '32px auto',
          maxWidth: 900,
          background: 'rgba(255,255,255,0.92)',
          borderRadius: 6,
          boxShadow: '0 4px 24px rgba(30,41,59,0.10)',
          p: { xs: 2, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 2,
          }}
        >
          {firstRow.map((box) => (
            <Paper
              key={box.label}
              elevation={2}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 4,
                p: 2,
                background: theme.palette.grey[50],
                boxShadow: '0 2px 8px rgba(30,41,59,0.06)',
                minHeight: 120,
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: `0 4px 24px ${box.color}33`,
                },
              }}
            >
              <Typography sx={{ fontSize: 36, mb: 1 }}>{box.icon}</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 24, color: box.color }}>
                {box.value}
              </Typography>
              <Typography
                sx={{
                  color: theme.palette.text.secondary,
                  mt: 1,
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: 0.2,
                }}
              >
                {box.label}
              </Typography>
            </Paper>
          ))}
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: `repeat(${secondRow.length}, 1fr)` },
            gap: 3,
          }}
        >
          {secondRow.map((box) => (
            <Paper
              key={box.label}
              elevation={2}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 4,
                p: 2,
                background: theme.palette.grey[50],
                boxShadow: '0 2px 8px rgba(30,41,59,0.06)',
                minHeight: 120,
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: `0 4px 24px ${box.color}33`,
                },
              }}
            >
              <Typography sx={{ fontSize: 36, mb: 1 }}>{box.icon}</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 24, color: box.color }}>
                {box.value}
              </Typography>
              <Typography
                sx={{
                  color: theme.palette.text.secondary,
                  mt: 1,
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: 0.2,
                }}
              >
                {box.label}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>
    </>
  );
}