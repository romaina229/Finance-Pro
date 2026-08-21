import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'
const TOKEN_KEY = 'ong_finance_pro_super_admin_token'

// Instance dédiée, volontairement simple (pas de file d'attente offline :
// un compte de supervision de la plateforme doit toujours être en ligne)
// et un jeton totalement distinct de celui des comptes d'organisation,
// pour qu'ils ne puissent jamais être confondus côté navigateur non plus.
export const superAdminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

superAdminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

superAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('ong_finance_pro_super_admin')
    }
    return Promise.reject(error)
  }
)

export function getSuperAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setSuperAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearSuperAdminSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('ong_finance_pro_super_admin')
}
