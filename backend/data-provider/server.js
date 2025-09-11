const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const simulationRoutes = require('./routes/simulation');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/drone_simulator', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Routes
app.use('/api', simulationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Data Provider', port: PORT });
});

app.listen(PORT, () => {
  console.log(`🚀 Data Provider Server running on port ${PORT}`);
  console.log(`📡 Simulation endpoint: http://localhost:${PORT}/api/simulation`);
});