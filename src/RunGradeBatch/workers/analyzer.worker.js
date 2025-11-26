/* eslint-disable no-restricted-globals */
import {
  getAnalysisBins, getBinSummary, getGradientPaceAnalysis,
  getPaceByGradientChart, getGradeAdjustmentAnalysis, getAdjustmentByGradientBins
} from '../gpxBinning';
import {
  processGPXFileFromText, processFITFileFromArrayBuffer,
  getGPXRoutePointsFromText, getFITRoutePointsFromArrayBuffer
} from '../GPXhelpers';

async function analyzeSingleFile(file, binLength) {
  const name = file.name.toLowerCase();
  let statsResult, routePoints;
  if (name.endsWith('.gpx')) {
    const text = await file.text();
    statsResult = processGPXFileFromText(text, file.name);
    routePoints = getGPXRoutePointsFromText(text);
  } else if (name.endsWith('.fit')) {
    const ab = await file.arrayBuffer();
    statsResult = await processFITFileFromArrayBuffer(ab, file.name);
    routePoints = await getFITRoutePointsFromArrayBuffer(ab);
  } else {
    return { error: 'Unsupported file type', filename: file.name };
  }
  if (statsResult.error) return statsResult;

  const bins = Array.isArray(routePoints) && routePoints.length > 0
    ? getAnalysisBins(routePoints, binLength)
    : [];
  const binSummary = getBinSummary(bins);
  const hasHeartRateData = bins.some(b => b.avgHeartRate != null);

  return {
    ...statsResult.stats,
    binLength,
    bins,
    binSummary,
    routePointCount: routePoints?.length || 0,
    hasHeartRateData
  };
}

self.onmessage = async (e) => {
  const { cmd, payload } = e.data || {};
  try {
    if (cmd === 'analyze-with-bins') {
      const { files, binLength } = payload;
      const results = [], errors = [];
      for (const f of files) {
        const r = await analyzeSingleFile(f, binLength);
        if (r.error) errors.push({ filename: f.name, error: r.error });
        else results.push(r);
      }
      const totalBins = results.reduce((s, r) => s + (r.bins?.length || 0), 0);
      const summary = {
        totalFiles: files.length,
        successfulFiles: results.length,
        failedFiles: errors.length,
        binLength,
        totalBins,
        avgBinsPerFile: results.length ? Math.round((totalBins / results.length) * 10) / 10 : 0,
        filesWithHeartRate: results.filter(r => r.hasHeartRateData).length
      };
      postMessage({ ok: true, data: { success: true, summary, results, errors } });
    }

    else if (cmd === 'advanced-analysis') {
      const { results, statType = 'mean' } = payload;

      // Get gradient pace and grade adjustment analysis
      const gradientPace = getGradientPaceAnalysis(results);
      const paceByGradientChart = getPaceByGradientChart(results);
      const gradeAdjustment = getGradeAdjustmentAnalysis(results);

      // Select the correct base pace (mean or median) based on statType
      const basePace = statType === 'median' ? gradeAdjustment.basePaceMedian : gradeAdjustment.basePace;

      // Calculate red dot data using the selected base pace
      const redDotData = getAdjustmentByGradientBins(results, basePace, statType);

      // Send the analysis data back to the main thread
      postMessage({
        ok: true,
        data: {
          success: true,
          analyses: {
            gradientPace,
            paceByGradientChart,
            gradeAdjustment,
            redDotData,
          },
        },
      });
    }

    else if (cmd === 'analyze-with-filters-json') {
      const { results, removeUnreliableBins, heartRateFilter, statType = 'mean' } = payload;

      let exclusionCounts = { speed: 0, gradient: 0, timeInSeconds: 0, distance: 0, heartRate: 0, total: 0 };
      const filteredResults = results.map(run => {
        const bins = run.bins || [];
        const kept = [];
        for (const bin of bins) {
          let exclude = null;
          if (removeUnreliableBins) {
            const speed = typeof bin.avgSpeed === 'number' ? bin.avgSpeed : (typeof bin.velocity === 'number' ? bin.velocity * 3.6 : 0);
            if (!(speed >= 1 && speed <= 30)) { exclusionCounts.speed++; exclude = 'speed'; }
            else if (!(bin.gradient <= 30 && bin.gradient >= -30)) { exclusionCounts.gradient++; exclude = 'gradient'; }
            else if (!(bin.timeInSeconds >= 1)) { exclusionCounts.timeInSeconds++; exclude = 'timeInSeconds'; }
            else if (!(bin.distance > 0)) { exclusionCounts.distance++; exclude = 'distance'; }
          }
          if (heartRateFilter && (heartRateFilter.minHR || heartRateFilter.maxHR)) {
            if (bin.avgHeartRate == null ||
                (heartRateFilter.minHR && bin.avgHeartRate < heartRateFilter.minHR) ||
                (heartRateFilter.maxHR && bin.avgHeartRate > heartRateFilter.maxHR)) {
              exclusionCounts.heartRate++; exclude = 'heartRate';
            }
          }
          if (!exclude) kept.push(bin); else exclusionCounts.total++;
        }
        return { ...run, bins: kept };
      });

      const totalOriginalBins = results.reduce((s, r) => s + (r.bins?.length || 0), 0);
      const totalFilteredBins = filteredResults.reduce((s, r) => s + (r.bins?.length || 0), 0);

      const gradientPace = getGradientPaceAnalysis(filteredResults);
      const paceByGradientChart = getPaceByGradientChart(filteredResults);
      const gradeAdjustment = getGradeAdjustmentAnalysis(filteredResults);
      const basePace = gradeAdjustment.basePace;
      const redDotData = getAdjustmentByGradientBins(filteredResults, basePace, statType);

      postMessage({
        ok: true,
        data: {
          success: true,
          summary: { totalOriginalBins, totalFilteredBins, exclusionCounts },
          analyses: { gradientPace, paceByGradientChart, gradeAdjustment, redDotData },
          filteredResults
        }
      });
    }

    else if (cmd === 'process-batch') {
      const { files, binLength } = payload;
      const totalFiles = files.length;
      const results = [], errors = [];
      // Initial progress
      postMessage({ ok: true, sse: { type: 'progress', fileIndex: 0, totalFiles, progressPercent: 0, filesProcessed: 0, currentFile: 'Starting analysis...', resultsSoFar: [], errorsSoFar: [] } });
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        let out;
        try {
          out = await analyzeSingleFile(file, binLength);
          if (out.error) errors.push({ filename: file.name, error: out.error });
          else results.push(out);
        } catch (err) {
          errors.push({ filename: file.name, error: String(err?.message || err) });
        }
        postMessage({
          ok: true,
          sse: {
            type: 'progress',
            fileIndex: i + 1,
            totalFiles,
            progressPercent: Math.round(((i + 1) / totalFiles) * 100),
            filesProcessed: results.length + errors.length,
            currentFile: file.name,
            resultsSoFar: results,
            errorsSoFar: errors
          }
        });
      }
      postMessage({
        ok: true,
        sse: { type: 'complete', totalFiles, successfulFiles: results.length, failedFiles: errors.length, results, errors }
      });
    }

    else {
      postMessage({ ok: false, error: `Unknown cmd ${cmd}` });
    }
  } catch (err) {
    postMessage({ ok: false, error: err?.message || String(err) });
  }
};