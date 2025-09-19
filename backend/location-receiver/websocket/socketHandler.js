function handleWebSocketConnections(io) {
  // Store connected clients count
  let connectedClients = 0;
  
  io.on('connection', (socket) => {
    connectedClients++;
    console.log(`🔌 Client connected: ${socket.id} (Total: ${connectedClients})`);
    
    // Send welcome message with more details
    socket.emit('connected', {
      message: 'Connected to Drone Location Service',
      socketId: socket.id,
      timestamp: new Date(),
      capabilities: [
        'droneLocationUpdates',
        'simulationData', 
        'orderNotifications',
        'systemStatus'
      ]
    });
    
    // Handle drone subscription
    socket.on('subscribeToDrone', (serialNumber) => {
      const room = serialNumber === 'all' ? 'all_drones' : `drone_${serialNumber}`;
      socket.join(room);
      console.log(`📡 Client ${socket.id} subscribed to ${serialNumber === 'all' ? 'all drones' : `drone ${serialNumber}`}`);
      
      socket.emit('subscribed', {
        message: `Subscribed to ${serialNumber === 'all' ? 'all drones' : `drone ${serialNumber}`}`,
        serialNumber,
        room
      });
    });
    
    // Handle simulation data subscription
    socket.on('subscribeToSimulations', () => {
      socket.join('simulation_updates');
      console.log(`📊 Client ${socket.id} subscribed to simulation updates`);
      
      socket.emit('subscribed', {
        message: 'Subscribed to simulation updates',
        type: 'simulation_updates'
      });
    });
    
    // Handle order notifications subscription
    socket.on('subscribeToOrders', () => {
      socket.join('order_notifications');
      console.log(`📦 Client ${socket.id} subscribed to order notifications`);
      
      socket.emit('subscribed', {
        message: 'Subscribed to order notifications',
        type: 'order_notifications'
      });
    });
    
    // Handle unsubscribe from drone
    socket.on('unsubscribeFromDrone', (serialNumber) => {
      const room = serialNumber === 'all' ? 'all_drones' : `drone_${serialNumber}`;
      socket.leave(room);
      console.log(`📡 Client ${socket.id} unsubscribed from ${serialNumber === 'all' ? 'all drones' : `drone ${serialNumber}`}`);
    });
    
    // Handle unsubscribe from simulations
    socket.on('unsubscribeFromSimulations', () => {
      socket.leave('simulation_updates');
      console.log(`📊 Client ${socket.id} unsubscribed from simulation updates`);
    });
    
    // Handle ping for connection testing
    socket.on('ping', (data) => {
      socket.emit('pong', {
        ...data,
        serverTime: new Date(),
        socketId: socket.id
      });
    });
    
    // Handle custom message broadcasting (for testing)
    socket.on('broadcastTest', (data) => {
      if (data.room) {
        socket.to(data.room).emit('testMessage', {
          ...data,
          from: socket.id,
          timestamp: new Date()
        });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      connectedClients--;
      console.log(`🔌 Client disconnected: ${socket.id} (Reason: ${reason}, Remaining: ${connectedClients})`);
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`❌ WebSocket error for client ${socket.id}:`, error);
    });
  });
  
  // Add helper methods to io instance
  io.emitSimulationData = (simulationData) => {
    console.log('📊 Broadcasting simulation data to all clients');
    io.emit('simulationData', simulationData);
  };
  
  io.emitOrderNotification = (orderData) => {
    console.log('📦 Broadcasting order notification to all clients');
    io.emit('order_notification', orderData);
  };
  
  io.emitDroneLocationUpdate = (locationData) => {
    console.log(`📍 Broadcasting location update for drone ${locationData.serialNumber}`);
    io.to('all_drones').emit('droneLocationUpdate', locationData);
    io.to(`drone_${locationData.serialNumber}`).emit('droneLocationUpdate', locationData);
  };
  
  io.emitSystemStatus = (statusData) => {
    console.log('🔧 Broadcasting system status update');
    io.emit('systemStatus', statusData);
  };
  
  // Periodic status broadcast
  setInterval(() => {
    io.emitSystemStatus({
      connectedClients,
      timestamp: new Date(),
      services: {
        locationReceiver: 'online',
        database: 'connected'
      }
    });
  }, 30000); // Every 30 seconds
  
  return io;
}

module.exports = { handleWebSocketConnections };