const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  batteryCapacity: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 100
  },
  weightLimit: {
    type: Number,
    required: true,
    min: 0,
    default: 10 // kg
  },
  status: {
    type: String,
    enum: ['available', 'delivering', 'charging', 'maintenance', 'offline'],
    default: 'available'
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90,
    default: 0
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180,
    default: 0
  },
  currentOrder: {
    type: String,
    ref: 'Order',
    default: null
  }
}, {
  timestamps: true,
  versionKey: '__v',
  collection: 'drones'
});

// Indexes for better query performance
droneSchema.index({ status: 1 });
droneSchema.index({ serialNumber: 1 }, { unique: true });
droneSchema.index({ location: '2dsphere' });

// Virtual for current location
droneSchema.virtual('location').get(function() {
  return {
    type: 'Point',
    coordinates: [this.longitude, this.latitude]
  };
});

// Method to update drone location
droneSchema.methods.updateLocation = function(latitude, longitude) {
  this.latitude = latitude;
  this.longitude = longitude;
  return this.save();
};

// Method to assign order to drone
droneSchema.methods.assignOrder = function(orderId) {
  this.currentOrder = orderId;
  this.status = 'delivering';
  return this.save();
};

// Method to complete delivery
droneSchema.methods.completeDelivery = function() {
  this.currentOrder = null;
  this.status = 'available';
  return this.save();
};

module.exports = mongoose.model('Drone', droneSchema);
