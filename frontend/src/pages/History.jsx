/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { getHistoryFolders, getHistoryTickets, updateBooking, deleteBooking, uploadPdf, getBookings, sendWhatsApp } from '../services/api';
import { toast } from '../components/Toast';

import {
  FiCalendar,
  FiDollarSign,
  FiSearch,
  FiClock,
  FiFolder,
  FiFolderMinus,
  FiFolderPlus,
  FiActivity,
  FiCheckCircle,
  FiSend,
  FiPhone,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiClipboard,
  FiFileText,
  FiTrash2,
  FiLink,
  FiAlertCircle,
  FiBell
} from 'react-icons/fi';
import { LuHistory } from 'react-icons/lu';
import { HiOutlineDocumentReport, HiTrendingUp } from 'react-icons/hi';

const formatDateStr = (dateStr) => {
  if (!dateStr) return '—';
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const History = ({ initialFilter = 'all', initialSubSection = 'weekly' }) => {
  const [folders, setFolders] = useState([]);
  const [stats, setStats] = useState({ count: 0, totalAmount: 0, totalProfit: 0, paidCount: 0, unpaidCount: 0, completedCount: 0, sentCount: 0 });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Subsections inside History
  const [subSection, setSubSection] = useState(
    initialSubSection === 'completed' || initialSubSection === 'sent' ? 'weekly' : initialSubSection
  ); // 'weekly' | 'reports' | 'further'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'current_week' | 'previous_week' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [ticketFilter, setTicketFilter] = useState(
    initialSubSection === 'completed' ? 'completed_paid' : initialSubSection === 'sent' ? 'sent' : initialFilter
  );

  // Folder interaction and lazy-loaded tickets
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderTickets, setFolderTickets] = useState({});
  const [folderLoading, setFolderLoading] = useState({});

  // Ticket Detail Modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [mobilePdfUrl, setMobilePdfUrl] = useState(null);

  // Direct search results
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Flat tickets for Sent sub-section
  const [flatTickets, setFlatTickets] = useState([]);
  const [flatLoading, setFlatLoading] = useState(false);

  // Send All Progress States
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [sendAllProgress, setSendAllProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
    currentName: ''
  });

  const fetchFlatTickets = useCallback(async () => {
    setFlatLoading(true);
    try {
      const params = {
        subSection: 'weekly',
        sort,
        searchQuery,
        ticketFilter: 'sent',
        dateFilter
      };
      if (dateFilter === 'custom') {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      const { data } = await getHistoryTickets(params);
      setFlatTickets(data || []);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load tickets', 'error');
    } finally {
      setFlatLoading(false);
    }
  }, [sort, searchQuery, dateFilter, customStart, customEnd]);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setExpandedFolders({});
    setFolderTickets({});
    setFolderLoading({});
    try {
      const params = {
        subSection,
        sort,
        searchQuery,
        ticketFilter,
      };
      if (subSection === 'weekly') {
        params.dateFilter = dateFilter;
        if (dateFilter === 'custom') {
          if (!customStart || !customEnd) {
            setFolders([]);
            setLoading(false);
            return;
          }
          params.startDate = customStart;
          params.endDate = customEnd;
        }
      }
      const { data } = await getHistoryFolders(params);
      setFolders(data.folders || []);
      setStats(data.stats || { count: 0, totalAmount: 0, totalProfit: 0, paidCount: 0, unpaidCount: 0, completedCount: 0, sentCount: 0 });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load folders', 'error');
    } finally {
      setLoading(false);
    }
  }, [subSection, dateFilter, customStart, customEnd, searchQuery, sort, ticketFilter]);

  useEffect(() => {
    if (subSection === 'weekly' && ticketFilter === 'sent') {
      fetchFlatTickets();
    } else {
      fetchFolders();
    }
  }, [subSection, ticketFilter, fetchFolders, fetchFlatTickets]);

  // Direct tickets search effect (debounce)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = {
          subSection,
          sort,
          searchQuery,
          ticketFilter,
        };
        if (subSection === 'weekly') {
          params.dateFilter = dateFilter;
          if (dateFilter === 'custom') {
            params.startDate = customStart;
            params.endDate = customEnd;
          }
        }
        const { data } = await getHistoryTickets(params);
        setSearchResults(data || []);
      } catch (err) {
        toast(err.response?.data?.message || 'Failed to search tickets', 'error');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, subSection, dateFilter, customStart, customEnd, ticketFilter, sort]);

  const toggleFolder = async (dateStr) => {
    const isExpanded = !!expandedFolders[dateStr];
    setExpandedFolders((prev) => ({ ...prev, [dateStr]: !isExpanded }));

    // If expanding and tickets are not loaded yet, fetch them
    if (!isExpanded && !folderTickets[dateStr]) {
      setFolderLoading((prev) => ({ ...prev, [dateStr]: true }));
      try {
        const params = {
          subSection,
          sort,
          searchQuery,
          bookingDate: dateStr,
          ticketFilter,
        };
        if (subSection === 'weekly') {
          params.dateFilter = dateFilter;
          if (dateFilter === 'custom') {
            params.startDate = customStart;
            params.endDate = customEnd;
          }
        }
        const { data } = await getHistoryTickets(params);
        setFolderTickets((prev) => ({ ...prev, [dateStr]: data }));
      } catch (err) {
        toast(err.response?.data?.message || 'Failed to load tickets', 'error');
      } finally {
        setFolderLoading((prev) => ({ ...prev, [dateStr]: false }));
      }
    }
  };


  // ── WhatsApp Action Handlers ──
  const handleSendWhatsApp = async (ticketId) => {
    const toastId = toast.loading ? toast.loading('Sending ticket via WhatsApp...') : null;
    try {
      const { data } = await sendWhatsApp(ticketId);
      setSelectedTicket(data);

      // Update cached lists
      const folderId = data.createdAt?.split('T')[0];
      if (folderId) {
        setFolderTickets((prev) => ({
          ...prev,
          [folderId]: prev[folderId]?.map((t) => (t._id === data._id ? data : t)) || [],
        }));
      }
      setSearchResults((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      setFlatTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)));

      if (toastId) toast.dismiss(toastId);
      toast.success('Ticket sent successfully via WhatsApp!');
      if (ticketFilter === 'sent') {
        fetchFlatTickets();
      } else {
        fetchFolders();
      }
    } catch (err) {
      if (toastId) toast.dismiss(toastId);
      const errMsg = err.response?.data?.message || 'Failed to send WhatsApp';
      toast.error(errMsg);

      // Update local state with failure
      const failedTicket = {
        ...selectedTicket,
        deliveryStatus: 'failed',
        errorMessage: errMsg
      };
      setSelectedTicket(failedTicket);
      setFlatTickets((prev) => prev.map((t) => (t._id === ticketId ? failedTicket : t)));

      const folderId = selectedTicket.createdAt?.split('T')[0];
      if (folderId) {
        setFolderTickets((prev) => ({
          ...prev,
          [folderId]: prev[folderId]?.map((t) => (t._id === ticketId ? failedTicket : t)) || [],
        }));
      }
      setSearchResults((prev) => prev.map((t) => (t._id === ticketId ? failedTicket : t)));
    }
  };

  const handleSendBrowser = async (ticket) => {
    let phone = ticket.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.slice(1);
    if (!phone.startsWith('91')) phone = '91' + phone;

    const bookedDate = ticket.bookingDate
      ? new Date(ticket.bookingDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '—';
    const timeslot = ticket.slotTime || '—';

    const message = `🙏 శ్రీ వేంకటేశ్వర స్వామి వారి ఆశీస్సులతో 🙏

నమస్కారం ${ticket.member1} గారు,

మీ వడపల్లి శ్రీ వేంకటేశ్వర స్వామి వారి టికెట్ సిద్ధంగా ఉంది.

📅 తేదీ | Date: ${bookedDate}
🕘 సమయం | Time: ${timeslot}

📄 మీ టికెట్ PDF జతచేయబడింది.
Download ticket here 👇
${ticket.pdfUrl}

⚠️ దయచేసి టికెట్కు ప్రింట్ తీసుకుని దేవాలయానికి తీసుకురండి.
⚠️ Please take a printout of the ticket before coming to the temple.

🌸 పూజా సామగ్రి (Pooja Items) కావాలంటే, దయచేసి **బుక్ చేసిన తేదీకి 3 రోజుల ముందు** ఈ నంబర్కు సంప్రదించండి: **8331923995**

🌸 If you require Pooja items, please contact **8331923995** at least **3 days before your booked date**.

ధన్యవాదాలు 🙏
Thank You 🙏

**వడపల్లి శ్రీ వేంకటేశ్వర స్వామి దేవస్థానం**`;

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    
    const w = window.open(url, '_blank');
    if (w) {
      w.focus();
    }

    try {
      const { data } = await updateBooking(ticket._id, { 
        sent: true, 
        pdfSent: true, 
        sentAt: new Date().toISOString(),
        deliveryStatus: 'sent' 
      });
      
      setSelectedTicket(data);
      const folderId = data.createdAt?.split('T')[0];
      if (folderId) {
        setFolderTickets((prev) => ({
          ...prev,
          [folderId]: prev[folderId]?.map((t) => (t._id === data._id ? data : t)) || [],
        }));
      }
      setSearchResults((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      setFlatTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      
      if (ticketFilter === 'sent') {
        fetchFlatTickets();
      } else {
        fetchFolders();
      }
    } catch (err) {
      // Silent catch
    }
  };

  const handleSendAll = async () => {
    const unsentTickets = flatTickets.filter(t => !t.sent);
    if (unsentTickets.length === 0) return;

    if (!window.confirm(`Are you sure you want to send all ${unsentTickets.length} unsent tickets via WhatsApp?`)) {
      return;
    }

    setIsSendingAll(true);
    setSendAllProgress({
      current: 0,
      total: unsentTickets.length,
      success: 0,
      failed: 0,
      currentName: ''
    });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < unsentTickets.length; i++) {
      const ticket = unsentTickets[i];
      setSendAllProgress(prev => ({
        ...prev,
        current: i + 1,
        currentName: ticket.member1 + (ticket.member2 ? ` & ${ticket.member2}` : '')
      }));

      try {
        const { data } = await sendWhatsApp(ticket._id);
        successCount++;

        setFlatTickets(prev => prev.map(t => t._id === ticket._id ? data : t));

        const folderId = ticket.createdAt?.split('T')[0];
        if (folderId) {
          setFolderTickets(prev => ({
            ...prev,
            [folderId]: prev[folderId]?.map(t => t._id === ticket._id ? data : t) || []
          }));
        }

        setSearchResults(prev => prev.map(t => t._id === ticket._id ? data : t));
      } catch (err) {
        console.error(`Failed to send WhatsApp for ticket ${ticket._id}:`, err);
        failedCount++;
        const failedTicket = {
          ...ticket,
          deliveryStatus: 'failed',
          errorMessage: err.response?.data?.message || err.message || 'WhatsApp sending failed.'
        };
        setFlatTickets(prev => prev.map(t => t._id === ticket._id ? failedTicket : t));
        const folderId = ticket.createdAt?.split('T')[0];
        if (folderId) {
          setFolderTickets(prev => ({
            ...prev,
            [folderId]: prev[folderId]?.map(t => t._id === ticket._id ? failedTicket : t) || []
          }));
        }
        setSearchResults(prev => prev.map(t => t._id === ticket._id ? failedTicket : t));
      }

      setSendAllProgress(prev => ({
        ...prev,
        success: successCount,
        failed: failedCount
      }));
    }

    toast.success(`Send All completed! Success: ${successCount}, Failed: ${failedCount}`);

    if (ticketFilter === 'sent') {
      fetchFlatTickets();
    } else {
      fetchFolders();
    }
  };

  // ── Ticket Detail Actions ──
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('id', selectedTicket._id);
    formData.append('pdf', file);

    const toastId = toast.loading ? toast.loading('Uploading PDF...') : null;
    try {
      const { data } = await uploadPdf(formData);
      const updatedTicket = {
        ...selectedTicket,
        pdfUrl: data.booking.pdfUrl || data.booking.localPdfUrl,
        localPdfUrl: data.booking.localPdfUrl,
        sent: data.booking.sent,
        deliveryStatus: data.booking.deliveryStatus,
        whatsappMessageId: data.booking.whatsappMessageId,
        errorMessage: data.booking.errorMessage,
        sentAt: data.booking.sentAt,
      };
      setSelectedTicket(updatedTicket);

      // Update cached lists
      const folderId = selectedTicket.createdAt?.split('T')[0];
      if (folderId) {
        setFolderTickets((prev) => ({
          ...prev,
          [folderId]: prev[folderId]?.map((t) => (t._id === selectedTicket._id ? updatedTicket : t)) || [],
        }));
      }
      setSearchResults((prev) => prev.map((t) => (t._id === selectedTicket._id ? updatedTicket : t)));
      setFlatTickets((prev) => prev.map((t) => (t._id === selectedTicket._id ? updatedTicket : t)));

      if (toastId) toast.dismiss(toastId);
      toast.success('PDF uploaded successfully!');
      if (ticketFilter === 'sent') {
        fetchFlatTickets();
      } else {
        fetchFolders();
      }
    } catch (err) {
      if (toastId) toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to upload PDF');
    }
  };

  const handleTicketDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this ticket? This action cannot be undone.')) return;

    try {
      await deleteBooking(selectedTicket._id);
      toast.success('Ticket deleted successfully!');

      // Update cached lists
      const folderId = selectedTicket.createdAt?.split('T')[0];
      if (folderId) {
        setFolderTickets((prev) => ({
          ...prev,
          [folderId]: prev[folderId]?.filter((t) => t._id !== selectedTicket._id) || [],
        }));
      }
      setSearchResults((prev) => prev.filter((t) => t._id !== selectedTicket._id));
      setFlatTickets((prev) => prev.filter((t) => t._id !== selectedTicket._id));

      setSelectedTicket(null);
      if (ticketFilter === 'sent') {
        fetchFlatTickets();
      } else {
        fetchFolders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
    }
  };

  const handleStatusToggle = async (field, currentValue) => {
    try {
      const { data } = await updateBooking(selectedTicket._id, { [field]: !currentValue });
      setSelectedTicket(data);

      // Update cached lists
      const folderId = data.createdAt?.split('T')[0];
      if (folderId) {
        setFolderTickets((prev) => ({
          ...prev,
          [folderId]: prev[folderId]?.map((t) => (t._id === data._id ? data : t)) || [],
        }));
      }
      setSearchResults((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      setFlatTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)));

      toast.success('Status updated successfully!');
      if (ticketFilter === 'sent') {
        fetchFlatTickets();
      } else {
        fetchFolders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Week-based grouping math ──
  const getWeekNumber = (d) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  };

  const formatWeekDateRange = (startDate, endDate) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const startStr = startDate.toLocaleDateString('en-GB', options).replace(/,/g, '');
    const endStr = endDate.toLocaleDateString('en-GB', options).replace(/,/g, '');
    return `${startStr} - ${endStr}`;
  };

  const groupFoldersByWeek = (foldersList) => {
    const weeks = {};

    foldersList.forEach((folder) => {
      if (!folder || !folder._id || typeof folder._id !== 'string') return;
      const parts = folder._id.split('-');
      if (parts.length !== 3) return;
      const [year, month, day] = parts.map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return;
      const date = new Date(year, month - 1, day);

      const dayOfWeek = date.getDay(); // 0 = Sunday, ..., 6 = Saturday
      const diff = (dayOfWeek + 1) % 7; // Saturday offset
      const start = new Date(date);
      start.setDate(date.getDate() - diff);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const weekKey = start.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          start: new Date(start),
          end: new Date(end),
          folders: [],
        };
      }
      weeks[weekKey].folders.push(folder);
    });

    const sortedWeekKeys = Object.keys(weeks).sort((a, b) => {
      return sort === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    });

    return sortedWeekKeys.map((key) => {
      const weekNum = getWeekNumber(weeks[key].start);
      return {
        weekKey: key,
        weekNumber: weekNum,
        start: weeks[key].start,
        end: weeks[key].end,
        folders: weeks[key].folders,
      };
    });
  };

  const weekGroups = groupFoldersByWeek(folders);

  return (
    <div className={`theme-${subSection}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <LuHistory className="icon-glow" /> History Archive
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>View completed, sent, and active records in a structured archive</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <FiSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }} />
            <input 
              type="text" 
              placeholder="Search by name, phone, gothram, date..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.875rem' }}
            />
          </div>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="desc">Booked Date ↓</option>
            <option value="asc">Booked Date ↑</option>
            <option value="phone">Phone Number</option>
          </select>
        </div>
      </div>

      {/* History Sub-navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.6rem', flexWrap: 'wrap' }}>
        <button className={`nav-tab ${subSection === 'weekly' ? 'active' : ''}`} onClick={() => { setSubSection('weekly'); setTicketFilter('all'); setDateFilter('all'); window.history.pushState({}, '', '/history/weekly'); }} style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <FiCalendar /> Weekly History
        </button>
        <button className={`nav-tab ${subSection === 'reports' ? 'active' : ''}`} onClick={() => { setSubSection('reports'); setDateFilter('monthly'); window.history.pushState({}, '', '/history/reports'); }} style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <HiOutlineDocumentReport /> Reports
        </button>
        <button className={`nav-tab ${subSection === 'further' ? 'active' : ''}`} onClick={() => { setSubSection('further'); setDateFilter('further_date'); window.history.pushState({}, '', '/history/further'); }} style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <FiFolderPlus /> Further Date Bookings
        </button>
      </div>

      {subSection === 'reports' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem', background: 'var(--surface)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reports Scope:</span>
          <span className="btn btn-sm btn-primary" style={{ pointerEvents: 'none' }}>Active & Pending Bookings</span>
        </div>
      )}

      {subSection === 'further' && (
        <div className="reminder-banner" style={{ borderLeft: '4px solid var(--primary)', marginBottom: '1rem', background: 'rgba(59, 130, 246, 0.08)' }}>
          <span className="icon"><FiActivity className="icon-glow" style={{ color: 'var(--accent)' }} /></span>
          <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}><strong>Future Bookings:</strong> Displaying all future visit date bookings. Done/Sent bookings are excluded.</span>
        </div>
      )}

      {/* Stats Summary for Each Section (Top Summary Cards serve as Clickable Filters in Weekly History) */}
      {stats && (
        <>
          {subSection === 'weekly' && (
            <div className="stats-bar" style={{ marginBottom: '1.5rem' }}>
              <div 
                className={`stat-card ${ticketFilter === 'all' ? 'active' : ''}`} 
                onClick={() => { setTicketFilter('all'); window.history.pushState({}, '', '/history/weekly'); }}
              >
                <span className="stat-icon"><FiClipboard className="icon-float" /></span>
                <div className="stat-info">
                  <div className="label">Total Records</div>
                  <div className="value">{stats.weeklyTotalCount || 0}</div>
                </div>
              </div>
              <div 
                className={`stat-card ${ticketFilter === 'completed_paid' ? 'active' : ''}`} 
                onClick={() => { setTicketFilter('completed_paid'); window.history.pushState({}, '', '/history/completed'); }}
              >
                <span className="stat-icon"><FiCheckCircle className="icon-float" style={{ color: 'var(--success)' }} /></span>
                <div className="stat-info">
                  <div className="label">Completed & Paid</div>
                  <div className="value">{stats.weeklyCompletedPaidCount || 0}</div>
                </div>
              </div>
              <div 
                className={`stat-card ${ticketFilter === 'sent' ? 'active' : ''}`} 
                onClick={() => { setTicketFilter('sent'); window.history.pushState({}, '', '/history/sent'); }}
              >
                <span className="stat-icon"><FiSend className="icon-float" style={{ color: 'var(--primary)' }} /></span>
                <div className="stat-info">
                  <div className="label">Tickets Sent</div>
                  <div className="value">{stats.weeklySentCount || 0}</div>
                </div>
              </div>
            </div>
          )}
          {/* Legacy Completed/Sent sections removed */}
          {subSection === 'reports' && (
            <div className="stats-bar financial-stats" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <span className="stat-icon"><FiClipboard className="icon-float" /></span>
                <div className="stat-info">
                  <div className="label">Active Tickets</div>
                  <div className="value">{stats.count || 0}</div>
                </div>
              </div>
              <div className="stat-card money">
                <span className="stat-icon"><FiDollarSign className="icon-float" style={{ color: 'var(--accent)' }} /></span>
                <div className="stat-info">
                  <div className="label">Active Amount</div>
                  <div className="value">₹{stats.totalAmount || 0}</div>
                </div>
              </div>
              <div className="stat-card profit">
                <span className="stat-icon"><HiTrendingUp className="icon-float" style={{ color: 'var(--success)' }} /></span>
                <div className="stat-info">
                  <div className="label">Active Profit</div>
                  <div className="value">₹{stats.totalProfit || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon"><FiCheckCircle className="icon-float" style={{ color: 'var(--success)' }} /></span>
                <div className="stat-info">
                  <div className="label">Paid (Active)</div>
                  <div className="value">{stats.paidCount || 0}</div>
                </div>
              </div>
            </div>
          )}
          {subSection === 'further' && (
            <div className="stats-bar" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <span className="stat-icon"><FiClipboard className="icon-float" /></span>
                <div className="stat-info">
                  <div className="label">Future Bookings</div>
                  <div className="value">{stats.count || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon"><FiCheckCircle className="icon-float" style={{ color: 'var(--success)' }} /></span>
                <div className="stat-info">
                  <div className="label">Paid (Future)</div>
                  <div className="value">{stats.paidCount || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon"><FiX className="icon-float" style={{ color: 'var(--danger)' }} /></span>
                <div className="stat-info">
                  <div className="label">Unpaid (Future)</div>
                  <div className="value">{stats.unpaidCount || 0}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {subSection === 'weekly' && ticketFilter === 'sent' ? (
        <div className="sent-tickets-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {/* Not Sent Column */}
          <div className="sent-column">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #D97706', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', color: '#D97706', textTransform: 'uppercase', margin: 0, textShadow: '0 0 8px rgba(217, 119, 6, 0.4)' }}>
                <FiBell /> Not Sent Queue ({flatTickets.filter(t => !t.sent).length})
              </h3>
              {flatTickets.filter(t => !t.sent).length > 0 && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleSendAll}
                  style={{
                    borderColor: '#D97706',
                    color: '#D97706',
                    background: 'rgba(217, 119, 6, 0.1)',
                    boxShadow: '0 0 10px rgba(217, 119, 6, 0.2)',
                    fontSize: '0.8rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px'
                  }}
                >
                  Send All
                </button>
              )}
            </div>
            {flatLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}><FiActivity className="icon-spin" /> Loading...</div>
            ) : flatTickets.filter(t => !t.sent).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '8px' }}>No tickets in not sent queue.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {flatTickets.filter(t => !t.sent).map(t => (
                  <div key={t._id} className="history-ticket-card" onClick={() => setSelectedTicket(t)} style={{ borderLeft: '3px solid #D97706', cursor: 'pointer' }}>
                    <div className="ticket-card-name">{t.member1}{t.member2 ? ` & ${t.member2}` : ''}</div>
                    <div className="ticket-card-meta">
                      <span><FiCalendar /> {formatDateStr(t.visitDate)}</span>
                      <span><FiClock /> {t.slotTime || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Column */}
          <div className="sent-column">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', color: '#3B82F6', textTransform: 'uppercase', borderBottom: '2px solid #3B82F6', paddingBottom: '0.5rem', marginBottom: '1rem', textShadow: '0 0 8px rgba(59, 130, 246, 0.4)' }}>
              <FiSend /> Sent ({flatTickets.filter(t => t.sent).length})
            </h3>
            {flatLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}><FiActivity className="icon-spin" /> Loading...</div>
            ) : flatTickets.filter(t => t.sent).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '8px' }}>No sent tickets.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {flatTickets.filter(t => t.sent).map(t => (
                  <div key={t._id} className="history-ticket-card" onClick={() => setSelectedTicket(t)} style={{ borderLeft: '3px solid #3B82F6', cursor: 'pointer' }}>
                    <div className="ticket-card-name">{t.member1}{t.member2 ? ` & ${t.member2}` : ''}</div>
                    <div className="ticket-card-meta">
                      <span><FiCalendar /> {formatDateStr(t.visitDate)}</span>
                      <span><FiClock /> {t.slotTime || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : searchQuery.trim() !== '' ? (
        // ── Direct Search Result View ──
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>
            Direct Search Results ({searchResults.length})
          </h3>
          {searchLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <FiActivity className="icon-spin" style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
              <div>Searching Archive...</div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="table-wrapper">
              <div className="empty-state">
                <div className="icon">
                  <FiFolderMinus className="icon-float" style={{ fontSize: '3rem', color: 'var(--text-muted)' }} />
                </div>
                <p>No tickets matching "{searchQuery}" found.</p>
              </div>
            </div>
          ) : (
            <div className="folder-tickets-grid">
              {searchResults.map((t) => (
                <div key={t._id} className="history-ticket-card" onClick={() => setSelectedTicket(t)}>
                  <div className="ticket-card-name">
                    {t.member1}{t.member2 ? ` & ${t.member2}` : ''}
                  </div>
                  <div className="ticket-card-meta">
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}><FiCalendar /> {formatDateStr(t.visitDate)}</span>
                    <span><FiClock /> {t.slotTime || 'No slot assigned'}</span>
                    <span><FiPhone /> {t.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // ── Week Groups Mode ──
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <FiActivity className="icon-spin" style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
              <div>Loading Archive Folders...</div>
            </div>
          ) : weekGroups.length === 0 ? (
            <div className="table-wrapper">
              <div className="empty-state">
                <div className="icon">
                  <FiFolderMinus className="icon-float" style={{ fontSize: '3rem', color: 'var(--text-muted)' }} />
                </div>
                <p>{subSection === 'reports' ? 'No reports available.' : 'No archived tickets found for this period.'}</p>
              </div>
            </div>
          ) : (
            <div>
              {weekGroups.map((week) => (
                <div key={week.weekKey}>
                  {/* Sleek left-bordered week side heading */}
                  <div className="week-side-heading">
                    Week ({formatWeekDateRange(week.start, week.end)})
                  </div>

                  {/* Folders List within Week */}
                  <div className="history-folders-container" style={{ marginBottom: '2rem' }}>
                    {week.folders.map((folder) => {
                      const isExpanded = !!expandedFolders[folder._id];
                      const tickets = folderTickets[folder._id] || [];
                      const isLoadingTickets = !!folderLoading[folder._id];

                      return (
                        <div key={folder._id} className={`history-folder-card ${isExpanded ? 'open' : ''}`}>
                          <div className="history-folder-header" onClick={() => toggleFolder(folder._id)}>
                            <div className="folder-title-area">
                              <FiFolder className="folder-icon" />
                              <span className="folder-date-text">{formatDateStr(folder._id)}</span>
                            </div>
                            <div className="folder-badge-area">
                              <span className="ticket-count-badge">{folder.count} {folder.count === 1 ? 'Ticket' : 'Tickets'}</span>
                              {isExpanded ? <FiChevronUp className="folder-chevron expanded" /> : <FiChevronDown className="folder-chevron" />}
                            </div>
                          </div>
                          <div className={`history-folder-content ${isExpanded ? 'expanded' : ''}`}>
                            {isExpanded && (
                              <>
                                {isLoadingTickets ? (
                                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <FiActivity className="icon-spin" style={{ marginRight: '0.5rem' }} />
                                    Loading tickets...
                                  </div>
                                ) : tickets.length === 0 ? (
                                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No tickets found.
                                  </div>
                                ) : (
                                  <div className="folder-tickets-grid">
                                    {tickets.map((t) => (
                                      <div key={t._id} className="history-ticket-card" onClick={() => setSelectedTicket(t)}>
                                        <div className="ticket-card-name">
                                          {t.member1}{t.member2 ? ` & ${t.member2}` : ''}
                                        </div>
                                        <div className="ticket-card-meta">
                                          <span><FiClock /> {t.slotTime || 'No slot assigned'}</span>
                                          <span><FiPhone /> {t.phone}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="history-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="history-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h3 className="history-modal-title">Ticket Details</h3>
              <button className="history-modal-close" onClick={() => setSelectedTicket(null)}>
                <FiX />
              </button>
            </div>
            <div className="history-modal-body">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'capitalize' }}>
                  {selectedTicket.member1}
                  {selectedTicket.member2 ? ` & ${selectedTicket.member2}` : ''}
                </h4>
              </div>

              <div className="history-modal-row">
                <span className="history-modal-label">Name:</span>
                <span className="history-modal-value">{selectedTicket.member1}{selectedTicket.member2 ? ` & ${selectedTicket.member2}` : ''}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Phone:</span>
                <span className="history-modal-value">{selectedTicket.phone}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Gothram:</span>
                <span className="history-modal-value">{selectedTicket.gothram || '—'}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Member 1:</span>
                <span className="history-modal-value">{selectedTicket.member1}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Member 2:</span>
                <span className="history-modal-value">{selectedTicket.member2 || '—'}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Booked Date:</span>
                <span className="history-modal-value">{formatDateStr(selectedTicket.bookingDate)}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Visit Date:</span>
                <span className="history-modal-value">{formatDateStr(selectedTicket.visitDate)}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Created Date:</span>
                <span className="history-modal-value">{selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString('en-GB') : '—'}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Timeslot:</span>
                <span className="history-modal-value">{selectedTicket.slotTime || '—'}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Payment Type:</span>
                <span className="history-modal-value" style={{ textTransform: 'capitalize' }}>{selectedTicket.paymentType || '—'}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Paid Status:</span>
                <span className="history-modal-value">{selectedTicket.paid ? 'Paid' : 'Unpaid'}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Completed Status:</span>
                <span className="history-modal-value">{selectedTicket.completed ? 'Completed' : 'Not Completed'}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">PDF Status:</span>
                <span className="history-modal-value">
                  {selectedTicket.pdfUrl || selectedTicket.pdfUploaded ? (
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>Uploaded</span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Not Uploaded</span>
                  )}
                </span>
              </div>

              <div className="history-modal-row">
                <span className="history-modal-label">WhatsApp Status:</span>
                <span className="history-modal-value">
                  {selectedTicket.sent ? (
                    <span style={{ color: '#22c55e', fontWeight: 700, textShadow: '0 0 8px rgba(34, 197, 94, 0.4)' }}>Sent</span>
                  ) : selectedTicket.deliveryStatus === 'failed' ? (
                    <span style={{ color: '#ef4444', fontWeight: 700, textShadow: '0 0 8px rgba(239, 68, 68, 0.4)' }}>Failed</span>
                  ) : (
                    <span style={{ color: '#D97706', fontWeight: 700, textShadow: '0 0 8px rgba(217, 119, 6, 0.4)' }}>Not Sent</span>
                  )}
                </span>
              </div>

              {selectedTicket.errorMessage && (
                <div className="history-modal-row" style={{ borderLeft: '3px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)', paddingLeft: '0.5rem' }}>
                  <span className="history-modal-label" style={{ color: '#ef4444' }}>Error Details:</span>
                  <span className="history-modal-value" style={{ color: '#ef4444', fontSize: '0.8rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>{selectedTicket.errorMessage}</span>
                </div>
              )}

              {selectedTicket.sentAt && (
                <div className="history-modal-row">
                  <span className="history-modal-label">Last Sent Time:</span>
                  <span className="history-modal-value">{new Date(selectedTicket.sentAt).toLocaleString('en-GB')}</span>
                </div>
              )}

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                {/* Send/Resend Actions */}
                {selectedTicket.pdfUrl && (
                  <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {selectedTicket.sent ? (
                      <button 
                        className="btn btn-primary btn-sm" 
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: 600,
                          padding: '0.6rem'
                        }} 
                        onClick={() => handleSendWhatsApp(selectedTicket._id)}
                      >
                        Send Again
                      </button>
                    ) : selectedTicket.deliveryStatus === 'failed' ? (
                      <button 
                        className="btn btn-primary btn-sm" 
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: 600,
                          padding: '0.6rem'
                        }} 
                        onClick={() => handleSendWhatsApp(selectedTicket._id)}
                      >
                        Retry Send
                      </button>
                    ) : (
                      <button 
                        className="btn btn-primary btn-sm" 
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: 600,
                          padding: '0.6rem'
                        }} 
                        onClick={() => handleSendWhatsApp(selectedTicket._id)}
                      >
                        Send via WhatsApp
                      </button>
                    )}

                    {/* Send Browser Option */}
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{
                        width: '100%',
                        borderColor: '#25D366',
                        color: '#25D366',
                        background: 'rgba(37, 211, 102, 0.05)',
                        boxShadow: '0 0 10px rgba(37, 211, 102, 0.15)',
                        fontWeight: 600,
                        padding: '0.6rem',
                        marginTop: '0.25rem'
                      }} 
                      onClick={() => handleSendBrowser(selectedTicket)}
                    >
                      Send Browser
                    </button>
                  </div>
                )}

                {/* File input helper */}
                <input 
                  type="file" 
                  accept="application/pdf" 
                  id="modal-pdf-upload" 
                  style={{ display: 'none' }} 
                  onChange={handlePdfUpload} 
                />

                {/* PDF Actions */}
                {selectedTicket.pdfUrl ? (
                  <>
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ flex: '1 1 calc(33% - 0.5rem)' }} 
                      onClick={(e) => {
                        e.preventDefault();
                        if (window.innerWidth >= 768) {
                          window.open(selectedTicket.pdfUrl, '_blank');
                        } else {
                          setMobilePdfUrl(selectedTicket.pdfUrl);
                        }
                      }}
                    >
                      View PDF
                    </button>
                    <a 
                      href={selectedTicket.pdfUrl} 
                      download 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm" 
                      style={{ flex: '1 1 calc(33% - 0.5rem)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      Download PDF
                    </a>
                    <button 
                      className="btn btn-warning btn-sm" 
                      style={{ flex: '1 1 calc(33% - 0.5rem)' }} 
                      onClick={() => document.getElementById('modal-pdf-upload').click()}
                    >
                      Replace PDF
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ flex: '1 1 100%' }} 
                    onClick={() => document.getElementById('modal-pdf-upload').click()}
                  >
                    Upload PDF
                  </button>
                )}

                {/* Section Specific Action buttons */}
                {subSection === 'reports' && (
                  <>
                    <button 
                      className={`btn btn-sm ${selectedTicket.paid ? 'btn-outline' : 'btn-success'}`} 
                      style={{ flex: '1 1 calc(50% - 0.5rem)' }} 
                      onClick={() => handleStatusToggle('paid', selectedTicket.paid)}
                    >
                      {selectedTicket.paid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                    <button 
                      className={`btn btn-sm ${selectedTicket.completed ? 'btn-outline' : 'btn-success'}`} 
                      style={{ flex: '1 1 calc(50% - 0.5rem)' }} 
                      onClick={() => handleStatusToggle('completed', selectedTicket.completed)}
                    >
                      {selectedTicket.completed ? 'Mark Not Completed' : 'Mark Completed'}
                    </button>
                  </>
                )}

                {subSection === 'further' && (
                  <>
                    <button 
                      className={`btn btn-sm ${selectedTicket.paid ? 'btn-outline' : 'btn-success'}`}
                      style={{ flex: '1 1 calc(50% - 0.5rem)' }} 
                      onClick={() => handleStatusToggle('paid', selectedTicket.paid)}
                    >
                      Change Paid Status
                    </button>
                    <button 
                      className={`btn btn-sm ${selectedTicket.completed ? 'btn-outline' : 'btn-success'}`}
                      style={{ flex: '1 1 calc(50% - 0.5rem)' }} 
                      onClick={() => handleStatusToggle('completed', selectedTicket.completed)}
                    >
                      Change Completed Status
                    </button>
                  </>
                )}

                <button className="btn btn-danger btn-sm" style={{ flex: '1 1 100%' }} onClick={handleTicketDelete}>
                  Delete Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {mobilePdfUrl && (
        <div className="pdf-viewer-overlay" onClick={() => setMobilePdfUrl(null)}>
          <div className="pdf-viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-viewer-header">
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)' }}>PDF Viewer</h3>
              <button className="pdf-viewer-close" onClick={() => setMobilePdfUrl(null)}>
                <FiX />
              </button>
            </div>
            <div className="pdf-viewer-body" style={{ flex: 1, position: 'relative', minHeight: '350px' }}>
              <iframe
                src={mobilePdfUrl}
                title="PDF Preview"
                style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', left: 0, top: 0 }}
              />
            </div>
            <div className="pdf-viewer-footer" style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
              <a 
                href={mobilePdfUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-sm btn-outline"
                style={{ flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
              >
                Open in New Tab
              </a>
              <a 
                href={mobilePdfUrl} 
                download
                className="btn btn-sm btn-primary"
                style={{ flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
              >
                Download PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {isSendingAll && (
        <div className="history-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="history-modal-container" style={{
            maxWidth: '450px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)'
          }}>
            <div className="history-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="history-modal-title" style={{ color: '#3B82F6', textShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
                Sending Tickets via WhatsApp
              </h3>
            </div>
            <div className="history-modal-body" style={{ color: '#f8fafc' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <FiActivity className="icon-spin" style={{ fontSize: '2.5rem', color: '#3B82F6', filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {sendAllProgress.current === sendAllProgress.total ? 'Processing Complete' : `Sending ${sendAllProgress.current} of ${sendAllProgress.total}`}
                </div>
                {sendAllProgress.currentName && sendAllProgress.current !== sendAllProgress.total && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Current: <span style={{ color: '#60A5FA' }}>{sendAllProgress.currentName}</span>
                  </div>
                )}
              </div>

              <style>{`
                @keyframes waterWave {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
                .water-tube-fill {
                  background-size: 200% 200%;
                  animation: waterWave 3s ease infinite;
                }
              `}</style>

              <div style={{ width: '100%', margin: '1.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Progress</span>
                  <span style={{ fontWeight: 600, color: '#3B82F6' }}>{sendAllProgress.total > 0 ? Math.round((sendAllProgress.current / sendAllProgress.total) * 100) : 0}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '24px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div 
                    className="water-tube-fill"
                    style={{
                      width: `${sendAllProgress.total > 0 ? Math.round((sendAllProgress.current / sendAllProgress.total) * 100) : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #1E3A8A 0%, #3B82F6 50%, #60A5FA 100%)',
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.7), inset 0 -2px 6px rgba(0, 0, 0, 0.4)',
                      transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.25) 100%)'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  boxShadow: '0 0 10px rgba(34, 197, 94, 0.05)'
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Success</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e', textShadow: '0 0 8px rgba(34, 197, 94, 0.4)' }}>
                    {sendAllProgress.success}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.05)'
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Failed</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', textShadow: '0 0 8px rgba(239, 68, 68, 0.4)' }}>
                    {sendAllProgress.failed}
                  </div>
                </div>
              </div>

              {sendAllProgress.current === sendAllProgress.total && (
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    style={{ minWidth: '120px' }}
                    onClick={() => setIsSendingAll(false)}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
