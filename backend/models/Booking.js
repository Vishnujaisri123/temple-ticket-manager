const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    serialNo: { type: Number, unique: true },
    bookingDate: { type: Date, required: true, default: Date.now },
    visitDate: { type: Date, required: true },
    phone: { type: String, required: true, trim: true },
    member1: { type: String, required: true, trim: true },
    member2: { type: String, trim: true, default: '' },
    gothram: { type: String, trim: true, default: '' },
    completed: { type: Boolean, default: false },
    pdfSent: { type: Boolean, default: false },
    paid: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['', 'phonepe', 'cash'], default: '' },
    amount: { type: Number, default: 200 },
    profit: { type: Number, default: 50 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    pdfUrl: { type: String, default: '' },
    localPdfUrl: { type: String, default: '' },
    localPdfPath: { type: String, default: '' },
    reminderSent: { type: Boolean, default: false },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-increment serialNo
bookingSchema.pre('save', async function (next) {
  if (this.isNew) {
    const last = await this.constructor.findOne({}, {}, { sort: { serialNo: -1 } });
    this.serialNo = last ? last.serialNo + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
