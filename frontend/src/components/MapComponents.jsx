// /frontend/src/components/MapComponent.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import droneIcon from '../assets/drone-icon.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom drone icon
const DroneIcon = L.icon({
  iconUrl: droneIcon,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapComponent = ({ 
  pickupCoords, 
  deliveryCoords, 
  currentPosition, 
  simulationStatus, 
  batteryLevel, 
  simulationProgress, 
  receivedData 
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [route, setRoute] = useState([]);
  const [bounds, setBounds] = useState(null);
  const [droneRotation, setDroneRotation] = useState(0);
  const previousPosition = useRef(null);

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (window.L && mapRef.current) {
        try {
          const map = window.L.map(mapRef.current).setView([40.7128, -74.0060], 12);
          
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);
          
          setMap(map);
          console.log('Leaflet map initialized');
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    };

    // Load Leaflet if not already loaded
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      link.onload = () => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        script.onload = initMap;
        script.onerror = () => console.error('Failed to load Leaflet script');
        document.head.appendChild(script);
      };
      link.onerror = () => console.error('Failed to load Leaflet CSS');
      document.head.appendChild(link);
    } else {
      initMap();
    }

    return () => {
      if (map) {
        try {
          map.remove();
          setMap(null);
        } catch (error) {
          console.error('Error removing map:', error);
        }
      }
    };
  }, []);

  // Calculate route and bounds when coordinates change
  useEffect(() => {
    if (pickupCoords && deliveryCoords) {
      const newRoute = [
        [pickupCoords.latitude, pickupCoords.longitude],
        [deliveryCoords.latitude, deliveryCoords.longitude]
      ];
      setRoute(newRoute);
      
      // Set map bounds to show both points with some padding
      const newBounds = L.latLngBounds([
        [pickupCoords.latitude, pickupCoords.longitude],
        [deliveryCoords.latitude, deliveryCoords.longitude]
      ]);
      setBounds(newBounds);
      
      // Calculate initial rotation
      if (currentPosition) {
        const angle = calculateRotationAngle(
          previousPosition.current || currentPosition,
          currentPosition
        );
        setDroneRotation(angle);
        previousPosition.current = { ...currentPosition };
      }
    }
  }, [currentPosition, simulationStatus, batteryLevel, simulationProgress, receivedData]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Real-time Flight Path</h2>
      
      <div className="relative">
        <div 
          ref={mapRef}
          className="w-full h-96 rounded-lg border-2 border-gray-200 relative"
          style={{ minHeight: '400px' }}
        >
          {/* Loading indicator */}
          {!receivedData && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-bounce" />
                <p className="text-gray-500">Interactive map will load when order data is received</p>
                <div className="mt-2">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Map controls overlay */}
        {receivedData && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 z-20">
            <div className="flex flex-col space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Pickup</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Delivery</span>
              </div>
              {simulationStatus !== 'stopped' && (
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    batteryLevel < 20 ? 'bg-red-500' : 
                    batteryLevel < 50 ? 'bg-orange-500' : 'bg-yellow-500'
                  }`}></div>
                  <span>Drone</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Location details */}
      {receivedData && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-600">🔵 Pickup:</span>
              <p className="text-gray-700 mt-1">{receivedData.order.pickupAddress}</p>
              {pickupCoords && (
                <p className="text-xs text-gray-500 mt-1">
                  {pickupCoords.latitude.toFixed(4)}, {pickupCoords.longitude.toFixed(4)}
                </p>
              )}
            </div>
            <div>
              <span className="font-medium text-red-600">🔴 Delivery:</span>
              <p className="text-gray-700 mt-1">{receivedData.order.deliveryAddress}</p>
              {deliveryCoords && (
                <p className="text-xs text-gray-500 mt-1">
                  {deliveryCoords.latitude.toFixed(4)}, {deliveryCoords.longitude.toFixed(4)}
                </p>
              )}
            </div>
            <div>
              <span className="font-medium text-yellow-600">🟡 Drone:</span>
              <p className="text-gray-700 mt-1">
                {simulationStatus === 'stopped' ? 'Not active' : `In flight (${simulationStatus})`}
              </p>
              {currentPosition && currentPosition.latitude !== 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {currentPosition.latitude.toFixed(4)}, {currentPosition.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
          
          {/* Flight statistics */}
          {pickupCoords && deliveryCoords && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Distance: ~{calculateDistance(pickupCoords, deliveryCoords).toFixed(2)} km</span>
                <span>Est. Time: ~{calculateFlightTime(pickupCoords, deliveryCoords)} min</span>
                <span>Battery: {batteryLevel.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to calculate distance between coordinates
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRadians = (degrees) => degrees * (Math.PI/180);

const calculateFlightTime = (coord1, coord2, speedKmh = 30) => {
  const distance = calculateDistance(coord1, coord2);
  return Math.round((distance / speedKmh) * 60);
};

export default MapComponent;