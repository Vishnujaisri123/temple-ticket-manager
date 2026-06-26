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
    queueStatus: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
    queueRetryCount: { type: Number, default: 0 },
    queueErrorMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-increment serialNo per week (Saturday 12:00 AM to Friday 11:59:59.999 PM)
// Finds the first available slot (hole) or continues the sequence if no deletions exist
bookingSchema.pre('save', async function (next) {
  if (this.isNew) {
    const referenceDate = new Date();
    
    // 1. Convert reference date to IST shifted time
    const utcTime = referenceDate.getTime() + (referenceDate.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (3600000 * 5.5)); // Shift by +5.5 hours
    
    // 2. Do the week start math on the IST date
    const day = istTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = (day + 1) % 7; // days since Saturday
    
    // 3. Set to Saturday 12:00 AM IST
    const startOfWeekIST = new Date(istTime);
    startOfWeekIST.setDate(istTime.getDate() - diff);
    startOfWeekIST.setHours(0, 0, 0, 0);
    
    // 4. Convert Saturday 12:00 AM IST back to UTC for database query
    const startOfWeek = new Date(startOfWeekIST.getTime() - (3600000 * 5.5));
    
    // 5. Calculate end of week in UTC (representing Friday 11:59:59.999 PM IST)
    const endOfWeek = new Date(startOfWeek.getTime() + (7 * 24 * 3600 * 1000) - 1);

    const bookingsInWeek = await this.constructor.find(
      {
        createdAt: { $gte: startOfWeek, $lte: endOfWeek },
        createdBy: this.createdBy
      },
      { serialNo: 1 }
    );

    const activeSerialNos = bookingsInWeek.map(b => b.serialNo);
    
    let targetSerialNo = 1;
    while (activeSerialNos.includes(targetSerialNo)) {
      targetSerialNo++;
    }
    
    this.serialNo = targetSerialNo;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
