// /frontend/src/components/StatusPanel.js
import React, { useState, useEffect } from 'react';
import { 
  Battery, 
  MapPin, 
  Clock, 
  Zap, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  XCircle,
  Gauge
} from 'lucide-react';

const StatusPanel = ({ 
  receivedData = {},
  batteryLevel = 100, 
  simulationProgress = 0, 
  currentPosition = {},
  simulationStatus = 'stopped',
  estimatedTimeRemaining = 0,
  connectionStatus = 'disconnected',
  lastDataReceived = null
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // Format coordinates for display
  const formatCoordinate = (coord) => {
    if (coord === undefined || coord === null) return '--.------';
    return parseFloat(coord).toFixed(6);
  };

  // Track simulation time
  useEffect(() => {
    let interval;
    
    if (simulationStatus === 'running') {
      setStartTime(prev => prev || new Date());
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else if (simulationStatus === 'stopped') {
      setTimeElapsed(0);
      setStartTime(null);
    }
    
    return () => clearInterval(interval);
  }, [simulationStatus]);

  // Format time in MM:SS
  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color based on simulation status
  const getStatusColor = () => {
    switch(simulationStatus) {
      case 'running':
        return 'text-green-500';
      case 'paused':
        return 'text-yellow-500';
      case 'completed':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Get status icon based on simulation status
  const getStatusIcon = () => {
    switch(simulationStatus) {
      case 'running':
        return <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse mr-2"></div>;
      case 'paused':
        return <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-2"></div>;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-blue-500 mr-2" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500 mr-2" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-gray-400 mr-2"></div>;
    }
  };

  // Get battery icon based on level
  const getBatteryIcon = (level) => {
    if (level < 20) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (level < 50) return <Zap className="w-4 h-4 text-yellow-500" />;
    return <Battery className="w-4 h-4 text-green-500" />;
  };

  // Format last updated time
  const formatLastUpdated = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Status Panel</h2>
        <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor()} border-opacity-50`}>
          {simulationStatus || 'idle'}
        </div>
      </div>
      
      <div className="space-y-4 flex-grow">
        {/* Connection Status */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500 mr-2" />
              )}
              <span className="font-medium">
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {lastDataReceived ? formatLastUpdated(lastDataReceived) : 'No data'}
            </span>
          </div>
          
          {receivedData?.drone && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-sm">
              <div className="flex items-center text-gray-600">
                <Gauge className="w-4 h-4 mr-2 text-blue-500" />
                <span>Weight Capacity: {receivedData.drone.weightLimit || 'N/A'} kg</span>
              </div>
            </div>
          )}
        </div>

        {/* Flight Status */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center mb-3">
            {getStatusIcon()}
            <h3 className="font-medium">Flight Status</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Battery</div>
              <div className="flex items-center">
                {getBatteryIcon(batteryLevel)}
                <div className="w-full bg-gray-200 rounded-full h-2 ml-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${batteryLevel}%`,
                      backgroundColor: 
                        batteryLevel > 50 ? '#10B981' :
                        batteryLevel > 20 ? '#F59E0B' : '#EF4444'
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-right mt-1">
                {batteryLevel.toFixed(0)}%
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 mb-1">Flight Time</div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-500" />
                <span className="font-mono">
                  {formatTime(timeElapsed)}
                </span>
              </div>
              {estimatedTimeRemaining > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  ~{Math.ceil(estimatedTimeRemaining)} min remaining
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Mission Progress</span>
              <span>{simulationProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${simulationProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Position Tracking */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center mb-3">
            <MapPin className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="font-medium">Position Tracking</h3>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Latitude</span>
              <span className="font-mono text-gray-800">
                {formatCoordinate(currentPosition.latitude)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Longitude</span>
              <span className="font-mono text-gray-800">
                {formatCoordinate(currentPosition.longitude)}
              </span>
            </div>
            
            {simulationStatus === 'running' && (
              <div className="text-xs text-gray-500 mt-2">
                Position updates every second during flight
              </div>
            )}
          </div>
        </div>

        {/* Emergency Actions */}
        {(batteryLevel < 20 || simulationStatus === 'running') && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">System Status</h3>
            <div className="space-y-2">
              {batteryLevel < 20 && simulationStatus === 'running' && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Low Battery Alert</span>
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    Consider returning to base or finding nearest landing zone
                  </div>
                </div>
              )}
              
              {simulationStatus === 'running' && (
                <div className="text-xs text-gray-500">
                  Emergency stop available in control panel
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPanel;