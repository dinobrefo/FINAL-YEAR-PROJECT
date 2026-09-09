require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const startSimulator = require('./simulator');
const runMigrations = require('./db/migrate');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
};

// Setup Socket.io for Real-Time updates
const io = new Server(server, { cors: corsOptions });

// Middleware
app.set('trust proxy', 1); // behind Render's proxy — needed for correct rate-limit keys
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '256kb' }));

// Throttle auth endpoints against credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later', code: 'rate_limited' },
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Pass io to request object for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Basic Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'PULSEGRID Backend is running' });
});

// API Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/ambulances', require('./routes/ambulanceRoutes'));
app.use('/api/hospitals', require('./routes/hospitalRoutes'));
app.use('/api/command-center', require('./routes/commandCenterRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/carto', require('./routes/cartoRoutes'));

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  // Schema migrations must finish before we accept traffic or start the simulator.
  try {
    await runMigrations();
  } catch (err) {
    console.error('[startup] Database migration failed — refusing to start:', err.message);
    process.exit(1);
  }

  if (config.simulatorEnabled) {
    startSimulator(io);
  } else {
    console.log('GPS simulator disabled (set ENABLE_SIMULATOR=true to enable).');
  }

  server.listen(config.port, () => {
    console.log(`Backend server listening on port ${config.port}`);
  });
}

start();

module.exports = { app, server, io };
