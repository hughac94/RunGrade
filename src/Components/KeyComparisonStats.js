import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography
} from '@mui/material';
import { getGradeAdjustedPaceFromBins } from './gpxAnalysis';
import { getTimeStopped } from './gpxAnalysis'
import { sectionTitleSx } from './Styles';

export default function KeyComparisonStats({ stats1, stats2, bins1 = [], bins2 = [], fullRoute1, fullRoute2, pauseThreshold1 = 30, pauseThreshold2 = 30, label1="GPX File 1", label2 ="GPX File2" }) {
  function getAvgPaceFromBins(bins) {
    if (!bins || bins.length === 0) return null;
    // Sum total time in seconds
    const totalTimeSecs = bins
      .map(bin => {
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

  function formatTime(s) {
    if (!isFinite(s) || s < 0) return 'n/a';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.round(s % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  }

function getAvgPaceByGradient(bins, minGradient, maxGradient) {
  if (!bins || bins.length === 0) return null;
  // Filter bins by gradient
  const filtered = bins.filter(bin =>
    typeof bin.gradient === 'number' &&
    bin.gradient > minGradient &&
    bin.gradient < maxGradient &&
    typeof bin.pace_min_per_km === 'number' &&
    isFinite(bin.pace_min_per_km)
  );
  if (filtered.length === 0) return null;
  // Weighted average by distance
  const totalDist = filtered.reduce((sum, bin) => sum + (bin.distance || 0), 0);
  if (totalDist === 0) return null;
  const totalTime = filtered.reduce((sum, bin) => sum + (bin.pace_min_per_km * (bin.distance || 0)), 0);
  return totalTime / totalDist; // min/km
}

  const avgPace1 = getAvgPaceFromBins(bins1);
  const avgPace2 = getAvgPaceFromBins(bins2);
  const gradeAdjPace1 = getGradeAdjustedPaceFromBins(bins1);
  const gradeAdjPace2 = getGradeAdjustedPaceFromBins(bins2);
  const timeStopped1 = getTimeStopped(fullRoute1, 0.2); // or 0.1 for more strict
  const timeStopped2 = getTimeStopped(fullRoute2, 0.2);
  const avgClimbPace1 = getAvgPaceByGradient(bins1, 5, Infinity);
  const avgClimbPace2 = getAvgPaceByGradient(bins2, 5, Infinity);

  const avgDescendPace1 = getAvgPaceByGradient(bins1, -Infinity, -5);
  const avgDescendPace2 = getAvgPaceByGradient(bins2, -Infinity, -5);

  const avgFlatPace1 = getAvgPaceByGradient(bins1, -3, 3);
  const avgFlatPace2 = getAvgPaceByGradient(bins2, -3, 3)



  const rows = [
    {
      label: 'Total Distance',
      value1: stats1?.distance != null ? `${stats1.distance.toFixed(2)} km` : '-',
      value2: stats2?.distance != null ? `${stats2.distance.toFixed(2)} km` : '-',
    },
    {
      label: 'Total Time',
      value1: stats1?.time != null ? formatTime(stats1.time) : '-',
      value2: stats2?.time != null ? formatTime(stats2.time) : '-',
    },
    {
      label: 'Avg Pace',
      value1: avgPace1 != null ? `${formatMinSec(avgPace1)} min/km` : '-',
      value2: avgPace2 != null ? `${formatMinSec(avgPace2)} min/km` : '-',
    },
    {
      label: 'Elevation Gain',
      value1: stats1?.elevationGain != null ? `${stats1.elevationGain.toFixed(0)} m` : '-',
      value2: stats2?.elevationGain != null ? `${stats2.elevationGain.toFixed(0)} m` : '-',
    },
    {
      label: 'Grade Adjusted Pace',
      value1: gradeAdjPace1 != null ? `${formatMinSec(gradeAdjPace1)} min/km` : '-',
      value2: gradeAdjPace2 != null ? `${formatMinSec(gradeAdjPace2)} min/km` : '-',
    },
    {
        label: 'Time Stopped (<~1km/h)',
        value1: (isFinite(timeStopped1) && timeStopped1 > 0) ? formatTime(timeStopped1) : '-',
        value2: (isFinite(timeStopped2) && timeStopped2 > 0) ? formatTime(timeStopped2) : '-',
      },
      {
        label: 'Avg Climbing Pace (>5%)',
        value1: avgClimbPace1 != null ? `${formatMinSec(avgClimbPace1)} min/km` : '-',
        value2: avgClimbPace2 != null ? `${formatMinSec(avgClimbPace2)} min/km` : '-',
      },
      {
        label: 'Avg Descending Pace (<-5%)',
        value1: avgDescendPace1 != null ? `${formatMinSec(avgDescendPace1)} min/km` : '-',
        value2: avgDescendPace2 != null ? `${formatMinSec(avgDescendPace2)} min/km` : '-',
      },
      {
        label: 'Avg Flat Pace (-3% to 3%)',
        value1: avgFlatPace1 != null ? `${formatMinSec(avgFlatPace1)} min/km` : '-',
        value2: avgFlatPace2 != null ? `${formatMinSec(avgFlatPace2)} min/km` : '-',
      },
  ];

const FILE1_COLOR = '#1976d2'; // Blue
const FILE2_COLOR = '#43a047'; // Green

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 4 },
        mb: 4,
        background: '#f8fafc',
        maxWidth: 1400,
        width: '100%',
        mx: 'auto',
        borderRadius: 4,
      }}
    >
      <Typography
        variant="h5"
        sx={sectionTitleSx}
      >
        Key Comparison Stats
      </Typography>
      <TableContainer component={Paper} sx={{ boxShadow: 0, background: 'transparent' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 700, color: FILE1_COLOR, fontSize: 18, borderBottom: 2, borderColor: '#e0e0e0' }}>
                {label1}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#888', fontSize: 18, borderBottom: 2, borderColor: '#e0e0e0' }}>
                Metric
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: FILE2_COLOR, fontSize: 18, borderBottom: 2, borderColor: '#e0e0e0' }}>
                   {label2}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow
                key={row.label}
                sx={{
                  background: idx % 2 === 0 ? '#f0f4fa' : '#fff',
                }}
              >
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: 20, color: '#002b80', borderBottom: '1px solid #e0e0e0' }}>
                  {row.value1}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: 18, color: '#444', borderBottom: '1px solid #e0e0e0' }}>
                  {row.label}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: 20, color: '#00743f', borderBottom: '1px solid #e0e0e0' }}>
                  {row.value2}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

