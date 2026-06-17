/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const { message, type } = e.detail;
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  return { toasts };
};

export const toast = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
};

export const ToastContainer = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <div key={t.id} className={`toast ${t.type}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        {t.type === 'success' && <FiCheckCircle className="icon-pulse" />}
        {t.type === 'error' && <FiXCircle className="icon-pulse" />}
        {t.type === 'warning' && <FiAlertTriangle className="icon-pulse" />}
        {t.message}
      </div>
    ))}
  </div>
);
