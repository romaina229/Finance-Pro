import { superAdminApi, setSuperAdminToken, clearSuperAdminSession } from './superAdminApi'

export interface SuperAdminAccount {
  id: string
  full_name: string
  email: string
}

export interface AdminOrganization {
  id: string
  name: string
  acronym: string | null
  country: string
  default_currency: string
  is_active: boolean
  approval_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  access_blocked_reason: string | null
  users_count: number
  projects_count: number
  subscription: { id: string; monthly_amount: string; status: string } | null
  created_at: string
}

export async function superAdminLogin(email: string, password: string) {
  const { data } = await superAdminApi.post('/super-admin/auth/login', { email, password })
  setSuperAdminToken(data.token)
  localStorage.setItem('ong_finance_pro_super_admin', JSON.stringify(data.admin))
  return data.admin as SuperAdminAccount
}

export async function registerSuperAdmin(full_name: string, email: string, password: string, password_confirmation: string) {
  const { data } = await superAdminApi.post('/super-admin/auth/register', {
    full_name,
    email,
    password,
    password_confirmation,
  })
  setSuperAdminToken(data.token)
  localStorage.setItem('ong_finance_pro_super_admin', JSON.stringify(data.admin))
  return data.admin as SuperAdminAccount
}

export async function updateSuperAdminProfile(payload: {
  full_name: string
  email: string
  current_password?: string
  password?: string
  password_confirmation?: string
}) {
  const { data } = await superAdminApi.put('/super-admin/auth/profile', payload)
  localStorage.setItem('ong_finance_pro_super_admin', JSON.stringify(data.admin))
  return data.admin as SuperAdminAccount
}

export async function superAdminLogout() {
  try {
    await superAdminApi.post('/super-admin/auth/logout')
  } finally {
    clearSuperAdminSession()
  }
}

export function getCurrentSuperAdmin(): SuperAdminAccount | null {
  const raw = localStorage.getItem('ong_finance_pro_super_admin')
  return raw ? JSON.parse(raw) : null
}

export async function fetchDashboard() {
  const { data } = await superAdminApi.get('/super-admin/dashboard')
  return data.data as {
    organizations: { total: number; pending: number; approved: number; rejected: number }
    invoices: { overdue_count: number; pending_count: number; paid_this_month: number }
  }
}

export async function fetchOrganizations(approvalStatus?: string, search?: string) {
  const { data } = await superAdminApi.get('/super-admin/organizations', {
    params: { approval_status: approvalStatus || undefined, search: search || undefined },
  })
  return data.data as AdminOrganization[]
}

export async function approveOrganization(id: string) {
  const { data } = await superAdminApi.post(`/super-admin/organizations/${id}/approve`)
  return data.data as AdminOrganization
}

export async function rejectOrganization(id: string, reason: string) {
  const { data } = await superAdminApi.post(`/super-admin/organizations/${id}/reject`, { rejection_reason: reason })
  return data.data as AdminOrganization
}

export async function suspendOrganization(id: string) {
  const { data } = await superAdminApi.post(`/super-admin/organizations/${id}/suspend`)
  return data.data as AdminOrganization
}

export async function reactivateOrganization(id: string) {
  const { data } = await superAdminApi.post(`/super-admin/organizations/${id}/reactivate`)
  return data.data as AdminOrganization
}
