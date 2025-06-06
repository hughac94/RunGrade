// Install first: npm install recharts

import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label, CartesianGrid } from 'recharts';

function ElevationProfileRecharts({ points, selectedLat, selectedLon, checkpoints = [] }) {
  if (!points || points.length < 2) return null;

  // Prepare data
  let totalDist = 0;
  const data = points.map((pt, i, arr) => {
    if (i > 0) {
      const [lat1, lon1] = arr[i - 1];
      const [lat2, lon2] = pt;
      const R = 6371000;
      const toRad = deg => deg * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += R * c;
    }
    return {
      distance: totalDist / 1000, // km
      elevation: pt[2],
      lat: pt[0],
      lon: pt[1]
    };
  });

  // Find selected point's distance
  let selectedDistance = null;
  if (
    typeof selectedLat === 'number' &&
    typeof selectedLon === 'number' &&
    points.length > 0
  ) {
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < points.length; i++) {
      const d =
        Math.pow(points[i][0] - selectedLat, 2) +
        Math.pow(points[i][1] - selectedLon, 2);
      if (d < minDist) {
        minDist = d;
        minIdx = i;
      }
    }
    selectedDistance = data[minIdx].distance;
  }

  // Find min/max elevation for axis
  const minElev = Math.min(...data.map(d => d.elevation));
  const maxElev = Math.max(...data.map(d => d.elevation));
  const maxDistance = data.length > 0 ? Math.max(...data.map(d => d.distance)) : 0;

  // Generate 5km grid lines
  const gridLines = [];
  for (let x = 5; x < maxDistance; x += 5) {
    gridLines.push(
      <ReferenceLine
        key={`grid-${x}`}
        x={x}
        stroke="#bbb"
        strokeDasharray="2 4"
        strokeWidth={1}
        ifOverflow="extendDomain"
        label={null}
        opacity={0.4}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart
        data={data}
        margin={{ top: 32, right: 20, left: 0, bottom: 0 }}
      >
        <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
        <XAxis
          dataKey="distance"
          type="number"
          domain={[0, maxDistance]}
          tickFormatter={v => v.toFixed(1)}
          label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          domain={['auto', 'auto']}
          label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value, name, props) =>
            name === 'elevation'
              ? [value, 'Elevation (m)']
              : [value, name]
          }
          labelFormatter={label => `Distance: ${label.toFixed(1)} km`}
        />
        {/* Gradient coloring */}
        <defs>
          <linearGradient id="elevGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d32f2f" />
            <stop offset="50%" stopColor="#43a047" />
            <stop offset="100%" stopColor="#1976d2" />
          </linearGradient>
        </defs>
        <Line
          type="monotone"
          dataKey="elevation"
          stroke="url(#elevGradient)"
          strokeWidth={3}
          dot={false}
          isAnimationActive={false}
        />
        {/* 5km faded grid lines */}
        {gridLines}
        {/* Checkpoints */}
        {checkpoints.map(cp => (
          <ReferenceLine
            key={cp.name}
            x={cp.km}
            stroke="#2a72e5"
            strokeDasharray="3 3"
            label={<Label value={cp.name} position="top" fill="#2a72e5" fontWeight="bold" fontSize={13} />}
          />
        ))}
        {/* Selected point */}
        {selectedDistance != null && (
          <ReferenceLine
            x={selectedDistance}
            stroke="#ff1744"
            strokeWidth={3}
            label={<Label value="Selected" position="top" fill="#ff1744" fontSize={13} />}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ElevationProfileRecharts;