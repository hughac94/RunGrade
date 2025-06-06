import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

function FitBounds({ bounds }) {
  const map = useMap();
  const prevBoundsStr = useRef('');

  useEffect(() => {
    if (bounds && bounds.length > 1) {
      const boundsStr = JSON.stringify(bounds);
      if (boundsStr !== prevBoundsStr.current) {
        map.fitBounds(bounds);
        prevBoundsStr.current = boundsStr;
      }
    }
  }, [bounds, map]);

  return null;
}

export default FitBounds;