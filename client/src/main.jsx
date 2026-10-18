import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Aplicar tamaño de fuente guardado
const savedFontSize = localStorage.getItem('fontSize');
if (savedFontSize) {
  const sizes = { normal: '16px', large: '18px', xlarge: '20px' };
  document.documentElement.style.fontSize = sizes[savedFontSize] || '16px';
}

// Registrar service worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
