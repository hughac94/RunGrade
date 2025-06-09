import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Label, CartesianGrid } from 'recharts';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { getTotalTimeByGradientGroup } from './gpxAnalysis';
import { getPaceByGradient } from './gpxAnalysis';
import gradientGroups from './GradientBuckets';
import { BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis, Tooltip as BarTooltip, Legend as BarLegend, CartesianGrid as BarCartesianGrid, Label as BarLabel, ResponsiveContainer as BarResponsiveContainer } from 'recharts';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import gradientSummaryGroups from './GradientGroups';
import { sectionTitleSx } from './Styles';

// Helper to parse h:mm:ss or m:ss to seconds
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatHMS(seconds) {
  if (!isFinite(seconds)) return 'n/a';
  const sign = seconds < 0 ? '-' : '';
  seconds = Math.abs(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `${sign}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const FILE1_COLOR = '#1976d2'; // Blue
const FILE2_COLOR = '#43a047'; // Green

//Creating a custom legend
function CustomLegend(props) {
  const { payload } = props;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 8 }}>
      {payload.map((entry, index) => (
        <span key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block',
            width: 16,
            height: 16,
            backgroundColor: entry.color,
            borderRadius: '50%',
            marginRight: 6,
            border: '1.5px solid #888'
          }} />
          <span style={{ fontWeight: 600, color: entry.color }}>{entry.value}</span>
        </span>
      ))}
    </div>
  );
}

// Helper to format decimal minutes as min:sec
function formatMinSec(decimalMinutes) {
  if (!isFinite(decimalMinutes) || decimalMinutes <= 0) return 'n/a';
  let min = Math.floor(decimalMinutes);
  let sec = Math.round((decimalMinutes - min) * 60);
  if (sec === 60) {
    min += 1;
    sec = 0;
  }
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PaceByGradientScatter({ bins1, bins2, label1 = "File 1", label2 = "File 2" }) {
  const data1 = getPaceByGradient(bins1);
  const data2 = getPaceByGradient(bins2);

  const timeData1 = getTotalTimeByGradientGroup(bins1, gradientGroups);
  const timeData2 = getTotalTimeByGradientGroup(bins2, gradientGroups);

  const barChartData = gradientGroups.map((group, i) => ({
    group: group.label,
    file1: (timeData1[i]?.totalTimeSec || 0) / 60, // convert to minutes
    file2: (timeData2[i]?.totalTimeSec || 0) / 60,
  }));

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 4 },
        mb: 4,
        background: '#f8fafc',
        maxWidth: 1200,
        width: '100%',
        mx: 'auto',
        borderRadius: 4,
      }}
    >
      <Box>
        {/* Time Difference by Terrain */}
        <Typography
          variant="h5"
          sx={sectionTitleSx}
          >
          Time Difference by Terrain
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, my: 2 }}>
          {(() => {
            // Go back to using bins directly for terrain grouping (not gradient groups)
            const diffs = gradientSummaryGroups.map(summary => {
              let totalTime1 = 0;
              let totalTime2 = 0;
              
              // Sum all bins for file 1 that fall in this terrain category
              bins1.forEach(bin1 => {
                let inGroup = false;
                if (summary.label === 'Downhill') {
                  inGroup = bin1.gradient < -3;
                } else if (summary.label === 'Flat') {
                  inGroup = bin1.gradient >= -3 && bin1.gradient <= 3;
                } else if (summary.label === 'Uphill') {
                  inGroup = bin1.gradient > 3;
                }
                
                if (inGroup) {
                  totalTime1 += parseTimeToSeconds(bin1.timeTaken);
                }
              });
              
              // Sum all bins for file 2 that fall in this terrain category  
              bins2.forEach(bin2 => {
                let inGroup = false;
                if (summary.label === 'Downhill') {
                  inGroup = bin2.gradient < -3;
                } else if (summary.label === 'Flat') {
                  inGroup = bin2.gradient >= -3 && bin2.gradient <= 3;
                } else if (summary.label === 'Uphill') {
                  inGroup = bin2.gradient > 3;
                }
                
                if (inGroup) {
                  totalTime2 += parseTimeToSeconds(bin2.timeTaken);
                }
              });
              
              const diffSec = totalTime1 - totalTime2;
              console.log(`${summary.label}: File1=${formatHMS(totalTime1)}, File2=${formatHMS(totalTime2)}, Diff=${formatHMS(diffSec)}`);
              
              return diffSec;
            });
            const icons = [
              <ArrowDownwardIcon sx={{ fontSize: 48, color: '#888'  }} />,
              <ArrowForwardIcon sx={{ fontSize: 48, color: '#888' }} />,
              <ArrowUpwardIcon sx={{ fontSize: 48, color: '#888'  }} />,
            ];
            const labels = ['Downhill', 'Flat', 'Uphill'];
            const colors = ['#888', '#888', '#888'];
            return diffs.map((diff, idx) => (
              <Paper
                key={labels[idx]}
                elevation={4}
                sx={{
                  flex: 1,
                  minWidth: 180,
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  background: '#f5fafd',
                  boxShadow: `0 2px 12px ${colors[idx]}22`,
                }}
              >
                <Box sx={{ mb: 1 }}>{icons[idx]}</Box>
                <Typography sx={{ fontWeight: 700, fontSize: 36, color: diff < 0 ? FILE1_COLOR : diff > 0 ? FILE2_COLOR : '#888', mb: 1 }}>
                  {formatHMS(diff)}
                </Typography>
                <Typography sx={{ fontWeight: 600, fontSize: 22, color: colors[idx] }}>
                  {labels[idx]}
                </Typography>
              </Paper>
            ));
          })()}
        </Box>

        {/* Average Pace by Gradient */}
        <Typography
          variant="h5"
         sx={sectionTitleSx}
          >
          Average Pace by Gradient
        </Typography>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
            <CartesianGrid stroke="#ccc" strokeDasharray="4 4" strokeWidth={2} />
            <XAxis
              type="number"
              dataKey="x"
              name="Gradient (%)"
              ticks={gradientGroups.map(g => g.mid)}
              tickFormatter={mid => {
                const group = gradientGroups.find(g => g.mid === mid);
                return group ? group.label : mid;
              }}
              domain={[-27.5, 27.5]}
              label={<Label value="Gradient Range (%)" position="bottom" offset={0} />}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Pace (min/km)"
              label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft', offset: 10 }}
              domain={[2, 12]}
              reversed
              tickFormatter={formatMinSec}
            />
            <Tooltip
              formatter={(value) => formatMinSec(value)}
              labelFormatter={mid => {
                const group = gradientGroups.find(g => g.mid === mid);
                return group ? group.label : mid;
              }}
            />
            <Legend verticalAlign="top" content={<CustomLegend />} />
            <Scatter name={label1} data={data1} fill={FILE1_COLOR} shape="circle" strokeWidth={4}/>
            <Scatter name={label2} data={data2} fill={FILE2_COLOR} shape="diamond" strokeWidth={4}/>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Total Time By Gradients */}
        <Typography
          variant="h5"
          sx={sectionTitleSx}
          >
          Total Time By Gradients
        </Typography>
        <BarResponsiveContainer width="100%" height={400}>
          <BarChart
            data={barChartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
            barGap={8}
          >
            <BarCartesianGrid stroke="#ccc" strokeDasharray="4 4" />
            <BarXAxis
              dataKey="group"
              label={<BarLabel value="Gradient Range (%)" position="bottom" offset={0} />}
            />
            <BarYAxis
              label={{ value: 'Total Time (min)', angle: -90, position: 'insideLeft', offset: 10 }}
              domain={(() => {
                // Find the minimum and maximum values across all data
                let minValue = Infinity;
                let maxValue = -Infinity;
                
                barChartData.forEach(item => {
                  if (item.file1 > 0) {
                    minValue = Math.min(minValue, item.file1);
                    maxValue = Math.max(maxValue, item.file1);
                  }
                  if (item.file2 > 0) {
                    minValue = Math.min(minValue, item.file2);
                    maxValue = Math.max(maxValue, item.file2);
                  }
                });
                
                // If no valid data, use auto scaling
                if (minValue === Infinity) {
                  return ['auto', 'auto'];
                }
                
                // Set domain with reasonable padding
                const yMin = Math.max(0, Math.floor(minValue - 5));
                const yMax = Math.ceil(maxValue + 5);
                
                return [yMin, yMax];
              })()}
            />
            <BarTooltip
              formatter={val => `${val.toFixed(1)} min`}
            />
            <BarLegend verticalAlign="top" />
            <Bar name={label1} dataKey="file1" fill={FILE1_COLOR} />
            <Bar name={label2} dataKey="file2" fill={FILE2_COLOR} />
          </BarChart>
        </BarResponsiveContainer>

        {/* Time Difference by Gradient Table */}
        <Box sx={{ mt: 3 }}>
          <Typography
            variant="h5"
            sx={sectionTitleSx}
          > 
            Time Difference by Gradient (coloured by faster file)
          </Typography>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 22 }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc', padding: 6 }}>Gradient Group</th>
                <th style={{ borderBottom: '1px solid #ccc', padding: 6 }}>Time Difference (hh:mm:ss)</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = gradientGroups.map((group, i) => {
                  const diffSec = (timeData1[i]?.totalTimeSec || 0) - (timeData2[i]?.totalTimeSec || 0);
                  return {
                    label: group.label,
                    diffSec,
                    formatted: formatHMS(diffSec)
                  };
                });

                // Calculate total
                const totalDiffSec = rows.reduce((sum, row) => sum + row.diffSec, 0);
                const totalFormatted = formatHMS(totalDiffSec);

                return (
                  <>
                    {rows.map(row => (
                      <tr key={row.label}>
                        <td style={{ padding: 6 }}>{row.label}</td>
                        <td style={{
                          padding: 6,
                          fontWeight: 700,
                          fontSize: 22,
                          color: row.diffSec < 0 ? FILE1_COLOR : FILE2_COLOR
                        }}>
                          {row.formatted}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ padding: 0 }}>
                        <hr style={{ border: '1px solid #888', margin: '8px 0' }} />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 6, fontWeight: 700, fontSize: 22 }}>Total</td>
                      <td style={{
                        padding: 6,
                        fontWeight: 700,
                        fontSize: 22,
                        color: totalDiffSec < 0 ? FILE1_COLOR : FILE2_COLOR
                      }}>
                        {totalFormatted}
                      </td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </Box>
      </Box>
    </Paper>
  );
}

