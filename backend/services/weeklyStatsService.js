const Booking = require('../models/Booking');

/**
 * Gets the start of the current week (Saturday 12:00 AM)
 * @param {Date} date - Optional reference date
 * @returns {Date}
 */
const getCurrentWeekStart = (date = new Date()) => {
  // 1. Convert reference date to IST shifted time
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istTime = new Date(utcTime + (3600000 * 5.5)); // Shift by +5.5 hours
  
  // 2. Do the week start math on the IST date
  const day = istTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = (day + 1) % 7; // days since Saturday
  
  // 3. Set to Saturday 12:00 AM IST
  const startOfWeekIST = new Date(istTime);
  startOfWeekIST.setDate(istTime.getDate() - diff);
  startOfWeekIST.setHours(0, 0, 0, 0);
  
  // 4. Convert Saturday 12:00 AM IST back to UTC for database queries
  const startOfWeekUTC = new Date(startOfWeekIST.getTime() - (3600000 * 5.5));
  return startOfWeekUTC;
};

/**
 * Gets the end of the current week (Friday 11:59:59.999 PM IST) represented in UTC
 * @param {Date} startOfWeek - Start of the week Date object in UTC
 * @returns {Date}
 */
const getCurrentWeekEnd = (startOfWeek) => {
  // Exactly 7 days minus 1 millisecond from the start of the week
  const endOfWeekUTC = new Date(startOfWeek.getTime() + (7 * 24 * 3600 * 1000) - 1);
  return endOfWeekUTC;
};

/**
 * Calculates weekly statistics for a specific admin/user
 * @param {string} adminId - Admin/createdBy ID
 * @returns {Promise<Object>}
 */
const getWeeklyStats = async (adminId) => {
  const startOfWeek = getCurrentWeekStart();
  const endOfWeek = getCurrentWeekEnd(startOfWeek);

  const bookings = await Booking.find({
    createdBy: adminId,
    createdAt: { $gte: startOfWeek, $lte: endOfWeek }
  }).lean();

  const stats = {
    totalAmount: 0,
    totalProfit: 0,
    phonepeAmount: 0,
    cashAmount: 0,
    phonepeCount: 0,
    cashCount: 0,
    paidCount: 0,
    sentCount: 0,
    completedCount: 0,
    count: bookings.length
  };

  bookings.forEach(b => {
    const amt = b.amount || 200;
    const prf = b.profit || 50;

    stats.totalAmount += amt;
    stats.totalProfit += prf;
    if (b.paid) stats.paidCount++;
    if (b.pdfSent) stats.sentCount++;
    if (b.completed) stats.completedCount++;

    if (b.paymentType === 'phonepe') {
      stats.phonepeAmount += amt;
      stats.phonepeCount++;
    }
    if (b.paymentType === 'cash') {
      stats.cashAmount += amt;
      stats.cashCount++;
    }
  });

  return stats;
};

module.exports = {
  getCurrentWeekStart,
  getCurrentWeekEnd,
  getWeeklyStats
};
