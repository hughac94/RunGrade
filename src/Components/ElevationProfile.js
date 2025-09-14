// Install first: npm install recharts

import React, { useState } from 'react';
import {
   Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Label, CartesianGrid, Area, ComposedChart, ReferenceArea
} from 'recharts';

// Helper: interpolate color by gradient (HSL for smooth transition)
function getGradientColor(gradient) {
  // Clamp gradient between -50% and +50%
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const g = clamp(gradient, -50, 50);

  if (g < -15) return '#1976d2';      // steep descent - blue
  if (g < -10) return '#2196f3';      // descent - lighter blue
  if (g < -5)  return '#00bcd4';      // moderate descent - cyan
  if (g < -2)  return '#43a047';      // slight descent - green
  if (g < 2)   return '#888888';      // flat - grey
  if (g < 5)   return '#fbc02d';      // slight climb - yellow
  if (g < 10)  return '#fb8c00';      // moderate climb - orange
  if (g < 15)  return '#f44336';      // climb - red-orange
  return '#d32f2f';                   // steep climb - red
}



function ElevationProfileRecharts({ points, selectedLat, selectedLon, checkpoints = [], onPointSelect, onSectionSelect }) {
  // State for drag selection - moved to top before any early returns
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Early return after all hooks
  if (!points || points.length < 2) return null;

  // Prepare data with immediate gradient calculation (no smoothing window)
  const windowSize = 20; // Wide smoothing

  let totalDist = 0;
  const data = points.map((pt, i, arr) => {
    let gradient = 0;
    let segmentDist = 0;

    // Calculate distance from previous point
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
      segmentDist = R * c;
      totalDist += segmentDist;
    }

    // Window smoothing for gradient
    if (i >= windowSize) {
      const start = arr[i - windowSize];
      const end = pt;
      // Only use elevation for gradient, ignore lat/lon
      const elev1 = start[2];
      const elev2 = end[2];

      // Calculate window distance
      let windowDist = 0;
      for (let j = i - windowSize + 1; j <= i; j++) {
        const [latA, lonA] = arr[j - 1];
        const [latB, lonB] = arr[j];
        const R = 6371000;
        const toRad = deg => deg * Math.PI / 180;
        const dLat = toRad(latB - latA);
        const dLon = toRad(lonB - lonA);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(latA)) *
            Math.cos(toRad(latB)) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        windowDist += R * c;
      }
      gradient = windowDist > 0 ? ((elev2 - elev1) / windowDist) * 100 : 0;
    } else if (i > 0) {
      const elev1 = arr[i - 1][2];
      const elev2 = pt[2];
      gradient = segmentDist > 0 ? ((elev2 - elev1) / segmentDist) * 100 : 0;
    }

    const color = getGradientColor(gradient);
    return {
      distance: totalDist / 1000,
      elevation: pt[2],
      lat: pt[0],
      lon: pt[1],
      gradient: gradient,
      color: color,
      originalIndex: i
    };
  });

  // Find closest point index for a given distance
  const findPointIndexForDistance = (distance) => {
    let minDiff = Infinity;
    let closestPoint = null;
    
    data.forEach(point => {
      const diff = Math.abs(point.distance - distance);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    });
    
    return closestPoint ? closestPoint.originalIndex : null;
  };

  // Handle mouse down - start drag
  const handleMouseDown = (event) => {
    if (!event || !event.activeLabel) return;
    const distance = parseFloat(event.activeLabel);
    setIsDragging(true);
    setDragStart(distance);
    setDragEnd(distance);
    setSelectedSection(null);
  };

  // Handle mouse move - update drag end
  const handleMouseMove = (event) => {
    if (!isDragging || !event || !event.activeLabel) return;
    const distance = parseFloat(event.activeLabel);
    setDragEnd(distance);
  };

  // Handle mouse up - finish drag
  const handleMouseUp = (event) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (dragStart !== null && dragEnd !== null) {
      const startDist = Math.min(dragStart, dragEnd);
      const endDist = Math.max(dragStart, dragEnd);
      
      // Only create selection if there's a meaningful difference
      if (Math.abs(endDist - startDist) > 0.1) {
        const startIdx = findPointIndexForDistance(startDist);
        const endIdx = findPointIndexForDistance(endDist);
        
        const selection = {
          startDistance: startDist,
          endDistance: endDist,
          startIndex: startIdx,
          endIndex: endIdx,
          distance: endDist - startDist
        };
        
        setSelectedSection(selection);
        
        // Notify parent component about the section selection
        if (onSectionSelect) {
          onSectionSelect(selection);
        }
      }
    }
  };

  // Handle single clicks (for point selection)
  const handleChartClick = (event) => {
    // Only handle single clicks if we're not dragging
    if (isDragging || !event || !event.activeLabel || !onPointSelect) return;
    
    const clickedDistance = parseFloat(event.activeLabel);
    const pointIndex = findPointIndexForDistance(clickedDistance);
    
    if (pointIndex !== null) {
      onPointSelect(pointIndex);
    }
  };

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

  // Create many more gradient stops for precise color mapping
  const gradientStops = [];
  const step = Math.max(1, Math.floor(data.length / 200)); // Use more stops for better precision
  
  for (let i = 0; i < data.length; i += step) {
    const point = data[i];
    const offset = (point.distance / maxDistance) * 100;
    gradientStops.push(
      <stop
        key={i}
        offset={`${offset}%`}
        stopColor={point.color}
      />
    );
  }
  
  // Ensure we have a stop at 100%
  if (data.length > 0) {
    const lastPoint = data[data.length - 1];
    gradientStops.push(
      <stop
        key="last"
        offset="100%"
        stopColor={lastPoint.color}
      />
    );
  }

  // Determine selection area bounds
  const selectionStart = isDragging ? Math.min(dragStart, dragEnd) : selectedSection?.startDistance;
  const selectionEnd = isDragging ? Math.max(dragStart, dragEnd) : selectedSection?.endDistance;

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart
          data={data}
          margin={{ top: 32, right: 20, left: 0, bottom: 40 }}
          onClick={handleChartClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
          }}
        >
          <defs>
            <linearGradient id="colorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops}
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
          <XAxis
            dataKey="distance"
            type="number"
            domain={[0, maxDistance]}
            tickFormatter={v => v.toFixed(1)}
            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            domain={['dataMin', 'dataMax']}
            label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value, name, props) => {
              if (name === 'elevation') return [`${Math.round(value)}m`, 'Elevation'];
              if (name === 'gradient') return [`${value.toFixed(1)}%`, 'Gradient'];
              return [value, name];
            }}
            labelFormatter={label => `Distance: ${label.toFixed(1)} km`}
          />
          
          {/* Filled area with gradient */}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="none"
            fill="url(#colorGradient)"
            fillOpacity={0.8}
            isAnimationActive={false}
          />
          
          {/* Selection highlight */}
          {(selectionStart !== null && selectionEnd !== null) && (
            <ReferenceArea
              x1={selectionStart}
              x2={selectionEnd}
              fill="rgba(255, 0, 0, 0.3)"
              stroke="red"
              strokeWidth={2}
            />
          )}
          
          {/* Main elevation line - exclude from tooltip */}
          <Line
            type="monotone"
            dataKey="elevation"
            stroke="#333"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            hide={true}
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
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Selection info tooltip */}
      {selectedSection && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          Selected: {selectedSection.distance.toFixed(2)} km
          <br />
          ({selectedSection.startDistance.toFixed(1)} - {selectedSection.endDistance.toFixed(1)} km)
        </div>
      )}
    </div>
  );
}

export default ElevationProfileRecharts;