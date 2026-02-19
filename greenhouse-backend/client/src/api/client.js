// client/src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gh_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gh_token');
      localStorage.removeItem('gh_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
