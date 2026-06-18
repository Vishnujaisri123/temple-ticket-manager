const mongoose = require('mongoose');

const deletedTicketsLogSchema = new mongoose.Schema(
  {
    memberName: { type: String, required: true },
    phone: { type: String, required: true },
    visitDate: { type: Date, required: true },
    deletedAt: { type: Date, required: true, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeletedTicketsLog', deletedTicketsLogSchema, 'DeletedTicketsLog');
