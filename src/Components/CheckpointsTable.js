import React, { useState, useEffect, useMemo } from 'react';
import { Typography } from '@mui/material';
import { formatMinSec, formatHMS, formatTime, extractTime } from './gpxAnalysis';

/**
 * CheckpointsTable component displays and manages a table of checkpoints,
 * including time, elevation, and pace calculations, as well as user-edited splits.
 */
function CheckpointsTable({
  checkpoints,
  setCheckpoints,
  route = [],
  distances = [],
  bins = [],
  inputGapMin = 4,
  inputGapSec = 30
}) {
  // State for input field, toggles, and user-edited GAPs
  const [input, setInput] = useState('');
  const [noTimeData, setNoTimeData] = useState(false);
  const [editSplits, setEditSplits] = useState(false);
  const [newGapArr, setNewGapArr] = useState([]);

  // Maximum route distance (km)
  const maxDistance = distances.length > 0 ? distances[distances.length - 1] : 0;

  // Modelled GAP in minutes (default for new splits)
  const modelledGapMinutes = useMemo(
    () => inputGapMin + inputGapSec / 60,
    [inputGapMin, inputGapSec]
  );

  // Ensure "Start" at km 0 and "End" at maxDistance are always present
  useEffect(() => {
    if (maxDistance === 0) return;
    setCheckpoints(prev => {
      let cps = [...prev];
      if (!cps.some(cp => Math.abs(cp.km - 0) < 1e-6)) {
        cps = [{ km: 0, name: 'Start' }, ...cps];
      }
      if (!cps.some(cp => Math.abs(cp.km - maxDistance) < 1e-6)) {
        cps = [...cps, { km: maxDistance, name: 'End' }];
      }
      cps.sort((a, b) => a.km - b.km);
      return cps.filter((cp, idx, arr) => idx === 0 || Math.abs(cp.km - arr[idx - 1].km) > 1e-6);
    });
  }, [maxDistance, setCheckpoints]);

  // Handle input field changes and Enter key for adding checkpoints
  const handleInputChange = e => setInput(e.target.value);
  const handleInputKeyDown = e => {
    if (e.key === 'Enter') {
      const km = parseFloat(input);
      if (!isNaN(km) && km >= 0 && km <= maxDistance) {
        setCheckpoints(prev => {
          const manualCount = prev.filter(cp => cp.name !== 'Start' && cp.name !== 'End').length;
          const newList = [...prev, { km, name: `Checkpoint ${manualCount + 1}` }];
          newList.sort((a, b) => a.km - b.km);
          return newList.filter((cp, idx, arr) => idx === 0 || Math.abs(cp.km - arr[idx - 1].km) > 1e-6);
        });
        setInput('');
      }
    }
  };

  // Handle checkpoint name changes
  const handleNameChange = (idx, newName) => {
    setCheckpoints(prev =>
      prev.map((cp, i) => (i === idx ? { ...cp, name: newName } : cp))
    );
  };

  // Handle checkpoint deletion (except Start/End)
  const handleDelete = idx => {
    setCheckpoints(prev =>
      prev.filter((cp, i) => {
        if (Math.abs(cp.km - 0) < 1e-6 || Math.abs(cp.km - maxDistance) < 1e-6) return true;
        return i !== idx;
      })
    );
  };

  // Find route index closest to a given km
  const findRouteIdxForKm = km => {
    if (!distances.length) return -1;
    let minDiff = Infinity;
    let minIdx = -1;
    distances.forEach((d, idx) => {
      const diff = Math.abs(d - km);
      if (diff < minDiff) {
        minDiff = diff;
        minIdx = idx;
      }
    });
    return minIdx;
  };

  // Calculate cumulative elevation gain up to a route index
  const getElevationGainToIdx = idx => {
    if (!route.length || idx <= 0) return 0;
    let gain = 0;
    for (let i = 1; i <= idx; i++) {
      const prevEle = typeof route[i - 1] === 'object' ? route[i - 1].ele : route[i - 1][2];
      const currEle = typeof route[i] === 'object' ? route[i].ele : route[i][2];
      const diff = currEle - prevEle;
      if (diff > 0) gain += diff;
    }
    return Math.round(gain);
  };

  /**
   * Returns an array of cumulative and segment adjusted times (in seconds) for each checkpoint.
   * @param {Array} checkpoints - Array of { km }
   * @param {Array} bins - Array of analysis bins (with .distance and .adjustedTime)
   * @returns {Array} Array of { checkpointIdx, cumulativeAdjustedTime, segmentAdjustedTime }
   */
  function getAdjustedTimesForCheckpoints(checkpoints, bins) {
    if (!Array.isArray(checkpoints) || !Array.isArray(bins) || bins.length === 0) return [];
    let binEndDistances = [];
    let cumDist = 0;
    for (let bin of bins) {
      cumDist += (bin.distance || 0) / 1000;
      binEndDistances.push(cumDist);
    }
    let checkpointBinIdxs = checkpoints.map(cp =>
      binEndDistances.findIndex(d => d >= cp.km)
    );
    let results = [];
    let prevBinIdx = 0;
    let prevCumulative = 0;
    for (let i = 0; i < checkpoints.length; i++) {
      let binIdx = checkpointBinIdxs[i];
      if (binIdx === -1) binIdx = bins.length - 1;
      let segmentAdjustedTime = 0;
      for (let j = prevBinIdx; j <= binIdx; j++) {
        if (bins[j] && typeof bins[j].adjustedTime === 'number' && isFinite(bins[j].adjustedTime)) {
          segmentAdjustedTime += bins[j].adjustedTime;
        }
      }
      let cumulativeAdjustedTime = prevCumulative + segmentAdjustedTime;
      results.push({
        checkpointIdx: i,
        cumulativeAdjustedTime,
        segmentAdjustedTime
      });
      prevBinIdx = binIdx + 1;
      prevCumulative = cumulativeAdjustedTime;
    }
    if (results.length > 0) {
      results[0].cumulativeAdjustedTime = 0;
      results[0].segmentAdjustedTime = 0;
    }
    return results;
  }

  // Get adjusted times for each checkpoint
  const adjustedTimes = getAdjustedTimesForCheckpoints(checkpoints, bins);
  const adjFromStartArr = adjustedTimes.map(a => a.cumulativeAdjustedTime || 0);
  const adjFromPrevArr = adjFromStartArr.map((val, idx) =>
    idx === 0 ? 0 : val - adjFromStartArr[idx - 1]
  );

  // Calculate average pace (min/km) for a segment
  function averagePaceForSegment(segmentTimeSecs, segmentDistKm) {
    if (!segmentDistKm || segmentDistKm <= 0) return null;
    return (segmentTimeSecs / 60) / segmentDistKm;
  }

  // Calculate grade adjusted pace (min/km) for a checkpoint segment
  function gradeAdjustedPaceForCheckpoint(bins, startBinIdx, endBinIdx, segmentElapsedSecs) {
    if (startBinIdx > endBinIdx || startBinIdx < 0 || endBinIdx >= bins.length) return null;
    let totalGradeAdjDist = 0;
    for (let i = startBinIdx; i <= endBinIdx; i++) {
      const bin = bins[i];
      if (bin && typeof bin.gradeAdjustedDistance === 'number' && isFinite(bin.gradeAdjustedDistance)) {
        totalGradeAdjDist += bin.gradeAdjustedDistance;
      }
    }
    if (totalGradeAdjDist > 0 && segmentElapsedSecs > 0) {
      const totalGradeAdjDistKm = totalGradeAdjDist / 1000;
      return (segmentElapsedSecs / 60) / totalGradeAdjDistKm;
    }
    return null;
  }

  // Build bin end distances for mapping checkpoints to bins
  let binEndDistances = [];
  let cumDist = 0;
  for (let bin of bins) {
    cumDist += (bin.distance || 0) / 1000;
    binEndDistances.push(cumDist);
  }
  let checkpointBinIdxs = checkpoints.map(cp =>
    binEndDistances.findIndex(d => d >= cp.km)
  );

  // Initialize newGapArr with default modelled GAP for each checkpoint
  useEffect(() => {
    setNewGapArr(checkpoints.map(() => modelledGapMinutes));
  }, [checkpoints, modelledGapMinutes]);

  // Parse min:sec string to decimal minutes
  const parseMinSec = str => {
    if (!str) return NaN;
    const parts = str.split(':');
    if (parts.length !== 2) return NaN;
    const [min, sec] = parts.map(Number);
    if (isNaN(min) || isNaN(sec) || min < 0 || sec < 0 || sec >= 60) return NaN;
    return min + sec / 60;
  };

  // Calculate New Time Overall (cumulative, using edited GAP for each segment)
  const newTimeOverallArr = (() => {
    if (!Array.isArray(checkpoints) || !Array.isArray(bins) || bins.length === 0) return [];
    let binEndDistances = [];
    let cumDist = 0;
    for (let bin of bins) {
      cumDist += (bin.distance || 0) / 1000;
      binEndDistances.push(cumDist);
    }
    let checkpointBinIdxs = checkpoints.map(cp =>
      binEndDistances.findIndex(d => d >= cp.km)
    );
    let results = [];
    for (let i = 0; i < checkpoints.length; i++) {
      let totalTime = 0;
      for (let seg = 1; seg <= i; seg++) {
        let segStart = seg === 1 ? 0 : checkpointBinIdxs[seg - 1] + 1;
        let segEnd = checkpointBinIdxs[seg] === -1 ? bins.length - 1 : checkpointBinIdxs[seg];
        if (segEnd < segStart) continue;
        const gap = newGapArr[seg] || modelledGapMinutes;
        for (let j = segStart; j <= segEnd; j++) {
          const bin = bins[j];
          if (bin && typeof bin.gradeAdjustedDistance === 'number' && isFinite(bin.gradeAdjustedDistance)) {
            const distanceKm = bin.gradeAdjustedDistance / 1000;
            totalTime += distanceKm * gap * 60;
          }
        }
      }
      results.push(totalTime);
    }
    if (results.length > 0) results[0] = 0;
    return results;
  })();

  // Calculate New Time from Previous (difference between rows of New Time Overall)
  const newTimeFromPreviousArr = newTimeOverallArr.map((val, idx) =>
    idx === 0 ? 0 : val - newTimeOverallArr[idx - 1]
  );

  // === Render ===
  return (
    <div style={{ width: '100%', margin: '80px 0 0 0', paddingTop: 16 }}>
      {/* Section header */}
      <hr
        style={{
          border: 'none',
          borderTop: '4px solid #e0e0e0',
          width: '100%',
          margin: 0,
          marginBottom: 32
        }}
      />
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
          mb: 3
        }}
      >
        Checkpoints
      </Typography>
      {/* Toggle buttons for time data and split editing */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, gap: 12 }}>
        <button
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid #bbb',
            background: noTimeData ? '#2563eb' : '#f8fafc',
            color: noTimeData ? '#fff' : '#222',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => setNoTimeData(v => !v)}
        >
          {noTimeData ? 'Show Time Data' : 'No Time Data'}
        </button>
        <button
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid #1976d2',
            background: editSplits ? '#1976d2' : '#f8fafc',
            color: editSplits ? '#fff' : '#1976d2',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => setEditSplits(v => !v)}
        >
          {editSplits ? 'Hide Splits' : 'Edit Splits'}
        </button>
      </div>
      {/* Input for adding new checkpoints */}
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
              width: '60%',
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
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>Name</th>
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>Checkpoint (km)</th>
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>Distance from Previous (km)</th>
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>Cumulative Elevation Gain (m)</th>
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>Elevation Gain from Previous (m)</th>
                {/* Conditionally render time columns */}
                {!noTimeData && (
                  <>
                    <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>Elapsed from Start</th>
                    <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600 }}>Elapsed from Previous</th>
                    <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, color: '#000' }}>Avg. Pace<br/>(min/km)</th>
                    <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, color: '#000' }}>Grade Adj. Pace<br/>(min/km)</th>
                  </>
                )}
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, color: '#2a72e5' }}>Adj. Time from Start</th>
                <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, color: '#2a72e5' }}>Adj. Time from Previous</th>
                {/* New columns for edited splits */}
                {editSplits && (
                  <>
                    <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, color: '#2e7d32' }}>Modelled GAP<br/>(min/km)</th>
                    <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, color: '#2e7d32' }}>New Edited GAP<br/>(min/km)</th>
                    <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, color: '#2e7d32' }}>New Time Overall<br/>(hh:mm:ss)</th>
                    <th style={{ padding: 6, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, color: '#2e7d32' }}>New Time from Previous<br/>(hh:mm:ss)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Table rows rendering (can be extracted to a CheckpointRow component for clarity) */}
              {checkpoints.map((cp, idx) => {
                const routeIdx = findRouteIdxForKm(cp.km);
                const elevationGain = getElevationGainToIdx(routeIdx);

                // Elevation gain from previous checkpoint
                let prevRouteIdx = idx === 0 ? 0 : findRouteIdxForKm(checkpoints[idx - 1].km);
                let prevElevationGain = idx === 0 ? 0 : getElevationGainToIdx(prevRouteIdx);
                const gainFromPrev = elevationGain - prevElevationGain;

                // Time calculations
                const currTime = extractTime(route[routeIdx]);
                const prevTime = idx === 0 ? extractTime(route[0]) : extractTime(route[prevRouteIdx]);
                const firstTime = extractTime(route[0]);

                let elapsedFromStart = '';
                let elapsedFromPrev = '';
                if (currTime instanceof Date && !isNaN(currTime) && firstTime instanceof Date && !isNaN(firstTime)) {
                  const seconds = (currTime - firstTime) / 1000;
                  if (!isNaN(seconds) && seconds >= 0) elapsedFromStart = formatTime(seconds);
                }
                if (currTime instanceof Date && !isNaN(currTime) && prevTime instanceof Date && !isNaN(prevTime)) {
                  const seconds = (currTime - prevTime) / 1000;
                  if (!isNaN(seconds) && seconds >= 0) elapsedFromPrev = formatTime(seconds);
                }

                const adjFromStart = adjFromStartArr[idx] != null ? formatTime(adjFromStartArr[idx]) : '-';
                const adjFromPrev = idx === 0 ? '-' : (adjFromPrevArr[idx] != null ? formatTime(adjFromPrevArr[idx]) : '-');

                // Find bin indices for this segment
                const startBinIdx = idx === 0 ? 0 : checkpointBinIdxs[idx - 1] + 1;
                const endBinIdx = checkpointBinIdxs[idx] === -1 ? bins.length - 1 : checkpointBinIdxs[idx];

                // Calculate segment distance (km) and segment time (seconds)
                const segmentDistKm = idx === 0 ? cp.km : cp.km - checkpoints[idx - 1].km;
                let segmentTimeSecs = null;
                if (idx > 0 && extractTime(route[findRouteIdxForKm(cp.km)]) && extractTime(route[findRouteIdxForKm(checkpoints[idx - 1].km)])) {
                  segmentTimeSecs = (extractTime(route[findRouteIdxForKm(cp.km)]) - extractTime(route[findRouteIdxForKm(checkpoints[idx - 1].km)])) / 1000;
                }

                // Average pace (min/km)
                const avgPace = (segmentTimeSecs && segmentDistKm > 0) ? averagePaceForSegment(segmentTimeSecs, segmentDistKm) : null;

                // Grade adjusted pace (min/km) - only for non-start rows
                let gradeAdjPace = null;
                if (idx > 0 && segmentTimeSecs && segmentTimeSecs > 0) {
                  gradeAdjPace = gradeAdjustedPaceForCheckpoint(bins, startBinIdx, endBinIdx, segmentTimeSecs);
                }

                
                const isEnd = cp.name && cp.name.toLowerCase() === 'end';

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
                          color: (Math.abs(cp.km - 0) < 1e-6 || Math.abs(cp.km - maxDistance) < 1e-6) ? '#ccc' : '#c00',
                          fontSize: 18,
                          cursor: (Math.abs(cp.km - 0) < 1e-6 || Math.abs(cp.km - maxDistance) < 1e-6) ? 'not-allowed' : 'pointer',
                          lineHeight: 1,
                          padding: 0
                        }}
                        title="Delete checkpoint"
                        aria-label="Delete checkpoint"
                        disabled={Math.abs(cp.km - 0) < 1e-6 || Math.abs(cp.km - maxDistance) < 1e-6}
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
                          fontWeight: isEnd ? 700 : undefined
                        }}
                      />
                    </td>
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined }}>{cp.km.toFixed(1)}</td>
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined }}>
                      {idx === 0 ? '-' : (cp.km - checkpoints[idx - 1].km).toFixed(2)}
                    </td>
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined }}>{elevationGain}</td>
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined }}>{idx === 0 ? '-' : gainFromPrev}</td>
                    {/* Conditionally render time columns */}
                    {!noTimeData && (
                      <>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined }}>{elapsedFromStart || '-'}</td>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined }}>{idx === 0 ? '-' : (elapsedFromPrev || '-')}</td>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined, color: '#000' }}>
                          {avgPace && isFinite(avgPace) ? formatMinSec(avgPace) : '-'}
                        </td>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined, color: '#000' }}>
                          {idx === 0 ? '-' : (gradeAdjPace && isFinite(gradeAdjPace) ? formatMinSec(gradeAdjPace) : '-')}
                        </td>
                      </>
                    )}
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined, color: '#2a72e5' }}>{adjFromStart}</td>
                    <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined, color: '#2a72e5' }}>{adjFromPrev}</td>
                    {/* === Add new cells for edited splits === */}
                    {editSplits && (
                      <>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined, color: '#2e7d32' }}>
                          {formatMinSec(modelledGapMinutes)}
                        </td>
                        <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined, color: '#2e7d32' }}>
                          <input
                            type="text"
                            value={formatMinSec(newGapArr[idx] || modelledGapMinutes)}
                            onChange={e => {
                              const val = e.target.value;
                              const parsed = parseMinSec(val);
                              if (!isNaN(parsed)) {
                                setNewGapArr(arr => {
                                  const newArr = [...arr];
                                  newArr[idx] = parsed;
                                  return newArr;
                                });
                              }
                            }}
                            onBlur={e => {
                              const parsed = parseMinSec(e.target.value);
                              if (isNaN(parsed)) {
                                setNewGapArr(arr => {
                                  const newArr = [...arr];
                                  newArr[idx] = modelledGapMinutes;
                                  return newArr;
                                });
                              }
                            }}
                            style={{
                              width: 60,
                              border: '1px solid #e0e7ef',
                              borderRadius: 6,
                              padding: '4px 6px',
                              background: '#f8fafc',
                              fontWeight: 700,
                              color: '#2e7d32',
                              textAlign: 'center'
                            }}
                            placeholder="0:00"
                          />
                        </td>
                     <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined, color: '#2e7d32' }}>
                        {formatHMS(newTimeOverallArr[idx])}
                      </td>
                       <td style={{ padding: 10, textAlign: 'center', fontWeight: isEnd ? 700 : undefined, color: '#2e7d32' }}>
                        {formatHMS(newTimeFromPreviousArr[idx])}
                      </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CheckpointsTable;