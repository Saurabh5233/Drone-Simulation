import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/globals.scss';
import 'leaflet/dist/leaflet.css';
import App from './App';

// Create root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);