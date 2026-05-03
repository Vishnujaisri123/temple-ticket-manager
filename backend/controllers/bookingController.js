const path = require('path');
const fs = require('fs');
const Booking = require('../models/Booking');
const Admin = require('../models/Admin');
const { uploadToCloudinary } = require('../config/cloudinary');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const getAll = async (req, res) => {
  const { status, sort } = req.query;
  let filter = {};

  if (status === 'paid') {
    filter.paid = true;
    filter.completed = false;
    filter.pdfSent = false;
  } else if (status === 'unpaid') {
    filter.paid = false;
    filter.pdfSent = false;
  } else if (status === 'sent') {
    filter.pdfSent = true;
  } else if (status === 'history_completed') {
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
    filter.pdfSent = false;
    filter.$nor = [{ completed: true, paid: true }];
  }

  let sortObj = { visitDate: sort === 'asc' ? 1 : -1, phone: 1 };
  if (sort === 'phone') {
    sortObj = { phone: 1, visitDate: 1 };
  }
  const bookings = await Booking.find(filter).sort(sortObj);
  res.json(bookings);
};

const create = async (req, res) => {
  const data = { ...req.body, createdBy: req.admin.id };
  const booking = await Booking.create(data);
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
  if (booking.localPdfPath && fs.existsSync(booking.localPdfPath))
    fs.unlinkSync(booking.localPdfPath);
  res.json({ message: 'Deleted successfully' });
};

const uploadPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const { id } = req.body;

  const isProduction = process.env.NODE_ENV === 'production';
  let pdfUrl = '';
  let localPdfUrl = '';
  let localPdfPath = '';

  if (isProduction) {
    // Production: Cloudinary only
    try {
      const result = await uploadToCloudinary(req.file.buffer, `ticket_${id}_${Date.now()}`);
      pdfUrl = result.secure_url;
      localPdfUrl = pdfUrl; // same URL in production
    } catch (err) {
      return res.status(500).json({ message: 'Cloudinary upload failed: ' + err.message });
    }
  } else {
    // Development: save locally + try Cloudinary
    const localFilename = `ticket_${Date.now()}.pdf`;
    localPdfPath = path.join(uploadDir, localFilename);
    fs.writeFileSync(localPdfPath, req.file.buffer);
    localPdfUrl = `${process.env.SERVER_URL}/uploads/${localFilename}`;
    pdfUrl = localPdfUrl;

    try {
      const result = await uploadToCloudinary(req.file.buffer, `ticket_${id}_${Date.now()}`);
      pdfUrl = result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload failed, using local URL:', err.message);
    }

    // Clean up old local file
    const existing = await Booking.findById(id);
    if (existing?.localPdfPath && fs.existsSync(existing.localPdfPath))
      fs.unlinkSync(existing.localPdfPath);
  }

  const booking = await Booking.findByIdAndUpdate(
    id,
    { pdfUrl, localPdfUrl, localPdfPath },
    { new: true }
  );
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json({ pdfUrl, localPdfUrl, booking });
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

const getTotalCount = async (req, res) => {
  const total = await Booking.countDocuments();
  res.json({ total });
};

const getStats = async (req, res) => {
  try {
    const allBookings = await Booking.find().populate('createdBy', 'username');
    
    let totalAmount = 0;
    let totalProfit = 0;
    let phonepeAmount = 0;
    let cashAmount = 0;
    
    const adminStats = {};

    allBookings.forEach(b => {
      const amt = b.amount || 200;
      const prf = b.profit || 50;
      
      totalAmount += amt;
      totalProfit += prf;
      
      if (b.paymentMethod === 'phonepe') phonepeAmount += amt;
      if (b.paymentMethod === 'cash') cashAmount += amt;
      
      if (b.createdBy) {
        const adminId = b.createdBy._id.toString();
        if (!adminStats[adminId]) {
          adminStats[adminId] = {
            username: b.createdBy.username,
            count: 0,
            amount: 0,
            profit: 0
          };
        }
        adminStats[adminId].count += 1;
        adminStats[adminId].amount += amt;
        adminStats[adminId].profit += prf;
      }
    });

    res.json({
      overall: {
        totalAmount,
        totalProfit,
        phonepeAmount,
        cashAmount,
        count: allBookings.length
      },
      admins: Object.values(adminStats)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, create, update, remove, uploadPdf, getReminderBookings, getTotalCount, getStats };
