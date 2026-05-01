require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const startScheduler = require('./services/scheduler');

const app = express();

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(express.json());

// Serve uploaded PDFs with correct content-type so browser opens them inline
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/', (req, res) => res.json({ status: 'Temple Ticket API running' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

const start = async () => {
  await connectDB();
  startScheduler();
  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
  );
};

start();
