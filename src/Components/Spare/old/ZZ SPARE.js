import React from 'react';

export default function GPXUploadControls({
  handleFileChange,
  downsample,
  setDownsample,
  downsampleFactor,
  setDownsampleFactor,
  removePauses,
  setRemovePauses,
  pauseThreshold,
  setPauseThreshold,
  smoothElevation,
  setSmoothElevation,
  smoothingWindow,
  setSmoothingWindow
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'linear-gradient(90deg, #f8fafc 60%, #e3e8ee 100%)',
        borderRadius: 16,
        boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
        padding: '32px 32px 24px 32px',
        margin: '0 auto 32px auto',
        maxWidth: 420,
        minHeight: 90,
        flexDirection: 'column'
      }}
    >
      <div style={{
        fontWeight: 700,
        fontSize: 20,
        color: '#2a72e5',
        marginBottom: 18,
        letterSpacing: '0.5px',
        textAlign: 'center'
      }}>
        Choose me first:
      </div>
      {/* Downsample */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        fontWeight: 500,
        fontSize: 15,
        color: '#222',
        marginBottom: 16
      }}>
        <input
          type="checkbox"
          checked={downsample}
          onChange={e => setDownsample(e.target.checked)}
          style={{ marginRight: 8 }}
        />
        Downsample polyline
        {downsample && (
          <>
            &nbsp;every&nbsp;
            <input
              type="number"
              min={2}
              max={50}
              value={downsampleFactor}
              onChange={e => setDownsampleFactor(Number(e.target.value))}
              style={{
                width: 48,
                margin: '0 6px',
                border: '1px solid #d0d7de',
                borderRadius: 4,
                padding: '2px 6px'
              }}
            />
            points
          </>
        )}
      </label>
      {/* Remove Pauses */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        fontWeight: 500,
        fontSize: 15,
        color: '#222',
        marginBottom: 16
      }}>
        <input
          type="checkbox"
          checked={removePauses}
          onChange={e => setRemovePauses(e.target.checked)}
          style={{ marginRight: 8 }}
        />
        Remove pauses
        <span style={{ color: '#888', marginLeft: 6, fontWeight: 400 }}>
          (ignore gaps &gt;
          <input
            type="number"
            min={1}
            max={3600}
            value={pauseThreshold}
            onChange={e => setPauseThreshold(Number(e.target.value))}
            style={{
              width: 48,
              margin: '0 6px',
              border: '1px solid #d0d7de',
              borderRadius: 4,
              padding: '2px 6px'
            }}
            disabled={!removePauses}
          />
          s)
        </span>
      </label>
      {/* Smooth Elevation */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        fontWeight: 500,
        fontSize: 15,
        color: '#222',
        marginBottom: 16
      }}>
        <input
          type="checkbox"
          checked={smoothElevation}
          onChange={e => setSmoothElevation(e.target.checked)}
          style={{ marginRight: 8 }}
        />
        Smooth elevation
        {smoothElevation && (
          <>
            &nbsp;window:&nbsp;
            <input
              type="number"
              min={3}
              max={51}
              step={2}
              value={smoothingWindow}
              onChange={e => setSmoothingWindow(Number(e.target.value))}
              style={{
                width: 48,
                margin: '0 6px',
                border: '1px solid #d0d7de',
                borderRadius: 4,
                padding: '2px 6px'
              }}
            />
            points
          </>
        )}
      </label>
      {/* GPX File */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        fontWeight: 500,
        fontSize: 15,
        color: '#222',
        cursor: 'pointer'
      }}>
        <span style={{ marginRight: 10, color: '#2a72e5', fontWeight: 600 }}>Choose GPX file</span>
        <input
          type="file"
          accept=".gpx"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <span style={{
          display: 'inline-block',
          background: '#e3e8ee',
          color: '#2a72e5',
          borderRadius: 6,
          padding: '2px 10px',
          fontSize: 13,
          marginLeft: 6
        }}>
          .gpx
        </span>
      </label>
    </div>
  );
}