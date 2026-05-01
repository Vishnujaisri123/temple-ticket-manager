const path = require('path');
const fs = require('fs');
const Booking = require('../models/Booking');
const { uploadToCloudinary } = require('../config/cloudinary');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const getAll = async (req, res) => {
  const { status, sort } = req.query;
  let filter = {};

  if (status === 'paid') {
    filter.paid = true;
    filter.completed = false; // exclude fully completed ones
    filter.pdfSent = false;
  } else if (status === 'unpaid') {
    filter.paid = false;
    filter.pdfSent = false;
  } else if (status === 'sent') {
    filter.pdfSent = true;
  } else if (status === 'history_completed') {
    // Completed & paid but NOT yet sent — shown in History > Completed & Paid tab
    filter.completed = true;
    filter.paid = true;
    filter.pdfSent = false;
  } else if (status === 'pending') {
    filter.pdfSent = false;
    filter.$or = [{ completed: false }, { paid: false }];
  } else if (status === 'reminder') {
    const now = new Date();
    const twoDaysLater = new Date(now);
    twoDaysLater.setDate(now.getDate() + 2);
    const startOfDay = new Date(twoDaysLater.setHours(0, 0, 0, 0));
    const endOfDay = new Date(twoDaysLater.setHours(23, 59, 59, 999));
    filter.visitDate = { $gte: startOfDay, $lte: endOfDay };
    filter.reminderSent = false;
    filter.pdfSent = false;
  } else {
    // Default 'all' — exclude bookings that are fully done (completed+paid) or already sent
    filter.pdfSent = false;
    filter.$nor = [{ completed: true, paid: true }];
  }

  const sortOrder = sort === 'asc' ? 1 : -1;
  const bookings = await Booking.find(filter).sort({ visitDate: sortOrder });
  res.json(bookings);
};

const create = async (req, res) => {
  const booking = await Booking.create(req.body);
  res.status(201).json(booking);
};

const update = async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
};

const remove = async (req, res) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  // Clean up local file
  if (booking.localPdfPath && fs.existsSync(booking.localPdfPath))
    fs.unlinkSync(booking.localPdfPath);
  res.json({ message: 'Deleted successfully' });
};

const uploadPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const { id } = req.body;

  // Save locally for in-app preview
  const localFilename = `ticket_${Date.now()}.pdf`;
  const localPath = path.join(uploadDir, localFilename);
  fs.writeFileSync(localPath, req.file.buffer);
  const localUrl = `${process.env.SERVER_URL}/uploads/${localFilename}`;

  // Upload to Cloudinary for public WhatsApp sharing
  let publicUrl = localUrl;
  try {
    const result = await uploadToCloudinary(req.file.buffer, `ticket_${id}_${Date.now()}`);
    publicUrl = result.secure_url;
  } catch (err) {
    console.error('Cloudinary upload failed, using local URL:', err.message);
  }

  // Clean up old local file
  const existing = await Booking.findById(id);
  if (existing?.localPdfPath && fs.existsSync(existing.localPdfPath))
    fs.unlinkSync(existing.localPdfPath);

  const booking = await Booking.findByIdAndUpdate(
    id,
    { pdfUrl: publicUrl, localPdfUrl: localUrl, localPdfPath: localPath },
    { new: true }
  );
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json({ pdfUrl: publicUrl, localPdfUrl: localUrl, booking });
};

const getReminderBookings = async (req, res) => {
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getDate() + 2);
  const start = new Date(target.setHours(0, 0, 0, 0));
  const end = new Date(target.setHours(23, 59, 59, 999));
  const bookings = await Booking.find({
    visitDate: { $gte: start, $lte: end },
    reminderSent: false,
  });
  res.json(bookings);
};

module.exports = { getAll, create, update, remove, uploadPdf, getReminderBookings };
