const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  weight: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  customerPhone: {
    type: String,
    trim: true
  },
  items: [orderItemSchema],
  totalWeight: {
    type: Number,
    required: true,
    min: 0
  },
  pickupAddress: {
    type: String,
    required: true,
    trim: true
  },
  pickupCoordinates: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 }
  },
  deliveryAddress: {
    type: String,
    required: true,
    trim: true
  },
  deliveryCoordinates: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 }
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'],
    default: 'pending'
  },
  assignedDrone: {
    type: String,
    ref: 'Drone',
    default: null
  },
  statusHistory: [statusHistorySchema],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  deliveryInstructions: {
    type: String,
    trim: true
  },
  externalOrderId: {
    type: String,
    index: true
  }
}, {
  timestamps: true,
  versionKey: '__v',
  collection: 'orders'
});

// Indexes for better query performance
orderSchema.index({ status: 1 });
orderSchema.index({ assignedDrone: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ externalOrderId: 1 });
orderSchema.index({ createdAt: -1 });

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    notes
  });
  
  if (newStatus === 'delivered') {
    this.actualDeliveryTime = new Date();
  }
  
  return this.save();
};

// Method to assign drone to order
orderSchema.methods.assignDrone = function(droneId) {
  this.assignedDrone = droneId;
  return this.updateStatus('assigned', `Assigned to drone ${droneId}`);
};

// Method to calculate estimated delivery time
orderSchema.methods.calculateEstimatedDelivery = function(droneSpeed = 30) { // km/h
  if (!this.pickupCoordinates || !this.deliveryCoordinates) {
    return null;
  }
  
  // Simple distance calculation (Haversine formula would be better)
  const distance = Math.sqrt(
    Math.pow(this.deliveryCoordinates.latitude - this.pickupCoordinates.latitude, 2) +
    Math.pow(this.deliveryCoordinates.longitude - this.pickupCoordinates.longitude, 2)
  ) * 111; // Rough conversion to km
  
  const travelTimeHours = distance / droneSpeed;
  const estimatedTime = new Date(Date.now() + (travelTimeHours * 60 * 60 * 1000) + (15 * 60 * 1000)); // Add 15 min for pickup
  
  this.estimatedDeliveryTime = estimatedTime;
  return estimatedTime;
};

// Virtual to check if order is active
orderSchema.virtual('isActive').get(function() {
  return ['pending', 'assigned', 'picked_up', 'in_transit'].includes(this.status);
});

// Virtual to get latest status update
orderSchema.virtual('latestStatusUpdate').get(function() {
  return this.statusHistory.length > 0 
    ? this.statusHistory[this.statusHistory.length - 1]
    : null;
});

module.exports = mongoose.model('Order', orderSchema);
