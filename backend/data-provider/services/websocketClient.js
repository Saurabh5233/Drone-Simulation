const axios = require('axios');
const { io } = require('socket.io-client');

class WebSocketBroadcastService {
  constructor() {
    this.locationReceiverUrl = 'http://localhost:3001';
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Connect to location-receiver's WebSocket as a client
  async connect() {
    try {
      if (this.socket && this.isConnected) {
        return true;
      }

      console.log('🔗 Connecting to location-receiver WebSocket...');
      
      this.socket = io(this.locationReceiverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('✅ Connected to location-receiver WebSocket');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Subscribe to necessary channels
          this.socket.emit('subscribeToSimulations');
          this.socket.emit('subscribeToOrders');
          
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Failed to connect to location-receiver WebSocket:', error.message);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`🔌 Disconnected from location-receiver WebSocket: ${reason}`);
          this.isConnected = false;
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`🔄 Reconnected to location-receiver WebSocket after ${attemptNumber} attempts`);
          this.isConnected = true;
        });

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return false;
    }
  }

  // Broadcast simulation data via HTTP API to location-receiver
  async broadcastSimulationData(simulationData) {
    try {
      // Method 1: Try WebSocket first
      if (this.socket && this.isConnected) {
        console.log('📊 Broadcasting simulation data via WebSocket');
        this.socket.emit('simulationDataBroadcast', simulationData);
        return true;
      }
      
      // Method 2: Fallback to HTTP API call to location-receiver
      console.log('📊 Broadcasting simulation data via HTTP API');
      await axios.post(`${this.locationReceiverUrl}/api/broadcast/simulation`, {
        type: 'simulationData',
        data: simulationData,
        timestamp: new Date().toISOString()
      }, {
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'data-provider'
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to broadcast simulation data:', error.message);
      return false;
    }
  }

  // Broadcast order notification
  async broadcastOrderNotification(orderData) {
    try {
      // Method 1: Try WebSocket first
      if (this.socket && this.isConnected) {
        console.log('📦 Broadcasting order notification via WebSocket');
        this.socket.emit('orderNotificationBroadcast', orderData);
        return true;
      }
      
      // Method 2: Fallback to HTTP API call
      console.log('📦 Broadcasting order notification via HTTP API');
      await axios.post(`${this.locationReceiverUrl}/api/broadcast/order`, {
        type: 'newOrder',
        data: orderData,
        timestamp: new Date().toISOString()
      }, {
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'data-provider'
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to broadcast order notification:', error.message);
      return false;
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id || null
    };
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from location-receiver WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Create singleton instance
const webSocketBroadcastService = new WebSocketBroadcastService();

// Auto-connect when module loads
setTimeout(() => {
  webSocketBroadcastService.connect().catch(error => {
    console.warn('⚠️ Failed to auto-connect to WebSocket, will try on demand');
  });
}, 2000);

module.exports = webSocketBroadcastService;
