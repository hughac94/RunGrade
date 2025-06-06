import { useRef, useState, useEffect } from 'react';

export function useCesiumIframe({ show3D, runners, sliderValue }) {
  const iframeRef = useRef();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const prevShow3D = useRef(false);

  // Send data to Cesium iframe when ready
  useEffect(() => {
    if (
      show3D &&
      iframeLoaded &&
      iframeRef.current &&
      iframeRef.current.contentWindow
    ) {
      iframeRef.current.contentWindow.postMessage({
        type: 'multi-gpx',
        runners,
        slider: sliderValue,
        flyTo: !prevShow3D.current && show3D,
      }, '*');
    }
    prevShow3D.current = show3D;
  }, [show3D, iframeLoaded, runners, sliderValue]);

  // Reset iframeLoaded when toggling 3D off
  useEffect(() => {
    if (!show3D) setIframeLoaded(false);
  }, [show3D]);

  return { iframeRef, iframeLoaded, setIframeLoaded };
}