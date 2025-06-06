// netstat -ano | findstr :3000
// taskkill /PID XXX /F

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom'; // <-- Add this import
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';

const theme = createTheme();

window.CESIUM_BASE_URL = "/cesium";

 const root = ReactDOM.createRoot(document.getElementById('root'));
 root.render(
  <React.StrictMode>
    <BrowserRouter> {/* <-- Wrap App in BrowserRouter */}
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
     </BrowserRouter>
  </React.StrictMode>
 );

