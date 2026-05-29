import { useState, useEffect, useCallback } from 'react';
import { getBookings, deleteBooking, updateBooking, claimOrphans } from '../services/api';
import { toast } from '../components/Toast';
import SendButton from '../components/SendButton';
import UploadCell from '../components/UploadCell';
import PrintButton from '../components/PrintButton';
import AutoPdfDropzone from '../components/AutoPdfDropzone';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—';

const History = () => {
  const [completed, setCompleted] = useState([]);
  const [sent, setSent] = useState([]);
  const [puja, setPuja] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('completed');
  const [sort, setSort] = useState('desc');
  const [editingPhone, setEditingPhone] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [completedRes, sentRes, pujaRes] = await Promise.all([
        getBookings({ status: 'history_completed', sort }),
        getBookings({ status: 'sent', sort }),
        getBookings({ status: 'puja_completed', sort }),
      ]);
      setCompleted(completedRes.data);
      setSent(sentRes.data);
      setPuja(pujaRes.data);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const handleStatsUpdated = () => {
      fetchHistory();
    };
    window.addEventListener('statsUpdated', handleStatsUpdated);
    return () => window.removeEventListener('statsUpdated', handleStatsUpdated);
  }, [fetchHistory]);

  const saveField = useCallback(async (id, field, value, type) => {
    try {
      const { data } = await updateBooking(id, { [field]: value });
      
      // Handle moving between lists for pujaGroceryDone
      if (field === 'pujaGroceryDone') {
        if (value === true) {
          setSent((prev) => prev.filter((b) => b._id !== id));
          setPuja((prev) => [data, ...prev]);
          setActiveTab('puja');
        } else {
          setPuja((prev) => prev.filter((b) => b._id !== id));
          setSent((prev) => [data, ...prev]);
          setActiveTab('sent');
        }
        window.dispatchEvent(new Event('statsUpdated'));
      } else {
        if (field === 'pujaGroceryPaymentMethod') {
          window.dispatchEvent(new Event('statsUpdated'));
        }
        if (type === 'completed') setCompleted((prev) => prev.map((b) => b._id === id ? data : b));
        else if (type === 'sent') setSent((prev) => prev.map((b) => b._id === id ? data : b));
        else if (type === 'puja') setPuja((prev) => prev.map((b) => b._id === id ? data : b));
      }
    } catch { toast('Failed to update', 'error'); }
  }, []);

  const handleDelete = async (id, type) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await deleteBooking(id);
      if (type === 'completed') setCompleted((prev) => prev.filter((b) => b._id !== id));
      else if (type === 'sent') setSent((prev) => prev.filter((b) => b._id !== id));
      else if (type === 'puja') setPuja((prev) => prev.filter((b) => b._id !== id));
      toast('Deleted successfully');
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleUploaded = (id, updatedBooking) => {
    setCompleted((prev) => prev.map((b) => b._id === id ? { ...b, ...updatedBooking } : b));
    setSent((prev) => prev.map((b) => b._id === id ? { ...b, ...updatedBooking } : b));
    setPuja((prev) => prev.map((b) => b._id === id ? { ...b, ...updatedBooking } : b));
  };

  const handleSent = (updated) => {
    setCompleted((prev) => prev.filter((b) => b._id !== updated._id));
    setSent((prev) => {
      const exists = prev.find((b) => b._id === updated._id);
      if (exists) return prev.map((b) => b._id === updated._id ? updated : b);
      return [updated, ...prev];
    });
    setPuja((prev) => prev.map((b) => b._id === updated._id ? updated : b));
  };

  const handleRecoverOldData = async () => {
    if (!window.confirm('Recover old bookings that may not be visible in your current account?')) return;
    try {
      const { data } = await claimOrphans();
      toast(data.message || 'Recovered old bookings');
      fetchHistory();
    } catch {
      toast('Failed to recover old booking data', 'error');
    }
  };

  const handleAutoUploaded = (updatedBooking) => {
    // If it matched a booking in any tab, update it
    setCompleted((prev) => prev.map((b) => b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b));
    setSent((prev) => prev.map((b) => b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b));
    setPuja((prev) => prev.map((b) => b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b));
  };

  const handlePhoneSave = (booking, type) => {
    const val = editingPhone[booking._id];
    if (val !== undefined && val !== booking.phone) saveField(booking._id, 'phone', val, type);
    setEditingPhone((prev) => { const n = { ...prev }; delete n[booking._id]; return n; });
  };

  const tabs = [
    { key: 'completed', label: '✅ Completed & Paid', count: completed.length },
    { key: 'sent', label: '📤 Sent Tickets', count: sent.length },
    { key: 'puja', label: '🥥 Puja Persons', count: puja.length },
  ];

  const filterData = (list) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(b => 
      b.member1?.toLowerCase().includes(q) || 
      b.phone?.includes(q)
    );
  };

  const data = filterData(activeTab === 'completed' ? completed : activeTab === 'sent' ? sent : puja);

  const PhoneCell = ({ b }) => (
    editingPhone[b._id] !== undefined ? (
      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
        <input type="tel" value={editingPhone[b._id]}
          onChange={(e) => setEditingPhone((prev) => ({ ...prev, [b._id]: e.target.value }))}
          style={{ border: '1.5px solid var(--primary)', borderRadius: '4px', padding: '0.25rem 0.4rem', fontSize: '0.82rem', width: '120px' }}
          maxLength={13} autoFocus />
        <button className="btn btn-sm btn-primary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handlePhoneSave(b, activeTab)}>✓</button>
        <button className="btn btn-sm btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setEditingPhone((prev) => { const n = { ...prev }; delete n[b._id]; return n; })}>✕</button>
      </div>
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <span style={{ fontSize: '0.82rem' }}>{b.phone}</span>
        <button className="btn btn-sm btn-outline" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
          onClick={() => setEditingPhone((prev) => ({ ...prev, [b._id]: b.phone }))}>✏️</button>
      </div>
    )
  );

  const PaymentCell = ({ b }) => (
    <select value={b.paymentMethod || ''}
      onChange={(e) => saveField(b._id, 'paymentMethod', e.target.value, activeTab)}
      style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '0.25rem 0.4rem', fontSize: '0.78rem', background: b.paymentMethod === 'phonepe' ? '#e8f4fd' : b.paymentMethod === 'cash' ? '#e8f5e9' : '#fff' }}>
      <option value="">— Select —</option>
      <option value="phonepe">📱 PhonePe</option>
      <option value="cash">💵 Cash</option>
    </select>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>📜 History</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Completed, paid and sent records</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.875rem' }}
            />
          </div>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="desc">Visit Date ↓</option>
            <option value="asc">Visit Date ↑</option>
            <option value="phone">📞 Phone Number</option>
          </select>
          <button className="btn btn-warning btn-sm" onClick={handleRecoverOldData} style={{ whiteSpace: 'nowrap' }}>
            🔄 Recover Old Data
          </button>
        </div>
      </div>

      <AutoPdfDropzone onUploadSuccess={handleAutoUploaded} />

      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-info"><div className="label">Completed & Paid</div><div className="value">{completed.length}</div></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📤</span>
          <div className="stat-info"><div className="label">Tickets Sent</div><div className="value">{sent.length}</div></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🥥</span>
          <div className="stat-info"><div className="label">Puja Done</div><div className="value">{puja.length}</div></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.key} className={`filter-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
            <span style={{ marginLeft: '0.4rem', background: activeTab === t.key ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)', color: activeTab === t.key ? '#fff' : 'var(--primary)', borderRadius: '10px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading history...</div>
      ) : data.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="icon">{activeTab === 'completed' ? '✅' : activeTab === 'sent' ? '📤' : '🥥'}</div>
            <p>{activeTab === 'completed' ? 'No completed & paid bookings yet.' : activeTab === 'sent' ? 'No sent tickets yet.' : 'No completed puja persons yet.'}</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <PrintButton bookings={data} title={activeTab === 'completed' ? 'Completed & Paid' : activeTab === 'sent' ? 'Sent Tickets' : 'Puja Persons'} />
          </div>

          {/* Desktop Table */}
          <div className="table-wrapper">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Bookers Date</th><th>Booked Date</th><th>Phone</th>
                    <th>Gothram</th><th>Member 1</th><th>Member 2</th>
                    <th>💰 Paid</th><th>✅ Done</th>
                    {(activeTab === 'sent' || activeTab === 'puja') && (
                      <>
                        <th>🥥 Puja Grocery</th><th>💳 Puja Payment</th><th>🥥 Puja Done</th>
                        <th>📤 Sent At</th>
                      </>
                    )}
                    <th>📎 PDF</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((b) => (
                    <tr key={b._id} className={activeTab === 'sent' ? 'sent-row' : ''}>
                      <td><div className="serial-no">{b.serialNo}</div></td>
                      <td>{fmt(b.bookingDate)}</td>
                      <td>{fmt(b.visitDate)}</td>
                      <td><PhoneCell b={b} /></td>
                      <td>{b.gothram || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{b.member1}</td>
                      <td>{b.member2 || '—'}</td>
                      <td className="checkbox-cell" onClick={() => saveField(b._id, 'paid', !b.paid, activeTab)} style={{ cursor: 'pointer' }}><span style={{ color: b.paid ? 'var(--success)' : 'var(--danger)' }}>{b.paid ? '✅' : '❌'}</span></td>
                      <td className="checkbox-cell" onClick={() => saveField(b._id, 'completed', !b.completed, activeTab)} style={{ cursor: 'pointer' }}><span style={{ color: b.completed ? 'var(--success)' : 'var(--danger)' }}>{b.completed ? '✅' : '❌'}</span></td>
                      {(activeTab === 'sent' || activeTab === 'puja') && (
                        <>
                          <td className="checkbox-cell"><input type="checkbox" checked={b.pujaGrocery} onChange={() => saveField(b._id, 'pujaGrocery', !b.pujaGrocery, activeTab)} /></td>
                          <td>
                            <select value={b.pujaGroceryPaymentMethod || ''} onChange={(e) => saveField(b._id, 'pujaGroceryPaymentMethod', e.target.value, activeTab)} style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '0.25rem 0.4rem', fontSize: '0.78rem', background: b.pujaGroceryPaymentMethod === 'phonepe' ? '#e8f4fd' : b.pujaGroceryPaymentMethod === 'cash' ? '#e8f5e9' : '#fff' }}>
                              <option value="">— Select —</option><option value="phonepe">📱 PhonePe</option><option value="cash">💵 Cash</option>
                            </select>
                          </td>
                          <td className="checkbox-cell"><input type="checkbox" checked={b.pujaGroceryDone} onChange={() => saveField(b._id, 'pujaGroceryDone', !b.pujaGroceryDone, activeTab)} /></td>
                          <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {b.sentAt ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>📤 {fmtTime(b.sentAt)}</span> : '—'}
                          </td>
                        </>
                      )}
                      <td><UploadCell booking={b} onUploaded={handleUploaded} /></td>
                      <td>
                        <div className="row-actions">
                          <SendButton booking={b} onSent={handleSent} />
                          <SendButton booking={b} isReminder onSent={handleSent} />
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(b._id, activeTab)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="booking-cards">
            {data.map((b) => (
              <div key={b._id} className={`booking-card${activeTab === 'sent' ? ' sent-card' : ''}`}>
                <div className="booking-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div className="card-serial">{b.serialNo}</div>
                    <div>
                      <div className="card-name">{b.member1}{b.member2 ? ` & ${b.member2}` : ''}</div>
                      <div className="card-date">📅 Booked: {fmt(b.visitDate)}</div>
                    </div>
                  </div>
                  <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}
                    onClick={() => handleDelete(b._id, activeTab)}>🗑️</button>
                </div>
                <div className="booking-card-body">
                  <div className="card-row">
                    <span className="card-label">📞 Phone</span>
                    <PhoneCell b={b} />
                  </div>
                  {b.gothram && <div className="card-row"><span className="card-label">🏛️ Gothram</span><span className="card-value">{b.gothram}</span></div>}
                  <div className="card-row"><span className="card-label">� Member 1</span><span className="card-value" style={{ fontWeight: 600 }}>{b.member1}</span></div>
                  {b.member2 && <div className="card-row"><span className="card-label">👤 Member 2</span><span className="card-value">{b.member2}</span></div>}
                  <div className="card-row"><span className="card-label">�📅 Bookers Date</span><span className="card-value">{fmt(b.bookingDate)}</span></div>
                  <div className="card-row"><span className="card-label">💰 Paid</span><span className="card-value" onClick={() => saveField(b._id, 'paid', !b.paid, activeTab)} style={{ cursor: 'pointer' }}>{b.paid ? '✅ Yes' : '❌ No'}</span></div>
                  <div className="card-row"><span className="card-label">✅ Done</span><span className="card-value" onClick={() => saveField(b._id, 'completed', !b.completed, activeTab)} style={{ cursor: 'pointer' }}>{b.completed ? '✅ Yes' : '❌ No'}</span></div>
                  {(activeTab === 'sent' || activeTab === 'puja') && (
                    <>
                      <div className="card-row"><span className="card-label">🥥 Puja Grocery</span><span className="card-value"><input type="checkbox" checked={b.pujaGrocery} onChange={() => saveField(b._id, 'pujaGrocery', !b.pujaGrocery, activeTab)} /></span></div>
                      <div className="card-row">
                        <span className="card-label">🥥 Puja Payment</span>
                        <select value={b.pujaGroceryPaymentMethod || ''} onChange={(e) => saveField(b._id, 'pujaGroceryPaymentMethod', e.target.value, activeTab)} style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '0.25rem 0.4rem', fontSize: '0.78rem', background: b.pujaGroceryPaymentMethod === 'phonepe' ? '#e8f4fd' : b.pujaGroceryPaymentMethod === 'cash' ? '#e8f5e9' : '#fff', color: 'var(--text)', cursor: 'pointer', width: '100px' }}>
                          <option value="">— Select —</option><option value="phonepe">📱 PhonePe</option><option value="cash">💵 Cash</option>
                        </select>
                      </div>
                      <div className="card-row"><span className="card-label">🥥 Puja Done</span><span className="card-value"><input type="checkbox" checked={b.pujaGroceryDone} onChange={() => saveField(b._id, 'pujaGroceryDone', !b.pujaGroceryDone, activeTab)} /></span></div>
                      {b.sentAt && (
                        <div className="card-row">
                          <span className="card-label">📤 Sent At</span>
                          <span className="card-value" style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.78rem' }}>{fmtTime(b.sentAt)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div style={{ paddingTop: '0.5rem' }}><UploadCell booking={b} onUploaded={handleUploaded} /></div>
                </div>
                <div className="card-actions">
                  <SendButton booking={b} onSent={handleSent} />
                  <SendButton booking={b} isReminder onSent={handleSent} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default History;
