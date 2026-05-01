import { useState, useEffect } from 'react';

let addToast;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  return { toasts };
};

export const toast = (message, type) => addToast?.(message, type);

export const ToastContainer = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <div key={t.id} className={`toast ${t.type}`}>
        {t.type === 'success' && '✅'}
        {t.type === 'error' && '❌'}
        {t.type === 'warning' && '⚠️'}
        {t.message}
      </div>
    ))}
  </div>
);
