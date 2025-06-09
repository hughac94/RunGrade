import React, { useState, useEffect } from 'react';
import { Typography, Paper } from '@mui/material';
import { sectionTitleSx } from './Styles';
import { formatTime, extractTime } from './gpxAnalysis';

/**
 * CheckpointsComparisonTable component for comparing checkpoint data between two GPX files
 * Uses the same calculation methodology as CheckpointsTable
 */
function CheckpointsComparisonTable({
  route1 = [],
  route2 = [],
  distances1 = [],
  distances2 = [],
  label1 = "Runner 1",
  label2 = "Runner 2"
}) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [input, setInput] = useState('');

  const FILE1_COLOR = '#1976d2'; // Blue
  const FILE2_COLOR = '#43a047'; // Green

  // Get max distances (using same logic as CheckpointsTable)
  const maxDistance1 = distances1.length > 0 ? distances1[distances1.length - 1] / 1000 : 0; // Convert to km
  const maxDistance2 = distances2.length > 0 ? distances2[distances2.length - 1] / 1000 : 0; // Convert to km
  const maxDistance = Math.max(maxDistance1, maxDistance2);

  // Find route index closest to a given km (EXACT SAME as CheckpointsTable)
  const findRouteIdxForKm1 = km => {
    if (!distances1.length) return -1;
    let minDiff = Infinity;
    let minIdx = -1;
    distances1.forEach((d, idx) => {
      const diff = Math.abs(d / 1000 - km); // Convert distance to km for comparison
      if (diff < minDiff) {
        minDiff = diff;
        minIdx = idx;
      }
    });
    return minIdx;
  };

  const findRouteIdxForKm2 = km => {
    if (!distances2.length) return -1;
    let minDiff = Infinity;
    let minIdx = -1;
    distances2.forEach((d, idx) => {
      const diff = Math.abs(d / 1000 - km); // Convert distance to km for comparison
      if (diff < minDiff) {
        minDiff = diff;
        minIdx = idx;
      }
    });
    return minIdx;
  };

  // Get total time for percentage calculations (using same logic as CheckpointsTable)
  const getTotalTime1 = () => {
    if (!route1.length) return null;
    const firstTime = extractTime(route1[0]);
    const lastTime = extractTime(route1[route1.length - 1]);
    
    if (firstTime instanceof Date && !isNaN(firstTime) && lastTime instanceof Date && !isNaN(lastTime)) {
      const seconds = (lastTime - firstTime) / 1000;
      if (!isNaN(seconds) && seconds >= 0) {
        return seconds;
      }
    }
    return null;
  };

  const getTotalTime2 = () => {
    if (!route2.length) return null;
    const firstTime = extractTime(route2[0]);
    const lastTime = extractTime(route2[route2.length - 1]);
    
    if (firstTime instanceof Date && !isNaN(firstTime) && lastTime instanceof Date && !isNaN(lastTime)) {
      const seconds = (lastTime - firstTime) / 1000;
      if (!isNaN(seconds) && seconds >= 0) {
        return seconds;
      }
    }
    return null;
  };

  const totalTime1 = getTotalTime1();
  const totalTime2 = getTotalTime2();

  // Ensure "Start" at km 0 and single "End" checkpoint at max distance
  useEffect(() => {
    if (maxDistance === 0) return;
    
    setCheckpoints(prev => {
      let cps = [...prev];
      
      // Add Start at 0km if not present
      if (!cps.some(cp => Math.abs(cp.km - 0) < 1e-6)) {
        cps = [{ km: 0, name: 'Start' }, ...cps];
      }
      
      // Add single End checkpoint at max distance if not present
      if (maxDistance > 0 && !cps.some(cp => Math.abs(cp.km - maxDistance) < 1e-6)) {
        cps = [...cps, { km: maxDistance, name: 'End' }];
      }
      
      // Sort by distance and remove duplicates (EXACT SAME logic)
      cps.sort((a, b) => a.km - b.km);
      return cps.filter((cp, idx, arr) => idx === 0 || Math.abs(cp.km - arr[idx - 1].km) > 1e-6);
    });
  }, [maxDistance1, maxDistance2, maxDistance, label1, label2]);

  // Handle input field changes and Enter key for adding checkpoints (EXACT SAME as CheckpointsTable)
  const handleInputChange = e => setInput(e.target.value);
  
  const handleInputKeyDown = e => {
    if (e.key === 'Enter') {
      const km = parseFloat(input);
      if (!isNaN(km) && km >= 0 && km <= maxDistance) {
        setCheckpoints(prev => {
          const manualCount = prev.filter(cp => 
            cp.name !== 'Start' && 
            !cp.name.startsWith('End')
          ).length;
          const newList = [...prev, { km, name: `Checkpoint ${manualCount + 1}` }];
          newList.sort((a, b) => a.km - b.km);
          return newList.filter((cp, idx, arr) => idx === 0 || Math.abs(cp.km - arr[idx - 1].km) > 1e-6);
        });
        setInput('');
      }
    }
  };

  // Handle checkpoint name changes (EXACT SAME as CheckpointsTable)
  const handleNameChange = (idx, newName) => {
    setCheckpoints(prev =>
      prev.map((cp, i) => (i === idx ? { ...cp, name: newName } : cp))
    );
  };

 // Handle checkpoint deletion (allow deletion of End checkpoint too)
const handleDelete = idx => {
  setCheckpoints(prev =>
    prev.filter((cp, i) => {
      // Don't delete Start checkpoint, but allow End checkpoint deletion
      if (Math.abs(cp.km - 0) < 1e-6) return true; // Keep Start
      return i !== idx; // Delete everything else including End
    })
  );
};

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
        Checkpoints Comparison
      </Typography>

      {/* Input for adding new checkpoints (EXACT SAME styling as CheckpointsTable) */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <input
          type="number"
          step="0.1"
          min="0"
          max={maxDistance}
          placeholder={`Enter km (0 - ${maxDistance.toFixed(2)})`}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          style={{ width: 120, marginRight: 8 }}
        />
        <span style={{ color: '#888' }}>Press Enter to add checkpoint</span>
      </div>

      {/* Main table display */}
      <div
        style={{
          width: '100%',
          minHeight: 120,
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          marginTop: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}
      >
        {checkpoints.length === 0 ? (
          <span style={{ color: '#888' }}>No checkpoints yet.</span>
        ) : (
          <table
            style={{
              width: '90%',
              background: '#fff',
              borderCollapse: 'separate',
              borderSpacing: 0,
              borderRadius: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              margin: '0 auto',
              minWidth: 800
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 32, background: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}></th>
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>
                  Checkpoint Name
                </th>
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>
                  Distance (km)
                </th>
                <th style={{ 
                  padding: 6, 
                  borderBottom: '2px solid #e0e0e0', 
                  background: '#f5f7fa', 
                  textAlign: 'center', 
                  fontWeight: 600,
                  color: FILE1_COLOR 
                }}>
                  {label1} Time
                </th>
                <th style={{ 
                  padding: 6, 
                  borderBottom: '2px solid #e0e0e0', 
                  background: '#f5f7fa', 
                  textAlign: 'center', 
                  fontWeight: 600,
                  color: FILE1_COLOR 
                }}>
                  {label1} % of Time
                </th>
                <th style={{ 
                  padding: 6, 
                  borderBottom: '2px solid #e0e0e0', 
                  background: '#f5f7fa', 
                  textAlign: 'center', 
                  fontWeight: 600,
                  color: FILE2_COLOR 
                }}>
                  {label2} Time
                </th>
                <th style={{ 
                  padding: 6, 
                  borderBottom: '2px solid #e0e0e0', 
                  background: '#f5f7fa', 
                  textAlign: 'center', 
                  fontWeight: 600,
                  color: FILE2_COLOR 
                }}>
                  {label2} % of Time
                </th>
                <th style={{ 
                  padding: 6, 
                  borderBottom: '2px solid #e0e0e0', 
                  background: '#f5f7fa', 
                  textAlign: 'center', 
                  fontWeight: 600
                }}>
                  Race within the Race
                </th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.map((cp, idx) => {
                const isStart = cp.name === 'Start';
                const isEnd = cp.name === 'End';
                const canDelete = !isStart;

                // Calculate elapsed times using EXACT SAME logic as CheckpointsTable
                const routeIdx1 = findRouteIdxForKm1(cp.km);
                const routeIdx2 = findRouteIdxForKm2(cp.km);

                // Get cumulative elapsed times from start for calculations
                let cumulativeSeconds1 = null;
                let cumulativeSeconds2 = null;
                
                if (routeIdx1 !== -1) {
                  const currTime = extractTime(route1[routeIdx1]);
                  const firstTime = extractTime(route1[0]);
                  if (currTime instanceof Date && !isNaN(currTime) && firstTime instanceof Date && !isNaN(firstTime)) {
                    const seconds = (currTime - firstTime) / 1000;
                    if (!isNaN(seconds) && seconds >= 0) {
                      cumulativeSeconds1 = seconds;
                    }
                  }
                }

                if (routeIdx2 !== -1) {
                  const currTime = extractTime(route2[routeIdx2]);
                  const firstTime = extractTime(route2[0]);
                  if (currTime instanceof Date && !isNaN(currTime) && firstTime instanceof Date && !isNaN(firstTime)) {
                    const seconds = (currTime - firstTime) / 1000;
                    if (!isNaN(seconds) && seconds >= 0) {
                      cumulativeSeconds2 = seconds;
                    }
                  }
                }

                // Calculate SEGMENT times and percentages
                let segmentTime1 = '';
                let segmentTime2 = '';
                let segmentSeconds1 = null;
                let segmentSeconds2 = null;
                let percentage1 = null;
                let percentage2 = null;

                if (idx === 0) {
                  // Start checkpoint - segment time is 0
                  segmentTime1 = '0:00';
                  segmentTime2 = '0:00';
                  segmentSeconds1 = 0;
                  segmentSeconds2 = 0;
                  percentage1 = 0;
                  percentage2 = 0;
                } else {
                  // Get previous checkpoint's cumulative time
                  const prevCp = checkpoints[idx - 1];
                  const prevRouteIdx1 = findRouteIdxForKm1(prevCp.km);
                  const prevRouteIdx2 = findRouteIdxForKm2(prevCp.km);
                  
                  let prevCumulativeSeconds1 = 0;
                  let prevCumulativeSeconds2 = 0;
                  
                  if (prevRouteIdx1 !== -1 && prevCp.name !== 'Start') {
                    const prevCurrTime = extractTime(route1[prevRouteIdx1]);
                    const firstTime = extractTime(route1[0]);
                    if (prevCurrTime instanceof Date && !isNaN(prevCurrTime) && firstTime instanceof Date && !isNaN(firstTime)) {
                      prevCumulativeSeconds1 = (prevCurrTime - firstTime) / 1000;
                    }
                  }
                  
                  if (prevRouteIdx2 !== -1 && prevCp.name !== 'Start') {
                    const prevCurrTime = extractTime(route2[prevRouteIdx2]);
                    const firstTime = extractTime(route2[0]);
                    if (prevCurrTime instanceof Date && !isNaN(prevCurrTime) && firstTime instanceof Date && !isNaN(firstTime)) {
                      prevCumulativeSeconds2 = (prevCurrTime - firstTime) / 1000;
                    }
                  }
                  
                  // Calculate segment times
                  if (cumulativeSeconds1 !== null) {
                    segmentSeconds1 = cumulativeSeconds1 - prevCumulativeSeconds1;
                    segmentTime1 = formatTime(segmentSeconds1);
                    if (totalTime1 !== null && totalTime1 > 0) {
                      percentage1 = Math.round((segmentSeconds1 / totalTime1) * 100);
                    }
                  }
                  
                  if (cumulativeSeconds2 !== null) {
                    segmentSeconds2 = cumulativeSeconds2 - prevCumulativeSeconds2;
                    segmentTime2 = formatTime(segmentSeconds2);
                    if (totalTime2 !== null && totalTime2 > 0) {
                      percentage2 = Math.round((segmentSeconds2 / totalTime2) * 100);
                    }
                  }
                }

                // Calculate Race within the Race
                let raceWithinRace = '';
                let raceColor = '#666';
                
                if (idx === 0) {
                  raceWithinRace = 'Tied';
                } else if (segmentSeconds1 !== null && segmentSeconds2 !== null) {
                  const timeDiffSeconds = Math.abs(segmentSeconds1 - segmentSeconds2);
                  const timeDiffMinutes = Math.round(timeDiffSeconds / 60);
                  
                  if (timeDiffMinutes === 0) {
                    raceWithinRace = 'Tied';
                  } else {
                    const winner = segmentSeconds1 < segmentSeconds2 ? label1 : label2;
                    const winnerColor = segmentSeconds1 < segmentSeconds2 ? FILE1_COLOR : FILE2_COLOR;
                    raceWithinRace = `${winner} by ${timeDiffMinutes} min${timeDiffMinutes !== 1 ? 's' : ''}`;
                    raceColor = winnerColor;
                  }
                }

                return (
                  <tr key={idx} style={{
                    background: idx % 2 === 0 ? '#fff' : '#f4f7fa',
                    fontWeight: isEnd ? 700 : undefined
                  }}>
                    <td style={{ textAlign: 'center', padding: 8 }}>
                      <button
                        onClick={() => handleDelete(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: canDelete ? '#c00' : '#ccc',
                          fontSize: 18,
                          cursor: canDelete ? 'pointer' : 'not-allowed',
                          lineHeight: 1,
                          padding: 0
                        }}
                        title="Delete checkpoint"
                        aria-label="Delete checkpoint"
                        disabled={!canDelete}
                      >
                        ×
                      </button>
                    </td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <input
                        type="text"
                        value={cp.name || ''}
                        onChange={e => handleNameChange(idx, e.target.value)}
                        style={{
                          width: 120,
                          border: '1px solid #e0e7ef',
                          borderRadius: 6,
                          padding: '4px 6px',
                          background: '#f8fafc',
                          fontWeight: isEnd ? 700 : 600
                        }}
                      />
                    </td>
                    <td style={{ 
                      padding: 10, 
                      textAlign: 'center', 
                      fontWeight: isEnd ? 700 : undefined 
                    }}>
                      {cp.km.toFixed(1)}
                    </td>
                    {/* Runner 1 SEGMENT Time */}
                    <td style={{ 
                      padding: 10, 
                      textAlign: 'center', 
                      fontWeight: isEnd ? 700 : undefined,
                      color: FILE1_COLOR
                    }}>
                      {segmentTime1 || '-'}
                    </td>
                    {/* Runner 1 % of Time (SEGMENT percentage) */}
                    <td style={{ 
                      padding: 10, 
                      textAlign: 'center', 
                      fontWeight: isEnd ? 700 : undefined,
                      color: FILE1_COLOR
                    }}>
                      {percentage1 !== null ? `${percentage1}%` : '-'}
                    </td>
                    {/* Runner 2 SEGMENT Time */}
                    <td style={{ 
                      padding: 10, 
                      textAlign: 'center', 
                      fontWeight: isEnd ? 700 : undefined,
                      color: FILE2_COLOR
                    }}>
                      {segmentTime2 || '-'}
                    </td>
                    {/* Runner 2 % of Time (SEGMENT percentage) */}
                    <td style={{ 
                      padding: 10, 
                      textAlign: 'center', 
                      fontWeight: isEnd ? 700 : undefined,
                      color: FILE2_COLOR
                    }}>
                      {percentage2 !== null ? `${percentage2}%` : '-'}
                    </td>
                    {/* Race within the Race */}
                    <td style={{ 
                      padding: 10, 
                      textAlign: 'center', 
                      fontWeight: isEnd ? 700 : 600,
                      color: raceColor,
                      fontSize: 14
                    }}>
                      {raceWithinRace}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Paper>
  );
}

export default CheckpointsComparisonTable;