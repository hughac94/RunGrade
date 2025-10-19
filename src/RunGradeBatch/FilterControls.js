// New file: src/FilterControls.js

import React from 'react';

const FilterControls = ({ 
  filterSettings,
  setFilterSettings,
  hasHeartRateData
}) => {
  return (
    <div className="filter-controls">
      <h3 style={{
  fontSize: '1.2rem',
  fontWeight: 700,
  color: '#fff',
  background: '#10b981',
  padding: '8px 0',
  borderRadius: '6px',
  marginBottom: 8,
  textAlign: 'center',
  letterSpacing: '0.5px'
}}>
  Choose Further Filtering Settings
</h3>
      
      
      <div className="filter-section" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 12 }}>
  <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
    <input
      type="checkbox"
      checked={filterSettings.removeUnreliableBins}
      onChange={e => setFilterSettings({
        ...filterSettings,
        removeUnreliableBins: e.target.checked
      })}
      style={{ marginRight: 6 }}
    />
    Filter out bins with extreme gradients, unrealistic speeds, or data anomalies
  </label>

</div>

{hasHeartRateData && (
  <div className="filter-section" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 12 }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
      <input
        type="checkbox"
        checked={filterSettings.enableHeartRateFilter}
        onChange={e => setFilterSettings({
          ...filterSettings,
          enableHeartRateFilter: e.target.checked
        })}
        style={{ marginRight: 6 }}
      />
      Filter by a specific heart rate range
    </label>
    {filterSettings.enableHeartRateFilter && (
      <div
        className="heart-rate-range"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: '1rem'
        }}
      >
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '1rem',
          margin: 0
        }}>
          Min HR:
          <input
            type="number"
            value={filterSettings.heartRateFilter.minHR || ''}
            onChange={e => setFilterSettings({
              ...filterSettings,
              heartRateFilter: {
                ...filterSettings.heartRateFilter,
                minHR: e.target.value ? parseInt(e.target.value) : null
              }
            })}
            min={60}
            max={220}
            placeholder="Min"
            style={{
              width: 60,
              marginLeft: 4,
              fontSize: '1rem',
              height: '32px',
              verticalAlign: 'middle'
            }}
          />
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '1rem',
          margin: 0
        }}>
          Max HR:
          <input
            type="number"
            value={filterSettings.heartRateFilter.maxHR || ''}
            onChange={e => setFilterSettings({
              ...filterSettings,
              heartRateFilter: {
                ...filterSettings.heartRateFilter,
                maxHR: e.target.value ? parseInt(e.target.value) : null
              }
            })}
            min={60}
            max={220}
            placeholder="Max"
            style={{
              width: 60,
              marginLeft: 4,
              fontSize: '1rem',
              height: '32px',
              verticalAlign: 'middle'
            }}
          />
        </label>
      </div>
    )}
  </div>
)}
      {/* Remove the Apply Filters button completely */}
    </div>
  );
};

export default FilterControls;