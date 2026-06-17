const Booking = require('../models/Booking');

/**
 * Gets the start of the current week (Saturday 12:00 AM)
 * @param {Date} date - Optional reference date
 * @returns {Date}
 */
const getCurrentWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = (day + 1) % 7; // days since Saturday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Gets the end of the current week (Friday 11:59:59.999 PM)
 * @param {Date} startOfWeek - Start of the week Date object
 * @returns {Date}
 */
const getCurrentWeekEnd = (startOfWeek) => {
  const d = new Date(startOfWeek);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
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
    bookingDate: { $gte: startOfWeek, $lte: endOfWeek }
  }).lean();

  const stats = {
    totalAmount: 0,
    totalProfit: 0,
    phonepeAmount: 0,
    cashAmount: 0,
    paidCount: 0,
    sentCount: 0,
    pujaCount: 0,
    pujaProfit: 0,
    pujaPhonepeAmount: 0,
    pujaCashAmount: 0,
    count: bookings.length
  };

  const pujaProfitValue = 200;

  bookings.forEach(b => {
    const amt = b.amount || 200;
    const prf = b.profit || 50;

    stats.totalAmount += amt;
    stats.totalProfit += prf;
    if (b.paid) stats.paidCount++;
    if (b.pdfSent) stats.sentCount++;

    if (b.paymentMethod === 'phonepe') stats.phonepeAmount += amt;
    if (b.paymentMethod === 'cash') stats.cashAmount += amt;

    if (b.pdfSent && b.pujaGroceryDone) {
      stats.pujaCount++;
      stats.pujaProfit += pujaProfitValue;
      if (b.pujaGroceryPaymentMethod === 'phonepe') stats.pujaPhonepeAmount += pujaProfitValue;
      if (b.pujaGroceryPaymentMethod === 'cash') stats.pujaCashAmount += pujaProfitValue;
    }
  });

  return stats;
};

module.exports = {
  getCurrentWeekStart,
  getCurrentWeekEnd,
  getWeeklyStats
};
