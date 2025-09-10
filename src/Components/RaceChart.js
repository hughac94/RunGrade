import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// Helper function to calculate distance along route to a specific point
function getDistanceAlongRoute(route, targetLat, targetLon) {
  if (!route || route.length === 0) return 0;
  
  let minDistance = Infinity;
  let closestIndex = 0;
  
  // Find the closest point on route1 to the target position
  route.forEach((pt, idx) => {
    const distance = Math.sqrt(
      Math.pow(pt.lat - targetLat, 2) + Math.pow(pt.lon - targetLon, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = idx;
    }
  });
  
  return route[closestIndex].distance || 0;
}

// Helper function to format time as HH:MM:SS
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

function RaceChart({ route1, route2, label1 = 'Runner 1', label2 = 'Runner 2' }) {
  const raceData = useMemo(() => {
    console.log('🔄 RaceChart: Starting calculation...');
    
    if (!route1?.length || !route2?.length) {
      console.log('❌ RaceChart: Empty routes');
      return [];
    }
    
    // Get start/end times for each route SEPARATELY
    const startTime1 = new Date(route1[0].time);
    const endTime1 = new Date(route1[route1.length - 1].time);
    const startTime2 = new Date(route2[0].time);
    const endTime2 = new Date(route2[route2.length - 1].time);
    
    // Calculate duration for each race separately
    const duration1Ms = endTime1.getTime() - startTime1.getTime();
    const duration2Ms = endTime2.getTime() - startTime2.getTime();
    
    console.log('⏰ RaceChart: Individual durations', {
      duration1Hours: (duration1Ms / 1000 / 60 / 60).toFixed(2),
      duration2Hours: (duration2Ms / 1000 / 60 / 60).toFixed(2)
    });
    
    // Use the longer race duration for our analysis
    const maxDurationMs = Math.max(duration1Ms, duration2Ms);
    const maxDurationHours = maxDurationMs / 1000 / 60 / 60;
    
    if (maxDurationHours > 24) {
      console.log('❌ RaceChart: Duration too long', { maxDurationHours });
      return [];
    }
    
    // Adaptive interval
    let intervalMs = 30000; // 30 seconds
    if (maxDurationMs > 3600000) intervalMs = 60000; // 1 hour+ = 1 min intervals
    if (maxDurationMs > 10800000) intervalMs = 120000; // 3 hour+ = 2 min intervals
    
    const expectedDataPoints = Math.ceil(maxDurationMs / intervalMs);
    console.log('📈 RaceChart: Expected data points:', expectedDataPoints);
    
    if (expectedDataPoints > 1000) {
      console.warn('⚠️ RaceChart: Too many data points');
      return [];
    }
    
    // Create data points at regular intervals
    const data = [];
    
    for (let elapsedMs = 0; elapsedMs <= maxDurationMs; elapsedMs += intervalMs) {
      const elapsedSeconds = elapsedMs / 1000;
      
      // Find position of runner 1 at this elapsed time
      const targetTime1 = new Date(startTime1.getTime() + elapsedMs);
      let pos1 = null;
      for (let i = 0; i < route1.length; i++) {
        const pointTime = new Date(route1[i].time);
        if (pointTime >= targetTime1) {
          pos1 = i > 0 ? route1[i - 1] : route1[i];
          break;
        }
        pos1 = route1[i];
      }
      
      // Find position of runner 2 at this elapsed time
      const targetTime2 = new Date(startTime2.getTime() + elapsedMs);
      let pos2 = null;
      for (let i = 0; i < route2.length; i++) {
        const pointTime = new Date(route2[i].time);
        if (pointTime >= targetTime2) {
          pos2 = i > 0 ? route2[i - 1] : route2[i];
          break;
        }
        pos2 = route2[i];
      }
      
      if (pos1 && pos2) {
        const distance1 = pos1.distance || 0;
        const distance2 = getDistanceAlongRoute(route1, pos2.lat, pos2.lon);
        const gap = (distance1 - distance2) / 1000;
        
        // Use the same colors as FILE1_COLOR and FILE2_COLOR from GPXComparisonPage
        const pointColor = gap >= 0 ? '#1976d2' : '#43a047'; // Blue for runner 1, Green for runner 2
        
        data.push({
          elapsedSeconds,
          elapsedTime: formatTime(elapsedSeconds),
          gap,
          distance1: distance1 / 1000,
          distance2: distance2 / 1000,
          pointColor // Add color to each data point
        });
      }
    }
    
    console.log('✅ RaceChart: Calculation complete', { dataPoints: data.length });
    return data;
  }, [route1, route2]);
  
  if (raceData.length === 0) {
    return (
      <div style={{ 
        height: 400, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        color: '#666',
        padding: 20,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 18, marginBottom: 10 }}>
          No valid time data available for race comparison
        </div>
        <div style={{ fontSize: 14 }}>
          Possible issues:
          <ul style={{ textAlign: 'left', margin: '10px 0' }}>
            <li>Missing or invalid timestamps in GPX files</li>
            <li>Race duration too long (&gt;24 hours)</li>
            <li>Corrupted time data</li>
          </ul>
        </div>
        <div style={{ fontSize: 12, color: '#999' }}>
          Check browser console for debugging info
        </div>
      </div>
    );
  }
  
  const maxTime = Math.max(...raceData.map(d => d.elapsedSeconds));
  const maxGap = Math.max(...raceData.map(d => Math.abs(d.gap)));
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={raceData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis 
          dataKey="elapsedSeconds"
          type="number"
          scale="linear"
          domain={[0, maxTime]}
          tickFormatter={formatTime}
          label={{ 
            value: 'Elapsed Time', 
            position: 'insideBottom', 
            offset: -10,
            style: { textAnchor: 'middle' }
          }}
          interval="preserveStartEnd"
        />
        <YAxis 
          domain={[-maxGap * 1.1, maxGap * 1.1]}
          label={{ 
            value: 'Gap (km)', 
            angle: -90, 
            position: 'insideLeft',
            style: { textAnchor: 'middle' }
          }}
          tickFormatter={(value) => value.toFixed(2)}
        />
        <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const value = payload[0].value;
              const gapText = value >= 0 
                ? `${label1} ahead by ${Math.abs(value).toFixed(2)} km`
                : `${label2} ahead by ${Math.abs(value).toFixed(2)} km`;
              
              return (
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 12,
                  minWidth: 'auto',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {gapText}
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="gap"
          stroke="#888"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={3}
                fill={payload.pointColor}
                stroke={payload.pointColor}
                strokeWidth={1}
              />
            );
          }}
          activeDot={(props) => {
            const { cx, cy, payload } = props;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={6}
                fill={payload.pointColor}
                stroke={payload.pointColor}
                strokeWidth={2}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default RaceChart;