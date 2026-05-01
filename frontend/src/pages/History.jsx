import { useState, useEffect, useCallback } from 'react';
import { getBookings, deleteBooking, updateBooking } from '../services/api';
import { toast } from '../components/Toast';
import SendButton from '../components/SendButton';
import UploadCell from '../components/UploadCell';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const History = () => {
  const [completed, setCompleted] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('completed');
  const [sort, setSort] = useState('desc');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [completedRes, sentRes] = await Promise.all([
        getBookings({ status: 'history_completed', sort }),
        getBookings({ status: 'sent', sort }),
      ]);
      setCompleted(completedRes.data);
      setSent(sentRes.data);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (id, type) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await deleteBooking(id);
      if (type === 'completed') setCompleted((prev) => prev.filter((b) => b._id !== id));
      else setSent((prev) => prev.filter((b) => b._id !== id));
      toast('Deleted successfully');
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleUploaded = (id, updatedBooking) => {
    setCompleted((prev) => prev.map((b) => b._id === id ? { ...b, ...updatedBooking } : b));
    setSent((prev) => prev.map((b) => b._id === id ? { ...b, ...updatedBooking } : b));
  };

  const handleSent = (updated) => {
    // Remove from completed tab, add to sent tab
    setCompleted((prev) => prev.filter((b) => b._id !== updated._id));
    setSent((prev) => {
      const exists = prev.find((b) => b._id === updated._id);
      if (exists) return prev.map((b) => b._id === updated._id ? updated : b);
      return [updated, ...prev];
    });
  };

  const tabs = [
    { key: 'completed', label: '✅ Completed & Paid', count: completed.length },
    { key: 'sent', label: '📤 Sent Tickets', count: sent.length },
  ];

  const data = activeTab === 'completed' ? completed : sent;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--primary)', margin: 0 }}>📜 History</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Completed, paid and sent ticket records</p>
        </div>
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="desc">Visit Date ↓</option>
          <option value="asc">Visit Date ↑</option>
        </select>
      </div>

      {/* Stats */}
      <div className="stats-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-info"><div className="label">Completed & Paid</div><div className="value">{completed.length}</div></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📤</span>
          <div className="stat-info"><div className="label">Tickets Sent</div><div className="value">{sent.length}</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`filter-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            <span style={{
              marginLeft: '0.4rem', background: activeTab === t.key ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)',
              color: activeTab === t.key ? '#fff' : 'var(--primary)',
              borderRadius: '10px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading history...</div>
      ) : data.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="icon">{activeTab === 'completed' ? '✅' : '📤'}</div>
            <p>{activeTab === 'completed' ? 'No completed & paid bookings yet.' : 'No sent tickets yet. Send a ticket from the dashboard.'}</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Booking Date</th>
                  <th>Visit Date</th>
                  <th>Phone</th>
                  <th>Member 1</th>
                  <th>Member 2</th>
                  <th>Gothram</th>
                  <th>💰 Paid</th>
                  <th>✅ Done</th>
                  {activeTab === 'sent' && <th>📤 Sent At</th>}
                  <th>📎 PDF</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b._id} style={{ background: activeTab === 'sent' && b.pdfSent ? '#f0fff4' : '' }}>
                    <td><div className="serial-no">{b.serialNo}</div></td>
                    <td>{fmt(b.bookingDate)}</td>
                    <td>{fmt(b.visitDate)}</td>
                    <td style={{ fontSize: '0.82rem' }}>{b.phone}</td>
                    <td style={{ fontWeight: 600 }}>{b.member1}</td>
                    <td>{b.member2 || '—'}</td>
                    <td>{b.gothram || '—'}</td>
                    <td className="checkbox-cell">
                      <span style={{ color: b.paid ? 'var(--success)' : 'var(--danger)', fontSize: '1.1rem' }}>
                        {b.paid ? '✅' : '❌'}
                      </span>
                    </td>
                    <td className="checkbox-cell">
                      <span style={{ color: b.completed ? 'var(--success)' : 'var(--danger)', fontSize: '1.1rem' }}>
                        {b.completed ? '✅' : '❌'}
                      </span>
                    </td>
                    {activeTab === 'sent' && (
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {b.sentAt ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                            📤 {fmtTime(b.sentAt)}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                    <td>
                      <UploadCell booking={b} onUploaded={handleUploaded} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <SendButton booking={b} onSent={handleSent} />
                        <SendButton booking={b} isReminder onSent={handleSent} />
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => handleDelete(b._id, activeTab)}
                          title="Delete"
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
