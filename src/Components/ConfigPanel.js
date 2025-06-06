import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';


export default function ConfigPanel({
  title = "Configure File",
  showGapInput = true,
  handleFileChange,
  selectedFileName,
  inputGapMin,
  setInputGapMin,
  inputGapSec,
  setInputGapSec,
  inputGapPaceMs,
  downsample,
  setDownsample,
  downsampleFactor,
  setDownsampleFactor,
  binLength,
  setBinLength,
  removePauses,
  setRemovePauses,
  pauseThreshold,
  setPauseThreshold,
  smoothElevation,
  setSmoothElevation,
  smoothingWindow,
  setSmoothingWindow,
  snapAndTrim,
  setSnapAndTrim,
}) {
  

  return (
    <Paper
      elevation={4}
      sx={{
        borderRadius: 3,
        p: 3,
        mb: 3,
        background: 'rgba(245,247,250,0.95)',
        maxWidth: 700,
        minWidth: 320,
        fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
        fontSize: 16,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 2,
          textAlign: 'center',
          letterSpacing: 1,
        }}
      >
        {title}
      </Typography>

      <Button
        component="label"
        variant="outlined"
        startIcon={<UploadFileIcon />}
        sx={{ mb: 1, textTransform: 'none', fontWeight: 500 }}
        fullWidth
      >
        Upload GPX file
        <input
          type="file"
          accept=".gpx"
          hidden
          onChange={handleFileChange}
        />
      </Button>
      {selectedFileName && (
        <Typography variant="body2" color="success.main" sx={{ mt: 1, ml: 1, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, marginRight: 6 }}>✅</span>
          {selectedFileName}
        </Typography>
      )}

      <Divider sx={{ my: 2 }} />

      {showGapInput && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2 }}>
            ⚡ Input Grade Adjusted Pace:
          </Typography>
          <Grid container spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Grid >
              <TextField
                type="number"
                label="min"
                size="small"
                inputProps={{ min: 0, max: 59 }}
                value={inputGapMin}
                onChange={e => setInputGapMin(Number(e.target.value))}
                sx={{ width: 60 }}
              />
            </Grid>
            <Grid>
              <TextField
                type="number"
                label="sec/km"
                size="small"
                inputProps={{ min: 0, max: 59 }}
                value={inputGapSec}
                onChange={e => setInputGapSec(Number(e.target.value))}
                sx={{ width: 70 }}
              />
            </Grid>
            <Grid>
              <Typography variant="caption" color="text.secondary" fontSize={14}>
                ({inputGapPaceMs ? inputGapPaceMs.toFixed(2) : '0.00'} m/s)
              </Typography>
            </Grid>
          </Grid>
        </>
      )}

      <Stack spacing={2} sx={{ mt: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={downsample}
                onChange={e => setDownsample(e.target.checked)}
              />
            }
            label="Downsample polyline"
          />
          {downsample && (
            <TextField
              type="number"
              label="Every Nth"
              size="small"
              inputProps={{ min: 2, max: 50 }}
              value={downsampleFactor}
              onChange={e => setDownsampleFactor(Number(e.target.value))}
              sx={{ width: 80 }}
            />
          )}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={removePauses}
                onChange={e => setRemovePauses(e.target.checked)}
              />
            }
            label="Remove pauses longer than"
          />
          <TextField
            type="number"
            label="(s)"
            size="small"
            inputProps={{ min: 1, max: 3600 }}
            value={pauseThreshold}
            onChange={e => setPauseThreshold(Number(e.target.value))}
            sx={{ width: 100 }}
            disabled={!removePauses}
          />
        </Stack>

        {/* Bin length control */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ width: 2 }} />
          <Typography fontWeight={500} color="text.primary" fontSize={16}>
            Set bin length for splitting up GPX file
          </Typography>
          <TextField
            type="number"
            label="Bin length (m)"
            size="small"
            inputProps={{ min: 10, max: 1000 }}
            value={binLength}
            onChange={e => setBinLength(Number(e.target.value))}
            sx={{ width: 120 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            m
          </Typography>
        </Stack>

        {/* Smoothing window control (inside "Smooth elevation" stack) */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={smoothElevation}
                onChange={e => setSmoothElevation(e.target.checked)}
              />
            }
            label="Smooth elevation"
          />
          {smoothElevation && (
            <TextField
              type="number"
              label="Window"
              size="small"
              inputProps={{ min: 3, max: 51, step: 2 }}
              value={smoothingWindow}
              onChange={e => setSmoothingWindow(Number(e.target.value))}
              sx={{ width: 80 }}
            />
          )}
        </Stack>

        {/* Only show Snap and trim if props are provided */}
        {typeof snapAndTrim !== "undefined" && typeof setSnapAndTrim === "function" && (
          <Stack direction="row" alignItems="center" spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={snapAndTrim}
                  onChange={e => setSnapAndTrim(e.target.checked)}
                  color="primary"
                />
              }
              label="Snap and trim"
            />
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}