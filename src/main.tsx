import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './slides.css';
import App from './App';
import Presenter from './components/Presenter';

// ?presenter → the presenter window (opened with P); otherwise the app
const presenter = new URLSearchParams(location.search).has('presenter');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{presenter ? <Presenter /> : <App />}</React.StrictMode>,
);

// PWA: the service worker is emitted by swPlugin() at build time (vite.config.ts), so production only
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* offline support is optional */ }); });
}
