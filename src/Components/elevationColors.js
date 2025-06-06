// Maps a gradient (%) to a color from dark blue (descents) to white (flat) to dark red (ascents)
export function gradientToColor(g) {
  // Clamp gradient between -20% and +20% for color scaling
  const minG = -20, maxG = 20;
  const norm = Math.max(0, Math.min(1, (g - minG) / (maxG - minG)));
  // Interpolate between blue (#002b80), white (#fff), and red (#b30000)
  if (norm < 0.5) {
    // Blue to white
    const t = norm * 2;
    return `rgb(${Math.round(0 + t * (255 - 0))},${Math.round(43 + t * (255 - 43))},${Math.round(128 + t * (255 - 128))})`;
  } else {
    // White to red
    const t = (norm - 0.5) * 2;
    return `rgb(${Math.round(255 + t * (179 - 255))},${Math.round(255 - t * 255)},${Math.round(255 - t * 0)})`;
  }
}