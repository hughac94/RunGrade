import React from 'react';
import { Typography } from '@mui/material';

// === ADDED: Bar component for horizontal bars in table cells ===
function Bar({ value, max, color = "#1976d2", width = 100, label = "", blunt = true }) {
  let pct = 0;
  if (max > 0) {
    if (blunt) {
      const minBarPct = 40;
      pct = minBarPct + (70 * Math.min(1, value / max));
    } else {
      pct = 100 * Math.min(1, value / max);
    }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', minWidth: width }}>
      <div style={{
        height: 16,
        width: `${pct}%`,
        background: color,
        borderRadius: 4,
        transition: 'width 0.3s',
        marginRight: 8,
        minWidth: 2
      }} />
      <span style={{ fontWeight: 500 }}>{label}</span>
    </div>
  );
}
// === END ADDED ===

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatPace(decimalMinutes) {
  if (!decimalMinutes || !isFinite(decimalMinutes)) return 'n/a';
  const min = Math.floor(decimalMinutes);
  const sec = Math.round((decimalMinutes - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function TimeAtAltitudeTable({ bins, route, noTimeData }) {
  console.log('bins[0]', bins && bins[0]);
  console.log('route.length', route && route.length);

  // Define altitude groups
  const altitudeGroups = [
    { label: '>2500m', min: 2500, max: Infinity },
    { label: '2000-2500m', min: 2000, max: 2500 },
    { label: '1000-2000m', min: 1000, max: 2000 },
    { label: '0-1000m', min: 0, max: 1000 }
  ];

  // Group bins by altitude group and calculate stats
  const groupStats = altitudeGroups.map((group) => {
    const binsInGroup = (bins || []).filter(bin => {
      if (!route || !route[bin.startIdx] || !route[bin.endIdx]) {
        return false;
      }
      const avgElevation = (route[bin.startIdx].ele + route[bin.endIdx].ele) / 2;
      if (typeof avgElevation !== 'number' || !isFinite(avgElevation)) return false;
      return avgElevation >= group.min && avgElevation < group.max;
    });

    const time = binsInGroup
      .map(bin => parseTimeToSeconds(bin.timeTaken))
      .reduce((a, b) => a + b, 0);

    const totalDistance = binsInGroup
      .map(bin => typeof bin.distance === 'number' ? bin.distance : 0)
      .reduce((a, b) => a + b, 0);

    const avgPace = (totalDistance > 0 && time > 0)
      ? (time / 60) / (totalDistance / 1000)
      : null;

    const totalAdjustedTime = binsInGroup
      .filter(bin => typeof bin.adjustedTime === 'number' && isFinite(bin.adjustedTime) && bin.adjustedTime > 0)
      .map(bin => bin.adjustedTime)
      .reduce((a, b) => a + b, 0);

    return {
      label: group.label,
      time,
      avgPace,
      totalDistance,
      totalAdjustedTime,
      hasData: binsInGroup.length > 0 // <-- Add this flag
    };
  });

  // Only consider rows with data for scaling
  const visibleRows = groupStats.filter(row => row.hasData);

  // Find min/max values for bar scaling among visible rows
  const minTime = Math.min(...visibleRows.map(row => row.time ?? Infinity));
  const maxTime = Math.max(...visibleRows.map(row => row.time ?? 0));
  const minAvgPace = Math.min(...visibleRows.map(row => row.avgPace ?? Infinity));
  const maxAvgPace = Math.max(...visibleRows.map(row => row.avgPace ?? 0));
  const maxDistance = Math.max(...visibleRows.map(row => row.totalDistance ?? 0));
  const minAdjTime = Math.min(...visibleRows.map(row => row.totalAdjustedTime ?? Infinity));
  const maxAdjTime = Math.max(...visibleRows.map(row => row.totalAdjustedTime ?? 0));

  // Calculate totals
  const totalTimeSecs = groupStats.reduce((a, b) => a + (b.time || 0), 0);
  const totalDistanceMeters = groupStats.reduce((a, b) => a + (b.totalDistance || 0), 0);
  const totalDistanceKm = totalDistanceMeters / 1000;
  const overallAvgPace = (totalDistanceKm > 0 && totalTimeSecs > 0)
    ? (totalTimeSecs / 60) / totalDistanceKm
    : null;
  const totalAdjustedTimeSecs = groupStats.reduce((a, b) => a + (b.totalAdjustedTime || 0), 0); // NEW

  // Table rendering
  const COL_WIDTH = 140;

  
  return (
    <div style={{ width: '100%', margin: '0 auto 40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Title */}
      <div style={{ width: '100%' }}>
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
          Time at Altitude
        </Typography>
      </div>
      {/* Table */}
      <div style={{ marginTop: 24, width: '100%', maxWidth: 1000, margin: '0 auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          marginTop: 8,
          background: '#f8fafc',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}>
          <thead>
            <tr>
              <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'left', minWidth: COL_WIDTH }}>Altitude Group</th>
              {!noTimeData && (
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>Time</th>
              )}
              {!noTimeData && (
                <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>Average Pace (min/km)</th>
              )}
              <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>Distance (km)</th>
              <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', color: '#2a72e5', minWidth: COL_WIDTH }}>
                Adj. Time (User GAP)
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => (
              <tr key={row.label} style={{ background: idx % 2 === 0 ? '#fff' : '#f4f7fa' }}>
                <td style={{
                  padding: 10,
                  borderBottom: '1px solid #e0e0e0',
                  borderRadius: idx === 0 ? '12px 0 0 0' : undefined,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  minWidth: COL_WIDTH
                }}>
                  {row.label}
                </td>
                {!noTimeData && (
                  <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>
                    <Bar
                      value={row.time - minTime}
                      max={maxTime - minTime}
                      color="#1976d2"
                      width={COL_WIDTH}
                      label={formatTime(row.time)}
                    />
                  </td>
                )}
                {!noTimeData && (
                  <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>
                    <Bar
                      value={row.avgPace - minAvgPace}
                      max={maxAvgPace - minAvgPace}
                      color="#43a047"
                      width={COL_WIDTH}
                      label={formatPace(row.avgPace)}
                    />
                  </td>
                )}
                <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>
                  <Bar
                    value={row.totalDistance}
                    max={maxDistance}
                    color="#388e3c"
                    width={COL_WIDTH}
                    label={(row.totalDistance / 1000).toFixed(1)}
                    blunt={false}
                  />
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', color: '#2a72e5', fontWeight: 600, textAlign: 'center', minWidth: COL_WIDTH }}>
                  <Bar
                    value={row.totalAdjustedTime - minAdjTime}
                    max={maxAdjTime - minAdjTime}
                    color="#fbc02d"
                    width={COL_WIDTH}
                    label={formatTime(row.totalAdjustedTime)}
                  />
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr style={{ fontWeight: 'bold', background: '#e8f0fe' }}>
              <td style={{ padding: 10, borderRadius: '0 0 0 12px', textAlign: 'center', fontWeight: 'bold', minWidth: COL_WIDTH }}>Total</td>
              {!noTimeData && (
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', minWidth: COL_WIDTH }}>
                  {formatTime(totalTimeSecs)}
                </td>
              )}
              {!noTimeData && (
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', minWidth: COL_WIDTH }}>
                  {formatPace(overallAvgPace)}
                </td>
              )}
              <td style={{ padding: 10, color: '#2a72e5', fontWeight: 700, textAlign: 'center', minWidth: COL_WIDTH }}>
                {(totalDistanceMeters / 1000).toFixed(1)}
              </td>
              <td style={{ padding: 10, color: '#2a72e5', fontWeight: 700, textAlign: 'center', minWidth: COL_WIDTH }}>
                {formatTime(totalAdjustedTimeSecs)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}


