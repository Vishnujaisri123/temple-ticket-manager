/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { getHistoryFolders, getHistoryTickets } from '../services/api';
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

const History = () => {
  const [folders, setFolders] = useState([]);
  const [stats, setStats] = useState({ count: 0, totalAmount: 0, totalProfit: 0, paidCount: 0, unpaidCount: 0, completedCount: 0, sentCount: 0 });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Subsections inside History
  const [subSection, setSubSection] = useState('weekly'); // 'weekly' | 'reports' | 'further'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'current_week' | 'previous_week' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Folder interaction and lazy-loaded tickets
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderTickets, setFolderTickets] = useState({});
  const [folderLoading, setFolderLoading] = useState({});

  // Ticket Detail Modal
  const [selectedTicket, setSelectedTicket] = useState(null);

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
  }, [subSection, dateFilter, customStart, customEnd, searchQuery, sort]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

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
    // Refresh the folder list when a PDF is matched in the background
    fetchFolders();
  };

  return (
    <div>
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
              placeholder="Search by name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.875rem' }}
            />
          </div>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="desc">Bookers Date ↓</option>
            <option value="asc">Bookers Date ↑</option>
            <option value="phone">Phone Number</option>
          </select>
        </div>
      </div>

      {/* History Sub-navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.6rem', flexWrap: 'wrap' }}>
        <button className={`nav-tab ${subSection === 'weekly' ? 'active' : ''}`} onClick={() => { setSubSection('weekly'); setDateFilter('all'); }} style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <FiCalendar /> Weekly History
        </button>
        <button className={`nav-tab ${subSection === 'reports' ? 'active' : ''}`} onClick={() => { setSubSection('reports'); setDateFilter('monthly'); }} style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <HiOutlineDocumentReport /> Reports
        </button>
        <button className={`nav-tab ${subSection === 'further' ? 'active' : ''}`} onClick={() => { setSubSection('further'); setDateFilter('further_date'); }} style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <FiFolderPlus /> Further Date Bookings
        </button>
      </div>

      {/* Date Scope Selectors */}
      {subSection === 'weekly' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem', background: 'var(--surface)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button className={`btn btn-sm ${dateFilter === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDateFilter('all')}>
            All Time
          </button>
          <button className={`btn btn-sm ${dateFilter === 'current_week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDateFilter('current_week')}>
            Current Week
          </button>
          <button className={`btn btn-sm ${dateFilter === 'previous_week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDateFilter('previous_week')}>
            Previous Week
          </button>
          <button className={`btn btn-sm ${dateFilter === 'custom' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDateFilter('custom')}>
            Custom Date Range
          </button>
          {dateFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
          )}
        </div>
      )}

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

      {/* Stats Summary for Each Section */}
      {stats && (
        <>
          {subSection === 'weekly' && (
            <div className="stats-bar" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <span className="stat-icon"><FiClipboard className="icon-float" /></span>
                <div className="stat-info">
                  <div className="label">Total Records</div>
                  <div className="value">{stats.count || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon"><FiCheckCircle className="icon-float" style={{ color: 'var(--success)' }} /></span>
                <div className="stat-info">
                  <div className="label">Completed & Paid</div>
                  <div className="value">{stats.completedCount || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon"><FiSend className="icon-float" style={{ color: 'var(--primary)' }} /></span>
                <div className="stat-info">
                  <div className="label">Tickets Sent</div>
                  <div className="value">{stats.sentCount || 0}</div>
                </div>
              </div>
            </div>
          )}
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

      {/* Auto PDF Dropzone (Only relevant for matching/uploading to completed & paid) */}
      {subSection === 'weekly' && (
        <AutoPdfDropzone onUploadSuccess={handleAutoUploaded} />
      )}

      {/* Folders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FiActivity className="icon-spin" style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
          <div>Loading Archive Folders...</div>
        </div>
      ) : folders.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="icon">
              <FiFolderMinus className="icon-float" style={{ fontSize: '3rem', color: 'var(--text-muted)' }} />
            </div>
            <p>No archived tickets found for this period.</p>
          </div>
        </div>
      ) : (
        <div className="history-folders-container">
          {folders.map((folder) => {
            const isExpanded = !!expandedFolders[folder._id];
            const tickets = folderTickets[folder._id] || [];
            const isLoadingTickets = !!folderLoading[folder._id];

            return (
              <div key={folder._id} className="history-folder-card">
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
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 700 }}>
                  {selectedTicket.member1}
                  {selectedTicket.member2 ? ` & ${selectedTicket.member2}` : ''}
                </h4>
              </div>
              
              <div className="history-modal-row">
                <span className="history-modal-label">Booked:</span>
                <span className="history-modal-value">{formatDateStr(selectedTicket.bookingDate)}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Timeslot:</span>
                <span className="history-modal-value">{selectedTicket.slotTime || '—'}</span>
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
                <span className="history-modal-label">Bookers Date:</span>
                <span className="history-modal-value">{formatDateStr(selectedTicket.bookingDate)}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Visit Date:</span>
                <span className="history-modal-value">{formatDateStr(selectedTicket.visitDate)}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Paid:</span>
                <span className="history-modal-value">{selectedTicket.paid ? 'Yes' : 'No'}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Completed:</span>
                <span className="history-modal-value">{selectedTicket.completed ? 'Yes' : 'No'}</span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
