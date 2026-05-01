import { useState } from 'react';
import { createBooking } from '../services/api';
import { toast } from './Toast';
import GothramInput from './GothramInput';

const defaultForm = {
  bookingDate: new Date().toISOString().split('T')[0],
  visitDate: '',
  phone: '',
  member1: '',
  member2: '',
  gothram: '',
};

const AddBookingForm = ({ onAdded }) => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleChange = (e) => {
    if (e.target.name === 'phone') {
      // Only allow digits, max 10
      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
      setForm({ ...form, phone: digits });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visitDate || !form.phone || !form.member1) {
      toast('Visit date, phone and member 1 are required', 'error');
      return;
    }
    if (form.phone.length !== 10) {
      toast('Phone number must be exactly 10 digits', 'error');
      return;
    }
    setLoading(true);
    try {
      // Store as 91XXXXXXXXXX
      const { data } = await createBooking({ ...form, phone: '91' + form.phone });
      onAdded(data);
      setForm(defaultForm);
      setOpen(false);
      toast('Booking added successfully');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-booking-bar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>➕ New Booking</h3>
        <button className="btn btn-outline btn-sm" onClick={() => setOpen(!open)}>
          {open ? '▲ Hide' : '▼ Expand'}
        </button>
      </div>
      {open && (
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <div className="booking-form-grid">
            <div className="form-group">
              <label>Bookers Date</label>
              <input type="date" name="bookingDate" value={form.bookingDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Booked Date *</label>
              <input type="date" name="visitDate" value={form.visitDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg)' }}>
                <span style={{ padding: '0.5rem 0.6rem', background: '#f0e8e4', color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem', borderRight: '1.5px solid var(--border)', whiteSpace: 'nowrap' }}>+91</span>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="10 digit number" maxLength={10} required style={{ border: 'none', background: 'transparent', padding: '0.5rem 0.65rem', fontSize: '0.875rem', width: '100%', outline: 'none' }} />
              </div>
            </div>
            <div className="form-group">
              <label>Gothram</label>
              <GothramInput value={form.gothram} onChange={(val) => setForm({ ...form, gothram: val })} placeholder="Search gothram..." />
            </div>
            <div className="form-group">
              <label>Member 1 *</label>
              <input type="text" name="member1" value={form.member1} onChange={handleChange} placeholder="Full name" required />
            </div>
            <div className="form-group">
              <label>Member 2</label>
              <input type="text" name="member2" value={form.member2} onChange={handleChange} placeholder="Optional" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Adding...' : '+ Add Booking'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddBookingForm;
