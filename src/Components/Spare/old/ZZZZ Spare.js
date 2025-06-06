import { useMapEvents } from 'react-leaflet';

function AutoSelectClosestPoint({ route, setSelectedIdx }) {
  useMapEvents({
    click(e) {
      if (!route || route.length === 0) return;
      // Find closest point to click location
      let minDist = Infinity;
      let minIdx = null;
      route.forEach((pt, idx) => {
        const d = Math.sqrt(
          Math.pow(pt[0] - e.latlng.lat, 2) +
          Math.pow(pt[1] - e.latlng.lng, 2)
        );
        if (d < minDist) {
          minDist = d;
          minIdx = idx;
        }
      });
      setSelectedIdx(minIdx);
    },
    mouseout() {
      setSelectedIdx(null);
    }
  });

  return null;
}

export default AutoSelectClosestPoint;