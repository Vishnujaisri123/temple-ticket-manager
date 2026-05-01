import { useState, useCallback } from 'react';
import { updateBooking, deleteBooking } from '../services/api';
import { toast } from './Toast';
import UploadCell from './UploadCell';
import SendButton from './SendButton';
import GothramInput from './GothramInput';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const isReminderDue = (visitDate) => {
  const today = new Date();
  const visit = new Date(visitDate);
  const diff = Math.ceil((visit - today) / (1000 * 60 * 60 * 24));
  return diff === 2;
};

const BookingTable = ({ bookings, setBookings }) => {
  const [editing, setEditing] = useState({});

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
    // If both completed AND paid are now true, remove from dashboard immediately
    if (updated.completed && updated.paid) {
      setBookings((prev) => prev.filter((b) => b._id !== booking._id));
    } else {
      setBookings((prev) =>
        prev.map((b) => (b._id === booking._id ? updated : b))
      );
    }
  };

  const handleBlur = (booking, field) => {
    const val = editing[booking._id]?.[field];
    if (val !== undefined && val !== booking[field]) {
      saveField(booking, field, val);
      setBookings((prev) =>
        prev.map((b) => (b._id === booking._id ? { ...b, [field]: val } : b))
      );
    }
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

  const handleBulkSend = () => {
    const withPdf = bookings.filter((b) => b.pdfUrl && !b.pdfSent);
    if (!withPdf.length) { toast('No unsent bookings with PDF', 'warning'); return; }
    withPdf.forEach((b, i) => {
      setTimeout(() => {
        const phone = b.phone.replace(/\D/g, '');
        const visitDate = new Date(b.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const msg = `🙏 Namaskaram ${b.member1}!\n\nYour temple ticket is ready.\n📅 Visit Date: *${visitDate}*\n📄 Ticket: ${b.pdfUrl}\n\nJai Govinda! 🙏`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
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
          <span><strong>{reminderCount}</strong> booking(s) have visit date in 2 days — send reminders!</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button className="btn btn-warning btn-sm" onClick={handleBulkSend}>
          📤 Bulk Send (Unsent)
        </button>
      </div>
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
                <th>✅ Done</th>
                <th>📤 Sent</th>
                <th>💰 Paid</th>
                <th>📎 PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                return (
                  <tr key={b._id} style={isReminderDue(b.visitDate) ? { background: '#fff8e1', borderLeft: '3px solid #f0a500' } : {}}>
                    <td><div className="serial-no">{b.serialNo}</div></td>
                    <td>{fmt(b.bookingDate)}</td>
                    <td>
                      <div className="editable-cell">
                        <input
                          type="date"
                          defaultValue={b.visitDate?.split('T')[0]}
                          onChange={(e) => handleFieldChange(b._id, 'visitDate', e.target.value)}
                          onBlur={() => handleBlur(b, 'visitDate')}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="editable-cell">
                        <input
                          type="tel"
                          defaultValue={b.phone}
                          onChange={(e) => handleFieldChange(b._id, 'phone', e.target.value)}
                          onBlur={() => handleBlur(b, 'phone')}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="editable-cell">
                        <input
                          type="text"
                          defaultValue={b.member1}
                          onChange={(e) => handleFieldChange(b._id, 'member1', e.target.value)}
                          onBlur={() => handleBlur(b, 'member1')}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="editable-cell">
                        <input
                          type="text"
                          defaultValue={b.member2}
                          onChange={(e) => handleFieldChange(b._id, 'member2', e.target.value)}
                          onBlur={() => handleBlur(b, 'member2')}
                          placeholder="—"
                        />
                      </div>
                    </td>
                    <td>
                      <GothramInput
                        value={b.gothram || ''}
                        onChange={(val) => handleFieldChange(b._id, 'gothram', val)}
                        onBlur={(val) => {
                          if (val !== b.gothram) {
                            saveField(b, 'gothram', val);
                            setBookings((prev) => prev.map((x) => x._id === b._id ? { ...x, gothram: val } : x));
                          }
                        }}
                        placeholder="—"
                      />
                    </td>
                    <td className="checkbox-cell">
                      <input type="checkbox" checked={b.completed} onChange={() => handleCheckbox(b, 'completed')} />
                    </td>
                    <td className="checkbox-cell">
                      <input type="checkbox" checked={b.pdfSent} onChange={() => handleCheckbox(b, 'pdfSent')} />
                    </td>
                    <td className="checkbox-cell">
                      <input type="checkbox" checked={b.paid} onChange={() => handleCheckbox(b, 'paid')} />
                    </td>
                    <td>
                      <UploadCell booking={b} onUploaded={handleUploaded} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <SendButton booking={b} onSent={(updated) => setBookings((prev) => prev.map((x) => x._id === updated._id ? updated : x))} onRemoveFromDashboard={(id) => setBookings((prev) => prev.filter((x) => x._id !== id))} />
                        <SendButton booking={b} isReminder onSent={(updated) => setBookings((prev) => prev.map((x) => x._id === updated._id ? updated : x))} onRemoveFromDashboard={(id) => setBookings((prev) => prev.filter((x) => x._id !== id))} />
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => handleDelete(b._id)}
                          title="Delete"
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default BookingTable;
