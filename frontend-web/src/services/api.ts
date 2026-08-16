import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Injecte le jeton Sanctum stocké après connexion sur chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ong_finance_pro_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Déconnexion automatique si le jeton est invalide/expiré
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ong_finance_pro_token')
      localStorage.removeItem('ong_finance_pro_user')
    }
    return Promise.reject(error)
  }
)
