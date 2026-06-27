const mongoose = require('mongoose');

const unassignedPdfSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    pdfUrl: { type: String, required: true },
    localPdfPath: { type: String, default: '' },
    extractedData: {
      ticketId: { type: String, default: '' },
      member1: { type: String, default: '' },
      member2: { type: String, default: '' },
      gothram: { type: String, default: '' },
      visitDate: { type: String, default: '' },
      slotTime: { type: String, default: '' },
      sevaName: { type: String, default: '' },
      amount: { type: String, default: '' }
    },
    reason: { type: String, default: '' },
    matchReport: { type: mongoose.Schema.Types.Mixed, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UnassignedPDF', unassignedPdfSchema);
