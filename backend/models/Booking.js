const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    serialNo: { type: Number },
    bookingDate: { type: Date, required: true, default: Date.now },
    visitDate: { type: Date, required: true },
    slotTime: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    member1: { type: String, required: true, trim: true },
    member2: { type: String, trim: true, default: '' },
    gothram: { type: String, trim: true, default: '' },
    completed: { type: Boolean, default: false },
    pdfSent: { type: Boolean, default: false },
    sent: { type: Boolean, default: false },
    deliveryStatus: { type: String, default: '' },
    whatsappMessageId: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    paid: { type: Boolean, default: false },
    paymentType: { type: String, enum: ['', 'phonepe', 'cash'], default: '' },
    amount: { type: Number, default: 200 },
    profit: { type: Number, default: 50 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    pdfUrl: { type: String, default: '' },
    pdfUploaded: { type: Boolean, default: false },
    localPdfUrl: { type: String, default: '' },
    localPdfPath: { type: String, default: '' },
    reminderSent: { type: Boolean, default: false },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-increment serialNo per week (Saturday 12:00 AM to Friday 11:59:59.999 PM)
// Reuses the first available deleted serial number (gap-filling) in the current week
bookingSchema.pre('save', async function (next) {
  if (this.isNew) {
    const referenceDate = new Date();
    const day = referenceDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = (day + 1) % 7; // Days since Saturday
    
    const startOfWeek = new Date(referenceDate);
    startOfWeek.setDate(referenceDate.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Fetch all bookings in the current week, sorted by serialNo ascending
    const weeklyBookings = await this.constructor.find(
      {
        createdAt: { $gte: startOfWeek, $lte: endOfWeek }
      },
      { serialNo: 1 }
    ).sort({ serialNo: 1 });

    // Find the first missing serial number (gap) starting from 1
    let nextSerial = 1;
    for (const booking of weeklyBookings) {
      if (booking.serialNo === nextSerial) {
        nextSerial++;
      } else if (booking.serialNo > nextSerial) {
        break; // Gap found!
      }
    }

    this.serialNo = nextSerial;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
