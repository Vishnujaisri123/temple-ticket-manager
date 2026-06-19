import { useState, useCallback } from 'react';
import { updateBooking, deleteBooking } from '../services/api';
import { toast } from './Toast';
import SendButton from './SendButton';
import GothramInput from './GothramInput';
import PrintButton from './PrintButton';
import {
  FiCheckCircle,
  FiSend,
  FiEdit2,
  FiCalendar,
  FiDollarSign,
  FiTrash2,
  FiCheck,
  FiX,
  FiPhone,
  FiHome,
  FiClock,
  FiBell,
  FiClipboard,
} from 'react-icons/fi';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const isReminderDue = (visitDate) => {
  const today = new Date();
  const visit = new Date(visitDate);
  const diff = Math.ceil((visit - today) / (1000 * 60 * 60 * 24));
  return diff === 2;
};

const PaymentSelect = ({ booking, onUpdate }) => (
  <select
    value={booking.paymentType || ''}
    onChange={(e) => onUpdate(booking, 'paymentType', e.target.value)}
    style={{
      border: '1px solid var(--border)', borderRadius: '4px',
      padding: '0.25rem 0.4rem', fontSize: '0.78rem',
      background: booking.paymentType === 'phonepe' ? '#e8f4fd' : booking.paymentType === 'cash' ? '#e8f5e9' : '#fff',
      color: 'var(--text)', cursor: 'pointer', width: '100%',
    }}
  >
    <option value="">— Select —</option>
    <option value="phonepe">PhonePe</option>
    <option value="cash">Cash</option>
  </select>
);

const BookingTable = ({ bookings, setBookings }) => {
  const [editing, setEditing] = useState({});
  const [editingPhone, setEditingPhone] = useState({});

  const handleFieldChange = (id, field, value) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveFields = useCallback(async (booking, updates) => {
    try {
      const { data } = await updateBooking(booking._id, updates);
      setBookings((prev) => prev.map((b) => (b._id === data._id ? data : b)));
      return data;
    } catch {
      toast('Failed to update', 'error');
      return null;
    }
  }, [setBookings]);

  const saveField = useCallback((booking, field, value) => {
    saveFields(booking, { [field]: value });
  }, [saveFields]);

  const handleDoneClick = async (booking) => {
    const newVal = !booking.completed;
    const updated = { ...booking, completed: newVal };
    if (updated.completed && updated.paid) {
      setBookings((prev) => prev.filter((b) => b._id !== booking._id));
      toast('Booking completed and moved to History');
    } else {
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? updated : b)));
    }
    await saveFields(booking, { completed: newVal });
  };

  const handlePaidClick = async (booking) => {
    const newVal = !booking.paid;
    if (newVal && !booking.paymentType) {
      toast('Please select payment type before marking as paid.', 'error');
      return;
    }
    const updatedPaymentType = newVal ? booking.paymentType : '';
    const updated = { ...booking, paid: newVal, paymentType: updatedPaymentType };
    if (updated.completed && updated.paid) {
      setBookings((prev) => prev.filter((b) => b._id !== booking._id));
      toast('Booking completed and moved to History');
    } else {
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? updated : b)));
    }
    await saveFields(booking, { paid: newVal, paymentType: updatedPaymentType });
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

  const onSent = (updated) => setBookings((prev) => prev.map((x) => x._id === updated._id ? updated : x));
  const onRemove = (id) => setBookings((prev) => prev.filter((x) => x._id !== id));

  if (!bookings.length) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <div className="icon">
            <FiClipboard className="icon-glow" style={{ fontSize: '3rem', color: 'var(--accent)' }} />
          </div>
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
          <span className="icon"><FiBell className="icon-pulse" /></span>
          <span><strong>{reminderCount}</strong> booking(s) visit in 2 days — send reminders!</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <PrintButton bookings={bookings} title="Dashboard Bookings" />
      </div>

      {/* ── Desktop Table ── */}
      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Booked Date</th><th>Visit Date</th><th>Phone</th>
                <th>Gothram</th><th>Member 1</th><th>Member 2</th>
                <th><FiCheckCircle style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} /> Done</th>
                <th><FiDollarSign style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} /> Paid</th>
                <th>Payment</th><th>Actions</th>
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
                    <div style={{ marginTop: '0.25rem' }}>
                      <select
                        value={b.slotTime || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          saveField(b, 'slotTime', val);
                          setBookings((prev) => prev.map((x) => x._id === b._id ? { ...x, slotTime: val } : x));
                        }}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '0.1rem 0.2rem',
                          fontSize: '0.72rem',
                          background: 'var(--surface)',
                          color: 'var(--text-muted)',
                          width: '100%',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">— Slot —</option>
                        <option value="6am-7am">6am-7am</option>
                        <option value="7am-8am">7am-8am</option>
                        <option value="8am-9am">8am-9am</option>
                        <option value="9am-10am">9am-10am</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    {editingPhone[b._id] !== undefined ? (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <input type="tel" value={editingPhone[b._id]}
                          onChange={(e) => setEditingPhone((prev) => ({ ...prev, [b._id]: e.target.value }))}
                          style={{ border: '1.5px solid var(--primary)', borderRadius: '4px', padding: '0.25rem 0.4rem', fontSize: '0.82rem', width: '120px' }}
                          maxLength={13} autoFocus />
                        <button className="btn btn-sm btn-primary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handlePhoneSave(b)}><FiCheck /></button>
                        <button className="btn btn-sm btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setEditingPhone((prev) => { const n = { ...prev }; delete n[b._id]; return n; })}><FiX /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ fontSize: '0.82rem' }}>{b.phone}</span>
                        <button className="btn btn-sm btn-outline" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                          onClick={() => setEditingPhone((prev) => ({ ...prev, [b._id]: b.phone }))}><FiEdit2 /></button>
                      </div>
                    )}
                  </td>
                  <td>
                    <GothramInput value={b.gothram || ''} onChange={(val) => handleFieldChange(b._id, 'gothram', val)}
                      onBlur={(val) => { if (val !== b.gothram) { saveField(b, 'gothram', val); setBookings((prev) => prev.map((x) => x._id === b._id ? { ...x, gothram: val } : x)); } }}
                      placeholder="—" />
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
                    <button
                      onClick={() => handleDoneClick(b)}
                      style={b.completed ? {
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                        border: '1px solid #22c55e',
                        boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%',
                        textTransform: 'uppercase',
                        transition: 'all 0.2s ease',
                      } : {
                        background: '#7f1d1d',
                        color: '#fecaca',
                        border: '1px solid #b91c1c',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%',
                        textTransform: 'uppercase',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        if (b.completed) e.currentTarget.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.8)';
                        else e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        if (b.completed) e.currentTarget.style.boxShadow = '0 0 10px rgba(34, 197, 94, 0.5)';
                        else e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      DONE
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handlePaidClick(b)}
                      style={b.paid ? {
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                        border: '1px solid #22c55e',
                        boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%',
                        textTransform: 'uppercase',
                        transition: 'all 0.2s ease',
                      } : {
                        background: '#7f1d1d',
                        color: '#fecaca',
                        border: '1px solid #b91c1c',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%',
                        textTransform: 'uppercase',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        if (b.paid) e.currentTarget.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.8)';
                        else e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        if (b.paid) e.currentTarget.style.boxShadow = '0 0 10px rgba(34, 197, 94, 0.5)';
                        else e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      PAID
                    </button>
                  </td>
                  <td><PaymentSelect booking={b} onUpdate={(bk, field, val) => { saveField(bk, field, val); setBookings((prev) => prev.map((x) => x._id === bk._id ? { ...x, [field]: val } : x)); }} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(b._id)} title="Delete"><FiTrash2 /></button>
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
                  <div className="card-date" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', flexWrap: 'wrap' }}>
                    <FiCalendar /> Visit: {fmt(b.visitDate)} {b.slotTime && <>| <FiClock /> {b.slotTime}</>}
                  </div>
                </div>
              </div>
              <button className="btn btn-danger btn-sm btn-icon"
                onClick={() => handleDelete(b._id)}><FiTrash2 /></button>
            </div>
            <div className="booking-card-body">
              <div className="card-row">
                <span className="card-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><FiPhone /> Phone</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {editingPhone[b._id] !== undefined ? (
                    <>
                      <input type="tel" value={editingPhone[b._id]}
                        onChange={(e) => setEditingPhone((prev) => ({ ...prev, [b._id]: e.target.value }))}
                        style={{ border: '1.5px solid var(--primary)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.82rem', width: '110px' }}
                        maxLength={13} />
                      <button className="btn btn-sm btn-primary" style={{ padding: '0.15rem 0.4rem' }} onClick={() => handlePhoneSave(b)}><FiCheck /></button>
                      <button className="btn btn-sm btn-outline" style={{ padding: '0.15rem 0.4rem' }} onClick={() => setEditingPhone((prev) => { const n = { ...prev }; delete n[b._id]; return n; })}><FiX /></button>
                    </>
                  ) : (
                    <>
                      <span className="card-value">{b.phone}</span>
                      <button className="btn btn-sm btn-outline" style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem' }}
                        onClick={() => setEditingPhone((prev) => ({ ...prev, [b._id]: b.phone }))}><FiEdit2 /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="card-row">
                <span className="card-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><FiHome /> Gothram</span>
                <span className="card-value">{b.gothram || '—'}</span>
              </div>
              <div className="card-row">
                <span className="card-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><FiCalendar /> Booked Date</span>
                <span className="card-value">{fmt(b.bookingDate)}</span>
              </div>
              <div className="card-row">
                <span className="card-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><FiDollarSign /> Payment</span>
                <PaymentSelect booking={b} onUpdate={(bk, field, val) => { saveField(bk, field, val); setBookings((prev) => prev.map((x) => x._id === bk._id ? { ...x, [field]: val } : x)); }} />
              </div>
              <div className="card-row">
                <span className="card-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><FiClock /> Timeslot</span>
                <select
                  value={b.slotTime || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    saveField(b, 'slotTime', val);
                    setBookings((prev) => prev.map((x) => x._id === b._id ? { ...x, slotTime: val } : x));
                  }}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '0.2rem 0.4rem',
                    fontSize: '0.78rem',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    width: '120px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">— Slot —</option>
                  <option value="6am-7am">6am-7am</option>
                  <option value="7am-8am">7am-8am</option>
                  <option value="8am-9am">8am-9am</option>
                  <option value="9am-10am">9am-10am</option>
                </select>
              </div>
              <div className="card-checkboxes" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                <button
                  onClick={() => handleDoneClick(b)}
                  style={b.completed ? {
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    border: '1px solid #22c55e',
                    boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1,
                    textTransform: 'uppercase',
                  } : {
                    background: '#7f1d1d',
                    color: '#fecaca',
                    border: '1px solid #b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  DONE
                </button>
                <button
                  onClick={() => handlePaidClick(b)}
                  style={b.paid ? {
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    border: '1px solid #22c55e',
                    boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1,
                    textTransform: 'uppercase',
                  } : {
                    background: '#7f1d1d',
                    color: '#fecaca',
                    border: '1px solid #b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  PAID
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default BookingTable;
