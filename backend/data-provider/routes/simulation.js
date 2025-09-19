const express = require('express');
const axios = require('axios');
const router = express.Router();
const Drone = require('../models/Drone');
const Order = require('../models/Order');
const { generateSimulationData } = require('../data/mockData');
const webSocketBroadcastService = require('../services/websocketClient');

const LOCATION_RECEIVER_URL = process.env.LOCATION_RECEIVER_URL || 'http://localhost:3001/api/drones/location';
const EXTERNAL_SERVER_URL = process.env.EXTERNAL_SERVER_URL || 'https://drone-flux-system-server.vercel.app';
const EXTERNAL_SERVER_ORDERS_ENDPOINT = process.env.EXTERNAL_SERVER_ORDERS_ENDPOINT;

// Store active simulations
let activeSimulations = new Map();
let externalServerPollInterval = null;

// POST /simulation
// Receives simulation data from an external server
router.post('/simulation', async (req, res) => {
  try {
    const simulationData = req.body;
    const { drone, order } = simulationData;

    if (!drone || !order) {
      return res.status(400).json({ error: 'Invalid simulation data format' });
    }

    console.log('✅ Received simulation data for order:', order._id);
    
    // Store the simulation data
    activeSimulations.set(order._id, simulationData);
    
    // Forward the data to the frontend via WebSocket
    // In a real implementation, you would emit this to connected WebSocket clients
    console.log('📤 Forwarding simulation data to frontend');
    
    res.status(200).json({ 
      success: true, 
      message: 'Simulation data received',
      orderId: order._id
    });

  } catch (error) {
    console.error('❌ Error processing simulation data:', error);
    res.status(500).json({ 
      error: 'Failed to process simulation data',
      details: error.message 
    });
  }
});

// Start simulation for a specific order
router.post('/simulation/:orderId/start', async (req, res) => {
  try {
    const { orderId } = req.params;
    const simulationData = activeSimulations.get(orderId);
    
    if (!simulationData) {
      return res.status(404).json({ error: 'Simulation data not found' });
    }
    
    const { drone, order } = simulationData;
    
    // Start the simulation by sending initial location
    const initialLocation = {
      serialNumber: drone.serialNumber,
      latitude: drone.latitude || 0,
      longitude: drone.longitude || 0,
      batteryCapacity: drone.batteryCapacity || 100,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Send initial location to location-receiver
      await axios.post(LOCATION_RECEIVER_URL, initialLocation);
      console.log(`🚀 Started simulation for order ${orderId}`);
      
      res.json({
        success: true,
        message: 'Simulation started',
        orderId,
        initialLocation
      });
      
    } catch (error) {
      console.error('Error sending initial location:', error.message);
      throw new Error('Failed to start simulation');
    }
    
  } catch (error) {
    console.error('Error starting simulation:', error);
    res.status(500).json({ 
      error: 'Failed to start simulation',
      details: error.message 
    });
  }
});

// GET /simulation - Get current simulation data or generate new one
router.get('/simulation', async (req, res) => {
  try {
    // Try to get the most recent active simulation
    if (activeSimulations.size > 0) {
      const latestSimulation = Array.from(activeSimulations.values())[0];
      return res.json(latestSimulation);
    }
    
    // If no active simulation, generate new simulation data
    const simulationData = await generateSimulationData();
    
    // Store the new simulation
    activeSimulations.set(simulationData.order._id, {
      ...simulationData,
      receivedAt: new Date().toISOString()
    });
    
    // Save to database
    try {
      const drone = new Drone(simulationData.drone);
      const order = new Order(simulationData.order);
      
      await Promise.all([drone.save(), order.save()]);
      console.log('💾 Saved simulation data to database');
    } catch (dbError) {
      console.warn('⚠️ Failed to save to database:', dbError.message);
    }
    
    // Broadcast simulation data to frontend via WebSocket
    try {
      await webSocketBroadcastService.broadcastSimulationData(simulationData);
    } catch (wsError) {
      console.warn('⚠️ Failed to broadcast simulation data via WebSocket:', wsError.message);
    }
    
    console.log('🆕 Generated new simulation data for order:', simulationData.order._id);
    res.json(simulationData);
    
  } catch (error) {
    console.error('❌ Error getting simulation data:', error);
    res.status(500).json({ 
      error: 'Failed to get simulation data',
      details: error.message 
    });
  }
});

// POST /simulation/start - Start a new simulation with optional custom data
router.post('/simulation/start', async (req, res) => {
  try {
    const customData = req.body || {};
    
    // Generate new simulation data with custom data
    const simulationData = await generateSimulationData(customData);
    
    // Store the simulation
    activeSimulations.set(simulationData.order._id, {
      ...simulationData,
      receivedAt: new Date().toISOString()
    });
    
    // Save to database
    try {
      const drone = new Drone(simulationData.drone);
      const order = new Order(simulationData.order);
      
      await Promise.all([drone.save(), order.save()]);
      console.log('💾 Saved new simulation to database');
    } catch (dbError) {
      console.warn('⚠️ Failed to save to database:', dbError.message);
    }
    
    console.log('🚀 Started new simulation for order:', simulationData.order._id);
    
    res.json({
      success: true,
      message: 'New simulation started',
      data: simulationData
    });
    
  } catch (error) {
    console.error('❌ Error starting simulation:', error);
    res.status(500).json({ 
      error: 'Failed to start simulation',
      details: error.message 
    });
  }
});

// Function to poll external server for new orders
const pollExternalServer = async () => {
  try {
    console.log('🔄 Polling external server for new orders...');
    
    // Prefer specific endpoint from env var, fallback to trying multiple
    const endpoints = EXTERNAL_SERVER_ORDERS_ENDPOINT
      ? [EXTERNAL_SERVER_ORDERS_ENDPOINT]
      : [
          '/api/orders/pending',
          '/orders/pending',
          '/api/orders',
          '/orders',
          '/api/drone-orders',
          '/pending-orders'
        ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${EXTERNAL_SERVER_URL}${endpoint}`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`📡 Found ${response.data.length} orders from ${endpoint}`);
          
          // Process each order
          for (const orderData of response.data) {
            await processExternalOrder(orderData);
          }
          return; // Success, exit polling
        }
      } catch (endpointError) {
        if (EXTERNAL_SERVER_ORDERS_ENDPOINT) {
          // If a specific endpoint is configured and fails, log it and stop.
          console.error(`❌ Error polling specific endpoint ${endpoint}:`, endpointError.message);
          return;
        }
        // Continue to next endpoint
        continue;
      }
    }
    
    if (!EXTERNAL_SERVER_ORDERS_ENDPOINT) {
      console.log('📡 No new orders found on external server after trying all endpoints');
    }
    
  } catch (error) {
    console.error('❌ Error polling external server:', error.message);
  }
};

// Process an order received from external server
const processExternalOrder = async (externalOrderData) => {
  try {
    // Convert external order format to our format
    const simulationData = await generateSimulationData({
      customerName: externalOrderData.customerName || 'External Customer',
      customerEmail: externalOrderData.customerEmail || 'customer@external.com',
      pickupAddress: externalOrderData.pickupAddress || externalOrderData.pickup,
      deliveryAddress: externalOrderData.deliveryAddress || externalOrderData.delivery,
      items: externalOrderData.items || [{
        name: externalOrderData.itemName || 'External Package',
        quantity: externalOrderData.quantity || 1
      }],
      totalWeight: externalOrderData.weight || externalOrderData.totalWeight || 2.0
    });
    
    // Add external order ID for tracking
    simulationData.order.externalOrderId = externalOrderData.id || externalOrderData._id;
    
    // Store the simulation
    activeSimulations.set(simulationData.order._id, {
      ...simulationData,
      receivedAt: new Date().toISOString(),
      source: 'external_server'
    });
    
    // Save to database
    try {
      const drone = new Drone(simulationData.drone);
      const order = new Order(simulationData.order);
      
      await Promise.all([drone.save(), order.save()]);
      console.log('💾 Saved external order to database');
    } catch (dbError) {
      console.warn('⚠️ Failed to save external order to database:', dbError.message);
    }
    
    console.log('📩 Processed external order:', simulationData.order._id);
    
    // Broadcast order notification to frontend via WebSocket
    try {
      await webSocketBroadcastService.broadcastOrderNotification({
        type: 'external_order',
        order: simulationData.order,
        drone: simulationData.drone,
        message: `New order received from external server: ${simulationData.order._id}`,
        source: 'external_server'
      });
      console.log('📦 Order notification broadcasted to frontend');
    } catch (wsError) {
      console.warn('⚠️ Failed to broadcast order notification via WebSocket:', wsError.message);
    }
    
  } catch (error) {
    console.error('❌ Error processing external order:', error);
  }
};

// Function to send location data back to external server
const sendLocationToExternalServer = async (locationData) => {
  try {
    const endpoints = [
      '/api/drone-location',
      '/drone-location',
      '/api/location-update',
      '/location-update'
    ];
    
    for (const endpoint of endpoints) {
      try {
        await axios.post(`${EXTERNAL_SERVER_URL}${endpoint}`, locationData, {
          timeout: 3000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`📤 Sent location data to external server: ${endpoint}`);
        return true;
      } catch (endpointError) {
        continue;
      }
    }
    
    console.warn('⚠️ Failed to send location to external server - no working endpoints');
    return false;
    
  } catch (error) {
    console.error('❌ Error sending location to external server:', error.message);
    return false;
  }
};

// Start polling external server when this module loads
const startExternalServerPolling = () => {
  if (externalServerPollInterval) {
    clearInterval(externalServerPollInterval);
  }
  
  // Poll every 10 seconds
  externalServerPollInterval = setInterval(pollExternalServer, 10000);
  
  // Also poll immediately
  setTimeout(pollExternalServer, 2000);
  
  console.log('🔄 Started external server polling (every 10 seconds)');
};

// Stop polling (useful for cleanup)
const stopExternalServerPolling = () => {
  if (externalServerPollInterval) {
    clearInterval(externalServerPollInterval);
    externalServerPollInterval = null;
    console.log('🛑 Stopped external server polling');
  }
};

// Get active simulations
router.get('/simulations/active', (req, res) => {
  const simulations = Array.from(activeSimulations.entries()).map(([orderId, data]) => ({
    orderId,
    drone: data.drone,
    order: data.order,
    receivedAt: data.receivedAt || new Date().toISOString(),
    source: data.source || 'internal'
  }));
  
  res.json({
    success: true,
    count: simulations.length,
    simulations
  });
});

// Manual trigger for external server polling (for testing)
router.post('/external/poll', async (req, res) => {
  try {
    await pollExternalServer();
    res.json({ success: true, message: 'External server polling triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to poll external server', details: error.message });
  }
});

// Export location sender function for use by other modules
router.sendLocationToExternalServer = sendLocationToExternalServer;

// Start external server polling
startExternalServerPolling();

module.exports = router;
