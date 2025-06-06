/**
 * Breaks a GPX route into sequential bins of a given length (in meters).
 * Each bin contains: distance, elevation change, gradient, time taken, velocity, running speed (min/km), and grade adjusted pace.
 * @param {Array} points - Array of {lat, lon, ele, time} objects
 * @param {number} binLength - Bin length in meters (default 50)
 * @param {Array} polyCoeffs - Polynomial coefficients for grade adjustment (optional)
 * @returns {Array} Array of bins
 */
import { haversine } from "./gpxAnalysis";

  function formatTime(seconds) {
    if (seconds == null) return '';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

export function getAnalysisBins(points, binLength = 50, polyCoeffs = null, newAdjustedVelocity = null) {
  if (!Array.isArray(points) || points.length < 2) return [];

  const bins = [];
  let lastBinIdx = 0;
  let cumDist = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segDist = haversine(prev.lat, prev.lon, curr.lat, curr.lon);

    cumDist += segDist;

    // When we've reached or exceeded the bin length, create a bin ending at this point
    if (cumDist >= binLength) {
      const binStart = points[lastBinIdx];
      const binEnd = curr;
      const distance = cumDist;
      const elevationChange = binEnd.ele - binStart.ele;
      const gradient = (distance > 0) ? (elevationChange / distance) * 100 : 0;

      // Time-based calculations only if both start and end have valid time
      let timeTaken = null;
      let velocity = null;
      let pace_min_per_km_num = null;
      if (binStart.time && binEnd.time) {
        const seconds = (new Date(binEnd.time) - new Date(binStart.time)) / 1000;
        if (!isNaN(seconds) && seconds > 0) {
          timeTaken = formatTime(seconds);
          velocity = distance / seconds;
          pace_min_per_km_num = (velocity > 0) ? (1000 / velocity) / 60 : null;
        }
      }

      let adjFactor = 1;
      if (polyCoeffs && Array.isArray(polyCoeffs) && polyCoeffs.length === 5 && typeof gradient === 'number') {
        const clampedGradient = Math.max(-35, Math.min(35, gradient));
        const [a, b, c, d, e] = polyCoeffs;
        adjFactor =
          a * Math.pow(clampedGradient, 4) +
          b * Math.pow(clampedGradient, 3) +
          c * Math.pow(clampedGradient, 2) +
          d * clampedGradient +
          e;
      }

      let adjustedTime = null;
      let gradeAdjustedDistance = null;
      if (
        newAdjustedVelocity &&
        newAdjustedVelocity > 0 &&
        isFinite(adjFactor) &&
        adjFactor > 0
      ) {
        adjustedTime = (distance * adjFactor) / newAdjustedVelocity;
        gradeAdjustedDistance = distance * adjFactor;
      }

      bins.push({
        distance,
        elevationChange: Number(elevationChange.toFixed(2)),
        gradient: Number(gradient.toFixed(2)),
        timeTaken,
        velocity,
        pace_min_per_km: pace_min_per_km_num,
        adjustedTime: Number(adjustedTime) || 0,
        gradeAdjustedDistance,
        startIdx: lastBinIdx,
        endIdx: i,
        startTime: binStart.time || null,
        endTime: binEnd.time || null
      });

      lastBinIdx = i;
      cumDist = 0;
    }
  }

  // Add a final partial bin if any distance remains
  if (lastBinIdx < points.length - 1 && cumDist > 0) {
    const binStart = points[lastBinIdx];
    const binEnd = points[points.length - 1];
    const distance = cumDist;
    const elevationChange = binEnd.ele - binStart.ele;
    const gradient = (distance > 0) ? (elevationChange / distance) * 100 : 0;

    let timeTaken = null;
    let velocity = null;
    let pace_min_per_km_num = null;
    if (binStart.time && binEnd.time) {
      const seconds = (new Date(binEnd.time) - new Date(binStart.time)) / 1000;
      if (!isNaN(seconds) && seconds > 0) {
        timeTaken = formatTime(seconds);
        velocity = distance / seconds;
        pace_min_per_km_num = (velocity > 0) ? (1000 / velocity) / 60 : null;
      }
    }

    let adjFactor = 1;
    if (polyCoeffs && Array.isArray(polyCoeffs) && polyCoeffs.length === 5 && typeof gradient === 'number') {
      const clampedGradient = Math.max(-35, Math.min(35, gradient));
      const [a, b, c, d, e] = polyCoeffs;
      adjFactor =
        a * Math.pow(clampedGradient, 4) +
        b * Math.pow(clampedGradient, 3) +
        c * Math.pow(clampedGradient, 2) +
        d * clampedGradient +
        e;
    }

    let adjustedTime = null;
    let gradeAdjustedDistance = null;
    if (
      newAdjustedVelocity &&
      newAdjustedVelocity > 0 &&
      isFinite(adjFactor) &&
      adjFactor > 0
    ) {
      adjustedTime = (distance * adjFactor) / newAdjustedVelocity;
      gradeAdjustedDistance = distance * adjFactor;
    }

    bins.push({
      distance,
      elevationChange: Number(elevationChange.toFixed(2)),
      gradient: Number(gradient.toFixed(2)),
      timeTaken,
      velocity,
      pace_min_per_km: pace_min_per_km_num,
      adjustedTime: Number(adjustedTime) || 0,
      gradeAdjustedDistance,
      startIdx: lastBinIdx,
      endIdx: points.length - 1,
      startTime: binStart.time || null,
      endTime: binEnd.time || null
    });
  }

  return bins;
}




export function getGradeAdjustedPaceFromBins(bins) {
  if (!bins || bins.length === 0) return null;
  // Filter out bins with no pace or invalid gradient
  const validBins = bins.filter(bin =>
    typeof bin.pace_min_per_km === 'number' &&
    isFinite(bin.pace_min_per_km) &&
    typeof bin.gradient === 'number' &&
    isFinite(bin.gradient)
  );
  if (validBins.length === 0) return null;

  // Weighted average by distance
  const totalDist = validBins.reduce((sum, bin) => sum + (bin.distance || 0), 0);
  if (totalDist === 0) return null;

  const totalTime = validBins.reduce((sum, bin) => sum + (bin.pace_min_per_km * (bin.distance || 0)), 0);
  return totalTime / totalDist; // min/km
}