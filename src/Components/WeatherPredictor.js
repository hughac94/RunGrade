import React, { useState, useMemo } from 'react';
import { Typography, Box } from '@mui/material';
import { getTotalDistance } from './gpxAnalysis';

const sectionTitleSx = {
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
};

function addHours(date, hours) {
  const result = new Date(date);
  result.setTime(result.getTime() + (hours * 60 * 60 * 1000));
  return result;
}

const getWeatherDescription = (code) => {
  const weatherCodes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm'
  };
  return weatherCodes[code] || 'Unknown';
};

// Function to find the geographic point at a specific time using GAP
function findPointAtTime(bins, targetTimeSeconds) {
  if (!bins || bins.length === 0) return null;
  
  let cumulativeTime = 0;
  let cumulativeDistance = 0; // Track distance ourselves
  
  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    const binTime = bin.adjustedTime || 0; // Use GAP adjusted time
    const binDistance = bin.distance || 0; // Distance in meters
    
    // Check if target time falls within this bin
    if (cumulativeTime + binTime >= targetTimeSeconds) {
      // Found the bin containing our target time
      // Calculate how far through this bin we are
      const timeIntoThisBin = targetTimeSeconds - cumulativeTime;
      const progressThroughBin = binTime > 0 ? timeIntoThisBin / binTime : 0;
      
      // Calculate distance up to the target point
      const distanceIntoThisBin = binDistance * progressThroughBin;
      const totalDistance = cumulativeDistance + distanceIntoThisBin;
      
      // Get start and end points of this bin
      const startIdx = bin.startIdx || 0;
      const endIdx = bin.endIdx || startIdx;
      
      // Interpolate position within the bin
      const binLength = endIdx - startIdx;
      const interpolatedIdx = Math.round(startIdx + (binLength * progressThroughBin));
      
      return {
        binIndex: i,
        routeIndex: Math.min(interpolatedIdx, endIdx),
        cumulativeTime: targetTimeSeconds,
        progressThroughBin,
        distance: totalDistance // Distance in meters
      };
    }
    
    cumulativeTime += binTime;
    cumulativeDistance += binDistance;
  }
  
  // If we've gone past all bins, return the last point
  const lastBin = bins[bins.length - 1];
  return {
    binIndex: bins.length - 1,
    routeIndex: lastBin.endIdx || 0,
    cumulativeTime: cumulativeTime,
    progressThroughBin: 1,
    distance: cumulativeDistance // Total distance in meters
  };
}

export default function WeatherPredictor({ route, bins, checkpoints }) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
    const [weatherData, setWeatherData] = useState({}); 
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Calculate total adjusted time using GAP (same logic as StatsSummary)
  const totalTimeSecs = useMemo(() => {
    if (!bins || bins.length === 0) return 0;
    
    let adjTotalTimeSecs = 0;
    
    // Use same logic as StatsSummary - include checkpoint filtering if checkpoints exist
    if (checkpoints && checkpoints.length > 0) {
      const lastCheckpointKm = checkpoints[checkpoints.length - 1]?.km;
      let cumDist = 0;
      for (const bin of bins) {
        if (cumDist <= lastCheckpointKm) {
          if (typeof bin.adjustedTime === 'number' && isFinite(bin.adjustedTime) && bin.adjustedTime > 0) {
            adjTotalTimeSecs += bin.adjustedTime;
          }
        } else {
          break;
        }
        cumDist += (bin.distance || 0) / 1000; // meters to km
      }
    } else {
      // No checkpoints - use all bins
      adjTotalTimeSecs = bins
        .map(bin => typeof bin.adjustedTime === 'number' && isFinite(bin.adjustedTime) && bin.adjustedTime > 0 ? bin.adjustedTime : 0)
        .reduce((a, b) => a + b, 0);
    }
    
    return adjTotalTimeSecs;
  }, [bins, checkpoints]);

  // Calculate total distance using existing function
  const totalDistanceKm = useMemo(() => {
    return getTotalDistance(route);
  }, [route]);

  const totalHours = totalTimeSecs > 0 ? totalTimeSecs / 3600 : 0;
  



  // Generate table rows with actual geographic points
  const tableRows = useMemo(() => {
    if (totalHours <= 0 || !bins || bins.length === 0) return [];
    
    const maxHours = Math.ceil(totalHours);
    const rows = [];
    
    for (let i = 0; i < maxHours; i++) {
      const hourStart = i;
      const hourEnd = i + 1;
      const midpointHours = i + 0.5;
      
      // Check if this hour bucket contains the finish
      const isLastBucket = (hourStart < totalHours && totalHours <= hourEnd);
      
      // Calculate the target time for this row
      const targetHours = isLastBucket ? totalHours : midpointHours;
      const targetTimeSeconds = targetHours * 3600;
      
      // Find the actual point along the route at this time
      const pointAtTime = findPointAtTime(bins, targetTimeSeconds);
      
      let distance = 0;
      let lat = null;
      let lon = null;
      let elevation = null;
      
      if (pointAtTime && route && route.length > pointAtTime.routeIndex) {
        const routePoint = route[pointAtTime.routeIndex];
        distance = pointAtTime.distance / 1000; // Convert meters to km
        lat = routePoint.lat;
        lon = routePoint.lon;
        elevation = routePoint.ele;
      }
      
      // Calculate time of day if start date/time provided
      let timeOfDay = '';
      if (startDate && startTime) {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        if (!isNaN(startDateTime.getTime())) {
          const targetTime = addHours(startDateTime, targetHours);
          timeOfDay = targetTime.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        }
      }
      
      // Add special formatting for the last bucket
      const timeOfRunLabel = isLastBucket ? 
        `Hour ${hourStart}-${hourEnd} (FINISH)` : 
        `Hour ${hourStart}-${hourEnd}`;
      
      rows.push({
        timeOfRun: timeOfRunLabel,
        timeOfDay,
        distance: distance.toFixed(1),
        isLastBucket,
        lat,
        lon,
        elevation,
        targetTimeSeconds,
        routeIndex: pointAtTime?.routeIndex
      });
    }
    
    return rows;
  }, [totalHours, route, bins, startDate, startTime]);

  const fetchWeatherForRow = async (row, startDateTime) => {
    if (!row.lat || !row.lon || !startDateTime) return null;
    
    try {
      const targetTime = addHours(startDateTime, row.targetTimeSeconds / 3600);
      const elevation = Math.round(row.elevation || 0);
      
      // Open-Meteo API call with additional parameters including daily data
      const params = new URLSearchParams({
        latitude: row.lat.toFixed(6),
        longitude: row.lon.toFixed(6),
        hourly: [
          'temperature_2m',
          'apparent_temperature',
          'precipitation',
          'weather_code',
          'wind_speed_10m',
          'wind_gusts_10m',
          'uv_index'
          // Removed 'visibility' completely
        ].join(','),
        daily: 'sunrise,sunset', // 🆕 Add sunrise/sunset data
        elevation: elevation,
        timezone: 'auto',
        forecast_days: 16
      });
      
      const url = `https://api.open-meteo.com/v1/forecast?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`API failed: ${response.status}`);
      
      const data = await response.json();
      
      // Find exact hour match
      const targetHour = targetTime.toISOString().slice(0, 13) + ':00';
      const hourIndex = data.hourly.time.findIndex(time => time === targetHour);
      
      if (hourIndex === -1) return null;
      
      // Find the corresponding day for sunrise/sunset
      const targetDate = targetTime.toISOString().slice(0, 10); // YYYY-MM-DD
      const dayIndex = data.daily.time.findIndex(date => date === targetDate);
      
      let sunStatus = 'Unknown';
      let sunIcon = '❓';
      
      if (dayIndex !== -1) {
        const sunrise = new Date(data.daily.sunrise[dayIndex]);
        const sunset = new Date(data.daily.sunset[dayIndex]);
        
        if (targetTime < sunrise) {
          sunStatus = `Night (🌅 ${sunrise.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})`;
          sunIcon = '🌙';
        } else if (targetTime > sunset) {
          sunStatus = `Night (🌇 ${sunset.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})`;
          sunIcon = '🌙';
        } else {
          // Daytime - calculate position
          const totalDaylight = sunset.getTime() - sunrise.getTime();
          const timeSinceSunrise = targetTime.getTime() - sunrise.getTime();
          const dayProgress = timeSinceSunrise / totalDaylight;
          
          if (dayProgress < 0.25) {
            sunStatus = 'Early Morning';
            sunIcon = '🌅';
          } else if (dayProgress < 0.5) {
            sunStatus = 'Morning';
            sunIcon = '🌤️';
          } else if (dayProgress < 0.75) {
            sunStatus = 'Afternoon';
            sunIcon = '☀️';
          } else {
            sunStatus = 'Evening';
            sunIcon = '🌇';
          }
        }
      }
      
      // Remove visibility from the return statement:
      return {
        weather: getWeatherDescription(data.hourly.weather_code[hourIndex]),
        temperature: `${Math.round(data.hourly.temperature_2m[hourIndex])}°C`,
        feelsLike: `${Math.round(data.hourly.apparent_temperature[hourIndex])}°C`,
        wind: `${Math.round(data.hourly.wind_speed_10m[hourIndex])} km/h`,
        windGusts: `${Math.round(data.hourly.wind_gusts_10m[hourIndex])} km/h`,
        // Removed all visibility code
        uvIndex: data.hourly.uv_index[hourIndex] ? Math.round(data.hourly.uv_index[hourIndex]) : '0',
        precipitation: `${data.hourly.precipitation[hourIndex]}mm`,
        sunStatus: sunStatus,
        sunIcon: sunIcon
      };
      
    } catch (error) {
      console.error('Weather fetch failed:', error);
      return null;
    }
  };

  // Add this function to fetch all weather
  const fetchAllWeather = async () => {
    if (!startDate || !startTime) {
      alert('Please set start date and time first');
      return;
    }
    
    setLoadingWeather(true);
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const newWeatherData = {};
    
    for (const row of tableRows) {
      const weather = await fetchWeatherForRow(row, startDateTime);
      if (weather) {
        newWeatherData[row.targetTimeSeconds] = weather;
      }
      await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
    }
    
    setWeatherData(newWeatherData);
    setLoadingWeather(false);
  };

  return (
  
      <Box>
        <Typography
          variant="h5"
          sx={sectionTitleSx}
        >
          Weather Predictor
        </Typography>

        {/* Date and Time inputs */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          mb: 3, 
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Start Date:
            </Typography>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 16,
                fontFamily: 'inherit'
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Start Time:
            </Typography>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 16,
                fontFamily: 'inherit'
              }}
            />
          </Box>
        </Box>

        {/* Fetch Weather button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <button
            onClick={fetchAllWeather}
            disabled={loadingWeather || !startDate || !startTime}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: loadingWeather ? '#ccc' : '#1976d2',
              color: 'white',
              fontWeight: 600,
              cursor: loadingWeather ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingWeather ? 'Fetching Weather...' : 'Get Weather Forecast'}
          </button>
        </Box>

        {/* Add debug info */}
        {totalHours > 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            mb: 2, 
            fontSize: 14, 
            color: '#666',
            fontStyle: 'italic'
          }}>
            Estimated completion time: {(totalHours).toFixed(2)} hours ({totalDistanceKm.toFixed(1)} km total)
          </Box>
        )}

        {/* Table */}
        {tableRows.length > 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <table style={{
              width: '100%',
              maxWidth: 1400,
              borderCollapse: 'separate',
              borderSpacing: 0,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}>
              <thead>
                <tr>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    ⏱️ Time of Run
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    🕐 Time of Day
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    📏 Distance (km)
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    ⛰️ Elevation (m)
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    🌅 Sun Level
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    🌤️ Weather
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    🌡️ Temp
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    🥵 Feels Like
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    💨 Wind
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    🌪️ Gusts
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    ☀️ UV Index
                  </th>
                  <th style={{ padding: 10, borderBottom: '2px solid #e0e0e0', background: '#f5f7fa', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    🌧️ Rain
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => {
                  const weather = weatherData[row.targetTimeSeconds];
                  return (
                    <tr key={idx} style={{ 
                      background: row.isLastBucket ? '#f0f8ff' : (idx % 2 === 0 ? '#fff' : '#f9fafb'),
                      fontWeight: row.isLastBucket ? 600 : 'normal'
                    }}>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0',
                        textAlign: 'center',
                        fontWeight: row.isLastBucket ? 600 : 500,
                        color: row.isLastBucket ? '#1976d2' : 'inherit',
                        fontSize: 12
                      }}>
                        {row.timeOfRun}
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0',
                        textAlign: 'center',
                        fontWeight: row.isLastBucket ? 600 : 500,
                        fontSize: 12
                      }}>
                        {row.timeOfDay || '-'}
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0',
                        textAlign: 'center',
                        fontWeight: row.isLastBucket ? 600 : 500,
                        color: '#1976d2',
                        fontSize: 12
                      }}>
                        {row.distance}
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0',
                        textAlign: 'center',
                        fontWeight: row.isLastBucket ? 600 : 500,
                        color: '#8b5a2b',
                        fontSize: 12
                      }}>
                        {row.elevation ? Math.round(row.elevation) : '-'}
                      </td>
                      <td style={{ 
                        padding: 8, 
                        borderBottom: '1px solid #e0e0e0',
                        textAlign: 'center',
                        fontSize: 11,
                        maxWidth: 90,
                        color: weather?.sunIcon === '🌙' ? '#4a5568' : '#d69e2e'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 14 }}>{weather?.sunIcon || '❓'}</span>
                          <span style={{ fontSize: 10, lineHeight: 1.2 }}>{weather?.sunStatus || '-'}</span>
                        </div>
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0', 
                        textAlign: 'center',
                        fontSize: 11,
                        maxWidth: 70
                      }}>
                        {weather?.weather || '-'}
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0', 
                        textAlign: 'center',
                        color: '#d32f2f',
                        fontSize: 12
                      }}>
                        {weather?.temperature || '-'}
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0', 
                        textAlign: 'center',
                        color: '#ff9800',
                        fontSize: 12
                      }}>
                        {weather?.feelsLike || '-'}
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0', 
                        textAlign: 'center',
                        color: '#2196f3',
                        fontSize: 12
                      }}>
                        {weather?.wind || '-'}
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0', 
                        textAlign: 'center',
                        color: '#f44336',
                        fontSize: 12
                      }}>
                        {weather?.windGusts || '-'}
                      </td>
                      
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0', 
                        textAlign: 'center',
                        color: '#ff5722',
                        fontSize: 12
                      }}>
                        {weather?.uvIndex || '-'}
                      </td>
                      <td style={{ 
                        padding: 10, 
                        borderBottom: '1px solid #e0e0e0', 
                        textAlign: 'center',
                        color: '#4caf50',
                        fontSize: 12
                      }}>
                        {weather?.precipitation || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4, 
            color: '#666',
            fontStyle: 'italic'
          }}>
            No route data available for weather prediction
          </Box>
        )}

        {/* Weather Data Technical Details */}
        <Box sx={{ 
          mt: 3, 
          p: 3, 
          background: '#f8fafc', 
          borderRadius: 2, 
          border: '1px solid #e2e8f0' 
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: '#334155', 
            mb: 2,
            fontSize: 16
          }}>
            Weather Data Details
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                Source:
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
                Open-Meteo high-resolution models at 1-2km grid spacing (ICON-D2, AROME, NAM)
              </Typography>
            </Box>


            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                Mountain Adjustment:
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
                Temperature: -6.5°C per 1000m elevation gain (standard atmospheric lapse rate)<br/>
                Wind: Terrain exposure and orographic effects included
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Data from{' '}
              <a 
                href="https://open-meteo.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0277bd', textDecoration: 'none' }}
              >
                Open-Meteo.com
              </a>
              {' '}• High-resolution models • Updated hourly
            </Typography>
          </Box>
        </Box>
      </Box>
 
  );
}

