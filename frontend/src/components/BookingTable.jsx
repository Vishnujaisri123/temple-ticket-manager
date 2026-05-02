import { useState, useCallback } from 'react';
import { updateBooking, deleteBooking } from '../services/api';
import { toast } from './Toast';
import UploadCell from './UploadCell';
import SendButton from './SendButton';
import GothramInput from './GothramInput';
import PrintButton from './PrintButton';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const isReminderDue = (visitDate) => {
  const today = new Date();
  const visit = new Date(visitDate);
  const diff = Math.ceil((visit - today) / (1000 * 60 * 60 * 24));
  return diff === 2;
};

const PaymentSelect = ({ booking, onUpdate }) => (
  <select
    value={booking.paymentMethod || ''}
    onChange={(e) => onUpdate(booking, 'paymentMethod', e.target.value)}
    style={{
      border: '1px solid var(--border)', borderRadius: '4px',
      padding: '0.25rem 0.4rem', fontSize: '0.78rem',
      background: booking.paymentMethod === 'phonepe' ? '#e8f4fd' : booking.paymentMethod === 'cash' ? '#e8f5e9' : '#fff',
      color: 'var(--text)', cursor: 'pointer', width: '100%',
    }}
  >
    <option value="">— Select —</option>
    <option value="phonepe">📱 PhonePe</option>
    <option value="cash">💵 Cash</option>
  </select>
);

const BookingTable = ({ bookings, setBookings }) => {
  const [editing, setEditing] = useState({});
  const [editingPhone, setEditingPhone] = useState({});

  const handleFieldChange = (id, field, value) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveField = useCallback(async (booking, field, value) => {
    try {
      const { data } = await updateBooking(booking._id, { [field]: value });
      setBookings((prev) => prev.map((b) => (b._id === data._id ? data : b)));
    } catch {
      toast('Failed to update', 'error');
    }
  }, [setBookings]);

  const handleCheckbox = (booking, field) => {
    const newVal = !booking[field];
    const updated = { ...booking, [field]: newVal };
    saveField(booking, field, newVal);
    if (updated.completed && updated.paid) {
      setBookings((prev) => prev.filter((b) => b._id !== booking._id));
    } else {
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? updated : b)));
    }
  };

  const handleBlur = (booking, field) => {
    const val = editing[booking._id]?.[field];
    if (val !== undefined && val !== booking[field]) {
      saveField(booking, field, val);
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? { ...b, [field]: val } : b)));
    }
  };

  const handlePhoneSave = (booking) => {
    const val = editingPhone[booking._id];
    if (val !== undefined && val !== booking.phone) {
      saveField(booking, 'phone', val);
      setBookings((prev) => prev.map((b) => b._id === booking._id ? { ...b, phone: val } : b));
    }
    setEditingPhone((prev) => { const n = { ...prev }; delete n[booking._id]; return n; });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this booking?')) return;
    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b._id !== id));
      toast('Booking deleted');
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleUploaded = (id, updatedBooking) => {
    setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, ...updatedBooking } : b)));
  };

  const onSent = (updated) => setBookings((prev) => prev.map((x) => x._id === updated._id ? updated : x));
  const onRemove = (id) => setBookings((prev) => prev.filter((x) => x._id !== id));

  const handleBulkSend = () => {
    const withPdf = bookings.filter((b) => b.pdfUrl && !b.pdfSent);
    if (!withPdf.length) { toast('No unsent bookings with PDF', 'warning'); return; }
    withPdf.forEach((b, i) => {
      setTimeout(() => {
        let phone = b.phone.replace(/\D/g, '');
        if (!phone.startsWith('91')) phone = '91' + phone;
        const visitDate = new Date(b.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const msg = `🙏 Namaskaram ${b.member1}!\n\nYour temple ticket is ready.\n📅 Visit Date: *${visitDate}*\n📄 Ticket: ${b.pdfUrl}\n\nJai Govinda! 🙏`;
        const a = document.createElement('a');
        a.href = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
        a.target = '_blank'; a.rel = 'noopener noreferrer';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }, i * 800);
    });
  };

  if (!bookings.length) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <div className="icon">🕌</div>
          <p>No bookings found. Add a new booking above.</p>
        </div>
      </div>
    );
  }

  const reminderCount = bookings.filter((b) => isReminderDue(b.visitDate) && !b.reminderSent).length;

  return (
    <>
      {reminderCount > 0 && (
        <div className="reminder-banner">
          <span className="icon">🔔</span>
          <span><strong>{reminderCount}</strong> booking(s) visit in 2 days — send reminders!</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <PrintButton bookings={bookings} title="Dashboard Bookings" />
        <button className="btn btn-warning btn-sm" onClick={handleBulkSend}>📤 Bulk Send</button>
      </div>

      {/* ── Desktop Table ── */}
      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Bookers Date</th><th>Booked Date</th><th>Phone</th>
                <th>Member 1</th><th>Member 2</th><th>Gothram</th>
                <th>✅ Done</th><th>📤 Sent</th><th>💰 Paid</th>
                <th>Payment</th><th>📎 PDF</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id} style={isReminderDue(b.visitDate) ? { background: '#fff8e1', borderLeft: '3px solid #f0a500' } : {}}>
                  <td><div className="serial-no">{b.serialNo}</div></td>
                  <td>{fmt(b.bookingDate)}</td>
                  <td>
                    <div className="editable-cell">
                      <input type="date" defaultValue={b.visitDate?.split('T')[0]}
                        onChange={(e) => handleFieldChange(b._id, 'visitDate', e.target.value)}
                        onBlur={() => handleBlur(b, 'visitDate')} />
                    </div>
                  </td>
                  <td>
                    {editingPhone[b._id] !== undefined ? (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <input type="tel" value={editingPhone[b._id]}
                          onChange={(e) => setEditingPhone((prev) => ({ ...prev, [b._id]: e.target.value }))}
                          style={{ border: '1.5px solid var(--primary)', borderRadius: '4px', padding: '0.25rem 0.4rem', fontSize: '0.82rem', width: '120px' }}
                          maxLength={13} autoFocus />
                        <button className="btn btn-sm btn-primary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handlePhoneSave(b)}>✓</button>
                        <button className="btn btn-sm btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setEditingPhone((prev) => { const n = { ...prev }; delete n[b._id]; return n; })}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ fontSize: '0.82rem' }}>{b.phone}</span>
                        <button className="btn btn-sm btn-outline" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                          onClick={() => setEditingPhone((prev) => ({ ...prev, [b._id]: b.phone }))}>✏️</button>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="editable-cell">
                      <input type="text" defaultValue={b.member1}
                        onChange={(e) => handleFieldChange(b._id, 'member1', e.target.value)}
                        onBlur={() => handleBlur(b, 'member1')} />
                    </div>
                  </td>
                  <td>
                    <div className="editable-cell">
                      <input type="text" defaultValue={b.member2}
                        onChange={(e) => handleFieldChange(b._id, 'member2', e.target.value)}
                        onBlur={() => handleBlur(b, 'member2')} placeholder="—" />
                    </div>
                  </td>
                  <td>
                    <GothramInput value={b.gothram || ''} onChange={(val) => handleFieldChange(b._id, 'gothram', val)}
                      onBlur={(val) => { if (val !== b.gothram) { saveField(b, 'gothram', val); setBookings((prev) => prev.map((x) => x._id === b._id ? { ...x, gothram: val } : x)); } }}
                      placeholder="—" />
                  </td>
                  <td className="checkbox-cell"><input type="checkbox" checked={b.completed} onChange={() => handleCheckbox(b, 'completed')} /></td>
                  <td className="checkbox-cell"><input type="checkbox" checked={b.pdfSent} onChange={() => handleCheckbox(b, 'pdfSent')} /></td>
                  <td className="checkbox-cell"><input type="checkbox" checked={b.paid} onChange={() => handleCheckbox(b, 'paid')} /></td>
                  <td><PaymentSelect booking={b} onUpdate={(bk, field, val) => { saveField(bk, field, val); setBookings((prev) => prev.map((x) => x._id === bk._id ? { ...x, [field]: val } : x)); }} /></td>
                  <td><UploadCell booking={b} onUploaded={handleUploaded} /></td>
                  <td>
                    <div className="row-actions">
                      <SendButton booking={b} onSent={onSent} onRemoveFromDashboard={onRemove} />
                      <SendButton booking={b} isReminder onSent={onSent} onRemoveFromDashboard={onRemove} />
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(b._id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="booking-cards">
        {bookings.map((b) => (
          <div key={b._id} className="booking-card" style={isReminderDue(b.visitDate) ? { borderLeft: '3px solid #f0a500' } : {}}>
            <div className="booking-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="card-serial">{b.serialNo}</div>
                <div>
                  <div className="card-name">{b.member1}{b.member2 ? ` & ${b.member2}` : ''}</div>
                  <div className="card-date">📅 Booked: {fmt(b.visitDate)}</div>
                </div>
              </div>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}
                onClick={() => handleDelete(b._id)}>🗑️</button>
            </div>
            <div className="booking-card-body">
              <div className="card-row">
                <span className="card-label">📞 Phone</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {editingPhone[b._id] !== undefined ? (
                    <>
                      <input type="tel" value={editingPhone[b._id]}
                        onChange={(e) => setEditingPhone((prev) => ({ ...prev, [b._id]: e.target.value }))}
                        style={{ border: '1.5px solid var(--primary)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.82rem', width: '110px' }}
                        maxLength={13} />
                      <button className="btn btn-sm btn-primary" style={{ padding: '0.15rem 0.4rem' }} onClick={() => handlePhoneSave(b)}>✓</button>
                      <button className="btn btn-sm btn-outline" style={{ padding: '0.15rem 0.4rem' }} onClick={() => setEditingPhone((prev) => { const n = { ...prev }; delete n[b._id]; return n; })}>✕</button>
                    </>
                  ) : (
                    <>
                      <span className="card-value">{b.phone}</span>
                      <button className="btn btn-sm btn-outline" style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem' }}
                        onClick={() => setEditingPhone((prev) => ({ ...prev, [b._id]: b.phone }))}>✏️</button>
                    </>
                  )}
                </div>
              </div>
              <div className="card-row">
                <span className="card-label">🏛️ Gothram</span>
                <span className="card-value">{b.gothram || '—'}</span>
              </div>
              <div className="card-row">
                <span className="card-label">📅 Bookers Date</span>
                <span className="card-value">{fmt(b.bookingDate)}</span>
              </div>
              <div className="card-row">
                <span className="card-label">💳 Payment</span>
                <PaymentSelect booking={b} onUpdate={(bk, field, val) => { saveField(bk, field, val); setBookings((prev) => prev.map((x) => x._id === bk._id ? { ...x, [field]: val } : x)); }} />
              </div>
              <div className="card-checkboxes">
                <label className="card-checkbox-item">
                  <input type="checkbox" checked={b.completed} onChange={() => handleCheckbox(b, 'completed')} />
                  ✅ Done
                </label>
                <label className="card-checkbox-item">
                  <input type="checkbox" checked={b.paid} onChange={() => handleCheckbox(b, 'paid')} />
                  💰 Paid
                </label>
                <label className="card-checkbox-item">
                  <input type="checkbox" checked={b.pdfSent} onChange={() => handleCheckbox(b, 'pdfSent')} />
                  📤 Sent
                </label>
              </div>
              <div style={{ paddingTop: '0.5rem' }}>
                <UploadCell booking={b} onUploaded={handleUploaded} />
              </div>
            </div>
            <div className="card-actions">
              <SendButton booking={b} onSent={onSent} onRemoveFromDashboard={onRemove} />
              <SendButton booking={b} isReminder onSent={onSent} onRemoveFromDashboard={onRemove} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default BookingTable;
