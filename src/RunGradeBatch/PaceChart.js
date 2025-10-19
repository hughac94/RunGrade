import React from 'react';
import './App.css';
import { calculateGradeAdjustment } from './Coefficients';

const CustomTooltip = ({ content, visible, x, y }) => {
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y - 35,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      zIndex: 1000,
      pointerEvents: 'none',
      transform: 'translateX(-50%)'
    }}>
      {content}
    </div>
  );
};

const GradientPaceChart = ({ gradientData, statType = 'mean' }) => {
  const [tooltip, setTooltip] = React.useState({ visible: false, content: '', x: 0, y: 0 });
  const chartRef = React.useRef();

  if (!gradientData || !gradientData.buckets || gradientData.buckets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        No gradient pace data available
      </div>
    );
  }

  // Choose which pace values to display based on statType
  const getPaceValue = (bucket) => statType === 'median' ? bucket.medianPace : bucket.avgPace;
  const getPaceLabel = (bucket) => statType === 'median' ? bucket.medianPaceMinPerKm : bucket.paceMinPerKm;

  // Calculate pace range for bar heights
  const paceValues = gradientData.buckets.map(bucket => getPaceValue(bucket)).filter(pace => pace);
  const maxPace = Math.max(...paceValues);
  const minPace = Math.min(...paceValues);
  const paceRange = maxPace - minPace;

  const getBarColor = (bucket) => {
    // Special case for <=-25% label
    if (bucket.label.includes('≤-25') || bucket.label.includes('<=-25')) return '#10b981'; // Green
    const gradient = parseFloat(bucket.label.split(' ')[0]);
    if (gradient < 0) return '#10b981'; // Green for downhill
    if (gradient <= 5) return '#3b82f6'; // Blue for flat to moderate
    return '#ef4444'; // Red for steep uphill
  };

  return (
    <div ref={chartRef} style={{ 
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      marginTop: 32,
      marginBottom: 40
    }}>
      <div style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '20px',
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Title and subtitle inside white box */}
        <h3 style={{ 
          textAlign: 'center', 
          marginBottom: 8,
          marginTop: 0,
          color: '#333'
        }}>
          📈 Average Pace by Gradient Bucket
        </h3>
       
        {/* Chart bars */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'end',
          gap: '8px',
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto 20px auto'
        }}>
          {gradientData.buckets.map((bucket, index) => {
            const barHeight = paceRange > 0 ? ((getPaceValue(bucket) - minPace) / paceRange) * 200 + 20 : 40;
            const barColor = getBarColor(bucket);
            
            return (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '50px'
              }}>
                <div 
                  style={{ 
                    height: `${barHeight}px`,
                    backgroundColor: barColor,
                    width: '40px',
                    borderRadius: '4px 4px 0 0',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '4px'
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const chartRect = chartRef.current.getBoundingClientRect();
                    setTooltip({
                      visible: true,
                      content: `${getPaceLabel(bucket)} min/km (${bucket.binCount} bins)`,
                      x: rect.left + rect.width/2 - chartRect.left,
                      y: rect.top - chartRect.top
                    });
                  }}
                  onMouseLeave={() => setTooltip({ ...tooltip, visible: false })}
                >
                  <div style={{
                    fontSize: '10px',
                    color: '#fff',
                    fontWeight: 'bold',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>
                    {getPaceLabel(bucket)}
                  </div>
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginTop: '4px',
                  textAlign: 'center',
                  color: '#333'
                }}>
                  {bucket.label}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: '#666',
                  marginTop: '2px',
                  lineHeight: 1.3,
                  textAlign: 'center'
                }}>
                  {bucket.binCount} bins<br />
                 {bucket.totalTime
  ? `${Math.round(bucket.totalTime / 60)} mins`
  : '0 mins'}
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginTop: '16px',
          flexWrap: 'wrap',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              backgroundColor: '#10b981',
              width: '16px',
              height: '16px',
              borderRadius: '2px'
            }}></div>
            <span style={{ fontSize: '12px', color: '#333' }}>Downhill (negative gradient)</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              backgroundColor: '#3b82f6',
              width: '16px',
              height: '16px',
              borderRadius: '2px'
            }}></div>
            <span style={{ fontSize: '12px', color: '#333' }}>Flat to moderate uphill (0-5%)</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              backgroundColor: '#ef4444',
              width: '16px',
              height: '16px',
              borderRadius: '2px'
            }}></div>
            <span style={{ fontSize: '12px', color: '#333' }}>Steep uphill (+5%)</span>
          </div>
        </div>
      </div>

      <CustomTooltip {...tooltip} />
    </div>
  );
};

const GradeAdjustmentChart = ({ adjustmentData, gradientPaceData, statType = 'mean', redDotData = [] }) => {
  console.log('GradeAdjustmentChart: redDotData', redDotData); // <-- Add this
  const [tooltipData, setTooltipData] = React.useState(null);

  const getInsights = () => {
    if (!bucketedData || bucketedData.length === 0) return null;
    const significantDeviations = bucketedData
      .filter(b => Math.abs(b.adjustmentFactor - b.literatureAdj) > 0.05)
      .map(b => ({
        gradient: b.label,
        midpoint: b.midpoint,
        personal: b.adjustmentFactor,
        literature: b.literatureAdj,
        diff: b.adjustmentFactor - b.literatureAdj,
        percentDiff: ((b.adjustmentFactor - b.literatureAdj) / b.literatureAdj * 100).toFixed(1)
      }))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    const uphillDeviations = significantDeviations.filter(d => d.midpoint > 0);
    const downhillDeviations = significantDeviations.filter(d => d.midpoint < 0);
    const maxUphillDeviation = uphillDeviations.length > 0 ? uphillDeviations[0] : null;
    const maxDownhillDeviation = downhillDeviations.length > 0 ? downhillDeviations[0] : null;
    let biggestImprovement = null;
    if (significantDeviations.length > 0) {
      const improvementAreas = significantDeviations.filter(d => d.diff > 0)
        .sort((a, b) => b.diff - a.diff);
      if (improvementAreas.length > 0) {
        biggestImprovement = improvementAreas[0];
      } else {
        biggestImprovement = significantDeviations
          .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))[0];
      }
    }
    return { 
      significantDeviations: significantDeviations.slice(0, 3), 
      maxUphillDeviation, 
      maxDownhillDeviation,
      biggestImprovement
    };
  };

  gradientPaceData.buckets.forEach((bucket, index) => {
    console.log(`Bucket ${index}:`, {
      label: bucket.label,
      min: bucket.min,
      max: bucket.max,
      calculated_midpoint: (bucket.min + bucket.max) / 2
    });
  });

  if (
    !adjustmentData ||
    !adjustmentData.adjustmentData ||
    adjustmentData.adjustmentData.length === 0
  ) {
    return null;
  }

  
  const getBasePace = () => {
    // Select the correct base pace (mean or median) based on statType
    const value = statType === 'median' ? adjustmentData.basePaceMedian : adjustmentData.basePace;
    return value != null ? value : 1; // Default to 1 if base pace is missing
  };
  const getBasePaceLabel = () => {
    const value = getBasePace();
    return value != null ? `${value.toFixed(2)} min/km` : 'N/A';
  };
  
  const skipLabels = [
    '≥35', '>=35',
    '≤-35', '<=-35'
  ];

  const bucketedData = [];
  if (gradientPaceData && gradientPaceData.buckets && getBasePace()) {
    gradientPaceData.buckets.forEach(bucket => {
      const cleanLabel = bucket.label.replace(/\s/g, '').replace(/%/g, '');
      if (skipLabels.some(skip => cleanLabel.startsWith(skip))) {
        console.log('Skipping bucket:', bucket.label, 'as cleanLabel:', cleanLabel);
        return;
      }
      if (bucket.binCount > 0) {
        const bucketPace = statType === 'median' ? bucket.medianPace : bucket.avgPace;
        if (bucketPace) {
          let midpoint;
          if (bucket.label.includes('≤-25') || bucket.label.includes('<=-25')) {
            midpoint = -27.5;
          } else if (bucket.label.includes('≥25') || bucket.label.includes('>=25')) {
            midpoint = 27.5;
          } else {
            midpoint = (bucket.min + bucket.max) / 2;
          }
          if (
            typeof midpoint === 'number' &&
            !isNaN(midpoint) &&
            midpoint > -31 &&
            midpoint < 31
          ) {
            const adjustmentFactor = bucketPace / getBasePace();
            const literatureAdj = calculateGradeAdjustment(midpoint);
            bucketedData.push({
              midpoint,
              adjustmentFactor,
              literatureAdj,
              label: bucket.label,
              binCount: bucket.binCount,
              avgPace: bucket.avgPace
            });
          }
        }
      }
    });
  }

  // Chart dimensions
  const chartHeight = 400;
  const width = 900;
  const chartPadding = 30;
  const chartWidth = width - 2 * chartPadding;

  const polynomialValues = [];
  for (let x = -30; x <= 30; x += 2) {
    polynomialValues.push(calculateGradeAdjustment(x));
  }

  const yMin = 0.4;
  const yMax = 3.7;

  const gradientMin = -30;
  const gradientMax = 30;
  const gradientRange = gradientMax - gradientMin;

  const getX = gradientValue =>
    ((gradientValue - gradientMin) / gradientRange) * chartWidth + chartPadding;

  const getY = adjustmentValue =>
    chartHeight - ((adjustmentValue - yMin) / (yMax - yMin)) * (chartHeight - chartPadding);

  const formatAdjustment = value => value.toFixed(2);

  const literatureLine = [];
  for (let g = gradientMin; g <= gradientMax; g++) {
    const x = g;
    const y = calculateGradeAdjustment(x);
    literatureLine.push({ x: getX(g), y: getY(y) });
  }
  const literatureLinePath = `M${literatureLine.map(p => `${p.x},${p.y}`).join(' L')}`;

  const adjustmentStep = 0.2;
  const yGridLines = [];
  for (
    let adj = Math.floor(yMin / adjustmentStep) * adjustmentStep;
    adj <= yMax;
    adj += adjustmentStep
  ) {
    yGridLines.push(adj);
  }

  const xGridLines = [];
  for (let g = -30; g <= 30; g += 5) {
    xGridLines.push(g);
  }

  // --- RETURN STATEMENT ---
  return (
    <div style={{ 
      marginTop: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%'
    }}>
      <div style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '20px',
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Title and subtitle inside white box */}
        <h3 style={{ 
          textAlign: 'center', 
          marginBottom: 8,
          marginTop: 0,
          color: '#333'
        }}>
          📊 Grade Adjustment - Personal vs Literature
        </h3>
        <p style={{ 
          textAlign: 'center', 
          maxWidth: '800px',
          marginBottom: 20,
          marginLeft: 'auto',
          marginRight: 'auto',
          color: '#666',
          fontSize: '14px'
        }}>
          Pace change multiplier relative to flat ground (x1.0 at flat/0% - {getBasePaceLabel()}) ({statType}) 
        </p>
        {adjustmentData.basePaceMethod && (
  <div style={{
    textAlign: 'center',
    color: '#888',
    fontSize: '13px',
    marginBottom: '10px'
  }}>
    <span>
      <strong>Base pace method:</strong> {
        adjustmentData.basePaceMethod === 'exact-zero' ? 'Exact 0% gradient bin'
        : adjustmentData.basePaceMethod === 'near-zero' ? 'Near-zero gradient bin (-2% to +2%)'
        : 'Average of all bins'
      }<br />
      <strong>Bucket:</strong> {adjustmentData.basePaceBinStats.label} &nbsp;|&nbsp;
      <strong>Bins:</strong> {adjustmentData.basePaceBinStats.binCount} &nbsp;|&nbsp;
      <strong>Total time:</strong> {adjustmentData.basePaceBinStats.totalTime
        ? `${Math.round(adjustmentData.basePaceBinStats.totalTime / 60)} mins`
        : 'N/A'}
    </span>
  </div>
)}
        {/* Chart SVG */}
        <svg width="100%" height={chartHeight + 25} style={{ 
          overflow: 'visible',
          display: 'block',
          margin: '0 auto'
        }}>
          {/* Y-axis grid lines */}
          {yGridLines.map(value => (
            <g key={`y-${value}`}>
              <line
                x1={chartPadding}
                x2={width - chartPadding}
                y1={getY(value)}
                y2={getY(value)}
                stroke="#e5e7eb"
                strokeDasharray="4 2"
                strokeWidth={1}
              />
              <text
                x={chartPadding - 8}
                y={getY(value)}
                fontSize={10}
                fill="#666"
                textAnchor="end"
                alignmentBaseline="middle"
              >
                {formatAdjustment(value)}
              </text>
            </g>
          ))}

          {/* X-axis grid lines */}
          {xGridLines.map(value => (
            <g key={`x-${value}`}>
              <line
                  x1={getX(value)}
                  x2={getX(value)}
                  y1={getY(yMax)}
                  y2={getY(yMin)}
                  stroke="#e5e7eb"
                  strokeDasharray="4 2"
                  strokeWidth={1}
              />
              <text
                x={getX(value)}
                y={getY(0.4) + 18}
                fontSize={10}
                fill="#666"
                textAnchor="middle"
              >
                {value}%
              </text>
            </g>
          ))}

          {/* Highlight 1.0 (no adjustment) line */}
          <line
            x1={chartPadding}
            x2={width - chartPadding}
            y1={getY(0.4)}
            y2={getY(0.4)}
            stroke="#888"
            strokeWidth={1}
          />

          <line
            x1={chartPadding}
            x2={width - chartPadding}
            y1={getY(1)}
            y2={getY(1)}
            stroke="#888"
            strokeWidth={1}
            strokeDasharray="4 2"
          />

          {/* Y-axis */}
          <line
            x1={chartPadding}
            x2={chartPadding}
            y1={getY(yMax)}
            y2={getY(yMin)}
            stroke="#888"
            strokeWidth={1}
          />

          {/* Literature formula line */}
          <path d={literatureLinePath} fill="none" stroke="#3b82f6" strokeWidth={2} />

          {/* Personal data points */}
          {redDotData
  .filter(point => point.gradient >= -30 && point.gradient <= 30)
  .map((point, idx) => (
    <circle
      key={idx}
      cx={getX(point.gradient)}
      cy={getY(point.adjustment)}
      r={4}
      fill="#ef4444"
      fillOpacity={0.4}
      stroke="#fff"
      strokeWidth={1}
      onMouseEnter={() => {
        setTooltipData({
          x: getX(point.gradient),
          y: getY(point.adjustment),
          gradient: `${point.gradient}%`,
          personalAdj: point.adjustment.toFixed(2),
          binCount: point.binCount,
          paceLabel: point.paceLabel
        });
      }}
      onMouseLeave={() => setTooltipData(null)}
      style={{cursor: 'pointer'}}
    />
  ))}

          {/* Bucket/category points */}
          {bucketedData
            .filter(bucket =>
              typeof bucket.midpoint === 'number' &&
              !isNaN(bucket.midpoint) &&
              bucket.midpoint > -31 &&
              bucket.midpoint < 31
            )
            .map((bucket, idx) => (
              <g key={`bucket-${idx}`}>
                <rect
                  x={getX(bucket.midpoint) - 4}
                  y={getY(bucket.adjustmentFactor) - 4}
                  width={8}
                  height={8}
                  fill="#3b82f6"
                  stroke="#fff"
                  strokeWidth={1.5}
                  onMouseEnter={() => {
                    setTooltipData({
                      x: getX(bucket.midpoint),
                      y: getY(bucket.adjustmentFactor),
                      gradient: bucket.label,
                      personalAdj: bucket.adjustmentFactor != null ? bucket.adjustmentFactor.toFixed(2) : 'N/A',
                      literatureAdj: calculateGradeAdjustment(bucket.midpoint).toFixed(2),
                      binCount: bucket.binCount
                    });
                  }}
                  onMouseLeave={() => setTooltipData(null)}
                  style={{cursor: 'pointer'}}
                />
                <line
                  x1={getX(bucket.midpoint)}
                  y1={getY(bucket.adjustmentFactor)}
                  x2={getX(bucket.midpoint)}
                  y2={getY(bucket.literatureAdj)}
                  stroke="#666"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
              </g>
            ))}

          {/* Tooltip rendering */}
          {tooltipData && (
            <g>
              <rect
                x={tooltipData.x + 8}
                y={tooltipData.y - 45}
                width={120}
                height={48}
                rx={3}
                fill="rgba(0,0,0,0.8)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
              <text
                x={tooltipData.x + 12}
                y={tooltipData.y - 32}
                fontSize={9}
                fontWeight="bold"
                fill="#fff"
              >
                Gradient: {tooltipData.gradient}
              </text>
              <text
                x={tooltipData.x + 12}
                y={tooltipData.y - 22}
                fontSize={9}
                fill="#fff"
              >
                Personal: {tooltipData.personalAdj}x
              </text>
              <text
                x={tooltipData.x + 12}
                y={tooltipData.y - 12}
                fontSize={9}
                fill="#fff"
              >
                Literature: {tooltipData.literatureAdj}x
              </text>
              <text
                x={tooltipData.x + 12}
                y={tooltipData.y - 2}
                fontSize={8}
                fill="#ccc"
              >
                {tooltipData.binCount} bins
              </text>
            </g>
          )}

          {/* Legend inside SVG, top left within chart area */}
          <g transform={`translate(${chartPadding + 10},${getY(yMax) + 10})`}>
            <rect width={180} height={55} rx={3} fill="white" fillOpacity={0.9} stroke="#e5e7eb" strokeWidth={1} />
            <circle cx={10} cy={12} r={3} fillOpacity={0.6} fill="#ef4444" />
            <text x={18} y={15} fontSize={10} fill="#333">Individual points</text>
            <rect x={7} y={25} width={6} height={6} fill="#3b82f6" stroke="#fff" strokeWidth={1} />
            <text x={18} y={30} fontSize={10} fill="#333">Bucket averages</text>
            <line x1={10} x2={30} y1={42} y2={42} stroke="#3b82f6" strokeWidth={2} />
            <text x={40} y={45} fontSize={10} fill="#333">Literature formula</text>
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
          {getInsights() ? (
            <>
              <p style={{ marginBottom: 16 }}>
                This chart compares your personal pace adjustments (<span style={{ color: '#ef4444', fontWeight: 'bold' }}>red circles</span> and <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>blue squares</span>) with the 
                <strong> Strava population average</strong> (<span style={{ color: '#3b82f6', fontWeight: 'bold' }}>blue line</span>) based on the model from Strava's research.  Higher values mean relatively slower compared to flat ground.
              </p>
              <p style={{ marginBottom: 16 }}>
                
                Compare your personal adjustment to the literature model to see where your performance differs most.
              </p>
            
              {getInsights().maxUphillDeviation && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Uphill performance:</strong>{' '}
                  {getInsights().maxUphillDeviation.diff > 0 ? (
                    <span>
                      You slow down <span style={{ color: '#ef4444' }}>more than average</span> on {getInsights().maxUphillDeviation.gradient} gradients 
                      ({getInsights().maxUphillDeviation.percentDiff}% difference). This could be an area to focus training.
                    </span>
                  ) : (
                    <span>
                      You handle {getInsights().maxUphillDeviation.gradient} gradients <span style={{ color: '#10b981' }}>better than average </span> 
                      ({Math.abs(getInsights().maxUphillDeviation.percentDiff)}% difference). This is a relative strength!
                    </span>
                  )}
                </div>
              )}
              {getInsights().maxDownhillDeviation && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Downhill performance:</strong>{' '}
                  {getInsights().maxDownhillDeviation.diff > 0 ? (
                    <span>
                      On {getInsights().maxDownhillDeviation.gradient} gradients, you're <span style={{ color: '#ef4444' }}>not taking full advantage</span> of 
                      the descent ({getInsights().maxDownhillDeviation.percentDiff}% difference from average).
                    </span>
                  ) : (
                    <span>
                      You're <span style={{ color: '#10b981' }}>particularly good</span> at {getInsights().maxDownhillDeviation.gradient} descents, 
                      with {Math.abs(getInsights().maxDownhillDeviation.percentDiff)}% relatively better adjustment than average runners.
                    </span>
                  )}
                </div>  
              )}
              {getInsights().biggestImprovement && (
                <div style={{ 
                  marginTop: 16, 
                  marginBottom: 8,
                  padding: '12px 16px',
                  backgroundColor: getInsights().biggestImprovement.diff > 0 ? '#fef2f2' : '#f0fdf4',
                  borderLeft: `4px solid ${getInsights().biggestImprovement.diff > 0 ? '#ef4444' : '#10b981'}`,
                  borderRadius: '4px'
                }}>
                  {getInsights().biggestImprovement.diff > 0 ? (
                    <>
                      <strong style={{ color: '#b91c1c' }}>📈 Biggest improvement opportunity:</strong>{' '}
                      <span>
                        Your {getInsights().biggestImprovement.gradient} gradient performance is {getInsights().biggestImprovement.percentDiff}% relatively slower 
                        than the modelled average runner. Focused training on this gradient could yield your biggest gains.
                      </span>
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#10b981' }}>📈 Focus area:</strong>{' '}
                      <span>
                        While you perform well on all gradients, your {getInsights().biggestImprovement.gradient} gradient 
                        has the least advantage compared to average ({Math.abs(getInsights().biggestImprovement.percentDiff)}% difference).
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
    </div>
  );
};

export { GradientPaceChart, GradeAdjustmentChart };