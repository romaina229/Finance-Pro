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

export async function createConflict(organizationId: string, mutation: { id: string; method: string; url: string; data?: unknown }, serverPayload: unknown) {
  const { data } = await api.post(`/organizations/${organizationId}/sync/conflicts`, {
    mutation_id: mutation.id,
    method: mutation.method,
    url: mutation.url,
    local_payload: mutation.data ?? null,
    server_payload: serverPayload ?? null,
  })
  return data.data
}

export async function resolveConflict(organizationId: string, conflictId: string, resolution: 'keep_local' | 'keep_server' | 'manual') {
  const { data } = await api.post(`/organizations/${organizationId}/sync/conflicts/${conflictId}/resolve`, { resolution })
  return data.data
}
