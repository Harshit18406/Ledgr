// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // adjust to your backend URL
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