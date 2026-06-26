const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const startScheduler = require('./services/scheduler');

const app = express();

// Must be before all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(cors());
app.use(express.json());

// Health check — must be before auth routes
app.get('/', (req, res) => res.json({ status: 'Temple Ticket API running' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve uploaded PDFs
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  startScheduler();
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`Server running on port ${PORT}`)
  );
};

start();
