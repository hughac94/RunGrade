import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

function MapView({
  route = [],
  distances = [],
  selectedIdx,
  setSelectedIdx,
  downsample = false,
  downsampleFactor = 5,
  checkpoints = [],
  runners, 
  sliderValue,
  selectedSection = null,
  showTooltips = true, // Add this prop
}) {
  // Move all hooks to the top before any early returns
  const [zoom, setZoom] = useState(13);

  const flagInterval = 10; // km

  const flagIndices = useMemo(() => {
    const indices = [];
    if (!distances.length) return indices;
    for (let km = flagInterval; km < distances[distances.length - 1]; km += flagInterval) {
      const idx = distances.findIndex(d => d >= km);
      if (idx !== -1) indices.push(idx);
    }
    return indices;
  }, [distances]);

  // Downsampled polyline for display
  const displayRoute = useMemo(() => {
    if (!downsample || downsampleFactor <= 1) return route;
    return route.filter((_, idx) => idx % downsampleFactor === 0 || idx === route.length - 1);
  }, [route, downsample, downsampleFactor]);

  // Add checkpoint markers
  const checkpointMarkers = useMemo(() => {
    if (!checkpoints.length || !distances.length || !route.length) return [];
    return checkpoints.map((cp, idx) => {
      // Find the closest route index for this checkpoint's km
      const routeIdx = findNearestRouteIdxForKm(distances, cp.km);
      if (routeIdx === -1 || !route[routeIdx]) return null;
      return (
        <CircleMarker
          key={`checkpoint-${idx}`}
          center={[route[routeIdx].lat, route[routeIdx].lon]}
          radius={12}
          pathOptions={{
            color: 'gold',
            fillColor: 'yellow',
            fillOpacity: 0.8,
            opacity: 1,
            weight: 3,
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
            {cp.name || `Checkpoint ${idx + 1}`}
          </Tooltip>
        </CircleMarker>
      );
    });
  }, [checkpoints, distances, route]);

  // Create highlighted section polyline and calculate elevation stats
  const highlightedSection = useMemo(() => {
    if (!selectedSection || !route.length) return null;
    
    const { startIndex, endIndex } = selectedSection;
    if (startIndex === null || endIndex === null) return null;
    
    const sectionRoute = route.slice(startIndex, endIndex + 1);
    return sectionRoute.length > 1 ? sectionRoute : null;
  }, [selectedSection, route]);

  // Calculate elevation stats for selected section
  const sectionStats = useMemo(() => {
    if (!selectedSection || !route.length) return null;
    
    const { startIndex, endIndex, distance } = selectedSection;
    if (startIndex === null || endIndex === null) return null;
    
    const sectionRoute = route.slice(startIndex, endIndex + 1);
    if (sectionRoute.length < 2) return null;
    
    let totalClimb = 0;
    let totalDescent = 0;
    
    for (let i = 1; i < sectionRoute.length; i++) {
      const elevationChange = sectionRoute[i].ele - sectionRoute[i - 1].ele;
      if (elevationChange > 0) {
        totalClimb += elevationChange;
      } else {
        totalDescent += Math.abs(elevationChange);
      }
    }
    
    return {
      distance: distance,
      climb: totalClimb,
      descent: totalDescent
    };
  }, [selectedSection, route]);

  // Handler for polyline click
  const handlePolylineClick = (e) => {
    if (!route.length) return;
    const { lat, lng } = e.latlng;
    let minDist = Infinity;
    let minIdx = 0;
    route.forEach((pt, idx) => {
      const d = Math.pow(pt.lat - lat, 2) + Math.pow(pt.lon - lng, 2);
      if (d < minDist) {
        minDist = d;
        minIdx = idx;
      }
    });
    setSelectedIdx(minIdx);
  };

  // Now check for early returns after all hooks
  const firstRunnerWithRoute = runners && Array.isArray(runners)
    ? runners.find(r => r.route && r.route.length > 0)
    : null;

  if (
    (!route || !Array.isArray(route) || route.length === 0) &&
    (!runners || !Array.isArray(runners) || runners.every(r => !r.route || r.route.length === 0))
  ) {
    return <div>No route loaded</div>;
  }

  const mapCenter = route.length > 0
    ? [route[0].lat, route[0].lon]
    : firstRunnerWithRoute
      ? [firstRunnerWithRoute.route[0].lat, firstRunnerWithRoute.route[0].lon]
      : [51.505, -0.09];

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
        />
        {route.length > 0 && (
          <>
            <Polyline
              positions={displayRoute.map(pt => [pt.lat, pt.lon])}
              color="blue"
              weight={6}
              eventHandlers={{
                click: handlePolylineClick,
              }}
            />
            
            {/* Highlighted section */}
            {highlightedSection && (
              <Polyline
                positions={highlightedSection.map(pt => [pt.lat, pt.lon])}
                color="red"
                weight={8}
                opacity={0.8}
              />
            )}
            
            {/* Only show marker for selectedIdx */}
            {selectedIdx !== null && (
              <CircleMarker
                center={[route[selectedIdx].lat, route[selectedIdx].lon]}
                radius={8}
                pathOptions={{
                  color: 'red',
                  fillColor: 'red',
                  fillOpacity: 1,
                  opacity: 1,
                }}
              >
                <Popup
                  position={[route[selectedIdx].lat, route[selectedIdx].lon]}
                  onClose={() => setSelectedIdx(null)}
                  closeButton={false}
                  autoPan={false}
                >
                  <div>
                    <strong>Distance:</strong> {distances[selectedIdx] ? distances[selectedIdx].toFixed(2) : '0.00'} km
                    <br />
                    {(() => {
                      const currPt = route[selectedIdx];
                      const firstPt = route[0];
                      const currTime = currPt && currPt.time ? new Date(currPt.time) : null;
                      const firstTime = firstPt && firstPt.time ? new Date(firstPt.time) : null;
                      let elapsed = '';
                      if (
                        currTime instanceof Date && !isNaN(currTime) &&
                        firstTime instanceof Date && !isNaN(firstTime)
                      ) {
                        const seconds = (currTime - firstTime) / 1000;
                        if (!isNaN(seconds) && seconds >= 0 && seconds < 60 * 60 * 24 * 7) {
                          elapsed = formatTime(seconds);
                        }
                      }
                      return elapsed
                        ? (<><strong>Elapsed:</strong> {elapsed}<br /></>)
                        : null;
                    })()}
                    <button
                      onClick={() => {
                        const { lat, lon } = route[selectedIdx];
                        const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
                        window.open(url, '_blank');
                      }}
                      style={{
                        marginTop: 8,
                        padding: '6px 12px',
                        borderRadius: 4,
                        border: '1px solid #34a853',
                        background: '#34a853',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Street View
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            )}
            {/* Checkpoint markers */}
            {checkpointMarkers}
          </>
        )}
        {flagIndices.map(idx => (
          <Marker
            key={`flag-${idx}`}
            position={[route[idx].lat, route[idx].lon]}
            icon={L.divIcon({
              className: '',
              html: '🏁',
              iconSize: [24, 24],
              iconAnchor: [12, 24],
            })}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
              {`${distances[idx].toFixed(1)} km`}
            </Tooltip>
          </Marker>
        ))}
        {runners && runners.map((runner, idx) => {
            const { route, color, showPolyline } = runner;
            if (!route || route.length < 2) return null;
            return showPolyline ? (
              <Polyline
                key={`polyline-${idx}`}
                positions={route.map(pt => [pt.lat, pt.lon])}
                color={color || 'blue'}
                weight={5}
                opacity={0.7}
              />
            ) : null;
          })}
        {/* Runners' positions */}
        {runners && runners.map((runner, idx) => {
          const { route, posIdx, runnerName, distance, elapsed, color } = runner;
          if (!route || route.length < 2) return null;
          const pt = route[posIdx];
          if (!pt) return null;
          return (
            <CircleMarker
              key={idx}
              center={[pt.lat, pt.lon]}
              radius={8}
              pathOptions={{
                color: color || 'red',
                fillColor: color || 'red',
                fillOpacity: 1,
                opacity: 1,
              }}
            >
              {showTooltips && (
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                  <div>
                    <strong>{runnerName}</strong>
                    <br />
                    {distance} km
                    <br />
                    {elapsed}
                  </div>
                </Tooltip>
              )}
            </CircleMarker>
          );
        })}
        <ZoomTracker setZoom={setZoom} />
        <PanToStart route={route} />
      </MapContainer>
      
      {/* Section stats tooltip */}
      {sectionStats && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          minWidth: '180px'
        }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>Distance:</strong> {sectionStats.distance.toFixed(2)} km
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Climb:</strong> {Math.round(sectionStats.climb)} m
          </div>
          <div>
            <strong>Descent:</strong> {Math.round(sectionStats.descent)} m
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds) {
  if (seconds == null) return '';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function findNearestRouteIdxForKm(distances, km) {
  if (!distances.length) return -1;
  let minDiff = Infinity;
  let minIdx = -1;
  distances.forEach((d, idx) => {
    const diff = Math.abs(d - km);
    if (diff < minDiff) {
      minDiff = diff;
      minIdx = idx;
    }
  });
  return minIdx;
}

function PanToStart({ route }) {
  const map = useMap();
  const hasZoomedRef = useRef(false);

  useEffect(() => {
    if (route.length > 0 && !hasZoomedRef.current) {
      map.setView([route[0].lat, route[0].lon], 15, { animate: true });
      hasZoomedRef.current = true;
    }
  }, [route, map]);

  const routeStartLat = route && route[0] && route[0].lat;
  const routeStartLon = route && route[0] && route[0].lon;

  useEffect(() => {
    hasZoomedRef.current = false;
  }, [routeStartLat, routeStartLon]);

  return null;
}

function ZoomTracker({ setZoom }) {
  useMap().on('zoomend', (e) => setZoom(e.target.getZoom()));
  return null;
}

export default MapView;
