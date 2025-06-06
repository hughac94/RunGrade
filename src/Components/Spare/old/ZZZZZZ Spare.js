export function getTotalTimeFromPoints(points) {
  // points: array of GPX points, each with a .time property (string or Date)
  const timePoints = points.filter(pt => pt.time);
  if (timePoints.length > 1) {
    const start = new Date(timePoints[0].time);
    const end = new Date(timePoints[timePoints.length - 1].time);
    return (end - start) / 1000; // seconds
  }
  return null;
}