import { useState, useEffect, useCallback } from 'react';
import { getBookings, getStats, claimOrphans } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import BookingTable from '../components/BookingTable';
import AddBookingForm from '../components/AddBookingForm';
import History from './History';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: '💰 Paid' },
  { key: 'unpaid', label: '❌ Unpaid' },
  { key: 'sent', label: '📤 Sent' },
  { key: 'pending', label: '⏳ Pending' },
  { key: 'reminder', label: '🔔 Reminders' },
];

const Dashboard = () => {
  const { username, logout } = useAuth();
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'history'
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('asc');
  const [stats, setStats] = useState({ overall: {}, admins: [] });
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
      if (filter !== 'all') params.status = filter;
      params.sort = sort;
      const { data } = await getBookings(params);
      setBookings(data);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, sort]);

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
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-top">
          <div className="navbar-brand">
            <span className="icon">🕌</span>
            <div>
              <h1>Temple Ticket Manager</h1>
              <span>Sri Venkateswara Swami Temple, Vadapalli</span>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
        <div className="navbar-bottom">
          <div className="nav-tabs">
            <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>📋 Dashboard</button>
            <button className={`nav-tab ${page === 'history' ? 'active' : ''}`} onClick={() => setPage('history')}>📜 History</button>
            <button className={`nav-tab ${page === 'daily' ? 'active' : ''}`} onClick={() => setPage('daily')}>📊 Daily Report</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn-mode" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <span className="user">👤 {username}</span>
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
              <h2>Daily Financial Report</h2>
              <p>Payment breakdown based on the date tickets were entered</p>
            </div>
          </div>
          {stats.daily && stats.daily.length > 0 ? (
            <div className="daily-grid">
              {stats.daily.map(day => (
                <div key={day.date} className="admin-stat-card">
                  <div className="admin-name" style={{ fontSize: '1.1rem' }}>📅 {new Date(day.date).toLocaleDateString('en-GB')}</div>
                  <div className="admin-details">
                    <span style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>🎟️ {day.count} tickets entered</span>
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
              <div className="icon">📊</div>
              <p>No daily data available</p>
            </div>
          )}
        </main>
      ) : (
        <main className="main-content">
          <div className="dashboard-header">
            <div className="dashboard-title">
              <h2>Booking Dashboard</h2>
              <p>Manage all temple ticket bookings</p>
            </div>
            <div className="controls">
              <button className="btn btn-warning btn-sm" onClick={handleClaimOrphans} style={{ gap: '0.4rem' }}>
                🔄 Recover Old Data
              </button>
              <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="asc">Visit Date ↑</option>
                <option value="desc">Visit Date ↓</option>
                <option value="phone">📞 Phone Number</option>
              </select>
            </div>
          </div>

          <div className="stats-bar financial-stats">
            <div className="stat-card money">
              <span className="stat-icon">💰</span>
              <div className="stat-info"><div className="label">Total Amount</div><div className="value">₹{stats.overall.totalAmount || 0}</div></div>
            </div>
            <div className="stat-card profit">
              <span className="stat-icon">📈</span>
              <div className="stat-info"><div className="label">Total Profit</div><div className="value">₹{stats.overall.totalProfit || 0}</div></div>
            </div>
            <div className="stat-card phonepe">
              <span className="stat-icon">📱</span>
              <div className="stat-info"><div className="label">PhonePe</div><div className="value">₹{stats.overall.phonepeAmount || 0}</div></div>
            </div>
            <div className="stat-card cash">
              <span className="stat-icon">💵</span>
              <div className="stat-info"><div className="label">Cash</div><div className="value">₹{stats.overall.cashAmount || 0}</div></div>
            </div>
          </div>

          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon">📋</span>
              <div className="stat-info"><div className="label">Total Bookings</div><div className="value">{stats.overall.count || 0}</div></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <div className="stat-info"><div className="label">Paid (Total)</div><div className="value">{stats.overall.paidCount || bookings.filter((b) => b.paid).length}</div></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📤</span>
              <div className="stat-info"><div className="label">Sent (Total)</div><div className="value">{stats.overall.sentCount || bookings.filter((b) => b.pdfSent).length}</div></div>
            </div>
          </div>

          {stats.admins && stats.admins.length > 0 && (
            <div className="admin-performance">
              <h3>👤 Admin Performance</h3>
              <div className="admin-grid">
                {stats.admins.map(a => (
                  <div key={a.username} className="admin-stat-card">
                    <div className="admin-name">{a.username}</div>
                    <div className="admin-details">
                      <span>🎟️ {a.count} tickets</span>
                      <span>💰 ₹{a.amount}</span>
                      <span className="profit-text">📈 ₹{a.profit} profit</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AddBookingForm onAdded={(b) => setBookings((prev) => [b, ...prev])} />

          <div className="filter-tabs" style={{ marginBottom: '1rem' }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

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
