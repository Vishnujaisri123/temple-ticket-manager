/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { getHistoryFolders, getHistoryTickets, getAutoDeletedLogs, updateBooking, deleteBooking, uploadPdf } from '../services/api';
import { toast } from '../components/Toast';
import AutoPdfDropzone from '../components/AutoPdfDropzone';
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
  const [deletedLogs, setDeletedLogs] = useState([]);

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

  // Direct search results
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setExpandedFolders({});
    setFolderTickets({});
    setFolderLoading({});
    try {
      if (subSection === 'deleted_logs') {
        const { data } = await getAutoDeletedLogs({ all: 'true' });
        setDeletedLogs(data || []);
        setLoading(false);
        return;
      }

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
    fetchFolders();
  }, [fetchFolders]);

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

  const handleAutoUploaded = () => {
    fetchFolders();
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
      // Construct updated ticket object
      const updatedTicket = {
        ...selectedTicket,
        pdfUrl: data.booking.pdfUrl || data.booking.localPdfUrl,
        localPdfUrl: data.booking.localPdfUrl,
        pdfSent: data.booking.pdfSent,
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

      if (toastId) toast.dismiss(toastId);
      toast.success('PDF uploaded successfully!');
      fetchFolders();
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

      setSelectedTicket(null);
      fetchFolders();
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

      toast.success('Status updated successfully!');
      fetchFolders();
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
        <button className={`nav-tab ${subSection === 'deleted_logs' ? 'active' : ''}`} onClick={() => { setSubSection('deleted_logs'); window.history.pushState({}, '', '/history/deleted_logs'); }} style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <FiFolderMinus /> Deleted Tickets Log
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

      {subSection === 'weekly' && (
        <AutoPdfDropzone onUploadSuccess={handleAutoUploaded} />
      )}

      {/* Main Content Area: Search Mode vs. Week Group Mode */}
      {searchQuery.trim() !== '' ? (
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
      ) : subSection === 'deleted_logs' ? (
        // ── Deleted Tickets Log View ──
        loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FiActivity className="icon-spin" style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
            <div>Loading Archive Logs...</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ marginTop: '1rem' }}>
            <table className="bookings-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Devotee Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Number</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visit Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Archived Time</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {deletedLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <FiFolderMinus style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block', margin: '0.5rem auto' }} />
                      No auto-deleted logs found in the last 30 days.
                    </td>
                  </tr>
                ) : (
                  deletedLogs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{log.memberName}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{log.phone}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--accent)' }}>{formatDateStr(log.visitDate)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.deletedAt).toLocaleString('en-GB')}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block' }}>
                          Archived to Shadow Realm
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
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
                <span className="history-modal-label">Booking Date:</span>
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
                  {selectedTicket.pdfUrl ? (
                    <a 
                      href={selectedTicket.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                    >
                      Uploaded
                    </a>
                  ) : (
                    <span style={{ color: 'var(--danger)' }}>Not Uploaded</span>
                  )}
                </span>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                {/* File input helper */}
                <input 
                  type="file" 
                  accept="application/pdf" 
                  id="modal-pdf-upload" 
                  style={{ display: 'none' }} 
                  onChange={handlePdfUpload} 
                />

                {/* Section Specific Action buttons */}
                {subSection === 'weekly' && (
                  <>
                    {!selectedTicket.pdfUrl ? (
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => document.getElementById('modal-pdf-upload').click()}>
                        Upload PDF
                      </button>
                    ) : (
                      <button className="btn btn-warning btn-sm" style={{ flex: 1 }} onClick={() => document.getElementById('modal-pdf-upload').click()}>
                        Replace PDF
                      </button>
                    )}
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleTicketDelete}>
                      Delete Ticket
                    </button>
                  </>
                )}

                {subSection === 'reports' && (
                  <>
                    {!selectedTicket.pdfUrl ? (
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => document.getElementById('modal-pdf-upload').click()}>
                        Upload PDF
                      </button>
                    ) : (
                      <button className="btn btn-warning btn-sm" style={{ flex: 1 }} onClick={() => document.getElementById('modal-pdf-upload').click()}>
                        Replace PDF
                      </button>
                    )}
                    <button 
                      className={`btn btn-sm ${selectedTicket.paid ? 'btn-outline' : 'btn-success'}`} 
                      style={{ flex: 1 }} 
                      onClick={() => handleStatusToggle('paid', selectedTicket.paid)}
                    >
                      {selectedTicket.paid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                    <button 
                      className={`btn btn-sm ${selectedTicket.completed ? 'btn-outline' : 'btn-success'}`} 
                      style={{ flex: 1 }} 
                      onClick={() => handleStatusToggle('completed', selectedTicket.completed)}
                    >
                      {selectedTicket.completed ? 'Mark Not Completed' : 'Mark Completed'}
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleTicketDelete}>
                      Delete Ticket
                    </button>
                  </>
                )}

                {subSection === 'further' && (
                  <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleTicketDelete}>
                    Delete Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
