import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.simulationDataCallback = null;
    this.locationUpdateCallback = null;
  }

  // Connect to WebSocket server
  connect(url = 'http://localhost:3001') {
    try {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        maxHttpBufferSize: 1e8
      });

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Subscribe to necessary events
          this.socket.emit('subscribeToDrone', 'all');
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        // Handle simulation data
        this.socket.on('simulationData', (data) => {
          console.log('📡 Received simulation data:', data);
          if (this.simulationDataCallback && typeof this.simulationDataCallback === 'function') {
            this.simulationDataCallback(data);
          }
        });

        // Handle location updates
        this.socket.on('droneLocationUpdate', (data) => {
          console.log('📍 Drone location update:', data);
          if (this.locationUpdateCallback && typeof this.locationUpdateCallback === 'function') {
            this.locationUpdateCallback(data);
          }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      throw error;
    }
  }

  // Setup event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connected', (data) => {
      console.log('📡 WebSocket welcome message:', data);
      this.emit('websocket_connected', data);
    });

    this.socket.on('droneLocationUpdate', (data) => {
      console.log('📍 Received drone location update:', data);
      this.emit('drone_location_update', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('websocket_disconnected', { reason });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.emit('websocket_reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnection error:', error);
      this.reconnectAttempts++;
      this.emit('websocket_reconnect_error', { error, attempts: this.reconnectAttempts });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed');
      this.emit('websocket_reconnect_failed');
    });
  }

  // Subscribe to drone updates
  subscribeToDrone(serialNumber) {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, cannot subscribe to drone');
      return;
    }

    this.socket.emit('subscribeToDrone', serialNumber);
    console.log(`📡 Subscribed to drone: ${serialNumber}`);

    // Handle subscription confirmation
    this.socket.on('subscribed', (data) => {
      console.log('✅ Subscription confirmed:', data);
      this.emit('drone_subscribed', data);
    });
  }

  // Unsubscribe from drone updates
  unsubscribeFromDrone(serialNumber) {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, cannot unsubscribe from drone');
      return;
    }

    this.socket.emit('unsubscribeFromDrone', serialNumber);
    console.log(`📡 Unsubscribed from drone: ${serialNumber}`);
  }

  // Add event listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit event to listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Send custom message
  send(event, data) {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id || null
    };
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Reconnect WebSocket
  reconnect() {
    if (this.socket) {
      console.log('🔄 Attempting to reconnect WebSocket');
      this.socket.connect();
    }
  }

  // Set callback for simulation data
  onSimulationData(callback) {
    this.simulationDataCallback = callback;
  }

  // Set callback for location updates
  onLocationUpdate(callback) {
    this.locationUpdateCallback = callback;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
