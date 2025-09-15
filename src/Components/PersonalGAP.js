import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';


// Custom gradient groups for adjustment chart (match PaceChart.js style)
const adjustmentGradientGroups = [
  { label: '≤-25%', min: -Infinity, max: -25, mid: -27.5 },
  { label: '-25 to -20%', min: -25, max: -20, mid: -22.5 },
  { label: '-20 to -15%', min: -20, max: -15, mid: -17.5 },
  { label: '-15 to -10%', min: -15, max: -10, mid: -12.5 },
  { label: '-10 to -5%', min: -10, max: -5, mid: -7.5 },
  { label: '-5 to 0%', min: -5, max: 0, mid: -2.5 },
  { label: '0 to 5%', min: 0, max: 5, mid: 2.5 },
  { label: '5 to 10%', min: 5, max: 10, mid: 7.5 },
  { label: '10 to 15%', min: 10, max: 15, mid: 12.5 },
  { label: '15 to 20%', min: 15, max: 20, mid: 17.5 },
  { label: '20 to 25%', min: 20, max: 25, mid: 22.5 },
  { label: '≥25%', min: 25, max: Infinity, mid: 27.5 }
];




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

export default function PersonalGAP({ bins, route, polyCoeffs, formatPoly4, checkpoints, noTimeData }) {
  return (
    <Box>
      <Typography variant="h5" sx={sectionTitleSx}>
        Personal GAP Analysis
      </Typography>
      {/* Gradient Group Pace Chart */}
      <GradientGroupPaceChart bins={bins} />
      {/* Adjustment Factor Chart */}
      <AdjustmentFactorChart polyCoeffs={polyCoeffs} bins={bins} />
    </Box>
  );
}

// Calculate adjustment factor for a given gradient using polyCoeffs
function calculateStravaAdjustment(gradient, polyCoeffs) {
  if (!polyCoeffs || polyCoeffs.length !== 5) return 1;
  const [a, b, c, d, e] = polyCoeffs;
  return a * Math.pow(gradient, 4) +
         b * Math.pow(gradient, 3) +
         c * Math.pow(gradient, 2) +
         d * gradient +
         e;
}

// Group bins by integer gradient and calculate mean adjustment factor
function getPersonalAdjustmentByGradient(bins, basePace) {
  const validBins = (bins || []).filter(bin =>
    typeof bin.gradient === 'number' &&
    typeof bin.pace_min_per_km === 'number' &&
    bin.pace_min_per_km > 0
  );
  const points = [];
  for (let g = -30; g <= 30; g++) {
    const binsInRange = validBins.filter(bin =>
      bin.gradient >= g - 0.5 && bin.gradient < g + 0.5
    );
    if (binsInRange.length === 0) continue;
    const paces = binsInRange.map(bin => bin.pace_min_per_km).sort((a, b) => a - b);
    let medianPace;
    const len = paces.length;
    if (len % 2 === 0) {
      medianPace = (paces[len / 2 - 1] + paces[len / 2]) / 2;
    } else {
      medianPace = paces[Math.floor(len / 2)];
    }
    const adjustment = basePace > 0 ? medianPace / basePace : 1;
    points.push({
      gradient: g,
      binCount: binsInRange.length,
      pace: medianPace,
      adjustment,
      paceLabel: `${Math.floor(medianPace)}:${Math.round((medianPace % 1) * 60).toString().padStart(2, '0')}`
    });
  }
  return points;
}

function getBasePace(bins) {
  const nearZeroBins = (bins || []).filter(bin =>
    bin.gradient >= -2 && bin.gradient <= 2 &&
    typeof bin.pace_min_per_km === 'number' &&
    bin.pace_min_per_km > 0
  );
  if (nearZeroBins.length === 0) return null;
  const paces = nearZeroBins.map(bin => bin.pace_min_per_km).sort((a, b) => a - b);
  const len = paces.length;
  let medianPace;
  if (len % 2 === 0) {
    medianPace = (paces[len / 2 - 1] + paces[len / 2]) / 2;
  } else {
    medianPace = paces[Math.floor(len / 2)];
  }
  return medianPace;
}

function getBasePaceStats(bins) {
  const nearZeroBins = (bins || []).filter(bin =>
    bin.gradient >= -2 && bin.gradient <= 2 &&
    typeof bin.pace_min_per_km === 'number' &&
    bin.pace_min_per_km > 0
  );
  const totalTime = nearZeroBins.reduce((sum, bin) => sum + parseTimeToSeconds(bin.timeTaken), 0);
  const binCount = nearZeroBins.length;
  const label = '-2% to 2%';
  return { label, binCount, totalTime };
}

function formatPace(pace) {
  if (!pace || isNaN(pace)) return 'N/A';
  return `${Math.floor(pace)}:${Math.round((pace % 1) * 60).toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

// Use adjustmentGradientGroups for both charts
function getGradientBuckets(bins, basePace) {
  const validBins = (bins || []).filter(bin =>
    typeof bin.gradient === 'number' &&
    typeof bin.pace_min_per_km === 'number' &&
    bin.pace_min_per_km > 0
  );
  return adjustmentGradientGroups.map(range => {
    const binsInRange = validBins.filter(bin => {
      const gradient = bin.gradient;
      if (range.min === -Infinity) return gradient <= range.max;
      if (range.max === Infinity) return gradient >= range.min;
      return gradient > range.min && gradient <= range.max;
    });
    if (binsInRange.length === 0) return null;
    const paces = binsInRange.map(bin => bin.pace_min_per_km).sort((a, b) => a - b);
    let medianPace;
    const len = paces.length;
    if (len % 2 === 0) {
      medianPace = (paces[len / 2 - 1] + paces[len / 2]) / 2;
    } else {
      medianPace = paces[Math.floor(len / 2)];
    }
    return {
      label: range.label,
      min: range.min,
      max: range.max,
      midpoint: range.mid,
      binCount: binsInRange.length,
      medianPace,
      adjustment: basePace > 0 ? medianPace / basePace : 1
    };
  }).filter(bucket => bucket !== null);
}

// Use custom adjustmentGradientGroups for adjustment chart
function getAdjustmentBuckets(bins, basePace) {
  const validBins = (bins || []).filter(bin =>
    typeof bin.gradient === 'number' &&
    typeof bin.pace_min_per_km === 'number' &&
    bin.pace_min_per_km > 0
  );
  return adjustmentGradientGroups.map(range => {
    const binsInRange = validBins.filter(bin => {
      const gradient = bin.gradient;
      if (range.min === -Infinity) return gradient <= range.max;
      if (range.max === Infinity) return gradient >= range.min;
      return gradient > range.min && gradient <= range.max;
    });
    if (binsInRange.length === 0) return null;
    const paces = binsInRange.map(bin => bin.pace_min_per_km).sort((a, b) => a - b);
    let medianPace;
    const len = paces.length;
    if (len % 2 === 0) {
      medianPace = (paces[len / 2 - 1] + paces[len / 2]) / 2;
    } else {
      medianPace = paces[Math.floor(len / 2)];
    }
    return {
      label: range.label,
      min: range.min,
      max: range.max,
      midpoint: range.mid,
      binCount: binsInRange.length,
      medianPace,
      adjustment: basePace > 0 ? medianPace / basePace : 1
    };
  }).filter(bucket => bucket !== null);
}

function getInterpretation(bucketedData, polyCoeffs) {
  if (!bucketedData || bucketedData.length === 0) return null;

  // Calculate literature adjustment for each bucket
  const withLiterature = bucketedData.map(b => ({
    ...b,
    literatureAdj: polyCoeffs ? calculateStravaAdjustment(b.midpoint, polyCoeffs) : 1,
    diff: b.adjustment - (polyCoeffs ? calculateStravaAdjustment(b.midpoint, polyCoeffs) : 1),
    percentDiff: polyCoeffs
      ? (((b.adjustment - calculateStravaAdjustment(b.midpoint, polyCoeffs)) / calculateStravaAdjustment(b.midpoint, polyCoeffs)) * 100)
      : 0
  }));

  // Find the bucket with the largest absolute percent difference
  const biggestDeviation = withLiterature.reduce((max, b) =>
    Math.abs(b.percentDiff) > Math.abs(max.percentDiff) ? b : max,
    withLiterature[0]
  );

  // Find the largest positive and negative percent differences (uphill/downhill)
  const uphillBuckets = withLiterature.filter(b => b.midpoint > 0);
  const downhillBuckets = withLiterature.filter(b => b.midpoint < 0);

  const maxUphillDeviation = uphillBuckets.length > 0
    ? uphillBuckets.reduce((max, b) =>
        Math.abs(b.percentDiff) > Math.abs(max.percentDiff) ? b : max,
        uphillBuckets[0]
      )
    : null;

  const maxDownhillDeviation = downhillBuckets.length > 0
    ? downhillBuckets.reduce((max, b) =>
        Math.abs(b.percentDiff) > Math.abs(max.percentDiff) ? b : max,
        downhillBuckets[0]
      )
    : null;

  return { maxUphillDeviation, maxDownhillDeviation, biggestDeviation };
}

// --- CHART COMPONENTS ---

const GradientGroupPaceChart = ({ bins }) => {
  const basePace = getBasePace(bins);
  const buckets = getGradientBuckets(bins, basePace);

  // Calculate average pace for each bucket (distance-weighted mean)
  const bucketsWithAvg = buckets.map(bucket => {
    const binsInRange = (bins || []).filter(bin => {
      const gradient = bin.gradient;
      if (bucket.min === -Infinity) return gradient <= bucket.max;
      if (bucket.max === Infinity) return gradient >= bucket.min;
      return gradient > bucket.min && gradient <= bucket.max;
    });
    const totalDistance = binsInRange.reduce((sum, bin) => sum + (bin.distance || 0), 0);
    const totalTime = binsInRange.reduce((sum, bin) => sum + parseTimeToSeconds(bin.timeTaken), 0);
    const avgPace = (totalDistance > 0 && totalTime > 0)
      ? (totalTime / 60) / (totalDistance / 1000)
      : null;
    return { ...bucket, avgPace };
  });

  const chartHeight = 260;
  const chartWidth = 900;
  const padding = 40;
  const barWidth = Math.max(12, (chartWidth - 2 * padding) / bucketsWithAvg.length / 2 - 4);

  const allPaces = bucketsWithAvg.flatMap(b => [b.medianPace, b.avgPace].filter(Boolean));
  const yMin = Math.min(...allPaces, 3);
  const yMax = Math.max(...allPaces, 10);

  const groupSlotWidth = (chartWidth - 2 * padding) / bucketsWithAvg.length;

  const getX = (idx, type) =>
    padding +
    groupSlotWidth * idx +
    groupSlotWidth / 2 +
    (type === 'avg' ? barWidth / 2 : -barWidth / 2);
  const getY = pace =>
    padding + ((yMax - pace) / (yMax - yMin)) * (chartHeight - 2 * padding);

  const getTotalTime = bucket => {
    if (!bucket || !bucket.binCount) return 0;
    return Math.round(
      (bins || [])
        .filter(bin => {
          const gradient = bin.gradient;
          if (bucket.min === -Infinity) return gradient <= bucket.max;
          if (bucket.max === Infinity) return gradient >= bucket.min;
          return gradient > bucket.min && gradient <= bucket.max;
        })
        .reduce((sum, bin) => sum + parseTimeToSeconds(bin.timeTaken), 0) / 60
    );
  };

  return (
    <div style={{ width: chartWidth, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 16, marginBottom: 24 }}>
      <h3 style={{ textAlign: 'center', marginBottom: 8, color: '#333' }}>
        🏃 Median & Average Pace by Gradient Group
      </h3>
      <svg width={chartWidth} height={chartHeight + 70} style={{ display: 'block', margin: '0 auto' }}>
        {/* Y grid lines */}
        {[...Array(Math.ceil((yMax - yMin) / 0.5) + 1)].map((_, i) => {
          const pace = yMin + i * 0.5;
          const y = getY(pace);
          return (
            <line
              key={i}
              x1={padding}
              x2={chartWidth - padding}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="4 2"
            />
          );
        })}
        {/* Bars: median (red), average (blue) */}
        {bucketsWithAvg.map((b, idx) => (
          <g key={idx}>
            {/* Median bar */}
            <Tooltip title={`Pace: ${formatPace(b.medianPace)} min/km`} placement="top" arrow>
              <rect
                x={getX(idx, 'median') - barWidth / 2}
                y={getY(b.medianPace)}
                width={barWidth}
                height={chartHeight - padding - getY(b.medianPace)}
                fill="#ef4444"
                opacity={0.8}
              />
            </Tooltip>
            {/* Average bar */}
            {b.avgPace &&
              <Tooltip title={`Pace: ${formatPace(b.avgPace)} min/km`} placement="top" arrow>
                <rect
                  x={getX(idx, 'avg') - barWidth / 2}
                  y={getY(b.avgPace)}
                  width={barWidth}
                  height={chartHeight - padding - getY(b.avgPace)}
                  fill="#3b82f6"
                  opacity={0.7}
                />
              </Tooltip>
            }
          </g>
        ))}
        {/* Axes */}
        <line x1={padding} x2={chartWidth - padding} y1={chartHeight - padding} y2={chartHeight - padding} stroke="#333" strokeWidth={2} />
        <line x1={padding} x2={padding} y1={padding} y2={chartHeight - padding} stroke="#333" strokeWidth={2} />
        {/* X axis labels: rotated, two lines */}
        {bucketsWithAvg.map((b, idx) => (
          <g key={idx} transform={`translate(${getX(idx, 'avg')},${chartHeight - padding + 30})`}>
            <text
              textAnchor="end"
              fontSize={12}
              fill="#333"
              transform="rotate(-40)"
              fontWeight="bold"
              y={0}
            >
              {b.label}
            </text>
            <text
              textAnchor="end"
              fontSize={11}
              fill="#666"
              transform="rotate(-40)"
              y={16}
            >
              {`${b.binCount} bins, ${getTotalTime(b)} min`}
            </text>
          </g>
        ))}
        {/* Y axis labels */}
        {[...Array(Math.ceil((yMax - yMin) / 0.5) + 1)].map((_, i) => {
          const pace = yMin + i * 0.5;
          const y = getY(pace);
          return (
            <text
              key={i}
              x={padding - 10}
              y={y + 5}
              textAnchor="end"
              fontSize={11}
              fill="#333"
            >
              {pace.toFixed(1)}
            </text>
          );
        })}
        {/* Axis titles */}
        <text x={padding} y={padding - 25} textAnchor="start" fontSize={13} fill="#333">
          Pace (min/km)
        </text>
        {/* Legend */}
        <g transform={`translate(${padding + 10},${padding + 10})`}>
          <rect width={160} height={38} rx={3} fill="white" fillOpacity={1} stroke="#e5e7eb" strokeWidth={1} />
          <rect x={10} y={10} width={18} height={12} fill="#ef4444" opacity={0.8} />
          <text x={32} y={20} fontSize={12} fill="#333">Median Pace</text>
          <rect x={10} y={26} width={18} height={12} fill="#3b82f6" opacity={0.7} />
          <text x={32} y={36} fontSize={12} fill="#333">Average Pace</text>
        </g>
      </svg>
    </div>
  );
};

const AdjustmentFactorChart = ({ polyCoeffs, bins }) => {
  // Use custom adjustment buckets for this chart
  const basePace = getBasePace(bins);
  const bucketedData = getAdjustmentBuckets(bins, basePace);

  // Chart dimensions and padding
  const chartHeight = 400;
  const chartWidth = 900;
  const chartPadding = 30;
  const yMin = 0.4;
  const yMax = 3.7;

  // X axis: use midpoints of custom buckets
  const xBuckets = bucketedData.map(b => b.midpoint);
  const xMin = Math.min(...xBuckets, -30);
  const xMax = Math.max(...xBuckets, 30);

  const getX = gradient =>
    ((gradient - xMin) / (xMax - xMin)) * (chartWidth - 2 * chartPadding) + chartPadding;
  const getY = adjustment =>
    chartHeight - ((adjustment - yMin) / (yMax - yMin)) * (chartHeight - chartPadding);

  // Strava base case (polyCoeffs)
  const stravaData = [];
  for (let g = xMin; g <= xMax; g += 1) {
    stravaData.push({
      gradient: g,
      adjustment: calculateStravaAdjustment(g, polyCoeffs)
    });
  }

  // Personal data from bins (dots)
  const personalData = getPersonalAdjustmentByGradient(bins, basePace);

  // Base pace stats
  const baseStats = getBasePaceStats(bins);

  // Y grid lines
  const gridStep = 0.2;
  const yGridLines = [];
  for (let v = yMin; v <= yMax; v += gridStep) {
    yGridLines.push(Number(v.toFixed(2)));
  }

  // X grid lines (every 5%)
  const xGridLines = [];
  for (let g = Math.ceil(xMin / 5) * 5; g <= xMax; g += 5) {
    xGridLines.push(g);
  }

  // Tooltip state
  const [tooltip, setTooltip] = React.useState(null);

  // Interpretation
  const interpretation = getInterpretation(bucketedData, polyCoeffs);

  return (
    <div style={{ width: chartWidth, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: 24 }}>
      <h3 style={{ textAlign: 'center', marginBottom: 8, color: '#333' }}>
        📊 Grade Adjustment - Personal vs Literature
      </h3>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: 8 }}>
        Pace change multiplier relative to flat ground (x1.0 at flat/0% - {formatPace(basePace)} min/km) (median)
      </p>
      <div style={{ textAlign: 'center', color: '#888', fontSize: '13px', marginBottom: '10px' }}>
        <span>
          <strong>Base pace method:</strong> Near-zero gradients (-2% to +2%)<br />
          
          <strong>Bins:</strong> {baseStats.binCount} &nbsp;|&nbsp;
          <strong>Total time:</strong> {baseStats.totalTime
            ? `${Math.round(baseStats.totalTime / 60)} mins`
            : 'N/A'}
        </span>
      </div>
      <svg width={chartWidth} height={chartHeight + 25} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
        {/* Y grid lines */}
        {yGridLines.map((adj, i) => (
          <g key={`y-${adj}`}>
            <line
              x1={chartPadding}
              x2={chartWidth - chartPadding}
              y1={getY(adj)}
              y2={getY(adj)}
              stroke="#e5e7eb"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
            <text
              x={chartPadding - 8}
              y={getY(adj)}
              fontSize={10}
              fill="#666"
              textAnchor="end"
              alignmentBaseline="middle"
            >
              {adj.toFixed(1)}
            </text>
          </g>
        ))}
        {/* X grid lines */}
        {xGridLines.map((g, i) => (
          <g key={`x-${g}`}>
            <line
              x1={getX(g)}
              x2={getX(g)}
              y1={getY(yMax)}
              y2={getY(yMin)}
              stroke="#e5e7eb"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
            <text
              x={getX(g)}
              y={getY(yMin) + 18}
              fontSize={10}
              fill="#666"
              textAnchor="middle"
            >
              {g}%
            </text>
          </g>
        ))}
        {/* Highlight 1.0 (no adjustment) line */}
        <line
          x1={chartPadding}
          x2={chartWidth - chartPadding}
          y1={getY(1)}
          y2={getY(1)}
          stroke="#888"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
        {/* Axes */}
        <line x1={chartPadding} x2={chartWidth - chartPadding} y1={getY(yMin)} y2={getY(yMin)} stroke="#333" strokeWidth={2} />
        <line x1={chartPadding} x2={chartPadding} y1={getY(yMax)} y2={getY(yMin)} stroke="#333" strokeWidth={2} />
        {/* Strava base case line (blue) */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          points={stravaData.map(d => `${getX(d.gradient)},${getY(d.adjustment)}`).join(' ')}
        />
        {/* Personal data dots (red) */}
        {personalData.map((d, i) => (
          <circle
            key={i}
            cx={getX(d.gradient)}
            cy={getY(d.adjustment)}
            r={4}
            fill="#ef4444"
            fillOpacity={0.4}
            stroke="#fff"
            strokeWidth={1}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip({
              x: getX(d.gradient),
              y: getY(d.adjustment),
              label: `${d.gradient}%`,
              adjustment: d.adjustment.toFixed(2),
              binCount: d.binCount,
              paceLabel: d.paceLabel
            })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        {/* Bucket/category points (blue squares) */}
        {bucketedData.map((bucket, idx) => (
          <rect
            key={idx}
            x={getX(bucket.midpoint) - 5}
            y={getY(bucket.adjustment) - 5}
            width={10}
            height={10}
            fill="#3b82f6"
            stroke="#fff"
            strokeWidth={1.5}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip({
              x: getX(bucket.midpoint),
              y: getY(bucket.adjustment),
              label: bucket.label,
              adjustment: bucket.adjustment.toFixed(2),
              binCount: bucket.binCount
            })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        {/* Tooltip rendering */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x + 8}
              y={tooltip.y - 45}
              width={120}
              height={48}
              rx={3}
              fill="rgba(0,0,0,0.8)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            />
            <text
              x={tooltip.x + 12}
              y={tooltip.y - 32}
              fontSize={9}
              fontWeight="bold"
              fill="#fff"
            >
              Gradient: {tooltip.label}
            </text>
            <text
              x={tooltip.x + 12}
              y={tooltip.y - 22}
              fontSize={9}
              fill="#fff"
            >
              Personal: {tooltip.adjustment}x
            </text>
            <text
              x={tooltip.x + 12}
              y={tooltip.y - 12}
              fontSize={9}
              fill="#fff"
            >
              {tooltip.paceLabel ? `Pace: ${tooltip.paceLabel}` : ''}
            </text>
            <text
              x={tooltip.x + 12}
              y={tooltip.y - 2}
              fontSize={8}
              fill="#ccc"
            >
              {tooltip.binCount} bins
            </text>
          </g>
        )}
        {/* Axis titles */}
        
        <text x={chartPadding - 30} y={chartHeight / 2} textAnchor="middle" fontSize={16} fill="#333" transform={`rotate(-90,${chartPadding - 30},${chartHeight / 2})`}>
          Adjustment Factor
        </text>
        {/* Legend inside SVG, top left */}
        <g transform={`translate(${chartPadding + 10},${getY(yMax) + 10})`}>
          <rect width={180} height={55} rx={3} fill="white" fillOpacity={0.9} stroke="#e5e7eb" strokeWidth={1} />
          <circle cx={10} cy={12} r={4} fillOpacity={0.6} fill="#ef4444" />
          <text x={18} y={15} fontSize={10} fill="#333">Individual points</text>
          <rect x={7} y={25} width={10} height={10} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
          <text x={18} y={33} fontSize={10} fill="#333">Bucket averages</text>
          <line x1={10} x2={30} y1={45} y2={45} stroke="#3b82f6" strokeWidth={2} />
          <text x={40} y={48} fontSize={10} fill="#333">Literature formula</text>
        </g>
      </svg>
      {/* Interpretation Section */}
      <div style={{ 
        marginTop: 20, 
        fontSize: 14, 
        color: '#333', 
        maxWidth: '800px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'left'
      }}>
        <h4 style={{ marginBottom: 10, fontSize: 16 }}>📋 Interpretation</h4>
        {interpretation ? (
          <>
            <p style={{ marginBottom: 16 }}>
              This chart compares your personal pace adjustments (<span style={{ color: '#ef4444', fontWeight: 'bold' }}>red circles</span> and <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>blue squares</span>) with the 
              <strong> Strava population average</strong> (<span style={{ color: '#3b82f6', fontWeight: 'bold' }}>blue line</span>) based on the model from Strava's research.  Higher values mean relatively slower compared to flat ground. Beneath the curve means you dealt with the gradient change relatively well.
            </p>
            <p style={{ marginBottom: 16 }}>
              Compare your personal adjustment to the literature model to see where your performance differs most.
            </p>
            {interpretation.maxUphillDeviation && (
              <div style={{ marginBottom: 8 }}>
                <strong>Uphill performance:</strong>{' '}
                {interpretation.maxUphillDeviation.diff > 0 ? (
                  <span>
                    You slow down <span style={{ color: '#ef4444' }}>more than average</span> on {interpretation.maxUphillDeviation.label} gradients 
                    ({interpretation.maxUphillDeviation.percentDiff.toFixed(1)}% difference). This could be an area to focus training.
                  </span>
                ) : (
                  <span>
                    You handle {interpretation.maxUphillDeviation.label} gradients <span style={{ color: '#10b981' }}>better than average </span> 
                    ({Math.abs(interpretation.maxUphillDeviation.percentDiff).toFixed(1)}% difference). This is a relative strength!
                  </span>
                )}
              </div>
            )}
            {interpretation.maxDownhillDeviation && (
              <div style={{ marginBottom: 8 }}>
                <strong>Downhill performance:</strong>{' '}
                {interpretation.maxDownhillDeviation.diff > 0 ? (
                  <span>
                    On {interpretation.maxDownhillDeviation.label} gradients, you're <span style={{ color: '#ef4444' }}>not taking full advantage</span> of 
                    the descent ({interpretation.maxDownhillDeviation.percentDiff.toFixed(1)}% difference from average).
                  </span>
                ) : (
                  <span>
                    You're <span style={{ color: '#10b981' }}>particularly good</span> at {interpretation.maxDownhillDeviation.label} descents, 
                    with {Math.abs(interpretation.maxDownhillDeviation.percentDiff).toFixed(1)}% relatively better adjustment than average runners.
                  </span>
                )}
              </div>  
            )}
            {interpretation.biggestDeviation && (
              <div style={{ 
                marginTop: 16, 
                marginBottom: 8,
                padding: '12px 16px',
                backgroundColor: interpretation.biggestDeviation.diff > 0 ? '#fef2f2' : '#f0fdf4',
                borderLeft: `4px solid ${interpretation.biggestDeviation.diff > 0 ? '#ef4444' : '#10b981'}`,
                borderRadius: '4px'
              }}>
                {interpretation.biggestDeviation.diff > 0 ? (
                  <>
                    <strong style={{ color: '#b91c1c' }}>📈 Biggest improvement opportunity:</strong>{' '}
                    <span>
                      Your {interpretation.biggestDeviation.label} gradient performance is {interpretation.biggestDeviation.percentDiff.toFixed(1)}% relatively slower 
                      than the modelled average runner. Focused training on this gradient could yield your biggest gains.
                    </span>
                  </>
                ) : (
                  <>
                    <strong style={{ color: '#10b981' }}>📈 Focus area:</strong>{' '}
                    <span>
                      While you perform well on all gradients, your {interpretation.biggestDeviation.label} gradient 
                      has the least advantage compared to average ({Math.abs(interpretation.biggestDeviation.percentDiff).toFixed(1)}% difference).
                    </span>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <p>Insufficient data to generate insights. More runs with varied gradients are needed.</p>
        )}
      </div>
    </div>
  );
}