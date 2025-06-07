import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getGradeAdjustedPaceFromBins } from './gpxAnalysis';

 function formatPace(pace) {
    if (!isFinite(pace) || pace == null) return '';
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  }



export default function GradeAdjustedPaceBySegmentChart({ bins1, bins2, segmentLengthKm = 5, color1 = '#1976d2', color2 = '#43a047', label1 = "GPX File 1", label2= "GPX File 2" }) {
  
  // Helper to get the cumulative distance for each bin (if not already present)
  function addCumulativeDistance(bins) {
    let cum = 0;
    return bins.map(bin => {
      cum += bin.distance || 0;
      return { ...bin, cumDistance: cum };
    });
  }


  
  const bins1WithCum = addCumulativeDistance(bins1 || []);
  const bins2WithCum = addCumulativeDistance(bins2 || []);

  const maxDist1 = bins1WithCum.length ? bins1WithCum[bins1WithCum.length - 1].cumDistance : 0;
  const maxDist2 = bins2WithCum.length ? bins2WithCum[bins2WithCum.length - 1].cumDistance : 0;
  const maxDistance = Math.max(maxDist1, maxDist2);

  // Build chart data for all segments, even if empty
  const chartData = [];
  const numSegments = Math.ceil(maxDistance / 1000 / segmentLengthKm);
  for (let segIdx = 0; segIdx < numSegments; segIdx++) {
    const segStart = segIdx * segmentLengthKm * 1000;
    const segEnd = (segIdx + 1) * segmentLengthKm * 1000;

    const bins1InSeg = bins1WithCum.filter(bin => (bin.cumDistance || 0) > segStart && (bin.cumDistance || 0) <= segEnd);
    const bins2InSeg = bins2WithCum.filter(bin => (bin.cumDistance || 0) > segStart && (bin.cumDistance || 0) <= segEnd);

    const pace1 = bins1InSeg.length ? getGradeAdjustedPaceFromBins(bins1InSeg) : null;
    const pace2 = bins2InSeg.length ? getGradeAdjustedPaceFromBins(bins2InSeg) : null;

    chartData.push({
      segment: `${segIdx * segmentLengthKm}-${(segIdx + 1) * segmentLengthKm} km`,
      pace1: isFinite(pace1) ? pace1 : null,
      pace2: isFinite(pace2) ? pace2 : null
    });
  }



  // Calculate overall GAP for each file
  const overall1 = getGradeAdjustedPaceFromBins(bins1WithCum);
  const overall2 = getGradeAdjustedPaceFromBins(bins2WithCum);

  // Calculate min and max pace values from chartData
  const allPaces = chartData.flatMap(d => [d.pace1, d.pace2].filter(v => isFinite(v)));
  const minPace = allPaces.length ? Math.min(...allPaces) : 2;
  const maxPace = allPaces.length ? Math.max(...allPaces) : 12;

  // Add a small margin for better comparison
  const yMin = Math.floor(minPace - 0.05);
  const yMax = Math.ceil(maxPace + 0.05);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" strokeWidth={1} />
        <XAxis dataKey="segment" interval={0} angle={-45} textAnchor="end" height={70} />
        <YAxis
          label={{ value: 'Grade Adj. Pace (min/km)', angle: -90, position: 'insideLeft' }}
          domain={[yMin, yMax]}
        />
        <RechartsTooltip formatter={(value) => [formatPace(value), '']} />
        <Legend />
        <Line type="monotone" dataKey="pace1" stroke={color1} strokeWidth={2} name={label1} dot />
        <Line type="monotone" dataKey="pace2" stroke={color2} strokeWidth={2} name={label2} dot />
        {overall1 && (
          <ReferenceLine y={overall1} stroke={color1} strokeDasharray="3 3"  strokeWidth={2}/>
        )}
        {overall2 && (
          <ReferenceLine y={overall2} stroke={color2} strokeDasharray="3 3" strokeWidth={2} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
