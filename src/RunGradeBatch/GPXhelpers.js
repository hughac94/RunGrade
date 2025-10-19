import GPXParser from 'gpxparser';
import FitParser from 'fit-file-parser';
import { XMLParser } from 'fast-xml-parser';

// GPX Analysis functions (keep existing ones)
export function getTotalDistance(points) {
  if (!points.length) return 0;
  const toRad = deg => deg * Math.PI / 180;
  let totalDist = 0;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], curr = points[i];
    if (typeof prev.lat === 'number' && typeof prev.lon === 'number' &&
        typeof curr.lat === 'number' && typeof curr.lon === 'number') {
      const R = 6371000; // Earth radius in meters
      const dLat = toRad(curr.lat - prev.lat);
      const dLon = toRad(curr.lon - prev.lon);
      const a = Math.sin(dLat/2)**2 +
        Math.cos(toRad(prev.lat)) * Math.cos(toRad(curr.lat)) *
        Math.sin(dLon/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDist += R * c;
    }
  }
  return totalDist / 1000; // Convert to km
}

export function getTotalTime(points) {
  if (!points.length) return 0;
  const first = points[0].time instanceof Date ? points[0].time : null;
  const last = points[points.length - 1].time instanceof Date ? points[points.length - 1].time : null;
  if (!first || !last) return 0;
  return (last - first) / 1000; // seconds
}

export function getTotalElevationGain(points) {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (typeof prev.ele === 'number' && typeof curr.ele === 'number') {
      const diff = curr.ele - prev.ele;
      if (diff > 0) gain += diff;
    }
  }
  return Math.round(gain);
}

// Updated FIT file processing based on documentation
export async function processFITFile(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    try {
      const size = (fileBuffer && (fileBuffer.byteLength ?? fileBuffer.length)) || 0;
      console.log(`Starting FIT parse for ${filename}, buffer size: ${size} bytes`);
      
      // Create parser instance
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'm',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
        mode: 'both'  // Changed from 'list' to 'both'
      });

      // Parse the file buffer
      fitParser.parse(fileBuffer, function (error, data) {
        if (error) {
          console.error(`FIT parse error for ${filename}:`, error);
          resolve({ error: `FIT parsing failed: ${error.message || error}`, filename });
          return;
        }

        try {
          console.log(`✅ FIT parse successful for ${filename}`);
          console.log(`FIT data keys:`, Object.keys(data));
          
          // Debug the data structure
          if (data.activity) {
            console.log(`Activity found with keys:`, Object.keys(data.activity));
            
            if (data.activity.sessions) {
              console.log(`Sessions found: ${data.activity.sessions.length}`);
              if (data.activity.sessions.length > 0) {
                console.log(`First session keys:`, Object.keys(data.activity.sessions[0]));
              }
            }
            
            if (data.activity.records) {
              console.log(`Records found: ${data.activity.records.length}`);
              if (data.activity.records.length > 0) {
                console.log(`First record keys:`, Object.keys(data.activity.records[0]));
              }
            }
          }

          // Try to extract data from different possible structures
          let sessions = [];
          let records = [];

          // Check different possible locations for session and record data
          if (data.activity && data.activity.sessions) {
            sessions = data.activity.sessions;
            records = data.activity.records || [];
          } else if (data.sessions) {
            sessions = data.sessions;
            records = data.records || [];
          } else {
            // No sessions found, but maybe we have records
            records = data.activity?.records || data.records || [];
            console.log(`No sessions found, but found ${records.length} records`);
          }

          console.log(`Final: ${sessions.length} sessions, ${records.length} records`);

          // Create a session object even if none exists
          let session = {};
          if (sessions.length > 0) {
            session = sessions[0];
          } else if (records.length > 0) {
            // Create a basic session from records
            const firstRecord = records[0];
            const lastRecord = records[records.length - 1];
            session = {
              sport: 'running', // default
              start_time: firstRecord.timestamp,
              total_timer_time: lastRecord.timestamp - firstRecord.timestamp
            };
          }

          // Extract GPS points from records
          const points = records
            .filter(record => record.position_lat !== undefined && record.position_long !== undefined)
            .map(record => ({
              lat: record.position_lat * (180 / Math.pow(2, 31)), // Convert semicircles to degrees
              lon: record.position_long * (180 / Math.pow(2, 31)),
              ele: record.altitude || record.enhanced_altitude || 0,
              time: record.timestamp ? new Date(record.timestamp) : null,
              heartRate: record.heart_rate || null,
              cadence: record.cadence || null,
              speed: record.speed || record.enhanced_speed || null
            }));

          console.log(`Extracted ${points.length} GPS points from ${filename}`);

          // Calculate basic stats
          const stats = {
            filename,
            fileType: 'FIT',
            totalTime: session.total_timer_time || (points.length > 0 ? getTotalTime(points) : 0),
            distance: session.total_distance ? (session.total_distance / 1000) : (points.length > 0 ? getTotalDistance(points) : 0),
            elevationGain: session.total_ascent || (points.length > 0 ? getTotalElevationGain(points) : 0),
            pointCount: points.length,
            startTime: points.length > 0 ? points[0]?.time : (session.start_time ? new Date(session.start_time) : null),
            endTime: points.length > 0 ? points[points.length - 1]?.time : null,
            // FIT-specific data
            avgHeartRate: session.avg_heart_rate || null,
            maxHeartRate: session.max_heart_rate || null,
            avgCadence: session.avg_cadence || null,
            calories: session.total_calories || null,
            sport: session.sport || 'unknown',
            avgSpeed: session.avg_speed ? (session.avg_speed * 3.6) : null,
            maxSpeed: session.max_speed ? (session.max_speed * 3.6) : null
          };

          console.log(`✅ FIT stats for ${filename}:`, {
            distance: stats.distance,
            time: stats.totalTime,
            elevation: stats.elevationGain,
            points: stats.pointCount,
            heartRate: stats.avgHeartRate
          });

          resolve({ stats, pointCount: points.length });

        } catch (processError) {
          console.error(`Error processing FIT data for ${filename}:`, processError);
          resolve({ error: `FIT processing failed: ${processError.message}`, filename });
        }
      });

    } catch (error) {
      console.error(`Error creating FIT parser for ${filename}:`, error);
      resolve({ error: error.message, filename });
    }
  });
}

// Process both GPX and FIT files (async)
export async function processFile(fileBuffer, filename) {
  const extension = filename.toLowerCase().split('.').pop();
  if (extension === 'gpx') {
    return processGPXFile(fileBuffer, filename);
  } else if (extension === 'fit') {
    return await processFITFile(fileBuffer, filename);
  } else {
    return { error: 'Unsupported file type. Only GPX and FIT files are supported.', filename };
  }
}





export async function processFITFileFromArrayBuffer(arrayBuffer, filename) {
  return await processFITFile(arrayBuffer, filename);
}



export async function getFITRoutePointsFromArrayBuffer(arrayBuffer) {
  return await getFITRoutePoints(arrayBuffer);
}

// Helper function to extract route points for binning
export async function getRoutePoints(fileBuffer, filename) {
  const extension = filename.toLowerCase().split('.').pop();
  if (extension === 'gpx') {
    return getGPXRoutePoints(fileBuffer);
  } else if (extension === 'fit') {
    return await getFITRoutePoints(fileBuffer);
  }
  return null;
}

// GPX file processing
export function processGPXFile(fileBuffer, filename) {
  try {
    const gpx = new GPXParser();
    gpx.parse(fileBuffer.toString());
    
    let rawPoints = gpx.tracks?.[0]?.points || [];
    if (!rawPoints.length && gpx.routes?.[0]?.points?.length) {
      rawPoints = gpx.routes[0].points;
    }
    
    if (!rawPoints.length) {
      return { error: 'No track data found', filename };
    }

    const points = rawPoints.map(pt => ({
      ...pt,
      time: pt.time ? new Date(pt.time) : null
    }));

    const stats = {
      filename: filename,
      fileType: 'GPX',
      totalTime: getTotalTime(points),
      distance: getTotalDistance(points),
      elevationGain: getTotalElevationGain(points),
      pointCount: points.length,
      startTime: points[0]?.time || null,
      endTime: points[points.length - 1]?.time || null,
      // GPX files don't have these fields
      avgHeartRate: null,
      maxHeartRate: null,
      avgCadence: null,
      calories: null,
      sport: 'unknown',
      avgSpeed: null,
      maxSpeed: null
    };

    return { stats, pointCount: points.length };
  } catch (error) {
    console.error(`Error processing ${filename}:`, error.message);
    return { error: error.message, filename };
  }
}


// Extract route points from GPX
export function getGPXRoutePoints(fileBuffer) {
  try {
    const gpx = new GPXParser();
    gpx.parse(fileBuffer.toString());
    
    let rawPoints = gpx.tracks?.[0]?.points || [];
    if (!rawPoints.length && gpx.routes?.[0]?.points?.length) {
      rawPoints = gpx.routes[0].points;
    }
    
    return rawPoints.map(pt => ({
      lat: pt.lat,
      lon: pt.lon,
      ele: pt.ele || 0,
      time: pt.time ? new Date(pt.time) : null,
      heartRate: null, // GPX typically doesn't have HR
      cadence: null,
      speed: null
    }));
  } catch (error) {
    console.error('Error extracting GPX route points:', error);
    return null;
  }
}

// Extract route points from FIT
export function getFITRoutePoints(fileBuffer) {
  console.log('getFITRoutePoints called');
  const __size = (fileBuffer && (fileBuffer.byteLength ?? fileBuffer.length)) || 0;
  console.log('getFITRoutePoints called, buffer size:', __size);
  return new Promise((resolve) => {
    try {
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'm',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
        mode: 'both'
      });

      fitParser.parse(fileBuffer, function (error, data) {
        console.log('fitParser.parse callback called');
        if (error) {
          console.error('FIT parsing error for route points:', error);
          resolve(null);
          return;
        }

        // Try all possible locations for records
        let records = [];
        if (data.activity?.records) {
          records = data.activity.records;
        } else if (data.records) {
          records = data.records;
        } else if (Array.isArray(data.record)) {
          records = data.record;
        }
        console.log(`📍 FIT route extraction: Found ${records.length} total records (activity.records, records, or record)`);

        // More flexible position detection
        const pointsWithPosition = records.filter(record => {
          const hasLat = record.position_lat !== undefined || record.lat !== undefined;
          const hasLon = record.position_long !== undefined || record.lon !== undefined || record.lng !== undefined;
          return hasLat && hasLon;
        });

        console.log(`📍 Records with GPS position: ${pointsWithPosition.length}/${records.length}`);

        function semicirclesToDegrees(val) {
          return val * (180 / Math.pow(2, 31));
        }

        const points = pointsWithPosition.map(record => {
          const lat = (typeof record.position_lat === 'number')
            ? (Math.abs(record.position_lat) > 180 ? semicirclesToDegrees(record.position_lat) : record.position_lat)
            : record.lat;
          const lon = (typeof record.position_long === 'number')
            ? (Math.abs(record.position_long) > 180 ? semicirclesToDegrees(record.position_long) : record.position_long)
            : (record.lon || record.lng);

          return {
            lat,
            lon,
            ele: record.altitude || record.enhanced_altitude || record.elevation || 0,
            time: record.timestamp ? new Date(record.timestamp) : null,
            heartRate: record.heart_rate || record.heartRate || null,
            cadence: record.cadence || null,
            speed: record.speed || record.enhanced_speed || null
          };
        });

        console.log(`📍 Final route points for binning: ${points.length}`);
        if (points.length > 0) {
          console.log(`First point:`, points[0]);
          console.log(`Last point:`, points[points.length - 1]);
        }

        resolve(points);
      });
    } catch (error) {
      console.error('Error creating FIT parser for route points:', error);
      resolve(null);
    }
  });
}

// helper to flatten trkpts from various GPX shapes
function flattenTrkpts(obj) {
  if (!obj) return [];
  const gpx = obj.gpx || obj.GPX || obj;
  const trks = Array.isArray(gpx?.trk) ? gpx.trk : (gpx?.trk ? [gpx.trk] : []);
  const segs = trks.flatMap(t => {
    const s = t?.trkseg ?? t?.segments ?? [];
    return Array.isArray(s) ? s : [s];
  });
  const pts = segs.flatMap(s => {
    const p = s?.trkpt ?? s?.TRKPT ?? [];
    return Array.isArray(p) ? p : (p ? [p] : []);
  });
  return pts.filter(Boolean);
}

function mapTrkpt(p) {
  const lat = parseFloat(p.lat ?? p.LAT ?? p.latitude ?? p.attributes?.lat);
  const lon = parseFloat(p.lon ?? p.LON ?? p.longitude ?? p.attributes?.lon);
  const eleRaw = p.ele ?? p.ELE ?? p.alt ?? p.altitude ?? p.children?.find?.(c => c.name === 'ele')?.value;
  const timeRaw = p.time ?? p.TIME ?? p.timestamp;

  const ele = eleRaw != null ? parseFloat(eleRaw) : 0;

  // NEW: normalize to Date
  let time = null;
  if (timeRaw != null) {
    if (timeRaw instanceof Date) {
      time = timeRaw;
    } else if (typeof timeRaw === 'string') {
      time = new Date(timeRaw);
    } else if (typeof timeRaw === 'number') {
      // if seconds, multiply to ms; if already ms (>= 1e12), use as-is
      time = new Date(timeRaw > 1e12 ? timeRaw : timeRaw * 1000);
    }
  }

  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, ele, time } : null;
}

export function processGPXFileFromText(xmlText, filename) {
  try {
    let points = [];
    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      const trkpts = Array.from(doc.getElementsByTagName('trkpt'));
      points = trkpts.map(el => {
        const lat = parseFloat(el.getAttribute('lat'));
        const lon = parseFloat(el.getAttribute('lon'));
        const ele = parseFloat(el.querySelector('ele')?.textContent ?? '0');
        const timeStr = el.querySelector('time')?.textContent ?? null;

        // NEW: Date object, not seconds
        const time = timeStr ? new Date(timeStr) : null;

        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, ele, time } : null;
      }).filter(Boolean);
    } else {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
      const obj = parser.parse(xmlText);
      const trkpts = flattenTrkpts(obj);
      points = trkpts.map(mapTrkpt).filter(Boolean);
    }

    const totalDistance = getTotalDistance(points);
    const totalTime = getTotalTime(points);
    const elevationGain = getTotalElevationGain(points);

    return {
      stats: {
        filename,
        fileType: 'GPX',
        distance: totalDistance,
        totalTime,
        elevationGain,
        pointCount: points.length,
        startTime: points[0]?.time || null,
        endTime: points[points.length - 1]?.time || null
      },
      pointCount: points.length
    };
  } catch (e) {
    return { error: `GPX parsing failed: ${e.message || String(e)}`, filename };
  }
}

export function getGPXRoutePointsFromText(xmlText) {
  try {
    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      const trkpts = Array.from(doc.getElementsByTagName('trkpt'));
      return trkpts.map(el => {
        const lat = parseFloat(el.getAttribute('lat'));
        const lon = parseFloat(el.getAttribute('lon'));
        const ele = parseFloat(el.querySelector('ele')?.textContent ?? '0');
        const timeStr = el.querySelector('time')?.textContent ?? null;

        // NEW: Date object here too
        const time = timeStr ? new Date(timeStr) : null;

        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, ele, time } : null;
      }).filter(Boolean);
    } else {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
      const obj = parser.parse(xmlText);
      const trkpts = flattenTrkpts(obj);
      return trkpts.map(mapTrkpt).filter(Boolean);
    }
  } catch {
    return [];
  }
}

