import React, { useState } from 'react';
import { Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';



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

// === ADDED: Bar component for horizontal bars in table cells ===
function Bar({ value, max, color = "#1976d2", width = 100, label = "" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
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

export default function PaceAnalysisPlot({ bins, route, polyCoeffs, formatPoly4 }) {
  const [noTimeData, setNoTimeData] = useState(false);

  const gradientGroups = [
    { label: '< -20', min: -Infinity, max: -20 },
    { label: '-20 to -10', min: -20, max: -10 },
    { label: '-10 to -5', min: -10, max: -5 },
    { label: '-5 to 5', min: -5, max: 5 },
    { label: '5 to 10', min: 5, max: 10 },
    { label: '10 to 20', min: 10, max: 20 },
    { label: '> 20', min: 20, max: Infinity }
  ];

  // --- Calculate overall totals from all bins ---
  const totalTimeSecs = (bins || [])
    .map(bin => parseTimeToSeconds(bin.timeTaken))
    .reduce((a, b) => a + b, 0);

  const totalAdjustedTimeSecs = (bins || [])
    .filter(bin => typeof bin.adjustedTime === 'number' && isFinite(bin.adjustedTime) && bin.adjustedTime > 0)
    .map(bin => bin.adjustedTime)
    .reduce((a, b) => a + b, 0);

  const totalDistanceMeters = (bins || [])
    .map(bin => typeof bin.distance === 'number' ? bin.distance : 0)
    .reduce((a, b) => a + b, 0);

  const totalDistanceKm = totalDistanceMeters / 1000;

  const totalGradeAdjDistance = (bins || [])
    .map(bin => typeof bin.gradeAdjustedDistance === 'number' ? bin.gradeAdjustedDistance : 0)
    .reduce((a, b) => a + b, 0);

  const totalAdjPace = (totalDistanceKm > 0 && totalAdjustedTimeSecs > 0)
    ? (totalAdjustedTimeSecs / 60) / totalDistanceKm
    : null;

  const overallAvgPace = (totalDistanceKm > 0 && totalTimeSecs > 0)
    ? (totalTimeSecs / 60) / totalDistanceKm
    : null;

  const overallGradeAdjPace = (totalGradeAdjDistance > 0 && totalTimeSecs > 0)
    ? (totalTimeSecs / 60) / (totalGradeAdjDistance / 1000)
    : null;

  // --- Group bins by gradient group and calculate stats ---
  const groupStats = gradientGroups.map((group, groupIdx) => {
    const binsInGroup = (bins || []).filter(bin => {
      if (typeof bin.gradient !== 'number' || !isFinite(bin.gradient)) return false;
      if (groupIdx === 0) return bin.gradient < group.max;
      if (groupIdx === gradientGroups.length - 1) return bin.gradient >= group.min;
      return bin.gradient >= group.min && bin.gradient < group.max;
    });
    // Time: sum of timeTaken
    const time = binsInGroup
      .map(bin => parseTimeToSeconds(bin.timeTaken))
      .reduce((a, b) => a + b, 0);

    const totalDistance = binsInGroup
      .map(bin => typeof bin.distance === 'number' ? bin.distance : 0)
      .reduce((a, b) => a + b, 0);

    const totalGradeAdjDistance = binsInGroup
      .map(bin => typeof bin.gradeAdjustedDistance === 'number' ? bin.gradeAdjustedDistance : 0)
      .reduce((a, b) => a + b, 0);

    const avgPace = (totalDistance > 0 && time > 0)
      ? (time / 60) / (totalDistance / 1000)
      : null;

    const gradeAdjPace = (totalGradeAdjDistance > 0 && time > 0)
      ? (time / 60) / (totalGradeAdjDistance / 1000)
      : null;

    const totalAdjustedTime = binsInGroup
      .filter(bin => typeof bin.adjustedTime === 'number' && isFinite(bin.adjustedTime) && bin.adjustedTime > 0)
      .map(bin => bin.adjustedTime)
      .reduce((a, b) => a + b, 0);

    const userGapPace = (totalDistance > 0 && totalAdjustedTime > 0)
      ? (totalAdjustedTime / 60) / (totalDistance / 1000)
      : null;

    return {
      label: group.label,
      time,
      avgPace,
      gradeAdjPace,
      totalAdjustedTime,
      userGapPace,
      totalDistance
    };
  });

  // === ADDED: Find max values for each column for bar scaling ===
  const maxTime = Math.max(...groupStats.map(row => row.time || 0));
  const maxAvgPace = Math.max(...groupStats.map(row => row.avgPace || 0));
  const maxGradeAdjPace = Math.max(...groupStats.map(row => row.gradeAdjPace || 0));
  const maxDistance = Math.max(...groupStats.map(row => row.totalDistance || 0));
  const maxAdjTime = Math.max(...groupStats.map(row => row.totalAdjustedTime || 0));
  const maxUserGapPace = Math.max(...groupStats.map(row => row.userGapPace || 0));
  // === END ADDED ===

  // Set a constant for column width
  const COL_WIDTH = 140;

  // Prepare data for Recharts
  const chartData = groupStats.map(row => ({
    label: row.label,
    avgPace: row.avgPace,
    gradeAdjPace: row.gradeAdjPace
  }));

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
          Time at Gradients
        </Typography>
      </div>
      {/* Table */}
      <div style={{ marginTop: 24, width: '100%', maxWidth: 1000, margin: '0 auto' }}>
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
              <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'left', minWidth: COL_WIDTH }}>Gradient Group</th>
              {!noTimeData && (
                <>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>Time</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>Average Pace (min/km)</th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>Grade Adj. Pace (min/km)</th>
                </>
              )}
              <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>
                Distance (km)
              </th>
              <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', color: '#2a72e5', minWidth: COL_WIDTH }}>
                Adj. Time (User GAP)
              </th>
              <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', textAlign: 'center', color: '#2a72e5', minWidth: COL_WIDTH }}>
                Adj. pace <br/>(min/km)
              </th>
            </tr>
          </thead>
          <tbody>
            {groupStats.map((row, idx) => (
              <tr key={row.label} style={{ background: idx % 2 === 0 ? '#fff' : '#f4f7fa' }}>
                <td style={{
                  padding: 10,
                  borderBottom: '1px solid #e0e0e0',
                  borderRadius: idx === 0 ? '12px 0 0 0' : undefined,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  minWidth: COL_WIDTH
                }}>
                  {gradientGroups[idx].min >= 5
                    ? <span style={{ color: '#388e3c', marginRight: 4 }}>▲</span>
                    : gradientGroups[idx].max <= -5
                      ? <span style={{ color: '#1976d2', marginRight: 4 }}>▼</span>
                      : null}
                  {row.label}
                </td>
                {!noTimeData && (
                  <>
                    {/* Time */}
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>
                      {/* === CHANGED: Use Bar === */}
                      <Bar value={row.time} max={maxTime} color="#1976d2" width={COL_WIDTH}
                        label={formatTime(row.time)} />
                    </td>
                    {/* Average Pace */}
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>
                      {/* === CHANGED: Use Bar === */}
                      <Bar value={row.avgPace} max={maxAvgPace} color="#43a047" width={COL_WIDTH}
                        label={formatPace(row.avgPace)} />
                    </td>
                    {/* Grade Adj. Pace */}
                    <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>
                      {/* === CHANGED: Use Bar === */}
                      <Bar value={row.gradeAdjPace} max={maxGradeAdjPace} color="#0288d1" width={COL_WIDTH}
                        label={formatPace(row.gradeAdjPace)} />
                    </td>
                  </>
                )}
                {/* Distance */}
                <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', textAlign: 'center', minWidth: COL_WIDTH }}>
                  {/* === CHANGED: Use Bar === */}
                  <Bar value={row.totalDistance} max={maxDistance} color="#388e3c" width={COL_WIDTH}
                    label={(row.totalDistance / 1000).toFixed(1)} />
                </td>
                {/* Adj. Time (User GAP) */}
                <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', color: '#2a72e5', fontWeight: 600, textAlign: 'center', minWidth: COL_WIDTH }}>
                  {/* === CHANGED: Use Bar === */}
                  <Bar value={row.totalAdjustedTime} max={maxAdjTime} color="#fbc02d" width={COL_WIDTH}
                    label={formatTime(row.totalAdjustedTime)} />
                </td>
                {/* Adj. Pace (User GAP) */}
                <td style={{ padding: 10, borderBottom: '1px solid #e0e0e0', color: '#2a72e5', fontWeight: 600, textAlign: 'center', minWidth: COL_WIDTH }}>
                  {/* === CHANGED: Use Bar === */}
                  <Bar value={row.userGapPace} max={maxUserGapPace} color="#e64a19" width={COL_WIDTH}
                    label={formatPace(row.userGapPace)} />
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr style={{ fontWeight: 'bold', background: '#e8f0fe' }}>
              <td style={{ padding: 10, borderRadius: '0 0 0 12px', textAlign: 'center', fontWeight: 'bold', minWidth: COL_WIDTH }}>Total</td>
              {!noTimeData && (
                <>
                  <td style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', minWidth: COL_WIDTH }}>
                    {formatTime(totalTimeSecs)}
                  </td>
                  <td style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', minWidth: COL_WIDTH }}>
                    {formatPace(overallAvgPace)}
                  </td>
                  <td style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', minWidth: COL_WIDTH }}>
                    {formatPace(overallGradeAdjPace)}
                  </td>
                </>
              )}
              <td style={{ padding: 10, color: '#2a72e5', fontWeight: 700, textAlign: 'center', minWidth: COL_WIDTH }}>
                {(groupStats.reduce((a, b) => a + (b.totalDistance || 0), 0) / 1000).toFixed(1)}
              </td>
              <td style={{ padding: 10, color: '#2a72e5', fontWeight: 700, textAlign: 'center', minWidth: COL_WIDTH }}>
                {formatTime(totalAdjustedTimeSecs)}
              </td>
              <td style={{ padding: 10, color: '#2a72e5', fontWeight: 700, textAlign: 'center', minWidth: COL_WIDTH }}>
                {formatPace(totalAdjPace)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Chart below table */}
      {!noTimeData && (
        <div style={{ width: '100%', maxWidth: 1000, margin: '24px auto 0 auto' }}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="label"
                label={{ value: 'Gradient Group', position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 14 }}
              />
              <YAxis
                label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft', fontSize: 16 }}
                tick={{ fontSize: 14 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(value, name) =>
                  [typeof value === 'number' ? value.toFixed(2) : value, name === 'avgPace' ? 'Average Pace' : 'Grade Adjusted Pace']
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgPace"
                name="Average Pace"
                stroke="green"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="gradeAdjPace"
                name="Grade Adjusted Pace"
                stroke="blue"
                strokeDasharray="5 5"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

