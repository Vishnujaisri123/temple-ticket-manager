import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Login = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username: form.username, password: form.password });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
        username: form.username,
        password: form.password,
      });
      setMode('login');
      setForm({ username: form.username, password: '', confirmPassword: '' });
      setError('');
      alert('Account created! Please sign in.');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setForm({ username: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="temple-icon">🕌</div>
          <h1>Temple Ticket Manager</h1>
          <p>Sri Venkateswara Swami Temple, Vadapalli</p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
          <button
            onClick={() => switchMode('login')}
            style={{
              flex: 1, padding: '0.55rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              background: mode === 'login' ? 'var(--primary)' : 'transparent',
              color: mode === 'login' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('register')}
            style={{
              flex: 1, padding: '0.55rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              background: mode === 'register' ? 'var(--primary)' : 'transparent',
              color: mode === 'register' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          )}
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading
              ? mode === 'login' ? 'Signing in...' : 'Creating...'
              : mode === 'login' ? '🔐 Sign In' : '✅ Create Account'
            }
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
