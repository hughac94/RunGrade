import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { calculateGradeAdjustment } from './RunGradeBatch/Coefficients';
import Plot from 'react-plotly.js'; // <-- add

function formatPaceMMSS(mins) {
  if (!isFinite(mins) || mins <= 0) return '—';
  const totalSec = Math.round(mins * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const round1 = (n) => Math.round(n * 10) / 10;

export default function TreadmillCalculator() {
  const [speedKmh, setSpeedKmh] = useState(10.0);     // km/h
  const [gradient, setGradient] = useState(10.0);      // %

  // Nudge helpers
  const speedMin = 0.1, speedMax = 30, speedStep = 0.1;
  const gradMin = -5, gradMax = 25, gradStep = 0.1;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const nudgeSpeed = (dir) => setSpeedKmh(prev => clamp(round1(prev + dir * speedStep), speedMin, speedMax));
  const nudgeGradient = (dir) => setGradient(prev => clamp(round1(prev + dir * gradStep), gradMin, gradMax));

  // Raw pace (min/km) = 60 / kmh
  const rawPaceMinPerKm = useMemo(() => {
    return speedKmh > 0 ? 60 / speedKmh : NaN;
  }, [speedKmh]);

  // Grade Adjusted Pace (min/km) = raw pace / adjFactor
  const gapMinPerKm = useMemo(() => {
    // Clamp gradient to match the rest of the app
    const clamped = Math.max(-35, Math.min(35, gradient));
    const adjFactor = calculateGradeAdjustment ? calculateGradeAdjustment(clamped) : 1;
    if (!isFinite(adjFactor) || adjFactor <= 0) return NaN;
    return rawPaceMinPerKm / adjFactor;
  }, [gradient, rawPaceMinPerKm]);

  // Equivalent grade-adjusted speed (km/h)
  const gapSpeedKmh = useMemo(() => {
    return isFinite(gapMinPerKm) && gapMinPerKm > 0 ? 60 / gapMinPerKm : NaN;
  }, [gapMinPerKm]);

  // Multiplier at current gradient (clamped to ±35)
  const adjFactor = useMemo(() => {
    const clamped = Math.max(-35, Math.min(35, gradient));
    return calculateGradeAdjustment ? calculateGradeAdjustment(clamped) : 1;
  }, [gradient]);

  // Curve over slider’s visible range (-5%..25%)
  const { xs, ys } = useMemo(() => {
    const viewMin = -5, viewMax = 25, step = 0.5;
    const xx = [];
    const yy = [];
    for (let x = viewMin; x <= viewMax + 1e-9; x += step) {
      const gx = Math.max(-35, Math.min(35, x));
      xx.push(Number(x.toFixed(1)));
      yy.push(calculateGradeAdjustment(gx));
    }
    return { xs: xx, ys: yy };
  }, []);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 3, p: 2 }}>
      {/* Helper text */}
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        Input treadmill metrics to get an estimate of grade adjusted pace... but be careful treadmills can be out by several %.
      </Typography>

      {/* Sliders for inputs */}
      <Stack spacing={4} sx={{ mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
              Speed (km/h)
            </Typography>
            <IconButton size="small" aria-label="decrease speed" onClick={() => nudgeSpeed(-1)}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="increase speed" onClick={() => nudgeSpeed(1)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <Slider
            value={speedKmh}
            min={speedMin}
            max={speedMax}
            step={speedStep}                 // discrete 0.1 km/h
            marks={[
              { value: 0.1, label: '0.1' },
              { value: 10, label: '10' },
              { value: 20, label: '20' },
              { value: 30, label: '30' },
            ]}
            valueLabelDisplay="on"
            valueLabelFormat={(v) => `${v.toFixed(1)} km/h`}
            onChange={(_, v) => setSpeedKmh(round1(Array.isArray(v) ? v[0] : v))}
            sx={{ width: '100%' }}
            aria-label="Speed km/h"
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
              Gradient (%)
            </Typography>
            <IconButton size="small" aria-label="decrease gradient" onClick={() => nudgeGradient(-1)}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="increase gradient" onClick={() => nudgeGradient(1)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <Slider
            value={gradient}
            min={gradMin}
            max={gradMax}
            step={gradStep}                  // discrete 0.1%
            marks={[
              { value: -5, label: '-5' },
              { value: 0, label: '0' },
              { value: 10, label: '10' },
              { value: 20, label: '20' },
              { value: 25, label: '25' },
            ]}
            valueLabelDisplay="on"
            valueLabelFormat={(v) => `${v.toFixed(1)} %`}
            onChange={(_, v) => setGradient(round1(Array.isArray(v) ? v[0] : v))}
            sx={{ width: '100%' }}
            aria-label="Gradient percent"
          />
        </Box>
      </Stack>

      {/* Results boxes */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16
      }}>
        <Box sx={{ p: 2, borderRadius: 2, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 0.5, fontWeight: 700 }}>
            Raw Pace
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {formatPaceMMSS(rawPaceMinPerKm)}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>min/km</Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: 2, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 0.5, fontWeight: 700 }}>
            Grade Adjusted Pace
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, color: '#2a72e5', display: 'flex', alignItems: 'baseline', gap: 1 }}
          >
            {formatPaceMMSS(gapMinPerKm)}
            <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>
              ({isFinite(gapSpeedKmh) ? gapSpeedKmh.toFixed(1) : '—'} km/h)
            </Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>min/km (GAP)</Typography>
        </Box>
      </Box>

      {/* GAP multiplier chart */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
          GAP Multiplier at {gradient.toFixed(1)}%: <span style={{ color: '#1976d2' }}>{adjFactor.toFixed(1)}×</span>
        </Typography>
        <Plot
          data={[
            {
              x: xs,
              y: ys,
              type: 'scatter',
              mode: 'lines',
              line: { color: '#1976d2', width: 3 },
              hoverinfo: 'skip', // no tooltip
            },
            {
              x: [gradient],
              y: [adjFactor],
              type: 'scatter',
              mode: 'markers+text',
              text: [`${adjFactor.toFixed(1)}×`],
              textposition: 'top center',
              hoverinfo: 'skip', // no tooltip
            },
          ]}
          layout={{
            autosize: true,
            height: 300,
            margin: { l: 50, r: 10, t: 10, b: 40 },
            xaxis: { title: 'Gradient (%)', range: [-5, 25], zeroline: true },
            yaxis: { title: 'Pace Multiplier', rangemode: 'tozero' },
            showlegend: false,
            hovermode: false, // disable hover globally
          }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </Box>
    </Box>
  );
}