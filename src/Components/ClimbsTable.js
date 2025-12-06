import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material'; 
import { extractTime, formatTime, formatMinSec } from './gpxAnalysis';

function ClimbsTable({ climbs, minGain, setMinGain, maxLoss, setMaxLoss, route, newAdjustedVelocity, bins, setClimbs, noTimeData }) {
  const [editSplits, setEditSplits] = useState(false);
  const [newGapArr, setNewGapArr] = useState([]);
  const [tempGapInputs, setTempGapInputs] = useState({});
  const defaultGap = 5; // Default GAP value in min/km

  // Initialize newGapArr when climbs change
  useEffect(() => {
    setNewGapArr(climbs.map(() => defaultGap));
  }, [climbs, defaultGap]);

  // Helper for min:sec parsing
  const parseMinSec = str => {
    if (!str) return NaN;
    const parts = str.split(':');
    if (parts.length !== 2) return NaN;
    const [min, sec] = parts.map(Number);
    if (isNaN(min) || isNaN(sec) || min < 0 || sec < 0 || sec >= 60) return NaN;
    return min + sec / 60;
  };

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

  // Helper: Calculate total climbing (sum of all positive elevation changes) between two route indices
  function getTotalClimbingGain(route, startIdx, endIdx) {
    if (!route || !Array.isArray(route) || startIdx == null || endIdx == null) return 0;
    let gain = 0;
    for (let i = startIdx + 1; i <= endIdx; i++) {
      const prev = route[i - 1];
      const curr = route[i];
      if (!prev || !curr) continue;
      const prevEle = Array.isArray(prev) ? prev[2] : prev.ele;
      const currEle = Array.isArray(curr) ? curr[2] : curr.ele;
      if (typeof prevEle !== 'number' || typeof currEle !== 'number') continue;
      const diff = currEle - prevEle;
      if (diff > 0) gain += diff;
    }
    return Math.round(gain);
  }

  // Calculate new time for a climb using gradeAdjustedDistance from bins
  const calculateNewClimbTime = (climb, gap, bins) => {
    if (!climb || !climb.gain || !climb.distance || !bins || !Array.isArray(bins)) {
      return null;
    }
    // Find which bins are part of this climb
    let binEndDistances = [];
    let cumDist = 0;
    for (let bin of bins) {
      cumDist += (bin.distance || 0) / 1000; // m to km
      binEndDistances.push(cumDist);
    }
    const climbStartKm = climb.start;
    const climbEndKm = climb.start + climb.distance;
    let binStartIdx = binEndDistances.findIndex(d => d >= climbStartKm);
    if (binStartIdx === -1) binStartIdx = 0;
    let binEndIdx = binEndDistances.findIndex(d => d >= climbEndKm);
    if (binEndIdx === -1) binEndIdx = bins.length - 1;
    let totalAdjustedTime = 0;
    for (let i = binStartIdx; i <= binEndIdx; i++) {
      const bin = bins[i];
      if (!bin || typeof bin.gradeAdjustedDistance !== 'number' || !isFinite(bin.gradeAdjustedDistance)) continue;
      const gradeAdjDistanceKm = bin.gradeAdjustedDistance / 1000; // Convert to km
      const timeSeconds = gradeAdjDistanceKm * gap * 60;
      totalAdjustedTime += timeSeconds;
    }
    return totalAdjustedTime;
  };

  // Helper: Calculate Climb GAP (min/km)
  const calculateClimbGAP = (climb, bins) => {
    if (!climb || !bins || !Array.isArray(bins)) return null;

    // Use index-based selection
    let binEndDistances = [];
    let cumDist = 0;
    for (let bin of bins) {
      cumDist += (bin.distance || 0) / 1000; // m to km
      binEndDistances.push(cumDist);
    }
    const climbStartKm = climb.start;
    const climbEndKm = climb.start + climb.distance;
    let binStartIdx = binEndDistances.findIndex(d => d >= climbStartKm);
    if (binStartIdx === -1) binStartIdx = 0;
    let binEndIdx = binEndDistances.findIndex(d => d >= climbEndKm);
    if (binEndIdx === -1) binEndIdx = bins.length - 1;

    // Select bins by index
    const binsInClimb = bins.slice(binStartIdx, binEndIdx + 1);

    // Calculate total time and total grade-adjusted distance
    const totalTimeSecs = binsInClimb.reduce((sum, bin) => {
      const time = typeof bin.timeTaken === 'string' ? parseTimeToSeconds(bin.timeTaken) : 0;
      return sum + time;
    }, 0);

    const totalGradeAdjDistance = binsInClimb.reduce((sum, bin) => {
      return sum + (bin.gradeAdjustedDistance || 0);
    }, 0);

    // Calculate GAP (min/km)
    return totalGradeAdjDistance > 0
      ? (totalTimeSecs / 60) / (totalGradeAdjDistance / 1000)
      : null;
  };

  // Calculate totals
  let totalGain = 0;
  climbs.forEach(climb => {
    if (climb.gain > 0) totalGain += climb.gain;
  });

  return (
    <div style={{ width: '100%', margin: '80px auto 0 auto', paddingTop: 16 }}>
      <hr style={{
        border: 'none',
        borderTop: '4px solid #e0e0e0',
        width: '100%',
        margin: 0,
        marginBottom: 32
      }} />
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
        Major Climbs
      </Typography>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, gap: 12 }}>
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
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <label>
          Min Gain (m):&nbsp;
          <input
            type="number"
            value={minGain}
            min={0}
            step={1}
            onChange={e => setMinGain(Number(e.target.value))}
            style={{ width: 60, marginRight: 16 }}
          />
        </label>
        <label>
          Loss to trigger new climb (m):&nbsp;
          <input
            type="number"
            value={maxLoss}
            min={0}
            step={1}
            onChange={e => setMaxLoss(Number(e.target.value))}
            style={{ width: 60 }}
          />
        </label>
      </div>
      {climbs.filter(climb => climb.gain > 0).length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888' }}>
          (No climbs detected yet)
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            margin: '0 auto',
            borderCollapse: 'separate',
            borderSpacing: 0,
            minWidth: 900,
            background: '#f8fafc',
            borderRadius: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
          }}>
            <thead>
              <tr>
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>Start (km)</th>
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>Total Climbing (m)</th>
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>Height Gain (m)</th>
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>Distance (km)</th>
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>Avg Gradient (%)</th>
                {!noTimeData && (
                  <>
                      <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>
                    Climb GAP<br/>(min/km)
                  </th>
                    <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>Elapsed</th>
                    <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>Elapsed from Start</th>
                    <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600 }}>VAM (m/h)</th>
                  </>
                )}
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 600, color: '#2a72e5' }}>
                  Adj. Time<br/>(at GAP)
                </th>
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', fontWeight: 700, color: '#2a72e5'}}>
                  Adj. VAM<br/>(at GAP) (m/h)
                </th>
                {editSplits && (
                  <>
                    <th style={{ 
                      padding: 10, 
                      borderBottom: '2px solid #e0e0e0', 
                      textAlign: 'center', 
                      fontWeight: 600, 
                      color: '#2e7d32' 
                    }}>
                      New GAP<br/>(min/km)
                    </th>
                    <th style={{ 
                      padding: 10, 
                      borderBottom: '2px solid #e0e0e0', 
                      textAlign: 'center', 
                      fontWeight: 600, 
                      color: '#2e7d32' 
                    }}>
                      New Time<br/>(at New GAP)
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {climbs.map((climb, idx) => {
                if (!climb.gain || climb.gain <= 0) return null;

                const startIdx = climb.startIdx;
                const endIdx = climb.endIdx;

                let startTime = extractTime(route && route[startIdx]);
                let endTime = extractTime(route && route[endIdx]);
                let firstTime = extractTime(route && route[0]);

                let climbTime = '—';
                let climbSeconds = null;
                if (
                  startTime instanceof Date && !isNaN(startTime) &&
                  endTime instanceof Date && !isNaN(endTime)
                ) {
                  const seconds = (endTime - startTime) / 1000;
                  if (!isNaN(seconds) && seconds >= 0 && seconds < 60 * 60 * 24 * 7) {
                    climbTime = formatTime(seconds);
                    climbSeconds = seconds;
                  }
                }

                let elapsedFromStart = '—';
                if (
                  firstTime instanceof Date && !isNaN(firstTime) &&
                  startTime instanceof Date && !isNaN(startTime)
                ) {
                  const seconds = (startTime - firstTime) / 1000;
                  if (!isNaN(seconds) && seconds >= 0 && seconds < 60 * 60 * 24 * 7) {
                    elapsedFromStart = formatTime(seconds);
                  }
                }

                let vam = '—';
                if (climbSeconds && climb.gain && climbSeconds > 0) {
                  vam = Math.round((climb.gain / climbSeconds) * 3600);
                }

                const totalClimbingGain = getTotalClimbingGain(route, climb.startIdx, climb.endIdx);

                // Calculate adjusted time at GAP (seconds)
                let adjTimeAtGap = null;
                if (Array.isArray(bins) && bins.length > 0 && climb.start != null && climb.distance != null) {
                  let binEndDistances = [];
                  let cumDist = 0;
                  for (let bin of bins) {
                    cumDist += (bin.distance || 0) / 1000; // m to km
                    binEndDistances.push(cumDist);
                  }
                  const climbStartKm = climb.start;
                  const climbEndKm = climb.start + climb.distance;
                  let binStartIdx = binEndDistances.findIndex(d => d >= climbStartKm);
                  if (binStartIdx === -1) binStartIdx = 0;
                  let binEndIdx = binEndDistances.findIndex(d => d >= climbEndKm);
                  if (binEndIdx === -1) binEndIdx = bins.length - 1;
                  let adjTime = 0;
                  for (let i = binStartIdx; i <= binEndIdx; i++) {
                    if (bins[i] && typeof bins[i].adjustedTime === 'number' && isFinite(bins[i].adjustedTime)) {
                      adjTime += bins[i].adjustedTime;
                    }
                  }
                  adjTimeAtGap = adjTime;
                }

                let adjVam = '—';
                if (adjTimeAtGap && climb.gain && adjTimeAtGap > 0) {
                  adjVam = Math.round((climb.gain / adjTimeAtGap) * 3600);
                }

                // Calculate Climb GAP
                const climbGAP = !noTimeData ? calculateClimbGAP(climb, bins) : null;

                return (
                  <tr key={`${climb.startIdx}-${climb.endIdx}-${idx}`} style={{
                    background: idx % 2 === 0 ? '#fff' : '#f4f7fa'
                  }}>
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', borderRadius: idx === 0 ? '12px 0 0 0' : undefined }}>
                      <input
                        type="text"
                        value={climb.name || ''}
                        onChange={e => {
                          if (!setClimbs) return;
                          setClimbs(prevClimbs => {
                            const updated = [...prevClimbs];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            return updated;
                          });
                        }}
                        style={{
                          width: 120,
                          border: '1px solid #e0e7ef',
                          borderRadius: 6,
                          padding: '4px 6px',
                          background: '#f8fafc',
                          fontWeight: 600
                        }}
                      />
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                      {typeof climb.start === 'number' ? climb.start.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>{totalClimbingGain}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>{climb.gain}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>{climb.distance}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>{climb.avgGradient}</td>
                    {!noTimeData && (
                      <>
                        <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center'}}>
                        {climbGAP != null ? formatMinSec(climbGAP) : '—'}
                      </td>
                        <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                          { climbTime}
                        </td>
                        <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                           { elapsedFromStart}
                        </td>
                        <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', borderRadius: idx === climbs.filter(climb => climb.gain > 0).length - 1 ? '0 0 12px 0' : undefined }}>
                          { vam}
                        </td>
                      </>
                    )}
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', color: '#2a72e5', fontWeight: 700 }}>
                      {adjTimeAtGap != null ? formatTime(adjTimeAtGap) : '—'}
                    </td>
                    <td style={{
                      padding: 10,
                      borderBottom: '1px solid #e0e0e0',
                      textAlign: 'center',
                      color: '#2a72e5',
                      fontWeight: 700,
                    }}>
                      {adjVam}
                    </td>
                    {editSplits && (
                      <>
                        <td style={{ 
                          padding: 10, 
                          borderBottom: '1px solid #e0e0e0', 
                          textAlign: 'center', 
                          fontWeight: 600,
                          color: '#2e7d32' 
                        }}>
                          <input
                            type="text"
                            value={tempGapInputs[idx] !== undefined ? tempGapInputs[idx] : formatMinSec(newGapArr[idx] || defaultGap)}
                            onChange={e => {
                              setTempGapInputs(prev => ({ ...prev, [idx]: e.target.value }));
                              const parsed = parseMinSec(e.target.value);
                              if (!isNaN(parsed)) {
                                setNewGapArr(arr => {
                                  const newArr = [...arr];
                                  newArr[idx] = parsed;
                                  return newArr;
                                });
                              }
                            }}
                            onBlur={e => {
                              setTempGapInputs(prev => {
                                const updated = {...prev};
                                delete updated[idx];
                                return updated;
                              });
                              const parsed = parseMinSec(e.target.value);
                              if (isNaN(parsed)) {
                                setNewGapArr(arr => {
                                  const newArr = [...arr];
                                  newArr[idx] = defaultGap;
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
                              fontWeight: 600,
                              color: '#2e7d32',
                              textAlign: 'center'
                            }}
                            placeholder="0:00"
                          />
                        </td>
                        <td style={{ 
                          padding: 10, 
                          borderBottom: '1px solid #e0e0e0', 
                          textAlign: 'center', 
                          fontWeight: 700,
                          color: '#2e7d32' 
                        }}>
                          {(() => {
                            const newTime = calculateNewClimbTime(climb, newGapArr[idx] || defaultGap, bins);
                            return newTime ? formatTime(newTime) : '—';
                          })()}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              <tr style={{ background: '#e8f5e9', fontWeight: 700 }}>
                <td style={{ padding: 10, borderTop: '2px solid #bdbdbd' }}>
                  Total ({climbs.filter(climb => climb.gain > 0).length} climbs)
                </td>
                <td />
                <td style={{ padding: 10, borderTop: '2px solid #bdbdbd', textAlign: 'center' }}>{totalGain}</td>
                <td colSpan={editSplits ? 9 : 7} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ClimbsTable;