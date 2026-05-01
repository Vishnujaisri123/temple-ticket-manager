import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://temple-ticket-manager.onrender.com/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const getBookings = (params) => api.get('/bookings', { params });
export const getTotalCount = () => api.get('/bookings/count');
export const createBooking = (data) => api.post('/bookings', data);
export const updateBooking = (id, data) => api.put(`/bookings/${id}`, data);
export const deleteBooking = (id) => api.delete(`/bookings/${id}`);
export const uploadPdf = (formData) => api.post('/bookings/upload', formData);
export const login = (data) => api.post('/auth/login', data);
export const seedAdmin = () => api.post('/auth/seed');
