import { useState, useEffect, useCallback } from 'react';
import { getBookings, getStats, claimOrphans } from '../services/api';
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
} from 'react-icons/fi';
import { LuLayoutDashboard, LuHistory } from 'react-icons/lu';
import { HiOutlineDocumentReport, HiTrendingUp } from 'react-icons/hi';
import { MdPhoneAndroid } from 'react-icons/md';
import { TbCash, TbDatabaseImport } from 'react-icons/tb';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'sent', label: 'Sent' },
  { key: 'pending', label: 'Pending' },
  { key: 'reminder', label: 'Reminders' },
];

const Dashboard = () => {
  const { username, logout } = useAuth();
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'history'
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('asc');
  const [stats, setStats] = useState({ overall: {}, admins: [], today: {}, weekly: {} });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

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

  const handleAutoUploaded = (updatedBooking) => {
    // Update booking in local state immediately so PDF button appears
    setBookings((prev) => prev.map((b) => b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b));
  };

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
            <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>
              <LuLayoutDashboard className="icon-hover-scale" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Dashboard
            </button>
            <button className={`nav-tab ${page === 'history' ? 'active' : ''}`} onClick={() => setPage('history')}>
              <LuHistory className="icon-hover-scale" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> History
            </button>
            <button className={`nav-tab ${page === 'daily' ? 'active' : ''}`} onClick={() => setPage('daily')}>
              <HiOutlineDocumentReport className="icon-hover-scale" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> Reports
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
          <History />
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
              <p>No daily data available</p>
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
              <div className="stat-info"><div className="label">Weekly PhonePe</div><div className="value">₹{stats.weekly?.phonepeAmount || 0}</div></div>
            </div>
            <div className="stat-card cash">
              <span className="stat-icon"><TbCash className="icon-float" style={{ color: 'var(--success)' }} /></span>
              <div className="stat-info"><div className="label">Weekly Cash</div><div className="value">₹{stats.weekly?.cashAmount || 0}</div></div>
            </div>
          </div>

          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon"><FiClipboard className="icon-float" /></span>
              <div className="stat-info"><div className="label">Weekly Bookings</div><div className="value">{stats.weekly?.count || 0}</div></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><FiCheckCircle className="icon-float" style={{ color: 'var(--success)' }} /></span>
              <div className="stat-info"><div className="label">Paid (Weekly)</div><div className="value">{stats.weekly?.paidCount || 0}</div></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><FiSend className="icon-float" style={{ color: 'var(--primary)' }} /></span>
              <div className="stat-info"><div className="label">Sent (Weekly)</div><div className="value">{stats.weekly?.sentCount || 0}</div></div>
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
    </div>
  );
};

export default Dashboard;
