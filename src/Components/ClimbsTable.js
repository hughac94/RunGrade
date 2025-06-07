import React, { useState } from 'react';
import { Typography } from '@mui/material'; 
import { extractTime, formatTime } from './gpxAnalysis';


function ClimbsTable({ climbs, minGain, setMinGain, maxLoss, setMaxLoss, route, newAdjustedVelocity, bins, setClimbs }) {
  const [noTimeData, setNoTimeData] = useState(false);



  // Allow climb renaming
  const handleNameChange = (idx, newName) => {
    if (!setClimbs) return;
    setClimbs(prevClimbs => {
      const updated = prevClimbs.map((climb, i) =>
        i === idx ? { ...climb, name: newName } : climb
      );
      return updated;
    });
  };

  // Filter out climbs with gain of 0
  const filteredClimbs = climbs.filter(climb => climb.gain > 0);

  // Calculate totals
  let totalGain = 0;
  

  filteredClimbs.forEach(climb => {
    totalGain += climb.gain || 0;
  });



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
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
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
      {filteredClimbs.length === 0 ? (
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
                {/* Conditionally render time columns */}
                {!noTimeData && (
                  <>
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
              </tr>
            </thead>
            <tbody>
              {filteredClimbs.map((climb, idx) => {
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

                // Calculate elapsed time from start of GPX to start of climb
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

                // Calculate VAM (vertical ascent meters per hour)
                let vam = '—';
                if (climbSeconds && climb.gain && climbSeconds > 0) {
                  vam = Math.round((climb.gain / climbSeconds) * 3600);
                }

                // Calculate total climbing gain using route points (CheckpointsTable logic)
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

                // Calculate Adj. VAM (at GAP) (m/h)
                let adjVam = '—';
                if (adjTimeAtGap && climb.gain && adjTimeAtGap > 0) {
                  adjVam = Math.round((climb.gain / adjTimeAtGap) * 3600);
                }

                return (
                  <tr key={`${climb.startIdx}-${climb.endIdx}-${idx}`} style={{
                    background: idx % 2 === 0 ? '#fff' : '#f4f7fa'
                  }}>
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', borderRadius: idx === 0 ? '12px 0 0 0' : undefined }}>
                      <input
                        type="text"
                        value={climb.name || ''}
                        onChange={e => handleNameChange(idx, e.target.value)}
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
                    {/* Conditionally render time columns */}
                    {!noTimeData && (
                      <>
                        <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                          { climbTime}
                        </td>
                        <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                           { elapsedFromStart}
                        </td>
                        <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', borderRadius: idx === filteredClimbs.length - 1 ? '0 0 12px 0' : undefined }}>
                          { vam}
                        </td>
                      </>
                    )}
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', color: '#2a72e5', fontWeight: 700 }}>
                      {(() => {
                        let adjTimeAtGap = null;
                        if (Array.isArray(bins) && bins.length > 0 && climb.start != null && climb.distance != null) {
                          // 1. Build array of bin end distances (in km)
                          let binEndDistances = [];
                          let cumDist = 0;
                          for (let bin of bins) {
                            cumDist += (bin.distance || 0) / 1000; // m to km
                            binEndDistances.push(cumDist);
                          }
                          // 2. Find bin indices covering the climb segment
                          const climbStartKm = climb.start;
                          const climbEndKm = climb.start + climb.distance;
                          // Find first bin whose end distance >= climbStartKm
                          let binStartIdx = binEndDistances.findIndex(d => d >= climbStartKm);
                          if (binStartIdx === -1) binStartIdx = 0;
                          // Find last bin whose end distance >= climbEndKm
                          let binEndIdx = binEndDistances.findIndex(d => d >= climbEndKm);
                          if (binEndIdx === -1) binEndIdx = bins.length - 1;
                          // 3. Sum adjustedTime for bins in this range
                          let adjTime = 0;
                          for (let i = binStartIdx; i <= binEndIdx; i++) {
                            if (bins[i] && typeof bins[i].adjustedTime === 'number' && isFinite(bins[i].adjustedTime)) {
                              adjTime += bins[i].adjustedTime;
                            }
                          }
                          adjTimeAtGap = adjTime;
                        }
                        return adjTimeAtGap != null ? formatTime(adjTimeAtGap) : '—';
                      })()}
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
                  </tr>
                );
              })}
              {/* Total row */}
              <tr style={{ background: '#e8f5e9', fontWeight: 700 }}>
                <td style={{ padding: 10, borderTop: '2px solid #bdbdbd' }}>Total ({filteredClimbs.length} climbs)</td>
                <td />
                <td style={{ padding: 10, borderTop: '2px solid #bdbdbd', textAlign: 'center' }}>{totalGain}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ClimbsTable;