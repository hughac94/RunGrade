import React from 'react';

const StatToggle = ({ value, onChange, style = {} }) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
      ...style 
    }}>
      <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Display:</span>
      <button
        onClick={() => onChange('mean')}
        style={{
          padding: '4px 12px',
          fontSize: '11px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: value === 'mean' ? '#3b82f6' : '#fff',
          color: value === 'mean' ? '#fff' : '#333',
          fontWeight: value === 'mean' ? 'bold' : 'normal'
        }}
      >
        Mean
      </button>
      <button
        onClick={() => onChange('median')}
        style={{
          padding: '4px 12px',
          fontSize: '11px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: value === 'median' ? '#3b82f6' : '#fff',
          color: value === 'median' ? '#fff' : '#333',
          fontWeight: value === 'median' ? 'bold' : 'normal'
        }}
      >
        Median
      </button>
    </div>
  );
};

export default StatToggle;