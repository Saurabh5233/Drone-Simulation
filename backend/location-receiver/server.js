const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const droneRoutes = require('./routes/drones');
const broadcastRoutes = require('./routes/broadcast');
const { handleWebSocketConnections } = require('./websocket/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/drone_locations', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB (Locations)');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Store io instance for use in routes
app.set('io', io);

// Routes
app.use('/api', droneRoutes);
app.use('/api', broadcastRoutes);
app.get('/api', (req,res)=>{
  res.send("Location-Reciever API is running.....")
});

// WebSocket handling
handleWebSocketConnections(io);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Location Receiver', port: PORT });
});

server.listen(PORT, () => {
  console.log(`🚀 Location Receiver Server running on port ${PORT}`);
  console.log(`📍 Location endpoint: http://localhost:${PORT}/api/drones/location`);
  console.log(`🔌 WebSocket available on port ${PORT}`);
});