/**
 * Axios instance pre-configured with:
 * - Base URL from VITE_API_BASE_URL (falls back to Vite proxy in dev)
 * - Authorization header injection from localStorage JWT
 * - 401 redirect to /login
 *
 * Feature-specific API modules are added in WS-4 through WS-7.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('synq_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to /login on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('synq_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
