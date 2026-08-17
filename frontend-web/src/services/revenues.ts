import { api } from './api'

export type RevenueStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid'
export type RevenueType = 'subvention' | 'don' | 'autofinancement' | 'remboursement' | 'cotisation' | 'autre'

export interface Revenue {
  id: string
  project_id: string | null
  project?: { id: string; name: string; code: string } | null
  donor_id: string | null
  donor?: { id: string; name: string } | null
  amount: string
  currency: string
  revenue_type: RevenueType
  received_date: string
  payment_method_id: number
  payment_method?: { id: number; name: string }
  payment_reference: string | null
  description: string | null
  status: RevenueStatus
  creator?: { id: string; full_name: string }
  rejection_reason: string | null
}

export interface RevenuePayload {
  project_id?: string | null
  donor_id?: string | null
  amount: number
  currency?: string
  revenue_type: RevenueType
  received_date: string
  payment_method_id: number
  payment_reference?: string
  description?: string
}

export async function fetchRevenues(
  organizationId: string,
  filters?: { project_id?: string; status?: RevenueStatus }
) {
  const { data } = await api.get(`/organizations/${organizationId}/revenues`, { params: filters })
  return data.data as Revenue[]
}

export async function createRevenue(organizationId: string, payload: RevenuePayload) {
  const { data } = await api.post(`/organizations/${organizationId}/revenues`, payload)
  return data.data as Revenue
}

export async function updateRevenue(organizationId: string, revenueId: string, payload: Partial<RevenuePayload>) {
  const { data } = await api.patch(`/organizations/${organizationId}/revenues/${revenueId}`, payload)
  return data.data as Revenue
}

export async function deleteRevenue(organizationId: string, revenueId: string) {
  await api.delete(`/organizations/${organizationId}/revenues/${revenueId}`)
}

export async function submitRevenue(organizationId: string, revenueId: string) {
  const { data } = await api.post(`/organizations/${organizationId}/revenues/${revenueId}/submit`)
  return data.data as Revenue
}

export async function approveRevenue(organizationId: string, revenueId: string) {
  const { data } = await api.post(`/organizations/${organizationId}/revenues/${revenueId}/approve`)
  return data.data as Revenue
}

export async function rejectRevenue(organizationId: string, revenueId: string, reason: string) {
  const { data } = await api.post(`/organizations/${organizationId}/revenues/${revenueId}/reject`, {
    rejection_reason: reason,
  })
  return data.data as Revenue
}

export async function markRevenuePaid(organizationId: string, revenueId: string) {
  const { data } = await api.post(`/organizations/${organizationId}/revenues/${revenueId}/mark-paid`)
  return data.data as Revenue
}
