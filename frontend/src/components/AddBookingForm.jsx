import { useState } from 'react';
import { createBooking } from '../services/api';
import { toast } from './Toast';
import GothramInput from './GothramInput';
import { FiPlus } from 'react-icons/fi';

const defaultForm = {
  bookingDate: new Date().toISOString().split('T')[0],
  visitDate: '',
  slotTime: '',
  phone: '',
  member1: '',
  member2: '',
  gothram: '',
};

const AddBookingForm = ({ onAdded }) => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  // Calculate next month for minimum date
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const minVisitDate = nextMonth.toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Only allow digits, max 10
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm({ ...form, phone: digits });
    } else if (name === 'bookingDate') {
      setForm({ ...form, bookingDate: value, visitDate: value });
    } else {
      setForm({ ...form, [name]: value });
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
      toast('Booking added successfully');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-booking-bar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}><FiPlus /> New Booking</h3>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="booking-form-grid">
          <div className="form-group">
            <label>Booked Date</label>
            <input type="date" name="bookingDate" value={form.bookingDate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Visit Date *</label>
            <input type="date" name="visitDate" value={form.visitDate} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Timeslot</label>
            <select name="slotTime" value={form.slotTime} onChange={handleChange} style={{ width: '100%', height: '38px', padding: '0.5rem 0.65rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}>
              <option value="">— Slot —</option>
              <option value="6am-7am">6am-7am</option>
              <option value="7am-8am">7am-8am</option>
              <option value="8am-9am">8am-9am</option>
              <option value="9am-10am">9am-10am</option>
            </select>
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
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              {loading ? 'Adding...' : <><FiPlus /> Add Booking</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddBookingForm;
