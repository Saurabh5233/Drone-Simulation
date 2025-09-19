const express = require('express');
const router = express.Router();

// POST endpoint to broadcast simulation data
const createBroadcastHandler = (emitMethodName, eventType, logIcon) => {
  return (req, res) => {
    try {
      const { data, timestamp } = req.body;

      if (!data) {
        return res.status(400).json({ error: `Missing ${eventType} data` });
      }

      console.log(`${logIcon} Received broadcast request for ${eventType} data`);

      const io = req.app.get('io');
      if (io && io[emitMethodName]) {
        io[emitMethodName]({
          ...data,
          broadcastTimestamp: timestamp || new Date().toISOString(),
          source: 'data_provider'
        });

        console.log(`✅ ${eventType} data broadcasted to all clients`);
        res.json({
          success: true,
          message: `${eventType} data broadcasted successfully`,
          clientsNotified: io.engine.clientsCount || 0
        });
      } else {
        console.warn(`⚠️ WebSocket not available for broadcasting ${eventType}`);
        res.status(503).json({
          error: 'WebSocket service not available',
          message: `Cannot broadcast ${eventType} data`
        });
      }
    } catch (error) {
      console.error(`❌ Error broadcasting ${eventType} data:`, error);
      res.status(500).json({
        error: `Failed to broadcast ${eventType} data`,
        details: error.message
      });
    }
  };
};

router.post('/broadcast/simulation', createBroadcastHandler('emitSimulationData', 'simulation', '📊'));
router.post('/broadcast/order', createBroadcastHandler('emitOrderNotification', 'order', '📦'));

// POST endpoint to broadcast custom messages
router.post('/broadcast/custom', (req, res) => {
  try {
    const { event, data, room } = req.body;
    
    if (!event || !data) {
      return res.status(400).json({ error: 'Missing event name or data' });
    }
    
    console.log(`📢 Received custom broadcast request for event: ${event}`);
    
    // Get io instance from app
    const io = req.app.get('io');
    if (io) {
      if (room) {
        io.to(room).emit(event, {
          ...data,
          broadcastTimestamp: new Date().toISOString(),
          source: 'data_provider'
        });
        console.log(`✅ Custom event '${event}' broadcasted to room '${room}'`);
      } else {
        io.emit(event, {
          ...data,
          broadcastTimestamp: new Date().toISOString(),
          source: 'data_provider'
        });
        console.log(`✅ Custom event '${event}' broadcasted to all clients`);
      }
      
      res.json({ 
        success: true, 
        message: `Custom event '${event}' broadcasted successfully`,
        room: room || 'all',
        clientsNotified: io.engine.clientsCount || 0
      });
    } else {
      console.warn('⚠️ WebSocket not available for broadcasting');
      res.status(503).json({ 
        error: 'WebSocket service not available',
        message: 'Cannot broadcast custom event'
      });
    }
    
  } catch (error) {
    console.error('❌ Error broadcasting custom event:', error);
    res.status(500).json({ 
      error: 'Failed to broadcast custom event',
      details: error.message 
    });
  }
});

// GET endpoint to check broadcast service status
router.get('/broadcast/status', (req, res) => {
  try {
    const io = req.app.get('io');
    
    const status = {
      service: 'WebSocket Broadcast Service',
      status: io ? 'available' : 'unavailable',
      connectedClients: io ? (io.engine.clientsCount || 0) : 0,
      timestamp: new Date().toISOString(),
      capabilities: {
        simulationBroadcast: !!io?.emitSimulationData,
        orderBroadcast: !!io?.emitOrderNotification,
        customBroadcast: !!io,
        roomSupport: !!io
      }
    };
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get broadcast status',
      details: error.message 
    });
  }
});

module.exports = router;
