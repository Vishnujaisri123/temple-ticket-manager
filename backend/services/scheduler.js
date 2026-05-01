const cron = require('node-cron');
const Booking = require('../models/Booking');

// Runs every day at midnight — deletes past visit dates
const startScheduler = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      const result = await Booking.deleteMany({ visitDate: { $lte: yesterday } });
      console.log(`[Cron] Deleted ${result.deletedCount} expired bookings`);
    } catch (err) {
      console.error('[Cron] Error deleting old bookings:', err.message);
    }
  });

  console.log('[Cron] Scheduler started');
};

module.exports = startScheduler;
