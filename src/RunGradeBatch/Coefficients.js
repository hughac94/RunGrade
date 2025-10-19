/**
 * Grade Adjustment Polynomial Coefficients
 * Based on Strava's research: https://medium.com/strava-engineering/an-improved-gap-model-8b07ae8886c3
 */

/**
 * Calculate grade adjustment factor for a given gradient percentage
 * @param {number} gradient - Gradient percentage (-35 to 35)
 * @returns {number} - Adjustment factor (pace multiplier)
 */

export const GAP_COEFFICIENTS = {
  a: -5.294439830640173e-7,
  b: -0.000003989571857841264,
  c: 0.0020535661142752205,
  d: 0.03265674125152065,
  e: 1
};

export function calculateGradeAdjustment(gradient) {
  return GAP_COEFFICIENTS.a * Math.pow(gradient, 4) +
         GAP_COEFFICIENTS.b * Math.pow(gradient, 3) +
         GAP_COEFFICIENTS.c * Math.pow(gradient, 2) +
         GAP_COEFFICIENTS.d * gradient +
         GAP_COEFFICIENTS.e;
}



