import gradientGroups from './GradientBuckets';

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}


// Helper to format decimal minutes as min:sec
export function formatMinSec(decimalMinutes) {
  if (!isFinite(decimalMinutes) || decimalMinutes <= 0) return 'n/a';
  let min = Math.floor(decimalMinutes);
  let sec = Math.round((decimalMinutes - min) * 60);
  if (sec === 60) {
    min += 1;
    sec = 0;
  }
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function formatHMS(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '-';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export function formatTime(seconds) {
    if (seconds == null) return '';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

/**
 * Find climbs in a GPX route.
 * A climb is defined as a segment where >50m vertical gain occurs without a loss >20m.
 * @param {Array} points - Array of [lat, lon, ele] points.
 * @param {Object} options - Options for climb detection
 * @param {number} options.minGain - Minimum gain in meters to qualify as a climb
 * @param {number} options.maxLoss - Maximum loss in meters to qualify as a climb
 * @returns {Array} Array of climbs: { start, endIdx, gain, distance, name }
 *   - start: distance in km from start of route
 */
export function findMajorClimbs(points, options = {}) {
  const minGain = options.minGain ?? 50;
  const maxLoss = options.maxLoss ?? 20;
  if (!Array.isArray(points) || points.length === 0 || !Array.isArray(points[0])) return [];

  const climbs = [];
  let startIdx = null;
  let gain = 0;
  let dist = 0;
  let minEleSinceStart = null;
  let climbCount = 1;

  // Precompute cumulative distances (in km) for each point
  const toRad = deg => deg * Math.PI / 180;
  let totalDist = 0;
  const cumDistances = points.map((pt, i, arr) => {
    if (i > 0) {
      const [lat1, lon1] = arr[i - 1];
      const [lat2, lon2] = pt;
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)**2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDist += R * c;
    }
    return totalDist / 1000; // in km
  });

  for (let i = 1; i < points.length; i++) {
    const [lat1, lon1, ele1, time1] = points[i - 1];
    const [lat2, lon2, ele2, time2] = points[i];

    if (startIdx === null) {
      // Start a new potential climb
      startIdx = i - 1;
      gain = 0;
      dist = 0;
      minEleSinceStart = ele1;
    }

    // Calculate distance between points
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const segDist = R * c;

    // Update gain and distance
    if (ele2 > minEleSinceStart) {
      minEleSinceStart = ele2;
    }
    gain = minEleSinceStart - points[startIdx][2];
    dist += segDist;

    // If we lose more than 20m from the highest point since the climb started, end the climb
    if (ele2 < minEleSinceStart - maxLoss) {
      if (gain >= minGain) {
        climbs.push({
          start: Number((cumDistances[startIdx]).toFixed(1)),
          gain: Math.round(gain),
          distance: Number((dist / 1000).toFixed(1)),
          name: `climb ${climbCount++}`,
          avgGradient: dist > 0 ? Math.round((gain / dist) * 100) : 0,
          startIdx,
          endIdx: i,
          startTime: points[startIdx][3] || null,
          endTime: time2 || null,
        });
      }
      startIdx = null;
      gain = 0;
      dist = 0;
      minEleSinceStart = null;
    }
  }

  // Check for a climb at the end
  if (startIdx !== null && gain >= minGain) {
    climbs.push({
      start: Number((cumDistances[startIdx]).toFixed(1)),
      gain: Math.round(gain),
      distance: Number((dist / 1000).toFixed(1)),
      name: `climb ${climbCount++}`,
      avgGradient: dist > 0 ? Math.round((gain / dist) * 100) : 0,
      startIdx,
      endIdx: points.length - 1,
      startTime: points[startIdx][3] || null,
      endTime: points[points.length - 1][3] || null,
    });
  }

  return climbs;
}

/**
 * General helpers
 */
export function median(arr) {
  if (!arr.length) return null;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Route-level stats
 */
export function getTotalTime(points) {
  if (!points.length) return 0;
  const first = points[0].time instanceof Date ? points[0].time : null;
  const last = points[points.length - 1].time instanceof Date ? points[points.length - 1].time : null;
  if (!first || !last) return 0;
  return (last - first) / 1000; // seconds
}

export function getTotalDistance(points) {
  if (!points.length) return 0;
  const toRad = deg => deg * Math.PI / 180;
  let totalDist = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], curr = points[i];
    if (typeof prev.lat === 'number' && typeof prev.lon === 'number' &&
        typeof curr.lat === 'number' && typeof curr.lon === 'number') {
      const R = 6371000;
      const dLat = toRad(curr.lat - prev.lat);
      const dLon = toRad(curr.lon - prev.lon);
      const a = Math.sin(dLat/2)**2 +
        Math.cos(toRad(prev.lat)) * Math.cos(toRad(curr.lat)) *
        Math.sin(dLon/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDist += R * c;
    }
  }
  return totalDist / 1000; // km
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

/**
 * Average pace (min/km)
 */
export function getAveragePace(points) {
  const totalTime = getTotalTime(points) / 60; // min
  const totalDist = getTotalDistance(points);
  if (!totalDist) return null;
  return totalTime / totalDist;
}


export function extractTime(pt) {
    if (!pt) return null;
    if (pt instanceof Date) return pt;
    if (typeof pt === 'string') return new Date(pt);
    if (Array.isArray(pt) && pt.length > 3 && pt[3]) return new Date(pt[3]);
    if (typeof pt === 'object' && pt.time) return new Date(pt.time);
    return null;
  }

/**
 * Overall grade-adjusted pace (min/km)
 */
export function getOverallGradeAdjustedPace(bins) {
  // Defensive: filter out bins with invalid or missing distance or gradeAdjustedTime
  const validBins = (bins || []).filter(
    bin => typeof bin.distance === 'number' && isFinite(bin.distance) && bin.distance > 0 &&
           typeof bin.gradeAdjustedTime === 'number' && isFinite(bin.gradeAdjustedTime) && bin.gradeAdjustedTime > 0
  );
  const totalAdjTime = validBins.reduce((sum, bin) => sum + bin.gradeAdjustedTime, 0);
  const totalDist = validBins.reduce((sum, bin) => sum + bin.distance, 0);

  if (!totalDist) {
    // Debug output for diagnosis
    return null;
  }
  return (totalAdjTime / 60) / (totalDist / 1000); // min/km
}

/**
 * Total adjusted time for new GAP
 */
export function getTotalAdjustedTime(bins) {
  return bins.reduce((sum, bin) => sum + (bin.gradeAdjustedTime || 0), 0);
}


/**
 * Pace analysis by gradient
 */
export function getPaceAnalysisByGradient(bins) {
  if (!bins || bins.length === 0) return { gradients: [], medians: [], gradeAdjMedians: [] };
  const groupMap = {};
  bins.forEach(bin => {
    if (typeof bin.gradient !== 'number' || !isFinite(bin.gradient)) return;
    const group = Math.round(bin.gradient);
    if (!groupMap[group]) groupMap[group] = [];
    groupMap[group].push(bin);
  });
  const gradients = [];
  const medians = [];
  const gradeAdjMedians = [];
  Object.keys(groupMap).sort((a, b) => a - b).forEach(group => {
    const binsInGroup = groupMap[group];
    const paces = binsInGroup.map(b => b.pace).filter(v => isFinite(v));
    const gradeAdjPaces = binsInGroup.map(b => b.gradeAdjustedPaceNum).filter(v => isFinite(v));
    if (paces.length && gradeAdjPaces.length) {
      gradients.push(Number(group));
      medians.push(median(paces));
      gradeAdjMedians.push(median(gradeAdjPaces));
    }
  });
  return { gradients, medians, gradeAdjMedians };
}

/**
 * Checkpoint calculations
 */
export function getCheckpointStats(points, checkpoints) {
  // Returns array of { checkpointIdx, elapsedTime, segmentTime, segmentDist, avgPace, gradeAdjPace, elevationGain }
  if (!Array.isArray(points) || !Array.isArray(checkpoints)) return [];
  const stats = [];
  for (let i = 0; i < checkpoints.length; i++) {
    const idx = checkpoints[i];
    if (typeof idx !== 'number' || idx < 0 || idx >= points.length) continue;
    const pt = points[idx];
    const prevIdx = i === 0 ? 0 : checkpoints[i - 1];
    const prevPt = points[prevIdx];
    const elapsedTime = pt.time instanceof Date && points[0].time instanceof Date
      ? (pt.time - points[0].time) / 1000
      : null;
    const segmentTime = pt.time instanceof Date && prevPt.time instanceof Date
      ? (pt.time - prevPt.time) / 1000
      : null;
    const segmentDist = getTotalDistance(points.slice(prevIdx, idx + 1));
    const elevationGain = getTotalElevationGain(points.slice(prevIdx, idx + 1));
    stats.push({
      checkpointIdx: idx,
      elapsedTime,
      segmentTime,
      segmentDist,
      avgPace: segmentDist ? (segmentTime / 60) / segmentDist : null,
      elevationGain
    });
  }
  return stats;
}

/**
 * Elevation smoothing
 */
export function smoothElevations(points, windowSize = 7) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const half = Math.floor(windowSize / 2);
  return points.map((pt, i) => {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
      sum += points[j].ele;
      count++;
    }
    return { ...pt, ele: sum / count };
  });
}
// This function applies a moving average smoothing to the elevation (ele) values in your points array.
// For each point, it averages the elevation of itself and its neighbors (within the window size).
// The result is a new array of points with smoothed elevation data, which helps reduce noise in elevation profiles.

/**
 * Calculate overall grade-adjusted pace (min/km) using moving time and gradeAdjustedDistance.
 * This matches the StatsSummary logic.
 */
export function getGradeAdjustedPaceFromBins(bins) {
 
 
  if (!bins || bins.length === 0) return null;
  // Sum total time in seconds
  const totalTimeSecs = bins
    .map(bin => {
      if (!bin.timeTaken) return 0;
      const parts = bin.timeTaken.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return 0;
    })
    .reduce((a, b) => a + b, 0);
  // Sum total grade adjusted distance in meters
  const totalGradeAdjDist = bins
    .map(bin => typeof bin.gradeAdjustedDistance === 'number' ? bin.gradeAdjustedDistance : 0)
    .reduce((a, b) => a + b, 0);
  if (totalGradeAdjDist === 0) return null;
  const totalTimeMins = totalTimeSecs / 60;
  const totalGradeAdjDistKm = totalGradeAdjDist / 1000;
  return totalTimeMins / totalGradeAdjDistKm; // min/km
}

/**
 * Get total time (in seconds) spent in each gradient group.
 * @param {Array} bins - Array of bin objects with .gradient and .timeTaken
 * @param {Array} gradientGroups - Array of gradient group definitions
 * @returns {Array} Array of { group, totalTimeSec }
 */
export function getTotalTimeByGradientGroup(bins, gradientGroups) {
  return gradientGroups.map(group => {
    const binsInGroup = (bins || []).filter(bin =>
      typeof bin.gradient === 'number' &&
      bin.gradient > group.min &&
      bin.gradient <= group.max
    );
    const totalTimeSec = binsInGroup
      .map(bin => {
        if (!bin.timeTaken) return 0;
        const parts = bin.timeTaken.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
      })
      .reduce((a, b) => a + b, 0);
    return {
      group: group.label,
      totalTimeSec
    };
  });
}

// Time stopped for over 30 seconds
export function getTimeStopped(points, speedThreshold = 0.2) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let totalStopped = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (
      prev.time instanceof Date && curr.time instanceof Date &&
      !isNaN(prev.time) && !isNaN(curr.time) &&
      typeof prev.lat === 'number' && typeof prev.lon === 'number' &&
      typeof curr.lat === 'number' && typeof curr.lon === 'number'
    ) {
      const deltaT = (curr.time - prev.time) / 1000; // seconds
      const dist = haversine(prev.lat, prev.lon, curr.lat, curr.lon); // meters
      const speed = dist / deltaT; // m/s
      // Debug log:
      if (
        speed < speedThreshold &&
        deltaT > 0 && deltaT < 60 * 60 * 2
      ) {
        totalStopped += deltaT;
      }
    }
  }
  return totalStopped; // seconds
}



//pace by gradient calculation
export function getPaceByGradient(bins) {
  return gradientGroups.map(group => {
    const binsInGroup = (bins || []).filter(bin =>
      typeof bin.gradient === 'number' &&
      bin.gradient > group.min &&
      bin.gradient <= group.max
    );
    const totalTime = binsInGroup
      .map(bin => parseTimeToSeconds(bin.timeTaken))
      .reduce((a, b) => a + b, 0); // seconds
    const totalDistance = binsInGroup
      .map(bin => typeof bin.distance === 'number' ? bin.distance : 0)
      .reduce((a, b) => a + b, 0); // meters

    let avgPace = null;
    if (totalDistance > 0 && totalTime > 0) {
      avgPace = (totalTime / 60) / (totalDistance / 1000); // min/km
    }

    return {
      group: group.label,
      x: group.mid, // Use numeric midpoint for x
      y: avgPace,
      avgPaceStr: avgPace ? formatMinSec(avgPace) : 'n/a'
    };
  });
}

export function haversine(lat1, lon1, lat2, lon2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function downsampleToMax(arr, maxPoints = 400) {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, idx) => idx % step === 0 || idx === arr.length - 1);
}

export function removePauses(points, threshold) {
    if (!Array.isArray(points) || points.length < 2) return points;
    let adjustedPoints = [points[0]];
    let totalPause = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (
        prev.time instanceof Date &&
        curr.time instanceof Date &&
        !isNaN(prev.time) &&
        !isNaN(curr.time)
      ) {
        const delta = (curr.time - prev.time) / 1000;
        if (delta > threshold) {
          totalPause += delta;
        }
        adjustedPoints.push({
          ...curr,
          time: new Date(curr.time.getTime() - totalPause * 1000)
        });
      } else {
        adjustedPoints.push(curr);
      }
    }
    return adjustedPoints;
  }