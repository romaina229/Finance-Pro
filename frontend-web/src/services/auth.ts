import { api } from './api'

export interface User {
  id: string
  full_name: string
  email: string
  status: string
}

export interface Organization {
  id: string
  name: string
  acronym: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  full_name: string
  email: string
  phone?: string
  password: string
  password_confirmation: string
  organization_name: string
  country?: string
}

interface AuthResponse {
  user: User
  token: string
  organization?: Organization
  organizations?: Organization[]
}

function persistSession(data: AuthResponse) {
  localStorage.setItem('ong_finance_pro_token', data.token)
  localStorage.setItem('ong_finance_pro_user', JSON.stringify(data.user))
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload)
  persistSession(data)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  persistSession(data)
  return data
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } finally {
    localStorage.removeItem('ong_finance_pro_token')
    localStorage.removeItem('ong_finance_pro_user')
  }
}

export interface InvitationInfo {
  full_name: string
  email: string
  organizations: { id: string; name: string }[]
}

export async function fetchInvitation(token: string): Promise<InvitationInfo> {
  const { data } = await api.get<InvitationInfo>(`/auth/invitations/${token}`)
  return data
}

export async function acceptInvitation(
  token: string,
  password: string,
  passwordConfirmation: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>(`/auth/invitations/${token}/accept`, {
    password,
    password_confirmation: passwordConfirmation,
  })
  persistSession(data)
  return data
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem('ong_finance_pro_user')
  return raw ? JSON.parse(raw) : null
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem('ong_finance_pro_token'))
}
