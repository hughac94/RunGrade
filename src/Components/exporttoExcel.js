export function exportCheckpointsToCSV({
  checkpoints,
  noTimeData,
  editSplits,
  showNutrition,
  newGapArr,
  modelledGapMinutes,
  newTimeOverallArr,
  newTimeFromPreviousArr,
  carbGramsArr,
  formatMinSec,
  formatHMS,
  formatTime,
  getElevationGainToIdx,
  findRouteIdxForKm,
  adjFromStartArr,
  adjFromPrevArr,
  bins,
  route,
  distances
}) {
  // Build headers based on visible columns
  const headers = [
    "Name",
    "Checkpoint (km)",
    "Distance from Previous (km)",
    "Cumulative Elevation Gain (m)",
    "Elevation Gain from Previous (m)",
    ...(noTimeData ? [] : [
      "Elapsed from Start",
      "Elapsed from Previous",
      "Avg. Pace (min/km)",
      "Grade Adj. Pace (min/km)"
    ]),
    "Adj. Time from Start",
    "Adj. Time from Previous",
    ...(editSplits ? [
      "Modelled GAP (min/km)",
      "New Edited GAP (min/km)",
      "New Time Overall (hh:mm:ss)",
      "New Time from Previous (hh:mm:ss)"
    ] : []),
    ...(showNutrition ? [
      "Carbs (g)",
      "Carbs/hr"
    ] : []),
    "Notes"
  ];

  // Build rows
  const rows = checkpoints.map((cp, idx) => {
    const routeIdx = findRouteIdxForKm(cp.km);
    const elevationGain = getElevationGainToIdx(routeIdx);
    let prevRouteIdx = idx === 0 ? 0 : findRouteIdxForKm(checkpoints[idx - 1].km);
    let prevElevationGain = idx === 0 ? 0 : getElevationGainToIdx(prevRouteIdx);
    const gainFromPrev = elevationGain - prevElevationGain;
    const currTime = route && route[routeIdx] ? new Date(route[routeIdx].time || route[routeIdx][0]) : null;
    const prevTime = idx === 0 ? (route && route[0] ? new Date(route[0].time || route[0][0]) : null) : (route && route[prevRouteIdx] ? new Date(route[prevRouteIdx].time || route[prevRouteIdx][0]) : null);
    const firstTime = route && route[0] ? new Date(route[0].time || route[0][0]) : null;
    let elapsedFromStart = '';
    let elapsedFromPrev = '';
    if (currTime instanceof Date && !isNaN(currTime) && firstTime instanceof Date && !isNaN(firstTime)) {
      const seconds = (currTime - firstTime) / 1000;
      if (!isNaN(seconds) && seconds >= 0) elapsedFromStart = formatTime(seconds);
    }
    if (currTime instanceof Date && !isNaN(currTime) && prevTime instanceof Date && !isNaN(prevTime)) {
      const seconds = (currTime - prevTime) / 1000;
      if (!isNaN(seconds) && seconds >= 0) elapsedFromPrev = formatTime(seconds);
    }
    const adjFromStart = adjFromStartArr[idx] != null ? formatTime(adjFromStartArr[idx]) : '-';
    const adjFromPrev = idx === 0 ? '-' : (adjFromPrevArr[idx] != null ? formatTime(adjFromPrevArr[idx]) : '-');
    const avgPace = '-';
    const gradeAdjPace = '-';

    const row = [
      cp.name || '',
      cp.km.toFixed(1),
      idx === 0 ? '-' : (cp.km - checkpoints[idx - 1].km).toFixed(2),
      elevationGain,
      idx === 0 ? '-' : gainFromPrev,
      ...(noTimeData ? [] : [
        elapsedFromStart || '-',
        idx === 0 ? '-' : (elapsedFromPrev || '-'),
        avgPace,
        gradeAdjPace
      ]),
      adjFromStart,
      adjFromPrev,
      ...(editSplits ? [
        formatMinSec(modelledGapMinutes),
        formatMinSec(newGapArr[idx] || modelledGapMinutes),
        formatHMS(newTimeOverallArr[idx]),
        formatHMS(newTimeFromPreviousArr[idx])
      ] : []),
      ...(showNutrition ? [
        carbGramsArr[idx] || 0,
        (() => {
          const grams = carbGramsArr[idx] || 0;
          const secs = newTimeFromPreviousArr[idx] || 0;
          if (!grams || !secs) return '-';
          const hours = secs / 3600;
          if (hours === 0) return '-';
          return Math.round(grams / hours);
        })()
      ] : []),
      "" // Notes column, left blank for user to fill in Excel
    ];
    return row;
  });

  // Add a first line with instructions for Excel users
  const instructionLine = ['For neateness, click "Format as Table" in the Excel menu above after opening this file.'];

  // Convert to CSV string
  const csvContent = [
    instructionLine.join(","),
    headers.join(","),
    ...rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
  ].join("\r\n");

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "checkpoints.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}