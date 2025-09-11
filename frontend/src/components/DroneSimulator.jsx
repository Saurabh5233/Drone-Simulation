// /frontend/src/components/DroneSimulator.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapComponent from './MapComponent';
import ControlPanel from './ControlPanel';
import StatusPanel from './StatusPanel';
import { simulationAPI, droneAPI, healthAPI, handleAPIError } from '../services/api';
import { getCoordinatesFromAddress } from '../utils/coordinates';
import webSocketService from '../services/websocket';

const DroneSimulator = () => {
  // State variables
  const [receivedData, setReceivedData] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('stopped');
  const [currentPosition, setCurrentPosition] = useState({ latitude: 0, longitude: 0 });
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastDataReceived, setLastDataReceived] = useState(null);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [error, setError] = useState(null);

  // Refs
  const simulationIntervalRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);

  // Initialize component
  useEffect(() => {
    initializeApp();
    setupWebSocketHandlers();
    return () => {
      cleanup();
    };
  }, []);

  // Initialize the application
  const initializeApp = async () => {
    try {
      // Check backend health
      await checkBackendHealth();

      // Initialize WebSocket connection
      await initializeWebSocket();

      // Load initial data
      await loadInitialData();

      // Start periodic health checks
      startHealthChecks();

    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError(handleAPIError(error));
    }
  };

  // Initialize WebSocket connection and handlers
  const setupWebSocketHandlers = useCallback(() => {
    // Handle simulation data
    webSocketService.onSimulationData((data) => {
      console.log('📡 Received simulation data:', data);
      setReceivedData(data);

      // Extract and set pickup and delivery coordinates
      if (data.order) {
        const { pickupAddress, deliveryAddress } = data.order;

        // Convert addresses to coordinates
        const fetchCoordinates = async () => {
          try {
            const [pickup, delivery] = await Promise.all([
              getCoordinatesFromAddress(pickupAddress),
              getCoordinatesFromAddress(deliveryAddress)
            ]);

            setPickupCoords(pickup);
            setDeliveryCoords(delivery);

            // Set initial drone position to pickup location
            setCurrentPosition({
              latitude: pickup.latitude,
              longitude: pickup.longitude
            });

            console.log('📍 Set pickup and delivery coordinates');
          } catch (error) {
            console.error('Error getting coordinates:', error);
            setError('Failed to get coordinates for addresses');
          }
        };

        fetchCoordinates();
      }
    });

    // Handle location updates
    webSocketService.onLocationUpdate((location) => {
      setCurrentPosition({
        latitude: location.latitude,
        longitude: location.longitude
      });
      setBatteryLevel(location.batteryCapacity);
    });

    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        await webSocketService.connect();
        setConnectionStatus('connected');
        console.log('✅ WebSocket connected');
      } catch (error) {
        console.error('❌ WebSocket connection error:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectWebSocket();

    return () => {
      webSocketService.disconnect();
    };
  }, []);

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      const [dataProviderHealth, locationReceiverHealth] = await Promise.allSettled([
        healthAPI.checkDataProvider(),
        healthAPI.checkLocationReceiver()
      ]);

      const isDataProviderHealthy = dataProviderHealth.status === 'fulfilled' &&
        dataProviderHealth.value.status === 'OK';
      const isLocationReceiverHealthy = locationReceiverHealth.status === 'fulfilled' &&
        locationReceiverHealth.value.status === 'OK';

      if (isDataProviderHealthy && isLocationReceiverHealthy) {
        setConnectionStatus('connected');
        setError(null);
      } else {
        setConnectionStatus('disconnected');
        const errors = [];
        if (!isDataProviderHealthy) errors.push('Data Provider (Port 3003)');
        if (!isLocationReceiverHealthy) errors.push('Location Receiver (Port 3001)');
        setError(`Backend services unavailable: ${errors.join(', ')}`);
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      setError('Cannot connect to backend services');
    }
  };

  // Initialize WebSocket connection
  const initializeWebSocket = async () => {
    try {
      await webSocketService.connect();

      // Set up WebSocket event listeners
      webSocketService.on('drone_location_update', (data) => {
        console.log('📍 Received WebSocket location update:', data);
        showNotification(`Location update for drone ${data.serialNumber}`);
      });

      webSocketService.on('websocket_connected', () => {
        console.log('✅ WebSocket connected successfully');
      });

      webSocketService.on('websocket_disconnected', () => {
        console.log('❌ WebSocket disconnected');
      });

    } catch (error) {
      console.warn('WebSocket connection failed, continuing without real-time updates:', error);
    }
  };

  // Load initial simulation data
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const data = await simulationAPI.getSimulation();
      if (data) {
        handleNewSimulationData(data);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // Try to generate new simulation data
      try {
        const newData = await simulationAPI.startSimulation({});
        if (newData) {
          handleNewSimulationData(newData);
        }
      } catch (fallbackError) {
        console.error('Failed to generate simulation data:', fallbackError);
        setError('Unable to load or generate simulation data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new simulation data
  const handleNewSimulationData = (data) => {
    setReceivedData(data);
    setLastDataReceived(new Date());

    // Calculate coordinates
    const pickup = getCoordinatesFromAddress(data.order.pickupAddress);
    const delivery = getCoordinatesFromAddress(data.order.deliveryAddress);

    setPickupCoords(pickup);
    setDeliveryCoords(delivery);

    // Reset simulation state
    if (simulationStatus === 'stopped') {
      setCurrentPosition(pickup);
      setBatteryLevel(data.drone.batteryCapacity);
      setSimulationProgress(0);
    }

    // Subscribe to drone updates via WebSocket
    if (webSocketService.getConnectionStatus().isConnected) {
      webSocketService.subscribeToDrone(data.drone.serialNumber);
    }

    showNotification('New order data received!');
    setError(null);
  };

  // Start health checks
  const startHealthChecks = () => {
    healthCheckIntervalRef.current = setInterval(() => {
      checkBackendHealth();
    }, 30000); // Check every 30 seconds
  };

  // Show notification
  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 4000);
  };

  // Start simulation
  const startSimulation = async () => {
    if (!receivedData?.order?._id) {
      setError('No simulation data available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Start the simulation on the server
      console.log('🚀 Starting simulation for order:', receivedData.order._id);

      const response = await fetch(`http://localhost:3003/api/simulation/${receivedData.order._id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Simulation started:', result);

      setSimulationStatus('running');

      // Start simulating drone movement
      simulateDroneMovement();

    } catch (error) {
      console.error('Error starting simulation:', error);
      setError(`Failed to start simulation: ${error.message}`);
      setSimulationStatus('stopped');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate drone movement (this is a fallback, real updates come from WebSocket)
  const simulateDroneMovement = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    let progress = 0;

    simulationIntervalRef.current = setInterval(() => {
      progress += 1;

      if (progress >= 100) {
        progress = 100;
        setEstimatedTimeRemaining(0);
        clearInterval(simulationIntervalRef.current);
        showNotification('🎉 Delivery completed successfully!', 'success');
        
        // Update order status (in real app, this would be sent to backend)
        console.log('✅ Order completed:', receivedData.order._id);
      }
    }, 100); // Update every 100ms
    
    showNotification('🚁 Drone simulation started!', 'success');
  };

  // Pause simulation
  const pauseSimulation = () => {
    setSimulationStatus('paused');
    clearInterval(simulationIntervalRef.current);
    showNotification('⏸️ Simulation paused', 'warning');
  };

  // Stop simulation
  const stopSimulation = () => {
    setSimulationStatus('stopped');
    setSimulationProgress(0);
    setEstimatedTimeRemaining(0);
    clearInterval(simulationIntervalRef.current);
    
    if (pickupCoords) {
      setCurrentPosition(pickupCoords);
    }
    if (receivedData) {
      setBatteryLevel(receivedData.drone.batteryCapacity);
    }
    
    showNotification('🛑 Simulation stopped', 'warning');
  };

  // Refresh data
  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Try to get new simulation data
      const data = await simulationAPI.getSimulation();
      if (data) {
        handleNewSimulationData(data);
      }
      
      // Check backend health
      await checkBackendHealth();
      
      showNotification('📡 Data refreshed successfully!', 'success');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError(handleAPIError(error));
      showNotification('❌ Failed to refresh data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }
    webSocketService.disconnect();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Drone Simulator</h1>
              <p className="text-gray-600 mt-1">Real-time drone delivery simulation platform</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                } ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`}></div>
                <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
              </div>
              
              {/* WebSocket Status */}
              {webSocketService.getConnectionStatus().isConnected && (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                  <span>Live Updates</span>
                </div>
              )}
              
              {lastDataReceived && (
                <div className="text-xs text-gray-500">
                  Updated: {new Date(lastDataReceived).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map View - Takes 2/3 width on large screens */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
            <MapComponent 
              currentPosition={currentPosition} 
              pickupCoords={pickupCoords}
              deliveryCoords={deliveryCoords}
              simulationStatus={simulationStatus}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <ControlPanel 
              simulationStatus={simulationStatus}
              onStartSimulation={startSimulation}
              onPauseSimulation={pauseSimulation}
              onStopSimulation={stopSimulation}
              onRefreshData={refreshData}
              connectionStatus={connectionStatus}
              lastDataReceived={lastDataReceived}
              isLoading={isLoading}
            />
            
            <StatusPanel 
              receivedData={receivedData}
              batteryLevel={batteryLevel}
              simulationProgress={simulationProgress}
              currentPosition={currentPosition}
              simulationStatus={simulationStatus}
              estimatedTimeRemaining={estimatedTimeRemaining}
              connectionStatus={connectionStatus}
              lastDataReceived={lastDataReceived}
            />
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
          <span className="mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </span>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-4 text-white hover:text-gray-200"
            aria-label="Close error message"
          >
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default DroneSimulator;