// Enhanced formatPoly4 with scientific notation for very small numbers
function formatPoly4(coeffs, decimals = 10) {
  const [a, b, c, d, e] = coeffs;
  
  // Format each coefficient with appropriate precision
  const formatCoeff = (val, power) => {
    // Use scientific notation for very small values
    if (Math.abs(val) < 0.000001) {
      const scientificStr = val.toExponential(6);
      return `${scientificStr}x${power}`;
    }
    
    // For other values, use fixed decimal places
    const fixed = val.toFixed(decimals);
    // Remove trailing zeros
    const trimmed = fixed.replace(/\.?0+$/, '');
    return `${trimmed}x${power}`;
  };
  
  // Build polynomial string with appropriate signs
  let poly = "";
  
  // Add x⁴ term
  poly += formatCoeff(a, "⁴");
  
  // Add x³ term with sign
  poly += b >= 0 ? ` + ${formatCoeff(b, "³")}` : ` - ${formatCoeff(Math.abs(b), "³")}`;
  
  // Add x² term with sign
  poly += c >= 0 ? ` + ${formatCoeff(c, "²")}` : ` - ${formatCoeff(Math.abs(c), "²")}`;
  
  // Add x term with sign
  poly += d >= 0 ? ` + ${formatCoeff(d, "")}` : ` - ${formatCoeff(Math.abs(d), "")}`;
  
  // Add constant term with sign
  poly += e >= 0 ? ` + ${e.toFixed(decimals)}` : ` - ${Math.abs(e).toFixed(decimals)}`;
  
  return poly;
}