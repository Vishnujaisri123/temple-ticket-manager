const mongoose = require('mongoose');

const unassignedPdfSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    pdfUrl: { type: String, required: true },
    localPdfPath: { type: String, default: '' },
    extractedData: {
      member1: { type: String, default: '' },
      member2: { type: String, default: '' },
      gothram: { type: String, default: '' },
      visitDate: { type: String, default: '' },
      slotTime: { type: String, default: '' }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UnassignedPDF', unassignedPdfSchema);
