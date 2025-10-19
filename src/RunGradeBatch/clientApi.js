// Creates/owns a single worker instance and exposes API-like functions
const worker = new Worker(new URL('./workers/analyzer.worker.js', import.meta.url), { type: 'module' });

function callWorker(cmd, payload, onSSE) {
  return new Promise((resolve, reject) => {
    const handle = (e) => {
      const { ok, data, error, sse } = e.data || {};
      if (sse && onSSE) { onSSE(sse); return; }
      worker.removeEventListener('message', handle);
      if (!ok) reject(new Error(error || 'Worker error'));
      else resolve(data);
    };
    worker.addEventListener('message', handle);
    worker.postMessage({ cmd, payload });
  });
}

export function analyzeWithBins(files, binLength) {
  return callWorker('analyze-with-bins', { files, binLength });
}

export function advancedAnalysis(results, statType = 'mean') {
  return callWorker('advanced-analysis', { results, statType });
}

export function analyzeWithFiltersJson(results, options) {
  const { filterOptions, removeUnreliableBins, heartRateFilter, statType } = options || {};
  return callWorker('analyze-with-filters-json', { results, filterOptions, removeUnreliableBins, heartRateFilter, statType });
}

export function processBatch(files, binLength, onProgress) {
  // Mimic SSE stream via onProgress callback
  return callWorker('process-batch', { files, binLength }, onProgress);
}