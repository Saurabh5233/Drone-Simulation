const mongoose = require('mongoose');

const droneLocationSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    index: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  batteryCapacity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  altitude: {
    type: Number,
    default: 0
  },
  speed: {
    type: Number,
    default: 0
  },
  heading: {
    type: Number,
    min: 0,
    max: 360
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
droneLocationSchema.index({ serialNumber: 1, timestamp: -1 });

// TTL index to automatically remove old records (optional)
droneLocationSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days

module.exports = mongoose.model('DroneLocation', droneLocationSchema);