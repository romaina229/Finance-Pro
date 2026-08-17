import { api } from './api'

export interface AuditLog {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user: { id: string; full_name: string } | null
}

export async function fetchAuditLogs(organizationId: string, params: Record<string, string | number> = {}) {
  const { data } = await api.get(`/organizations/${organizationId}/audit-logs`, { params })
  return data as { data: AuditLog[]; meta: { current_page: number; last_page: number; total: number } }
}
