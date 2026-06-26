import { useState, useEffect, useCallback } from 'react';
import { getBookings, getStats, claimOrphans, getAutoDeletedLogs, getAudioSettings, uploadAudio, updateBooking, sendWhatsApp } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import BookingTable from '../components/BookingTable';
import AddBookingForm from '../components/AddBookingForm';
import History from './History';
import {
  FiActivity,
  FiUser,
  FiSun,
  FiMoon,
  FiClipboard,
  FiCalendar,
  FiDollarSign,
  FiCheckCircle,
  FiSend,
  FiVolume2,
  FiSettings,
  FiPlay,
  FiPause,
  FiStopCircle,
  FiRefreshCw,
  FiAlertTriangle,
  FiInfo,
} from 'react-icons/fi';
import { LuLayoutDashboard, LuHistory } from 'react-icons/lu';
import { HiOutlineDocumentReport, HiTrendingUp } from 'react-icons/hi';
import { MdPhoneAndroid } from 'react-icons/md';
import { TbCash, TbDatabaseImport } from 'react-icons/tb';



const Dashboard = () => {
  const { username, logout } = useAuth();
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'history' | 'daily'
  const [bookings, setBookings] = useState([]);
  const filter = 'all';
  const [sort, setSort] = useState('asc');
  const [stats, setStats] = useState({ overall: {}, admins: [], today: {}, weekly: {} });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySubSection, setHistorySubSection] = useState('weekly');

  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Queue and Automation States
  const [autoSendInterval, setAutoSendInterval] = useState(
    parseInt(localStorage.getItem('autoSendInterval')) || 180000
  );
  const [autoSendMode, setAutoSendMode] = useState(
    localStorage.getItem('autoSendMode') || 'api'
  );

  const [queueIsRunning, setQueueIsRunning] = useState(false);
  const [queueTickets, setQueueTickets] = useState([]);
  const [queueCurrentIndex, setQueueCurrentIndex] = useState(0);
  const [queueProgress, setQueueProgress] = useState({ completed: 0, total: 0, success: 0, failed: 0 });
  const [queueCurrentTicket, setQueueCurrentTicket] = useState(null);
  const [queueTimer, setQueueTimer] = useState(null);
  const [queueWaitTimeLeft, setQueueWaitTimeLeft] = useState(0);
  const [queueConfirmWaiting, setQueueConfirmWaiting] = useState(false);

  useEffect(() => {
    if (page === 'dashboard' || page === 'settings') {
      getAudioSettings()
        .then(({ data }) => {
          setCurrentAudioUrl(data.audioUrl || '');
        })
        .catch(() => {});
    }
  }, [page]);

  const handleAudioChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      setSelectedAudioFile(file);
    }
  };

  const handleAudioUpload = async () => {
    if (!selectedAudioFile) return;
    setUploadingAudio(true);
    const formData = new FormData();
    formData.append('audio', selectedAudioFile);

    try {
      const { data } = await uploadAudio(formData);
      setCurrentAudioUrl(data.audioUrl);
      setSelectedAudioFile(null);
      toast.success('Voice message audio uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload audio');
    } finally {
      setUploadingAudio(false);
    }
  };

  // Persist settings changes
  const handleIntervalChange = (val) => {
    const ms = parseInt(val);
    setAutoSendInterval(ms);
    localStorage.setItem('autoSendInterval', ms);
  };

  const handleModeChange = (val) => {
    setAutoSendMode(val);
    localStorage.setItem('autoSendMode', val);
  };

  // Start the Queue
  const startQueue = (tickets) => {
    if (tickets.length === 0) {
      toast.error('No tickets to send');
      return;
    }

    const sortedTickets = [...tickets].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    setQueueTickets(sortedTickets);
    setQueueCurrentIndex(0);
    setQueueProgress({
      completed: 0,
      total: sortedTickets.length,
      success: 0,
      failed: 0
    });
    setQueueIsRunning(true);
    setQueueConfirmWaiting(false);
    
    processQueueTicket(sortedTickets, 0);
  };

  // Process a ticket
  const processQueueTicket = async (ticketsList, index) => {
    if (index >= ticketsList.length) {
      setQueueIsRunning(false);
      setQueueCurrentTicket(null);
      toast.success('Auto Send Queue completed!');
      return;
    }

    const ticket = ticketsList[index];
    setQueueCurrentTicket(ticket);
    setQueueCurrentIndex(index);

    try {
      await updateBooking(ticket._id, { queueStatus: 'sending' });
      window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: { ...ticket, queueStatus: 'sending' } }));
    } catch (err) {
      console.error('Failed to set status to sending:', err);
    }

    if (autoSendMode === 'api') {
      try {
        const { data } = await sendWhatsApp(ticket._id);
        
        await updateBooking(ticket._id, { 
          queueStatus: 'sent', 
          sent: true, 
          pdfSent: true, 
          sentAt: new Date().toISOString(), 
          deliveryStatus: 'sent', 
          errorMessage: '' 
        });

        const updatedTicket = { 
          ...ticket, 
          queueStatus: 'sent', 
          sent: true, 
          pdfSent: true, 
          sentAt: new Date().toISOString(), 
          deliveryStatus: 'sent', 
          errorMessage: '' 
        };
        window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));
        
        setQueueProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
          success: prev.success + 1
        }));

        toast.success(`Sent ticket to ${ticket.member1}`);

        startIntervalCountdown(ticketsList, index + 1);
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'WhatsApp sending failed';
        const nextRetryCount = (ticket.queueRetryCount || 0) + 1;

        if (nextRetryCount < 3) {
          await updateBooking(ticket._id, { 
            queueStatus: 'pending', 
            queueRetryCount: nextRetryCount, 
            queueErrorMessage: errMsg 
          });

          const updatedTicket = { 
            ...ticket, 
            queueStatus: 'pending', 
            queueRetryCount: nextRetryCount, 
            queueErrorMessage: errMsg 
          };
          window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));

          toast.warning(`Failed sending to ${ticket.member1}. Retry 1/2 scheduled in 5 mins.`);

          setTimeout(() => {
            retryTicketBackground(ticket);
          }, 300000); // 5 minutes

          setQueueProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
            failed: prev.failed + 1
          }));

          startIntervalCountdown(ticketsList, index + 1);
        } else {
          await updateBooking(ticket._id, { 
            queueStatus: 'failed', 
            queueRetryCount: nextRetryCount, 
            queueErrorMessage: errMsg,
            sent: false
          });

          const updatedTicket = { 
            ...ticket, 
            queueStatus: 'failed', 
            queueRetryCount: nextRetryCount, 
            queueErrorMessage: errMsg,
            sent: false
          };
          window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));

          toast.error(`Failed sending to ${ticket.member1} after 3 attempts. Moved to Failed Queue.`);

          setQueueProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
            failed: prev.failed + 1
          }));

          startIntervalCountdown(ticketsList, index + 1);
        }
      }
    } else {
      // Browser Mode
      setQueueConfirmWaiting(true);

      const visitDateStr = ticket.visitDate 
        ? new Date(ticket.visitDate).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
        : '—';
      const timeslot = ticket.slotTime || '—';
      
      let phone = ticket.phone.replace(/\D/g, '');
      if (phone.startsWith('0')) phone = phone.slice(1);
      if (!phone.startsWith('91')) phone = '91' + phone;

      const audioPart = currentAudioUrl
        ? `\n\n🎵 Listen to the voice message 👇\n${currentAudioUrl}`
        : '';

      const message = `🛕 శ్రీ వేంకటేశ్వర స్వామి వారి ఆశీస్సులతో 🛕

🌺 నమస్కారం ${ticket.member1} గారు,

మీ వడపల్లి శ్రీ వేంకటేశ్వర స్వామి వారి అష్టోత్తర సేవ (Astothram) టికెట్ సిద్ధంగా ఉంది.

🗓️ తేదీ | Date: ${visitDateStr}

🕘 సమయం | Time: ${timeslot}

🖨️ దయచేసి ఈ టికెట్కు ప్రింట్ తీసుకుని దేవాలయానికి తప్పనిసరిగా తీసుకురండి.

🖨️ Please take a printout of this ticket and bring it with you to the temple.

🪔 పూజా సామగ్రి (Pooja Items) కావాలంటే, బుక్ చేసిన తేదీకి కనీసం 3 రోజుల ముందు ఈ నంబర్ను సంప్రదించండి: 📞 8331923995

🪔 If you require Pooja items, please contact 📞 8331923995 at least 3 days before your booked date.

🙏 ధన్యవాదాలు | Thank You

🛕 వడపల్లి శ్రీ వేంకటేశ్వర స్వామి దేవస్థానం🛕

📄 Download your ticket here 👇
${ticket.pdfUrl}${audioPart}`;

      const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
      window.location.href = url;

      toast.info(`Opened WhatsApp Web for ${ticket.member1}. Please attach files, send, and confirm.`);
    }
  };

  // Background retry
  const retryTicketBackground = async (ticket) => {
    try {
      await updateBooking(ticket._id, { queueStatus: 'sending' });
      await sendWhatsApp(ticket._id);
      
      await updateBooking(ticket._id, { 
        queueStatus: 'sent', 
        sent: true, 
        pdfSent: true, 
        sentAt: new Date().toISOString(), 
        deliveryStatus: 'sent', 
        errorMessage: '' 
      });

      const updatedTicket = { 
        ...ticket, 
        queueStatus: 'sent', 
        sent: true, 
        pdfSent: true, 
        sentAt: new Date().toISOString(), 
        deliveryStatus: 'sent', 
        errorMessage: '' 
      };
      window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));

      toast.success(`Background retry succeeded: Sent ticket to ${ticket.member1}`);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'WhatsApp sending failed';
      const nextRetryCount = (ticket.queueRetryCount || 0) + 1;

      if (nextRetryCount < 3) {
        await updateBooking(ticket._id, { 
          queueStatus: 'pending', 
          queueRetryCount: nextRetryCount, 
          queueErrorMessage: errMsg 
        });

        const updatedTicket = { 
          ...ticket, 
          queueStatus: 'pending', 
          queueRetryCount: nextRetryCount, 
          queueErrorMessage: errMsg 
        };
        window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));

        toast.warning(`Background retry failed for ${ticket.member1}. Retrying again in 5 minutes.`);
        
        setTimeout(() => {
          retryTicketBackground({ ...ticket, queueRetryCount: nextRetryCount });
        }, 300000);
      } else {
        await updateBooking(ticket._id, { 
          queueStatus: 'failed', 
          queueRetryCount: nextRetryCount, 
          queueErrorMessage: errMsg,
          sent: false
        });

        const updatedTicket = { 
          ...ticket, 
          queueStatus: 'failed', 
          queueRetryCount: nextRetryCount, 
          queueErrorMessage: errMsg,
          sent: false
        };
        window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));

        toast.error(`Background retry failed for ${ticket.member1} after 3 attempts. Moved to Failed Queue.`);
      }
    }
  };

  // Start Interval countdown
  const startIntervalCountdown = (ticketsList, nextIndex) => {
    if (queueTimer) clearInterval(queueTimer);

    let timeLeft = autoSendInterval / 1000;
    setQueueWaitTimeLeft(timeLeft);

    const intervalTimer = setInterval(() => {
      timeLeft--;
      setQueueWaitTimeLeft(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(intervalTimer);
        processQueueTicket(ticketsList, nextIndex);
      }
    }, 1000);

    setQueueTimer(intervalTimer);
  };

  // Stop Queue
  const stopQueue = () => {
    if (queueTimer) {
      clearInterval(queueTimer);
    }
    setQueueIsRunning(false);
    setQueueTimer(null);
    setQueueWaitTimeLeft(0);
    toast.info('Queue paused by administrator');
  };

  // Resume Queue
  const resumeQueue = () => {
    if (queueTickets.length === 0) {
      toast.error('No tickets in queue');
      return;
    }
    setQueueIsRunning(true);
    setQueueConfirmWaiting(false);
    processQueueTicket(queueTickets, queueCurrentIndex);
  };

  // Confirm Browser Sent
  const handleConfirmSent = async () => {
    if (!queueCurrentTicket) return;
    const ticket = queueCurrentTicket;
    setQueueConfirmWaiting(false);

    try {
      await updateBooking(ticket._id, { 
        queueStatus: 'sent', 
        sent: true, 
        pdfSent: true, 
        sentAt: new Date().toISOString(), 
        deliveryStatus: 'sent', 
        errorMessage: '' 
      });

      const updatedTicket = { 
        ...ticket, 
        queueStatus: 'sent', 
        sent: true, 
        pdfSent: true, 
        sentAt: new Date().toISOString(), 
        deliveryStatus: 'sent', 
        errorMessage: '' 
      };
      window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));

      setQueueProgress(prev => ({
        ...prev,
        completed: prev.completed + 1,
        success: prev.success + 1
      }));

      toast.success(`Confirmed sent for ${ticket.member1}`);

      startIntervalCountdown(queueTickets, queueCurrentIndex + 1);
    } catch (err) {
      toast.error('Failed to confirm ticket status');
    }
  };

  // Confirm Browser Failed
  const handleConfirmFailed = async () => {
    if (!queueCurrentTicket) return;
    const ticket = queueCurrentTicket;
    setQueueConfirmWaiting(false);

    const errMsg = 'Administrator marked as failed in Browser Mode';
    const nextRetryCount = (ticket.queueRetryCount || 0) + 1;

    try {
      if (nextRetryCount < 3) {
        await updateBooking(ticket._id, { 
          queueStatus: 'pending', 
          queueRetryCount: nextRetryCount, 
          queueErrorMessage: errMsg 
        });

        const updatedTicket = { 
          ...ticket, 
          queueStatus: 'pending', 
          queueRetryCount: nextRetryCount, 
          queueErrorMessage: errMsg 
        };
        window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));

        toast.warning(`Marked failed for ${ticket.member1}. Retry 1/2 scheduled in 5 mins.`);

        setTimeout(() => {
          retryTicketBackground(ticket);
        }, 300000);

        setQueueProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
          failed: prev.failed + 1
        }));

        startIntervalCountdown(queueTickets, queueCurrentIndex + 1);
      } else {
        await updateBooking(ticket._id, { 
          queueStatus: 'failed', 
          queueRetryCount: nextRetryCount, 
          queueErrorMessage: errMsg,
          sent: false
        });

        const updatedTicket = { 
          ...ticket, 
          queueStatus: 'failed', 
          queueRetryCount: nextRetryCount, 
          queueErrorMessage: errMsg,
          sent: false
        };
        window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedTicket }));

        toast.error(`Marked failed for ${ticket.member1} after 3 attempts. Moved to Failed Queue.`);

        setQueueProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
          failed: prev.failed + 1
        }));

        startIntervalCountdown(queueTickets, queueCurrentIndex + 1);
      }
    } catch (err) {
      toast.error('Failed to confirm ticket status');
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (queueTimer) clearInterval(queueTimer);
    };
  }, [queueTimer]);

  const checkAutoDeletedTickets = useCallback(async () => {
    try {
      const lastCheck = localStorage.getItem('lastDeletedCheck');
      // If there's no lastCheck, set it to now and return (so they don't get flooded with ancient deletions on first run)
      if (!lastCheck) {
        localStorage.setItem('lastDeletedCheck', new Date().toISOString());
        return;
      }

      const { data } = await getAutoDeletedLogs({ since: lastCheck });
      if (data && data.length > 0) {
        const count = data.length;
        const ticketText = count === 1 ? '1 expired ticket' : `${count} expired tickets`;
        toast(`${ticketText} archived`, 'success');
      }
      
      // Update check timestamp
      localStorage.setItem('lastDeletedCheck', new Date().toISOString());
    } catch (err) {
      console.error('Failed to check auto-deleted tickets:', err);
    }
  }, []);

  useEffect(() => {
    checkAutoDeletedTickets();
  }, [checkAutoDeletedTickets]);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const filterParam = searchParams.get('filter');

      if (path.startsWith('/history/')) {
        const sub = path.replace('/history/', '');
        setPage('history');
        setHistorySubSection(sub || 'weekly');
        setHistoryFilter(filterParam || 'all');
      } else if (path === '/daily') {
        setPage('daily');
      } else if (path === '/settings') {
        setPage('settings');
      } else if (path === '/' || path === '/login') {
        setPage('dashboard');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (pageName, subSection = 'weekly', filterVal = 'all') => {
    if (pageName === 'history') {
      window.history.pushState({}, '', `/history/${subSection}?filter=${filterVal}`);
      setPage('history');
      setHistorySubSection(subSection);
      setHistoryFilter(filterVal);
    } else if (pageName === 'daily') {
      window.history.pushState({}, '', '/daily');
      setPage('daily');
    } else if (pageName === 'settings') {
      window.history.pushState({}, '', '/settings');
      setPage('settings');
    } else {
      window.history.pushState({}, '', '/');
      setPage('dashboard');
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (page === 'dashboard') {
        params.weekly = 'true';
      }
      if (filter !== 'all') params.status = filter;
      params.sort = sort;
      const { data } = await getBookings(params);
      setBookings(data);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, sort, page]);

  useEffect(() => {
    if (page === 'dashboard') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBookings();
    }
  }, [fetchBookings, page]);

  // Fetch total count and financial stats
  useEffect(() => {
    getStats().then(({ data }) => {
      setStats(data);
    }).catch(() => {});
  }, [bookings]); // refetch when bookings change

  useEffect(() => {
    const handleStatsUpdated = () => {
      getStats().then(({ data }) => setStats(data)).catch(() => {});
    };
    window.addEventListener('statsUpdated', handleStatsUpdated);
    return () => window.removeEventListener('statsUpdated', handleStatsUpdated);
  }, []);

  useEffect(() => {
    const handleBookingUpdated = (e) => {
      const updated = e.detail;
      setBookings((prev) => prev.map((b) => b._id === updated._id ? { ...b, ...updated } : b));
    };
    window.addEventListener('bookingUpdated', handleBookingUpdated);
    return () => window.removeEventListener('bookingUpdated', handleBookingUpdated);
  }, []);



  const handleClaimOrphans = async () => {
    if (window.confirm('Do you want to recover old bookings that are not visible? This will assign them to your account.')) {
      try {
        const { data } = await claimOrphans();
        toast.success(data.message);
        fetchBookings();
        getStats().then(({ data }) => setStats(data)).catch(() => {});
      } catch {
        toast.error('Failed to recover data');
      }
    }
  };

  return (
    <div className="app-layout solo-leveling-theme">
      <div className="monarch-particles">
        <div className="particle p1"></div>
        <div className="particle p2"></div>
        <div className="particle p3"></div>
        <div className="particle p4"></div>
        <div className="particle p5"></div>
      </div>
      <nav className="navbar">
        <div className="navbar-top">
          <div className="navbar-brand">
            <span className="icon">
              <FiActivity className="icon-glow icon-pulse" style={{ color: 'var(--accent)' }} />
            </span>
            <div>
              <h1>Temple Ticket Manager</h1>
              <span>Sri Venkateswara Swami Temple, Vadapalli</span>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
        <div className="navbar-bottom">
          <div className="nav-tabs">
            <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => navigateTo('dashboard')}>
              <LuLayoutDashboard className="icon-hover-scale" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Dashboard
            </button>
            <button className={`nav-tab ${page === 'history' ? 'active' : ''}`} onClick={() => navigateTo('history', 'weekly', 'all')}>
              <LuHistory className="icon-hover-scale" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> History
            </button>
            <button className={`nav-tab ${page === 'daily' ? 'active' : ''}`} onClick={() => navigateTo('daily')}>
              <HiOutlineDocumentReport className="icon-hover-scale" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Reports
            </button>
            <button className={`nav-tab ${page === 'settings' ? 'active' : ''}`} onClick={() => navigateTo('settings')}>
              <FiSettings className="icon-hover-scale" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Settings
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn-mode" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <FiSun className="icon-spin" /> : <FiMoon className="icon-pulse" />}
            </button>
            <span className="user" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <FiUser /> {username}
            </span>
            <button className="btn-logout btn-logout-desktop" onClick={logout}>Logout</button>
          </div>
        </div>
      </nav>

      {page === 'history' ? (
        <main className="main-content">
          <History 
            initialFilter={historyFilter} 
            initialSubSection={historySubSection} 
            key={`${historyFilter}-${historySubSection}`}
            queueIsRunning={queueIsRunning}
            startQueue={startQueue}
            stopQueue={stopQueue}
            queueTickets={queueTickets}
            queueCurrentTicket={queueCurrentTicket}
          />
        </main>
      ) : page === 'settings' ? (
        <main className="main-content">
          <div className="dashboard-header">
            <div className="dashboard-title">
              <h2>Settings</h2>
              <p>Configure temple automation, voice messages, and queue parameters</p>
            </div>
          </div>

          <div className="settings-section-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', marginTop: 0, fontSize: '1.05rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>
              <FiSettings /> WhatsApp Automation Settings
            </h3>
            
            <div className="settings-row">
              <div className="settings-label">
                <span className="settings-title-text">Auto Send Mode</span>
                <span className="settings-desc-text">Choose between fully automated API sending or manual browser sending.</span>
              </div>
              <div>
                <select 
                  className="settings-control-select" 
                  value={autoSendMode} 
                  onChange={(e) => handleModeChange(e.target.value)}
                >
                  <option value="api">Auto Send Queue (API)</option>
                  <option value="browser">Auto Send Queue (Browser)</option>
                </select>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span className="settings-title-text">Auto Send Interval</span>
                <span className="settings-desc-text">Configured delay between sequential ticket sends in the queue.</span>
              </div>
              <div>
                <select 
                  className="settings-control-select" 
                  value={autoSendInterval} 
                  onChange={(e) => handleIntervalChange(e.target.value)}
                >
                  <option value="30000">30 seconds</option>
                  <option value="60000">1 minute</option>
                  <option value="180000">3 minutes</option>
                  <option value="300000">5 minutes</option>
                </select>
              </div>
            </div>
          </div>
        </main>
      ) : page === 'daily' ? (
        <main className="main-content">
          <div className="dashboard-header">
            <div className="dashboard-title">
              <h2>Overall & Daily Financial Report</h2>
              <p>Overall summary and payment breakdown based on the date tickets were entered</p>
            </div>
          </div>
          {stats.overall && (
            <div className="admin-stat-card" style={{ marginBottom: '2rem', border: '2px solid var(--primary-color)' }}>
              <div className="admin-name" style={{ fontSize: '1.2rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FiActivity className="icon-glow" style={{ color: 'var(--accent)' }} /> Lifetime Overall Stats
              </div>
              <div className="admin-details">
                <span style={{ fontSize: '1rem', marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FiClipboard /> {stats.overall.count || 0} total tickets entered
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div className="stat-card money" style={{ padding: '1rem' }}>
                    <div className="stat-info"><div className="label">Total Amount</div><div className="value" style={{ fontSize: '1.2rem' }}>₹{stats.overall.totalAmount || 0}</div></div>
                  </div>
                  <div className="stat-card profit" style={{ padding: '1rem' }}>
                    <div className="stat-info"><div className="label">Total Profit</div><div className="value" style={{ fontSize: '1.2rem' }}>₹{stats.overall.totalProfit || 0}</div></div>
                  </div>
                  <div className="stat-card phonepe" style={{ padding: '1rem' }}>
                    <div className="stat-info"><div className="label">PhonePe</div><div className="value" style={{ fontSize: '1.2rem' }}>₹{stats.overall.phonepeAmount || 0}</div></div>
                  </div>
                  <div className="stat-card cash" style={{ padding: '1rem' }}>
                    <div className="stat-info"><div className="label">Cash</div><div className="value" style={{ fontSize: '1.2rem' }}>₹{stats.overall.cashAmount || 0}</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Daily Breakdown</h3>
          {stats.daily && stats.daily.length > 0 ? (
            <div className="daily-grid">
              {stats.daily.map(day => (
                <div key={day.date} className="admin-stat-card">
                  <div className="admin-name" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FiCalendar /> {new Date(day.date).toLocaleDateString('en-GB')}
                  </div>
                  <div className="admin-details">
                    <span style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FiClipboard /> {day.count} tickets entered
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="stat-card money" style={{ padding: '0.5rem', minWidth: '0' }}>
                        <div className="stat-info"><div className="label">Amount</div><div className="value" style={{ fontSize: '1rem' }}>₹{day.totalAmount}</div></div>
                      </div>
                      <div className="stat-card profit" style={{ padding: '0.5rem', minWidth: '0' }}>
                        <div className="stat-info"><div className="label">Profit</div><div className="value" style={{ fontSize: '1rem' }}>₹{day.totalProfit}</div></div>
                      </div>
                      <div className="stat-card phonepe" style={{ padding: '0.5rem', minWidth: '0' }}>
                        <div className="stat-info"><div className="label">PhonePe</div><div className="value" style={{ fontSize: '1rem' }}>₹{day.phonepeAmount}</div></div>
                      </div>
                      <div className="stat-card cash" style={{ padding: '0.5rem', minWidth: '0' }}>
                        <div className="stat-info"><div className="label">Cash</div><div className="value" style={{ fontSize: '1rem' }}>₹{day.cashAmount}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">
                <HiOutlineDocumentReport style={{ fontSize: '3rem', color: 'var(--text-muted)' }} />
              </div>
              <p>No reports available.</p>
            </div>
          )}
        </main>
      ) : (
        <main className="main-content">
          <div className="dashboard-header">
            <div className="dashboard-title">
              <h2>Weekly Dashboard</h2>
              <p>Manage weekly temple ticket bookings and stats</p>
            </div>
            <div className="controls">
              <button className="btn btn-primary btn-sm" onClick={handleClaimOrphans} style={{ gap: '0.4rem' }}>
                <TbDatabaseImport className="icon-spin" /> Recover Old Data
              </button>
              <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="asc">Visit Date ↑</option>
                <option value="desc">Visit Date ↓</option>
                <option value="phone">Phone Number</option>
              </select>
            </div>
          </div>
          


          <div className="stats-bar financial-stats">
            <div className="stat-card money">
              <span className="stat-icon"><FiDollarSign className="icon-float" style={{ color: 'var(--accent)' }} /></span>
              <div className="stat-info"><div className="label">Weekly Amount</div><div className="value">₹{stats.weekly?.totalAmount || 0}</div></div>
            </div>
            <div className="stat-card profit">
              <span className="stat-icon"><HiTrendingUp className="icon-float" style={{ color: 'var(--success)' }} /></span>
              <div className="stat-info"><div className="label">Weekly Profit</div><div className="value">₹{stats.weekly?.totalProfit || 0}</div></div>
            </div>
            <div className="stat-card phonepe">
              <span className="stat-icon"><MdPhoneAndroid className="icon-float" style={{ color: 'var(--primary)' }} /></span>
              <div className="stat-info"><div className="label">Weekly PhonePe</div><div className="value">{stats.weekly?.phonepeCount || 0}</div></div>
            </div>
            <div className="stat-card cash">
              <span className="stat-icon"><TbCash className="icon-float" style={{ color: 'var(--success)' }} /></span>
              <div className="stat-info"><div className="label">Weekly Cash</div><div className="value">{stats.weekly?.cashCount || 0}</div></div>
            </div>
          </div>

          <div className="stats-bar">
            <div className="stat-card" onClick={() => navigateTo('history', 'weekly', 'all')}>
              <span className="stat-icon"><FiClipboard className="icon-float" /></span>
              <div className="stat-info"><div className="label">Weekly Bookings</div><div className="value">{stats.weekly?.count || 0}</div></div>
            </div>
            <div className="stat-card" onClick={() => navigateTo('history', 'completed', 'all')}>
              <span className="stat-icon"><FiCheckCircle className="icon-float" style={{ color: 'var(--success)' }} /></span>
              <div className="stat-info"><div className="label">Paid (Weekly)</div><div className="value">{stats.weekly?.paidCount || 0}</div></div>
            </div>
            <div className="stat-card" onClick={() => navigateTo('history', 'sent', 'all')}>
              <span className="stat-icon"><FiSend className="icon-float" style={{ color: 'var(--primary)' }} /></span>
              <div className="stat-info"><div className="label">Sent (Weekly)</div><div className="value">{stats.weekly?.sentCount || 0}</div></div>
            </div>
          </div>



          {/* Audio Upload Panel */}
          <div className="admin-stat-card" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid rgba(var(--accent-rgb), 0.15)' }}>
            <div className="admin-name" style={{ fontSize: '1.1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
              <FiVolume2 className="icon-glow" style={{ color: 'var(--accent)', fontSize: '1.3rem' }} /> WhatsApp Voice Message Settings
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Upload a custom audio greetings message (.mp3, .wav, or .m4a). This audio will be sent automatically to every customer immediately after their PDF ticket is sent via WhatsApp.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-color)' }}>Current Audio:</span>
                  {currentAudioUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>Custom Active</span>
                      <audio src={currentAudioUrl} controls style={{ height: '32px', borderRadius: '4px' }} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-secondary" style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>Default</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Temple greeting voice message</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    style={{ display: 'none' }}
                    id="audio-upload-input"
                  />
                  <label htmlFor="audio-upload-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '6px' }}>
                    Choose Audio File
                  </label>
                  
                  {selectedAudioFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedAudioFile.name}
                      </span>
                      <button className="btn btn-primary btn-sm" onClick={handleAudioUpload} disabled={uploadingAudio} style={{ padding: '0.5rem 1rem', borderRadius: '6px' }}>
                        {uploadingAudio ? 'Uploading...' : 'Upload Audio'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAudioFile(null)} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <AddBookingForm onAdded={(b) => setBookings((prev) => [b, ...prev])} />



          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading bookings...
            </div>
          ) : (
            <BookingTable bookings={bookings} setBookings={setBookings} />
          )}
        </main>
      )}

      {/* Floating Queue Dashboard Panel (Shadow Monarch Style) */}
      {queueTickets.length > 0 && (
        <div className={`floating-queue-panel ${queueIsRunning ? 'running' : 'paused'} ${queueConfirmWaiting ? 'confirm-waiting' : ''}`}>
          <div className="queue-panel-header">
            <div className="queue-panel-title">
              <FiActivity className={queueIsRunning ? 'energy-pulse' : ''} style={{ color: queueConfirmWaiting ? '#10b981' : queueIsRunning ? '#06b6d4' : '#f59e0b' }} />
              Auto Send Queue
            </div>
            <div className="queue-status-text" style={{ 
              background: queueConfirmWaiting ? 'rgba(16, 185, 129, 0.15)' : queueIsRunning ? 'rgba(6, 182, 212, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: queueConfirmWaiting ? '#10b981' : queueIsRunning ? '#06b6d4' : '#f59e0b'
            }}>
              {queueConfirmWaiting ? 'Waiting Confirm' : queueIsRunning ? 'Running' : 'Paused'}
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <strong>Progress:</strong> {queueProgress.completed} / {queueProgress.total} tickets processed
          </div>

          <div className="queue-progress-container">
            <div className="queue-progress-bar" style={{ width: `${(queueProgress.completed / queueProgress.total) * 100}%` }} />
          </div>

          {queueCurrentTicket && (
            <div className="queue-active-ticket">
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                {queueConfirmWaiting ? 'Action Required' : 'Processing Ticket'}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: '0.15rem', color: 'var(--accent)' }}>
                {queueCurrentTicket.member1}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.15rem' }}>
                Phone: {queueCurrentTicket.phone} | Slot: {queueCurrentTicket.slotTime || '—'}
              </div>
            </div>
          )}

          <div className="queue-meta-row">
            <div>
              {queueIsRunning && !queueConfirmWaiting && queueWaitTimeLeft > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#06b6d4' }}>
                  <FiRefreshCw className="icon-spin" /> Next in {queueWaitTimeLeft}s
                </span>
              )}
              {queueConfirmWaiting && (
                <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  <FiInfo /> Prefilled tab opened!
                </span>
              )}
            </div>
            <div style={{ fontWeight: 600 }}>
              Est. Remaining: {
                queueIsRunning 
                  ? `${Math.max(1, Math.ceil((((queueProgress.total - queueProgress.completed) * autoSendInterval / 1000) + (queueIsRunning && !queueConfirmWaiting ? queueWaitTimeLeft : 0)) / 60))} mins`
                  : '—'
              }
            </div>
          </div>

          <div className="queue-controls">
            {queueIsRunning ? (
              <button className="queue-btn queue-btn-stop" onClick={stopQueue}>
                <FiStopCircle /> Stop Queue
              </button>
            ) : (
              <button className="queue-btn queue-btn-resume" onClick={resumeQueue} disabled={queueProgress.completed >= queueProgress.total}>
                <FiPlay /> Resume Queue
              </button>
            )}

            {queueConfirmWaiting && (
              <>
                <button className="queue-btn queue-btn-confirm" onClick={handleConfirmSent}>
                  Confirm Sent
                </button>
                <button className="queue-btn queue-btn-stop" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }} onClick={handleConfirmFailed}>
                  Failed
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
