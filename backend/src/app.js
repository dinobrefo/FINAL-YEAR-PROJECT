require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const startSimulator = require('./simulator');
const runMigrations = require('./db/migrate');

require('express-async-errors');

// Run safe non-destructive schema migrations
runMigrations();

const app = express();
const server = http.createServer(app);

// Setup Socket.io for Real-Time updates
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the live GPS simulator
startSimulator(io);

// Pass io to request object if needed in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Basic Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'IERBMS Backend is running' });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/ambulances', require('./routes/ambulanceRoutes'));
app.use('/api/hospitals', require('./routes/hospitalRoutes'));
app.use('/api/command-center', require('./routes/commandCenterRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
