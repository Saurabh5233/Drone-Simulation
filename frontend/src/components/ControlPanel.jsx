// /frontend/src/components/ControlPanel.js
import React, { useEffect, useState } from 'react';
import { Play, Pause, Square, RefreshCw, AlertTriangle, MapPin, Clock, Battery, Zap, Package } from 'lucide-react';

const ControlPanel = ({
  receivedData,
  simulationStatus,
  connectionStatus,
  lastDataReceived,
  onStartSimulation,
  onPauseSimulation,
  onStopSimulation,
  onRefreshData,
  isLoading
}) => {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState('');

  // Update time since last update
  useEffect(() => {
    const updateTime = () => {
      if (!lastDataReceived) {
        setTimeSinceUpdate('Never');
        return;
      }
      
      const seconds = Math.floor((new Date() - new Date(lastDataReceived)) / 1000);
      
      if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s ago`);
      } else if (seconds < 3600) {
        setTimeSinceUpdate(`${Math.floor(seconds / 60)}m ago`);
      } else {
        setTimeSinceUpdate(`${Math.floor(seconds / 3600)}h ago`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastDataReceived]);

  const handleStart = () => {
    if (simulationStatus === 'running' || !receivedData) return;
    onStartSimulation();
  };

  const handlePause = () => {
    if (simulationStatus !== 'running') return;
    onPauseSimulation();
  };

  const handleStop = () => {
    if (simulationStatus === 'stopped') return;
    onStopSimulation();
  };

  const handleRefresh = () => {
    onRefreshData();
  };

  const getStatusColor = () => {
    switch(simulationStatus) {
      case 'running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-full flex flex-col transition-colors duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Control Panel</h2>
        <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor()}`}>
          {simulationStatus || 'idle'}
        </div>
      </div>
      <div className="space-y-4 flex-grow">
        {/* Connection Status */}
        <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 transition-colors duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {connectionStatus === 'connected' ? 'Connected to Server' : 'Disconnected'}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{timeSinceUpdate}</span>
          </div>
        </div>

        {receivedData ? (
          <>
            {/* Drone Information */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-300">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Assigned Drone</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="text-gray-800 dark:text-gray-200">{receivedData.drone.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Model:</span>
                  <span className="text-gray-800 dark:text-gray-200">{receivedData.drone.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Serial:</span>
                  <span className="text-gray-800 dark:text-gray-200 font-mono text-xs">{receivedData.drone.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                  <span className="text-gray-800 dark:text-gray-200">{receivedData.drone.weightLimit} kg</span>
                </div>
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={onStartSimulation}
                disabled={simulationStatus === 'running' || isLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors font-medium"
                title={simulationStatus === 'running' ? 'Simulation already running' : 'Start drone simulation'}
              >
                <Play className="w-4 h-4" />
                <span>Start</span>
              </button>
              
              <button
                onClick={onPauseSimulation}
                disabled={simulationStatus !== 'running'}
                className="flex-1 flex items-center justify-center space-x-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors font-medium"
                title={simulationStatus !== 'running' ? 'No active simulation to pause' : 'Pause simulation'}
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
              
              <button
                onClick={onStopSimulation}
                disabled={simulationStatus === 'stopped'}
                className="flex-1 flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors font-medium"
                title={simulationStatus === 'stopped' ? 'Simulation already stopped' : 'Stop simulation'}
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={onRefreshData}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Loading...' : 'Refresh Data'}</span>
            </button>
          </>
        ) : (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Waiting for Order Data</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Listening for incoming simulation data...
            </p>
            
            {/* Loading indicator */}
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2 text-blue-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <button
                onClick={onRefreshData}
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
              >
                Try refreshing to get simulation data
              </button>
            )}
            
            {/* Connection troubleshooting */}
            {connectionStatus === 'disconnected' && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg transition-colors duration-300">
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <div className="font-medium mb-1">Connection Issues?</div>
                  <div className="text-xs">
                    • Check if backend servers are running<br/>
                    • Data Provider: http://localhost:3003<br/>
                    • Location Receiver: http://localhost:3001
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;