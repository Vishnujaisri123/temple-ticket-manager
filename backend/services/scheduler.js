const cron = require('node-cron');
const fs = require('fs');
const Booking = require('../models/Booking');
const DeletedTicket = require('../models/DeletedTicket');
const DeletedTicketsLog = require('../models/DeletedTicketsLog');
const { deleteFromCloudinary } = require('../config/cloudinary');

// Helper to get start of today in Asia/Kolkata timezone representation as UTC Date
const getISTTodayStart = () => {
  const kolkataTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const [month, day, year] = kolkataTime.split('/');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
};

// Helper to extract Cloudinary public ID from PDF URL
const extractPublicId = (url) => {
  if (!url) return null;
  const match = url.match(/temple_tickets\/[^\/]+$/);
  if (match) {
    return match[0];
  }
  return null;
};

// The core cleanup logic function
const runCleanup = async () => {
  console.log('[Cron] Starting expired tickets cleanup job...');
  try {
    const todayStart = getISTTodayStart();
    
    // Find all expired bookings (visitDate strictly before todayStart)
    const expiredBookings = await Booking.find({ visitDate: { $lt: todayStart } });
    console.log(`[Cron] Found ${expiredBookings.length} expired bookings to process`);
    
    if (expiredBookings.length > 0) {
      const deletedTime = new Date();
      const expiredIds = expiredBookings.map(b => b._id);
      
      // Process each expired booking
      for (const booking of expiredBookings) {
        // 1. Delete from Cloudinary if pdfUrl exists and matches Cloudinary
        if (booking.pdfUrl) {
          const publicId = extractPublicId(booking.pdfUrl);
          if (publicId) {
            try {
              await deleteFromCloudinary(publicId);
              console.log(`[Cron] Deleted PDF from Cloudinary: ${publicId}`);
            } catch (cloudinaryErr) {
              console.error(`[Cron] Failed to delete Cloudinary PDF for booking ${booking._id}:`, cloudinaryErr.message);
            }
          }
        }
        
        // 2. Delete local PDF file if in development/local storage
        if (booking.localPdfPath && fs.existsSync(booking.localPdfPath)) {
          try {
            fs.unlinkSync(booking.localPdfPath);
            console.log(`[Cron] Deleted local PDF: ${booking.localPdfPath}`);
          } catch (fsErr) {
            console.error(`[Cron] Failed to delete local PDF for booking ${booking._id}:`, fsErr.message);
          }
        }
        
        // 3. Move/Archive ticket to DeletedTicket collection
        await DeletedTicket.create({
          ticketDetails: booking.toObject(),
          pdfUrl: booking.pdfUrl || booking.localPdfUrl || '',
          deletedAt: deletedTime
        });
        
        // 4. Create system log entry in DeletedTicketsLog
        await DeletedTicketsLog.create({
          memberName: booking.member1 + (booking.member2 ? ` & ${booking.member2}` : ''),
          phone: booking.phone,
          visitDate: booking.visitDate,
          deletedAt: deletedTime,
          createdBy: booking.createdBy
        });
      }
      
      // 5. Delete bookings from the database
      const deleteResult = await Booking.deleteMany({ _id: { $in: expiredIds } });
      console.log(`[Cron] Successfully deleted ${deleteResult.deletedCount} bookings from the primary database`);
    }
    
    // 6. Permanently delete archived tickets older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const archiveCleanupResult = await DeletedTicket.deleteMany({ deletedAt: { $lt: thirtyDaysAgo } });
    if (archiveCleanupResult.deletedCount > 0) {
      console.log(`[Cron] Permanently removed ${archiveCleanupResult.deletedCount} old archived tickets from DeletedTickets (older than 30 days)`);
    }
    
  } catch (err) {
    console.error('[Cron] Error during scheduler execution:', err);
  }
};

// Runs every day at midnight (12:00 AM) in Asia/Kolkata timezone
const startScheduler = () => {
  // Run immediate cleanup on startup
  setTimeout(async () => {
    console.log('[Cron] Running startup expired tickets cleanup job...');
    await runCleanup();
  }, 5000); // Wait 5 seconds after startup for DB connection readiness

  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily expired tickets cleanup job...');
    await runCleanup();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log('[Cron] Scheduler started for Asia/Kolkata timezone');
};

module.exports = startScheduler;
