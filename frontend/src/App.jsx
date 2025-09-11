// /frontend/src/App.js
import React, { useEffect } from 'react';
import DroneSimulator from './components/DroneSimulator';
import 'leaflet/dist/leaflet.css';
import './styles/map-styles.css';
import './App.css';

// Fix for default marker icons in webpack
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  useEffect(() => {
    // Delete L.Icon.Default.prototype._getIconUrl
    delete L.Icon.Default.prototype._getIconUrl;
    
    // Set default icon paths
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: icon,
      iconUrl: icon,
      shadowUrl: iconShadow,
    });
  }, []);

  return (
    <div className="App">
      <DroneSimulator />
    </div>
  );
}

export default App;