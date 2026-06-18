const mongoose = require('mongoose');

const deletedTicketSchema = new mongoose.Schema(
  {
    ticketDetails: { type: Object, required: true },
    pdfUrl: { type: String, default: '' },
    deletedAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeletedTicket', deletedTicketSchema, 'DeletedTickets');
