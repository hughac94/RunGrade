import React, { useState } from 'react';
import { Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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

function formatPaceMMSS(decimalMinutes) {
  if (!decimalMinutes || !isFinite(decimalMinutes)) return 'n/a';
  const min = Math.floor(decimalMinutes);
  const sec = Math.round((decimalMinutes - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
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

export default function PaceAnalysisPlot({ bins, route, polyCoeffs, formatPoly4, noTimeData }) {
  // === CHANGED: Segment size state with presets ===
  const [segmentSize, setSegmentSize] = useState(500);
  const [removeLastSegment, setRemoveLastSegment] = useState(false);

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
  const maxAdjTime = Math.max(...groupStats.map(row => row.totalAdjustedTime || 0));
  const maxUserGapPace = Math.max(...groupStats.map(row => row.userGapPace || 0));
  const maxDistance = Math.max(...groupStats.map(row => row.totalDistance || 0));
  const minUserGapPace = Math.min(...groupStats.map(row => row.userGapPace || Infinity));
const userGapPaceRange = maxUserGapPace - minUserGapPace;
const minGradeAdjPace = Math.min(...groupStats.map(row => row.gradeAdjPace || Infinity));
const gradeAdjPaceRange = maxGradeAdjPace - minGradeAdjPace;
  // === END ADDED ===

  // --- Build segmentData for the chart ---
  let segmentData = [];
  if (Array.isArray(bins) && bins.length > 0) {
    let currentSegment = [];
    let currentSegmentDist = 0;
    let segmentStartDist = 0;

    bins.forEach(bin => {
      const binDist = typeof bin.distance === 'number' ? bin.distance : 0;
      currentSegment.push(bin);
      currentSegmentDist += binDist;

      if (currentSegmentDist >= segmentSize) { // <-- use segmentSize from state
        const totalGradeAdjDistance = currentSegment
          .map(b => typeof b.gradeAdjustedDistance === 'number' ? b.gradeAdjustedDistance : 0)
          .reduce((a, b) => a + b, 0);
        const totalTime = currentSegment
          .map(b => parseTimeToSeconds(b.timeTaken))
          .reduce((a, b) => a + b, 0);
        const segmentGradeAdjPace = (totalGradeAdjDistance > 0 && totalTime > 0)
          ? (totalTime / 60) / (totalGradeAdjDistance / 1000)
          : null;

        segmentData.push({
          distance: (segmentStartDist + currentSegmentDist / 2) / 1000,
          medianGradeAdjPace: segmentGradeAdjPace
        });

        segmentStartDist += currentSegmentDist;
        currentSegment = [];
        currentSegmentDist = 0;
      }
    });

    // Handle last segment
    if (currentSegment.length > 0) {
      const totalGradeAdjDistance = currentSegment
        .map(b => typeof b.gradeAdjustedDistance === 'number' ? b.gradeAdjustedDistance : 0)
        .reduce((a, b) => a + b, 0);
      const totalTime = currentSegment
        .map(b => parseTimeToSeconds(b.timeTaken))
        .reduce((a, b) => a + b, 0);
      const segmentGradeAdjPace = (totalGradeAdjDistance > 0 && totalTime > 0)
        ? (totalTime / 60) / (totalGradeAdjDistance / 1000)
        : null;

      segmentData.push({
        distance: (segmentStartDist + currentSegmentDist / 2) / 1000,
        medianGradeAdjPace: segmentGradeAdjPace
      });
    }
  }

  // Set a constant for column width
  const COL_WIDTH = 140;

  const displayedSegmentData = removeLastSegment && segmentData.length > 1
    ? segmentData.slice(0, -1)
    : segmentData;

  const minPace = Math.min(...displayedSegmentData.map(d => d.medianGradeAdjPace || Infinity));
  const maxPace = Math.max(...displayedSegmentData.map(d => d.medianGradeAdjPace || 0));

  // Calculate max distance for x-axis domain
  const maxSegmentDistance = segmentData.length > 0
    ? Math.max(...segmentData.map(d => d.distance || 0))
    : 0;

  // Calculate reasonable tick intervals for axes
  const xTickInterval = maxSegmentDistance > 10 ? 2 : 1;
  const yTickInterval = 0.5; // 30 seconds in min/km

  // === NEW: Build elevation-at-each-km points from full route (independent of segment size) ===
  const elevKmPoints = React.useMemo(() => {
    if (!Array.isArray(route) || route.length < 2) return [];
    // Haversine helpers
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000;

    // Build cumulative distance along route
    const cum = [];
    let distM = 0;
    for (let i = 0; i < route.length; i++) {
      const p = route[i];
      if (i > 0) {
        const a = route[i - 1];
        const dLat = toRad(p.lat - a.lat);
        const dLon = toRad(p.lon - a.lon);
        const aa =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(a.lat)) * Math.cos(toRad(p.lat)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        distM += R * c;
      }
      cum.push({ km: distM / 1000, ele: p.ele });
    }

    if (cum.length === 0) return [];
    const totalKm = Math.floor(cum[cum.length - 1].km);
    if (totalKm <= 0) return [];

    const out = [];
    let j = 0;
    for (let k = 0; k <= totalKm; k++) {
      // advance j so that cum[j].km <= k <= cum[j+1].km
      while (j + 1 < cum.length && cum[j + 1].km < k) j++;
      if (j + 1 >= cum.length) {
        out.push({ distance: k, elevation: cum[cum.length - 1].ele });
        continue;
      }
      const a = cum[j];
      const b = cum[j + 1];
      const span = Math.max(1e-9, b.km - a.km);
      const t = Math.min(1, Math.max(0, (k - a.km) / span));
      const ele = a.ele + t * (b.ele - a.ele);
      out.push({ distance: k, elevation: ele });
    }
    return out;
  }, [route]);

  const minElevation = elevKmPoints.length
    ? Math.min(...elevKmPoints.map(d => d.elevation))
    : 0;
  const maxElevation = elevKmPoints.length
    ? Math.max(...elevKmPoints.map(d => d.elevation))
    : 100;

  // === NEW: Merge pace segment points and per-km elevation samples into one chart dataset ===
  const chartData = React.useMemo(() => {
    // Keep pace points as-is
    const rows = (displayedSegmentData || []).map(d => ({
      distance: d.distance,
      medianGradeAdjPace: d.medianGradeAdjPace,
      elevation: null
    }));
    // Add elevation km points
    elevKmPoints.forEach(e => {
      rows.push({ distance: e.distance, medianGradeAdjPace: null, elevation: e.elevation });
    });
    rows.sort((a, b) => a.distance - b.distance);
    return rows;
  }, [displayedSegmentData, elevKmPoints]);

  // --- Chart rendering ---
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
      {/* === CHANGED: Segment size preset buttons with label === */}
      
      {/* Table */}
      <div style={{ marginTop: 24, width: '100%', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
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
                      <Bar
                        value={row.gradeAdjPace - minGradeAdjPace}
                        max={gradeAdjPaceRange}
                        color="#0288d1"
                        width={COL_WIDTH}
                        label={formatPace(row.gradeAdjPace)}
                      />
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
                  <Bar
                    value={row.userGapPace - minUserGapPace}
                    max={userGapPaceRange}
                    color="#e64a19"
                    width={COL_WIDTH}
                    label={formatPace(row.userGapPace)}
                  />
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
      {/* Only show segment size selector and graph if not planning a run */}
      {!noTimeData && (
        <>
          <div style={{ margin: '16px 0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ marginRight: 16, fontWeight: 500, fontSize: 16 }}>Choose segment size:</span>
            <ToggleButtonGroup
              value={segmentSize}
              exclusive
              onChange={(_, value) => value && setSegmentSize(value)}
              aria-label="segment size"
              size="small"
            >
              <ToggleButton value={100} aria-label="100m">100m</ToggleButton>
              <ToggleButton value={500} aria-label="500m">500m</ToggleButton>
              <ToggleButton value={1000} aria-label="1km">1km</ToggleButton>
              <ToggleButton value={5000} aria-label="5km">5km</ToggleButton>
            </ToggleButtonGroup>
            <button
              style={{ marginLeft: 24, padding: '6px 16px', fontWeight: 500, borderRadius: 4, border: '1px solid #1976d2', background: removeLastSegment ? '#e3f2fd' : '#fff', color: '#1976d2', cursor: 'pointer' }}
              onClick={() => setRemoveLastSegment(v => !v)}
            >
              {removeLastSegment ? 'Restore Last Segment' : 'Remove Last Segment'}
            </button>
          </div>
          <div style={{ marginTop: 40, width: '100%', maxWidth: 1600 }}>
            <ResponsiveContainer width="100%" height={300}>
              {/* === CHANGED: feed merged chartData so both lines render === */}
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="distance"
                  type="number"
                  domain={[0, maxSegmentDistance]}
                  label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
                  tickFormatter={v => v.toFixed(1)}
                  interval={0}
                  tickCount={Math.ceil(maxSegmentDistance / xTickInterval) + 1}
                />
                {/* Left Y for pace */}
                <YAxis
                  yAxisId="pace"
                  domain={[
                    minPace !== Infinity ? minPace - 0.33 : 'auto',
                    maxPace !== 0 ? maxPace + 0.33 : 'auto'
                  ]}
                  label={{ value: 'Grade Adj. Pace (min/km)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={v => formatPaceMMSS(v)}
                  allowDecimals={false}
                  interval={0}
                  tickCount={Math.ceil((maxPace - minPace) / yTickInterval) + 2}
                />
                {/* === NEW: Right Y for elevation === */}
                <YAxis
                  yAxisId="elev"
                  orientation="right"
                  domain={[minElevation, maxElevation]}
                  tick={{ fill: '#9ca3af' }}
                  stroke="#9ca3af"
                  width={44}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'medianGradeAdjPace') return [formatPaceMMSS(value), 'Pace'];
                    if (name === 'elevation') return [`${Math.round(value)} m`, 'Elevation'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Distance: ${label ? label.toFixed(2) : 'n/a'} km`}
                />
                {/* Pace line (foreground) */}
                <Line
                  yAxisId="pace"
                  type="monotone"
                  dataKey="medianGradeAdjPace"
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={true}
                  connectNulls={true}
                  name="Grade Adj. Pace"
                />
                {/* === NEW: Elevation line sampled per km (light grey) === */}
                <Line
                  yAxisId="elev"
                  type="linear"
                  dataKey="elevation"
                  stroke="#c4c4c4"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={true}
                  name="Elevation"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}