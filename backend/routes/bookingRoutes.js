const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getAll, create, update, remove, uploadPdf, getReminderBookings, getTotalCount, getStats, claimOrphans,
  getHistoryFolders, getHistoryTickets, getAutoDeletedLogs, sendWhatsApp
} = require('../controllers/bookingController');

router.use(protect);

router.post('/claim-orphans', claimOrphans);

router.get('/stats', getStats);
router.get('/count', getTotalCount);
router.get('/reminders', getReminderBookings);
router.get('/history/folders', getHistoryFolders);
router.get('/history/tickets', getHistoryTickets);
router.get('/history/auto-deleted', getAutoDeletedLogs);
router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/upload', upload.single('pdf'), uploadPdf);
router.post('/:id/send-whatsapp', sendWhatsApp);

module.exports = router;
