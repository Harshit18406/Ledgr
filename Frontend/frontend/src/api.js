// src/api.js
import axios from 'axios';

const api = axios.create({
baseURL: 'https://ledgr-backend-eopc.onrender.com/api'  // <-- /api zaroori hai
});

// Pass token with every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ledgr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;