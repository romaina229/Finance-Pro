import { api } from './api'

export type SyncConflict = {
  id: string
  organization_id: string
  mutation_id: string
  method: string
  url: string
  local_payload: Record<string, unknown> | null
  server_payload: Record<string, unknown> | null
  status: string
  created_at: string
  resolved_at: string | null
}

export async function fetchConflicts(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/sync/conflicts`)
  return data.data
}

export async function resolveConflict(organizationId: string, conflictId: string, resolution: 'keep_local' | 'keep_server' | 'manual') {
  const { data } = await api.post(`/organizations/${organizationId}/sync/conflicts/${conflictId}/resolve`, { resolution })
  return data.data
}
