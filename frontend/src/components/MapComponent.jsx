import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Set default icon
if (typeof window !== 'undefined') {
  L.Marker.prototype.options.icon = DefaultIcon;
}

const MapComponent = ({ 
  currentPosition, 
  pickupCoords, 
  deliveryCoords,
  simulationStatus 
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({
    drone: null,
    pickup: null,
    delivery: null
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Create map instance if it doesn't exist
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [currentPosition.latitude || 51.505, currentPosition.longitude || -0.09],
        zoom: 13,
        zoomControl: false
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstance.current);

      // Add zoom control
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstance.current);
    }

    // Update drone position
    if (currentPosition.latitude && currentPosition.longitude) {
      const droneLatLng = [currentPosition.latitude, currentPosition.longitude];
      
      if (!markers.current.drone) {
        // Create drone marker if it doesn't exist
        markers.current.drone = L.marker(droneLatLng, {
          icon: L.divIcon({
            html: '✈️',
            className: 'drone-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          }),
          zIndexOffset: 1000
        }).addTo(mapInstance.current);
      } else {
        // Update existing drone marker position with smooth animation
        markers.current.drone.setLatLng(droneLatLng);
      }

      // Center map on drone if simulation is running
      if (simulationStatus === 'running') {
        mapInstance.current.panTo(droneLatLng);
      }
    }

    // Update pickup marker
    if (pickupCoords) {
      const pickupLatLng = [pickupCoords.latitude, pickupCoords.longitude];
      if (!markers.current.pickup) {
        markers.current.pickup = L.marker(pickupLatLng, {
          icon: L.divIcon({
            html: '📦',
            className: 'pickup-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 28]
          })
        }).addTo(mapInstance.current);
      } else {
        markers.current.pickup.setLatLng(pickupLatLng);
      }
    }

    // Update delivery marker
    if (deliveryCoords) {
      const deliveryLatLng = [deliveryCoords.latitude, deliveryCoords.longitude];
      if (!markers.current.delivery) {
        markers.current.delivery = L.marker(deliveryLatLng, {
          icon: L.divIcon({
            html: '🏠',
            className: 'delivery-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 28]
          })
        }).addTo(mapInstance.current);
      } else {
        markers.current.delivery.setLatLng(deliveryLatLng);
      }
    }

    // Fit bounds to show all markers when they're available
    if (markers.current.pickup && markers.current.delivery) {
      const group = new L.featureGroup([
        markers.current.pickup,
        markers.current.delivery,
        ...(markers.current.drone ? [markers.current.drone] : [])
      ]);
      mapInstance.current.fitBounds(group.getBounds().pad(0.2));
    }

    // Cleanup function
    return () => {
      if (mapInstance.current) {
        mapInstance.current.off();
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [currentPosition, pickupCoords, deliveryCoords, simulationStatus]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
      style={{ zIndex: 1 }}
    />
  );
};

export default MapComponent;
