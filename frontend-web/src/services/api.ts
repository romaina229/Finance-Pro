import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { cacheResponse, enqueueMutation, mutationId, readCachedResponse } from './offlineStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'
export const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } })

const methodOf = (config: AxiosRequestConfig) => (config.method ?? 'get').toUpperCase()
const cacheKey = (config: AxiosRequestConfig) => `${config.baseURL ?? API_BASE_URL}${config.url ?? ''}?${config.params ? JSON.stringify(config.params) : ''}`

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ong_finance_pro_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  async (response) => {
    if (methodOf(response.config) === 'GET') await cacheResponse(cacheKey(response.config), response.data)
    return response
  },
  async (error: AxiosError) => {
    const config = error.config
    if (!config) return Promise.reject(error)
    if (error.response?.status === 401) {
      localStorage.removeItem('ong_finance_pro_token')
      localStorage.removeItem('ong_finance_pro_user')
    }
    const method = methodOf(config)
    const offline = !navigator.onLine
    const networkFailure = !error.response
    if (method === 'GET' && (offline || networkFailure)) {
      const cached = await readCachedResponse<unknown>(cacheKey(config))
      if (cached !== undefined) return { data: cached, status: 200, statusText: 'OK (cache hors ligne)', headers: {}, config } as AxiosResponse
    }
    const replay = config.headers?.['X-Offline-Replay'] === 'true'
    if (!replay && method !== 'GET' && method !== 'HEAD' && (offline || networkFailure)) {
      const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
      if (!isFormData) {
        const headers: Record<string, string> = {}
        const authorization = config.headers?.Authorization
        if (typeof authorization === 'string') headers.Authorization = authorization
        await enqueueMutation({ id: mutationId(), method, url: config.url ?? '', data: config.data, headers, createdAt: new Date().toISOString(), attempts: 0 })
        return { data: { queued: true, offline: true }, status: 202, statusText: 'Accepted (hors ligne)', headers: {}, config } as AxiosResponse
      }
    }
    return Promise.reject(error)
  },
)
