const path = require('path');
const fs = require('fs');
const Booking = require('../models/Booking');
const Admin = require('../models/Admin');
const { uploadToCloudinary } = require('../config/cloudinary');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const performAutoCorrection = async (adminId) => {
  try {
    await Booking.updateMany(
      {
        createdBy: adminId,
        pdfSent: true,
        $or: [{ pdfUrl: '' }, { pdfUrl: null }, { pdfUrl: { $exists: false } }]
      },
      { $set: { pdfSent: false } }
    );
  } catch (err) {
    console.error('[AutoCorrection] Failed to correct booking states:', err.message);
  }
};

const getAll = async (req, res) => {
  await performAutoCorrection(req.admin.id);
  const { status, sort, weekly, filterType, startDate, endDate, searchQuery } = req.query;
  let filter = { createdBy: req.admin.id };

  const { getCurrentWeekStart, getCurrentWeekEnd } = require('../services/weeklyStatsService');
  const startOfWeek = getCurrentWeekStart();
  const endOfWeek = getCurrentWeekEnd(startOfWeek);

  if (weekly === 'true' || filterType === 'current_week') {
    filter.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
  } else if (filterType === 'previous_week') {
    const prevStartOfWeek = new Date(startOfWeek);
    prevStartOfWeek.setDate(startOfWeek.getDate() - 7);
    const prevEndOfWeek = new Date(endOfWeek);
    prevEndOfWeek.setDate(endOfWeek.getDate() - 7);
    filter.createdAt = { $gte: prevStartOfWeek, $lte: prevEndOfWeek };
  } else if (filterType === 'further_date') {
    filter.createdAt = { $lt: startOfWeek };
  } else if (filterType === 'monthly') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    filter.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
  } else if (filterType === 'custom' && startDate && endDate) {
    const sD = new Date(startDate);
    sD.setHours(0, 0, 0, 0);
    const eD = new Date(endDate);
    eD.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: sD, $lte: eD };
  }

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
    if (weekly === 'true') {
      filter.pdfSent = false;
      filter.$nor = [{ completed: true, paid: true }];
    }
  }

  filter = applySearchQuery(filter, searchQuery);

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
  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
};

const remove = async (req, res) => {
  const booking = await Booking.findOneAndDelete({ _id: req.params.id });
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
    // Production: Respond IMMEDIATELY, then upload to Cloudinary in background
    // We update localPdfUrl to a temporary string so the UI knows a PDF exists, even while it's processing
    const booking = await Booking.findByIdAndUpdate(id, { localPdfUrl: 'processing...', pdfUploaded: true }, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Respond instantly so the UI doesn't hang
    res.json({ pdfUrl: '', localPdfUrl: 'processing...', booking });
    
    // Background Cloudinary upload
    uploadToCloudinary(req.file.buffer, `ticket_${id}_${Date.now()}`)
      .then(result => {
        Booking.findByIdAndUpdate(id, { pdfUrl: result.secure_url, localPdfUrl: result.secure_url, pdfUploaded: true }).exec();
      })
      .catch(err => console.error('Cloudinary upload failed:', err.message));
      
  } else {
    // Development: save locally and respond IMMEDIATELY, then upload to Cloudinary in background
    const localFilename = `ticket_${Date.now()}.pdf`;
    localPdfPath = path.join(uploadDir, localFilename);
    fs.writeFileSync(localPdfPath, req.file.buffer);
    localPdfUrl = `${process.env.SERVER_URL}/uploads/${localFilename}`;
    pdfUrl = localPdfUrl;

    const booking = await Booking.findByIdAndUpdate(id, { pdfUrl, localPdfUrl, localPdfPath, pdfUploaded: true }, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Respond instantly
    res.json({ pdfUrl, localPdfUrl, booking });

    // Background Cloudinary upload
    uploadToCloudinary(req.file.buffer, `ticket_${id}_${Date.now()}`)
      .then(result => Booking.findByIdAndUpdate(id, { pdfUrl: result.secure_url, pdfUploaded: true }).exec())
      .catch(err => console.error('Cloudinary background upload failed:', err.message));

    // Clean up old local file
    const existing = await Booking.findById(id);
    if (existing?.localPdfPath && fs.existsSync(existing.localPdfPath)) {
      try { fs.unlinkSync(existing.localPdfPath); } catch (e) {}
    }
  }
};




const getReminderBookings = async (req, res) => {
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getDate() + 2);
  const start = new Date(target.setHours(0, 0, 0, 0));
  const end = new Date(target.setHours(23, 59, 59, 999));
  const bookings = await Booking.find({
    createdBy: req.admin.id,
    visitDate: { $gte: start, $lte: end },
    reminderSent: false,
  });
  res.json(bookings);
};

const getTotalCount = async (req, res) => {
  const total = await Booking.countDocuments({ createdBy: req.admin.id });
  res.json({ total });
};

const getStats = async (req, res) => {
  try {
    const { getWeeklyStats } = require('../services/weeklyStatsService');
    const weeklyStats = await getWeeklyStats(req.admin.id);
    const allBookings = await Booking.find({ createdBy: req.admin.id }).populate('createdBy', 'username');
    
    let totalAmount = 0;
    let totalProfit = 0;
    let phonepeAmount = 0;
    let cashAmount = 0;
    let sentCount = 0;
    let paidCount = 0;
    
    const adminStats = {};
    const dailyStats = {};
    const todayKey = new Date().toISOString().split('T')[0];
    const todayStats = {
      totalAmount: 0, totalProfit: 0, phonepeAmount: 0, cashAmount: 0,
      paidCount: 0, sentCount: 0, count: 0
    };

    allBookings.forEach(b => {
      const amt = b.amount || 200;
      const prf = b.profit || 50;
      
      totalAmount += amt;
      totalProfit += prf;
      if (b.paid) paidCount++;
      if (b.pdfSent) sentCount++;
      
      if (b.paymentType === 'phonepe') phonepeAmount += amt;
      if (b.paymentType === 'cash') cashAmount += amt;
      
      const dateKey = b.createdAt ? b.createdAt.toISOString().split('T')[0] : 'Unknown';
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          totalAmount: 0,
          totalProfit: 0,
          phonepeAmount: 0,
          cashAmount: 0,
          count: 0
        };
      }
      dailyStats[dateKey].count++;
      dailyStats[dateKey].totalAmount += amt;
      dailyStats[dateKey].totalProfit += prf;
      if (b.paymentType === 'phonepe') dailyStats[dateKey].phonepeAmount += amt;
      if (b.paymentType === 'cash') dailyStats[dateKey].cashAmount += amt;

      if (dateKey === todayKey) {
        todayStats.count++;
        todayStats.totalAmount += amt;
        todayStats.todayProfit = (todayStats.todayProfit || 0) + prf; // keep compatible
        todayStats.totalProfit += prf;
        if (b.paid) todayStats.paidCount++;
        if (b.pdfSent) todayStats.sentCount++;
        if (b.paymentType === 'phonepe') todayStats.phonepeAmount += amt;
        if (b.paymentType === 'cash') todayStats.cashAmount += amt;
      }
      
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
      today: todayStats,
      weekly: weeklyStats,
      overall: {
        totalAmount,
        totalProfit,
        phonepeAmount,
        cashAmount,
        paidCount,
        sentCount,
        count: allBookings.length
      },
      admins: Object.values(adminStats),
      daily: Object.values(dailyStats).sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const claimOrphans = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    
    // Aggressively assign ALL bookings in the database to the current user
    const result = await Booking.updateMany(
      {},
      { $set: { createdBy: req.admin.id } }
    );
    
    res.json({ message: `Successfully transferred all ${result.modifiedCount} bookings in the database to your account!` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const applySearchQuery = (baseFilter, searchQuery) => {
  if (!searchQuery) return baseFilter;

  const regex = { $regex: searchQuery, $options: 'i' };
  const orConditions = [
    { member1: regex },
    { member2: regex },
    { phone: regex },
    { gothram: regex }
  ];

  // Try parsing date in DD/MM/YYYY or DD-MM-YYYY format
  const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = searchQuery.match(dateRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    
    const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    start.setMinutes(start.getMinutes() - 330); // shift UTC to IST start of day (UTC+5:30)
    
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    end.setMinutes(end.getMinutes() - 330); // shift UTC to IST end of day (UTC+5:30)

    orConditions.push({ visitDate: { $gte: start, $lte: end } });
    orConditions.push({ bookingDate: { $gte: start, $lte: end } });
    orConditions.push({ createdAt: { $gte: start, $lte: end } });
  }

  const result = { ...baseFilter };
  result.$and = result.$and || [];
  result.$and.push({ $or: orConditions });
  return result;
};

const getISTTodayEnd = () => {
  const kolkataTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const [month, day, year] = kolkataTime.split('/');
  const end = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
  end.setMinutes(end.getMinutes() - 330);
  return end;
};

const buildHistoryFilter = (adminId, subSection, dateFilter, startDate, endDate, ticketFilter) => {
  const mongoose = require('mongoose');
  let filter = { 
    createdBy: new mongoose.Types.ObjectId(adminId),
    createdAt: { $exists: true, $ne: null } 
  };
  
  const { getCurrentWeekStart, getCurrentWeekEnd } = require('../services/weeklyStatsService');
  const startOfWeek = getCurrentWeekStart();
  const endOfWeek = getCurrentWeekEnd(startOfWeek);

  if (subSection === 'weekly') {
    if (ticketFilter === 'completed_paid') {
      // Completed & Paid: completed = true AND paid = true AND pdfUrl is empty/null/missing
      filter.completed = true;
      filter.paid = true;
      filter.$or = [{ pdfUrl: '' }, { pdfUrl: null }, { pdfUrl: { $exists: false } }];
    } else if (ticketFilter === 'sent') {
      // Tickets Sent: pdfUrl is not empty/null
      filter.pdfUrl = { $nin: ['', null], $exists: true };
    } else {
      // All Tickets (Weekly History): Shows completed, sent, and pdf-attached tickets
      filter.$or = [
        { completed: true },
        { pdfUrl: { $nin: ['', null], $exists: true } }
      ];
    }

    // Apply weekly/custom date filters on createdAt
    if (dateFilter === 'current_week') {
      filter.createdAt = { ...filter.createdAt, $gte: startOfWeek, $lte: endOfWeek };
    } else if (dateFilter === 'previous_week') {
      const prevStartOfWeek = new Date(startOfWeek);
      prevStartOfWeek.setDate(startOfWeek.getDate() - 7);
      const prevEndOfWeek = new Date(endOfWeek);
      prevEndOfWeek.setDate(endOfWeek.getDate() - 7);
      filter.createdAt = { ...filter.createdAt, $gte: prevStartOfWeek, $lte: prevEndOfWeek };
    } else if (dateFilter === 'custom' && startDate && endDate) {
      const sD = new Date(startDate);
      sD.setHours(0, 0, 0, 0);
      const eD = new Date(endDate);
      eD.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $gte: sD, $lte: eD };
    }
  } else if (subSection === 'completed') {
    // Completed Tickets (Legacy/Alias)
    filter.completed = true;
    filter.$or = [{ pdfUrl: '' }, { pdfUrl: null }, { pdfUrl: { $exists: false } }];
  } else if (subSection === 'sent') {
    // Sent Tickets (Legacy/Alias)
    filter.pdfUrl = { $nin: ['', null], $exists: true };
  } else if (subSection === 'reports') {
    // Reports: Shows active/non-completed/non-sent records where bookingDate <= currentLiveDate
    filter.completed = false;
    filter.pdfSent = false;
    filter.bookingDate = { $lte: getISTTodayEnd() };
  } else if (subSection === 'further') {
    // Further Date Bookings: Shows future bookings only (non-completed, non-sent) where bookingDate > currentLiveDate
    filter.completed = false;
    filter.pdfSent = false;
    filter.bookingDate = { $gt: getISTTodayEnd() };
  }

  return filter;
};

const getHistoryFolders = async (req, res) => {
  try {
    await performAutoCorrection(req.admin.id);
    const { subSection, dateFilter, startDate, endDate, searchQuery, sort, ticketFilter } = req.query;
    let baseFilter = buildHistoryFilter(req.admin.id, subSection, dateFilter, startDate, endDate, ticketFilter);
    baseFilter = applySearchQuery(baseFilter, searchQuery);

    // Group the folder counts by createdAt date in Asia/Kolkata timezone (formatted as YYYY-MM-DD)
    const pipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: sort === 'asc' ? 1 : -1 } }
    ];

    const folders = await Booking.aggregate(pipeline);

    // Also get statistical summary for reports or general history
    const statsPipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$amount", 200] } },
          totalProfit: { $sum: { $ifNull: ["$profit", 50] } },
          paidCount: {
            $sum: { $cond: ["$paid", 1, 0] }
          },
          unpaidCount: {
            $sum: { $cond: ["$paid", 0, 1] }
          },
          completedCount: {
            $sum: { $cond: ["$completed", 1, 0] }
          },
          sentCount: {
            $sum: { $cond: ["$pdfSent", 1, 0] }
          }
        }
      }
    ];

    const statsResult = await Booking.aggregate(statsPipeline);
    const stats = statsResult[0] || { count: 0, totalAmount: 0, totalProfit: 0, paidCount: 0, unpaidCount: 0, completedCount: 0, sentCount: 0 };

    if (subSection === 'weekly') {
      const mongoose = require('mongoose');
      const adminObjId = new mongoose.Types.ObjectId(req.admin.id);

      // Define date query for weekly count alignment
      let dateQuery = {};
      const { getCurrentWeekStart, getCurrentWeekEnd } = require('../services/weeklyStatsService');
      const startOfWeek = getCurrentWeekStart();
      const endOfWeek = getCurrentWeekEnd(startOfWeek);

      if (dateFilter === 'current_week') {
        dateQuery.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
      } else if (dateFilter === 'previous_week') {
        const prevStartOfWeek = new Date(startOfWeek);
        prevStartOfWeek.setDate(startOfWeek.getDate() - 7);
        const prevEndOfWeek = new Date(endOfWeek);
        prevEndOfWeek.setDate(endOfWeek.getDate() - 7);
        dateQuery.createdAt = { $gte: prevStartOfWeek, $lte: prevEndOfWeek };
      } else if (dateFilter === 'custom' && startDate && endDate) {
        const sD = new Date(startDate);
        sD.setHours(0, 0, 0, 0);
        const eD = new Date(endDate);
        eD.setHours(23, 59, 59, 999);
        dateQuery.createdAt = { $gte: sD, $lte: eD };
      }

      // Total Records: completed = true OR pdfUrl not empty
      const weeklyTotalCount = await Booking.countDocuments({
        createdBy: adminObjId,
        ...dateQuery,
        $or: [
          { completed: true },
          { pdfUrl: { $nin: ['', null], $exists: true } }
        ]
      });

      // Completed & Paid: completed = true AND paid = true AND pdfUrl is empty/null/missing
      const weeklyCompletedPaidCount = await Booking.countDocuments({
        createdBy: adminObjId,
        completed: true,
        paid: true,
        ...dateQuery,
        $or: [{ pdfUrl: '' }, { pdfUrl: null }, { pdfUrl: { $exists: false } }]
      });

      // Tickets Sent: pdfUrl not empty
      const weeklySentCount = await Booking.countDocuments({
        createdBy: adminObjId,
        ...dateQuery,
        pdfUrl: { $nin: ['', null], $exists: true }
      });

      stats.weeklyTotalCount = weeklyTotalCount;
      stats.weeklySentCount = weeklySentCount;
      stats.weeklyCompletedPaidCount = weeklyCompletedPaidCount;

      if (process.env.NODE_ENV !== 'production') {
        console.log('Weekly History Counts (Debug):');
        console.log('  Total Records:', stats.weeklyTotalCount);
        console.log('  Completed & Paid:', stats.weeklyCompletedPaidCount);
        console.log('  Tickets Sent:', stats.weeklySentCount);
      }
    }

    res.json({ folders, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getHistoryTickets = async (req, res) => {
  try {
    await performAutoCorrection(req.admin.id);
    const { subSection, dateFilter, startDate, endDate, searchQuery, bookingDate, sort, ticketFilter } = req.query;
    let baseFilter = buildHistoryFilter(req.admin.id, subSection, dateFilter, startDate, endDate, ticketFilter);
    
    if (bookingDate) {
      const [year, month, day] = bookingDate.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      start.setMinutes(start.getMinutes() - 330); // shift UTC to IST start of day (UTC+5:30)
      
      const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      end.setMinutes(end.getMinutes() - 330); // shift UTC to IST end of day (UTC+5:30)
      
      baseFilter.createdAt = { $gte: start, $lte: end };
    }

    baseFilter = applySearchQuery(baseFilter, searchQuery);

    let sortObj = { visitDate: sort === 'asc' ? 1 : -1, phone: 1 };
    if (sort === 'phone') {
      sortObj = { phone: 1, visitDate: 1 };
    }

    const tickets = await Booking.find(baseFilter).sort(sortObj).lean();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAutoDeletedLogs = async (req, res) => {
  try {
    const { since } = req.query;
    let query = { createdBy: req.admin.id };
    if (since) {
      query.deletedAt = { $gt: new Date(since) };
    } else {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      query.deletedAt = { $gt: oneDayAgo };
    }
    const DeletedTicketsLog = require('../models/DeletedTicketsLog');
    const logs = await DeletedTicketsLog.find(query).sort({ deletedAt: -1 }).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
  uploadPdf,
  getReminderBookings,
  getTotalCount,
  getStats,
  claimOrphans,
  getHistoryFolders,
  getHistoryTickets,
  getAutoDeletedLogs
};
