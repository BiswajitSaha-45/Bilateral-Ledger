import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
};

export const transactionsAPI = {
  create:      (data)       => api.post('/transactions/', data),
  list:        (params)     => api.get('/transactions/', { params }),
  get:         (id)         => api.get(`/transactions/${id}`),
  confirm:     (id)         => api.post(`/transactions/${id}/confirm`),
  reject:      (id, reason) => api.post(`/transactions/${id}/reject`, { rejection_reason: reason }),
  getBalance:  (partnerId)  => api.get(`/transactions/balance/${partnerId}`),
  getPartners: ()           => api.get('/transactions/partners'),
};

export const usersAPI = {
  search: (q)  => api.get('/users/search', { params: { q } }),
  get:    (id) => api.get(`/users/${id}`),
};

export default api;