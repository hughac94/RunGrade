export function calculateMovingTime(points, pauseThresholdSeconds = 10) {
  let movingTime = 0;
  let pausedTime = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev.time || !curr.time) continue;
    const prevTime = new Date(prev.time).getTime() / 1000;
    const currTime = new Date(curr.time).getTime() / 1000;
    const delta = currTime - prevTime;
    if (delta > 0 && delta < pauseThresholdSeconds) {
      movingTime += delta;
    } else if (delta > pauseThresholdSeconds) {
      movingTime += pauseThresholdSeconds; // Only count up to threshold as moving
      pausedTime += (delta - pauseThresholdSeconds);
    }
  }
  return { movingTime, pausedTime };
}