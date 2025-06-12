/**
 * Reads a CSV file and fits a 4th order polynomial to the data.
 * Assumes CSV has two columns: gradient (x) and pace adjustment factor (y).
 * Returns the polynomial coefficients [a, b, c, d, e] for ax^4 + bx^3 + cx^2 + dx + e.
 */

import Papa from 'papaparse';
import { useState, useEffect } from 'react';

/**
 * Fit a 4th order polynomial to (x, y) data using least squares.
 * Returns coefficients [a, b, c, d, e] for ax^4 + bx^3 + cx^2 + dx + e.
 */
function fitPoly4(x, y, math) {
  const n = x.length;
  const X = [];
  for (let i = 0; i < n; i++) {
    X.push([
      Math.pow(x[i], 4),
      Math.pow(x[i], 3),
      Math.pow(x[i], 2),
      x[i],
      1
    ]);
  }
  // X^T * X
  const XT = math.transpose(X);
  const XTX = math.multiply(XT, X);
  const XTy = math.multiply(XT, y);
  // Solve XTX * coeffs = XTy
  const coeffs = math.lusolve(XTX, XTy).map(arr => arr[0]);
  return coeffs;
}

/**
 * Reads a CSV file and fits a 4th order polynomial to the first two columns:
 * gradient (x) and pace adjustment factor (y).
 * @param {File} file - CSV file input (from file input element)
 * @returns {Promise<Array>} - Resolves to [a, b, c, d, e] coefficients
 */
export function fitStravaGradientPacePoly4(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        // Assume first row is header
        const data = results.data.slice(1).filter(row => row.length >= 2);
         // Use x (gradient) as-is, do NOT divide by 10
        const x = data.map(row => parseFloat(row[0])).filter(v => !isNaN(v));
        const y = data.map(row => parseFloat(row[1])).filter(v => !isNaN(v));
        if (x.length < 5 || y.length < 5 || x.length !== y.length) {
          reject(new Error('Not enough valid data for polynomial fit.'));
          return;
        }
        // Use math.js for matrix operations
        import('mathjs').then(math => {
          try {
            const coeffs = fitPoly4(x, y, math);
            const normalizedCoeffs = normalizePoly4(coeffs);

          
           

            resolve(normalizedCoeffs);
          } catch (err) {
            reject(err);
          }
        });
      },
      error: (err) => reject(err),
      skipEmptyLines: true,
    });
  });
}

/**
 * Formats polynomial coefficients [a, b, c, d, e] as a string: ax⁴ + bx³ + cx² + dx + e
 * @param {number[]} coeffs - Array of 5 coefficients
 * @param {number} [precision=4] - Number of decimal places
 * @returns {string}
 */
export function formatPoly4(coeffs, decimals = 10) {
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

function normalizePoly4(coeffs) {
  if (!Array.isArray(coeffs) || coeffs.length !== 5) return coeffs;
  const e = coeffs[4];
  if (e === 0) return coeffs;
  return coeffs.map(c => c / e);
}


export async function loadStravaCSV() {
  try {
    const response = await fetch(process.env.PUBLIC_URL
      ? process.env.PUBLIC_URL + '/Components/Strava data.csv'
      : './Components/Strava data.csv');
    if (!response.ok) throw new Error('Failed to fetch Strava data.csv');
    const csvText = await response.text();
    const csvFile = new File([csvText], "Strava data.csv", { type: "text/csv" });
    return await fitStravaGradientPacePoly4(csvFile);
  } catch (err) {
    throw err;
  }
}

export function useStravaPolyCoeffs() {
  const [polyCoeffs, setPolyCoeffs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStravaCSV()
      .then(setPolyCoeffs)
      .catch(err => {
        setPolyCoeffs(null);
        setError(err);
      });
  }, []);

  return [polyCoeffs, error];
}