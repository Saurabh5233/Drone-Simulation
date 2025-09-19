const express = require('express');
const axios = require('axios');
const router = express.Router();
const DroneLocation = require('../models/DroneLocation');

const EXTERNAL_SERVER_URL = process.env.EXTERNAL_SERVER_URL || 'https://drone-flux-system-server.vercel.app';
const EXTERNAL_SERVER_LOCATION_ENDPOINT = process.env.EXTERNAL_SERVER_LOCATION_ENDPOINT;

// Store active drone connections
const activeDrones = new Map();

// Function to send location data to external server
const sendLocationToExternalServer = async (locationData) => {
  try {
    // Prefer specific endpoint from env var, fallback to trying multiple
    const endpoints = EXTERNAL_SERVER_LOCATION_ENDPOINT
      ? [EXTERNAL_SERVER_LOCATION_ENDPOINT]
      : [
          '/api/drone-location',
          '/drone-location',
          '/api/location-update',
          '/location-update',
          '/api/tracking/update',
          '/tracking/update'
        ];
    
    for (const endpoint of endpoints) {
      try {
        await axios.post(`${EXTERNAL_SERVER_URL}${endpoint}`, {
          ...locationData,
          source: 'drone_simulation',
          timestamp: new Date().toISOString()
        }, {
          timeout: 3000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Drone-Simulation-System/1.0'
          }
        });
        
        console.log(`📤 Sent location to external server: ${endpoint}`);
        return true;
      } catch (endpointError) {
        if (EXTERNAL_SERVER_LOCATION_ENDPOINT) {
          // If a specific endpoint is configured and fails, log it and stop.
          console.warn(`⚠️ Failed to send location to specific external endpoint ${endpoint}:`, endpointError.message);
          return false;
        }
        // Continue to next endpoint if this one fails
        continue;
      }
    }
    
    // If we get here, no endpoint worked
    if (!EXTERNAL_SERVER_LOCATION_ENDPOINT) {
      console.warn('⚠️ Failed to send location to external server - no working endpoints after trying all');
    }
    return false;
    
  } catch (error) {
    console.error('❌ Error sending location to external server:', error.message);
    return false;
  }
};

// POST endpoint to receive drone location updates
router.post('/drones/location', async (req, res) => {
  try {
    const { serialNumber, latitude, longitude, batteryCapacity, timestamp } = req.body;
    
    // Validate required fields
    if (!serialNumber || latitude === undefined || longitude === undefined || batteryCapacity === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: serialNumber, latitude, longitude, batteryCapacity' 
      });
    }
    
    // Create location record
    const locationData = new DroneLocation({
      serialNumber,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      batteryCapacity: parseFloat(batteryCapacity),
      timestamp: timestamp || new Date(),
      receivedAt: new Date()
    });
    
    // Save to database
    await locationData.save();
    
    // Update active drones map
    activeDrones.set(serialNumber, {
      serialNumber,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      batteryCapacity: parseFloat(batteryCapacity),
      lastUpdate: new Date(),
      status: batteryCapacity > 20 ? 'active' : 'low_battery'
    });
    
    // Emit to WebSocket clients using enhanced method
    const io = req.app.get('io');
    if (io && io.emitDroneLocationUpdate) {
      io.emitDroneLocationUpdate({
        serialNumber,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        batteryCapacity: parseFloat(batteryCapacity),
        timestamp: locationData.timestamp,
        status: batteryCapacity > 20 ? 'active' : 'low_battery'
      });
    } else if (io) {
      // Fallback to regular emit if enhanced methods aren't available
      io.emit('droneLocationUpdate', {
        serialNumber,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        batteryCapacity: parseFloat(batteryCapacity),
        timestamp: locationData.timestamp,
        status: batteryCapacity > 20 ? 'active' : 'low_battery'
      });
    }
    
    // Send location data to external server (async, non-blocking)
    const locationForExternal = {
      serialNumber,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      batteryCapacity: parseFloat(batteryCapacity),
      timestamp: locationData.timestamp,
      droneStatus: batteryCapacity > 20 ? 'active' : 'low_battery'
    };
    
    // Send to external server without blocking the response
    sendLocationToExternalServer(locationForExternal)
      .catch(error => {
        console.warn('⚠️ Failed to send location to external server:', error.message);
      });
    
    console.log(`📍 Location update received for drone ${serialNumber}: ${latitude}, ${longitude} (Battery: ${batteryCapacity}%)`);
    
    res.json({ 
      success: true, 
      message: 'Location updated successfully',
      data: {
        serialNumber,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        batteryCapacity: parseFloat(batteryCapacity),
        timestamp: locationData.timestamp
      }
    });
    
  } catch (error) {
    console.error('Error processing location update:', error);
    res.status(500).json({ 
      error: 'Failed to process location update',
      details: error.message 
    });
  }
});

// GET endpoint to retrieve drone locations
router.get('/drones/location/:serialNumber', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const { limit = 100 } = req.query;
    
    const locations = await DroneLocation.find({ serialNumber })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      serialNumber,
      count: locations.length,
      locations
    });
    
  } catch (error) {
    console.error('Error retrieving locations:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve locations',
      details: error.message 
    });
  }
});

// GET all active drones
router.get('/drones/active', (req, res) => {
  const now = new Date();
  const activeThreshold = 30000; // 30 seconds
  
  const activeDronesList = Array.from(activeDrones.values()).filter(drone => {
    return (now - drone.lastUpdate) < activeThreshold;
  });
  
  res.json({
    success: true,
    count: activeDronesList.length,
    drones: activeDronesList
  });
});

// GET drone statistics
router.get('/drones/stats', async (req, res) => {
  try {
    const totalLocations = await DroneLocation.countDocuments();
    const uniqueDrones = await DroneLocation.distinct('serialNumber');
    const recentLocations = await DroneLocation.countDocuments({
      receivedAt: { $gte: new Date(Date.now() - 3600000) } // Last hour
    });
    
    res.json({
      success: true,
      stats: {
        totalLocationUpdates: totalLocations,
        uniqueDrones: uniqueDrones.length,
        recentUpdates: recentLocations,
        activeDrones: activeDrones.size
      }
    });
    
  } catch (error) {
    console.error('Error retrieving stats:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve statistics',
      details: error.message 
    });
  }
});

module.exports = router;