import { useState, useEffect, useCallback } from 'react';
import { getBookings, getTotalCount } from '../services/api';
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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

  // Fetch total count across all bookings including history
  useEffect(() => {
    getTotalCount().then(({ data }) => setTotalCount(data.total)).catch(() => {});
  }, [bookings]); // refetch when bookings change

  const stats = {
    total: totalCount,
    paid: bookings.filter((b) => b.paid).length,
    sent: bookings.filter((b) => b.pdfSent).length,
    completed: bookings.filter((b) => b.completed).length,
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
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="user">👤 {username}</span>
            <button className="btn-logout btn-logout-desktop" onClick={logout}>Logout</button>
          </div>
        </div>
      </nav>

      {page === 'history' ? (
        <main className="main-content">
          <History />
        </main>
      ) : (
        <main className="main-content">
          <div className="dashboard-header">
            <div className="dashboard-title">
              <h2>Booking Dashboard</h2>
              <p>Manage all temple ticket bookings</p>
            </div>
            <div className="controls">
              <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="asc">Visit Date ↑</option>
                <option value="desc">Visit Date ↓</option>
              </select>
            </div>
          </div>

          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon">📋</span>
              <div className="stat-info"><div className="label">Total</div><div className="value">{stats.total}</div></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💰</span>
              <div className="stat-info"><div className="label">Paid</div><div className="value">{stats.paid}</div></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📤</span>
              <div className="stat-info"><div className="label">Sent</div><div className="value">{stats.sent}</div></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <div className="stat-info"><div className="label">Completed</div><div className="value">{stats.completed}</div></div>
            </div>
          </div>

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
