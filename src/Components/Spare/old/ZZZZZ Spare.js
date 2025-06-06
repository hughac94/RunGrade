import { useState } from 'react';
import GPXParser from 'gpxparser';
import { getTotalTimeFromPoints } from './ZZZZZZ Spare';

export function useGpxFile() {
  const [file, setFile] = useState(null);
  const [fullRoute, setFullRoute] = useState([]);
  const [stats, setStats] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const text = event.target.result;
        const gpx = new GPXParser();
        gpx.parse(text);

        if (gpx.tracks.length === 0) {
          alert('No tracks found in this GPX file.');
          return;
        }

        let points = gpx.tracks[0].points.map(pt => [pt.lat, pt.lon, pt.ele, pt.time ? new Date(pt.time) : null]);
        setFullRoute(points);

        const track = gpx.tracks[0];
        const distance = track?.distance?.total
          ? (track.distance.total / 1000).toFixed(2)
          : 'N/A';
        const elevationFromFile = track?.elevation?.gain
          ? track.elevation.gain.toFixed(0)
          : null;
        let calculatedelevationGain = 0;
        const pointsWithEle = track.points.filter(p => typeof p.ele === 'number');
        for (let i = 1; i < pointsWithEle.length; i++) {
          const diff = pointsWithEle[i].ele - pointsWithEle[i - 1].ele;
          if (diff > 0) calculatedelevationGain += diff;
        }
        const totalTime = getTotalTimeFromPoints(gpx.tracks[0].points);

        setStats({
          distance,
          elevationGain: elevationFromFile || Math.round(calculatedelevationGain),
          totalTime,
        });
      };
      reader.readAsText(selectedFile);
    }
  };

  return { file, fullRoute, stats, handleFileChange };
}