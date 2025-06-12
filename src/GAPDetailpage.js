import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Plot from 'react-plotly.js';
import PageContainer from './Components/Styles';

export default function GAPDetailpage({ polyCoeffs, formatPoly4 }) {
  console.log("Polynomial coefficients:", polyCoeffs);

  const x = -35;
  const [a, b, c, d, e] = polyCoeffs;
  const result = a * Math.pow(x, 4) + b * Math.pow(x, 3) + c * Math.pow(x, 2) + d * x + e;
  console.log(`At x = ${x}, polynomial = ${result}`);

  return (
    <PageContainer>
      
        <Typography
          variant="h2"
          sx={{
            fontWeight: 800,
            letterSpacing: 2,
            fontSize: { xs: 28, sm: 36, md: 44 },
            textAlign: 'center',
            userSelect: 'none',
            fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
            lineHeight: 1.1,
            mb: 3,
          }}
        >
          Grade Adjustment Approach
        </Typography>
        <Typography sx={{ mb: 3, fontWeight: 400, fontSize: 'inherit', textAlign: 'left' }}>
          This model calculates grade adjusted paces using a polynomial that is manually estimated to recreate the graph in&nbsp;
          <a href="https://medium.com/strava-engineering/an-improved-gap-model-8b07ae8886c3" target="_blank" rel="noopener noreferrer">
            this Strava Engineering article</a>. It allows up to -35% / +35% gradients, although the dataset/image referenced only goes to ±30%. The polynomial looks like this:
        
          <br />
        
        </Typography>
        {polyCoeffs && (
          <>
            <Typography sx={{ textAlign: 'center', mb: 2, fontFamily: 'monospace', fontSize: 18 }}>
              <strong>Polynomial:</strong> {formatPoly4(polyCoeffs, 6)}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Plot
                data={[
                  {
                    x: Array.from({ length: 201 }, (_, i) => -40 + (80 * i) / 200),
                    y: Array.from({ length: 201 }, (_, i) => {
                      const x = -40 + (80 * i) / 200;
                      const [a, b, c, d, e] = polyCoeffs;
                      return (
                        a * Math.pow(x, 4) +
                        b * Math.pow(x, 3) +
                        c * Math.pow(x, 2) +
                        d * x +
                        e
                      );
                    }),
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: 'blue' },
                    name: 'Polynomial Fit'
                  }
                ]}
                layout={{
                  width: 800,
                  height: 400,
                  xaxis: { title: 'Gradient (%)', range: [-35, 35] },
                  yaxis: { title: 'Pace Adjustment Factor', range: [0, 4] },
                  margin: { t: 40 }
                }}
              />
            </Box>
          </>
        )}
      
    </PageContainer>
  );
}
