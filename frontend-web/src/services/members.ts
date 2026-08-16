import { api } from './api'

export interface Member {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: { id: number; code: string; name: string } | null
  is_primary: boolean
  status: 'active' | 'suspended' | 'invited'
}

export interface RoleOption {
  id: number
  code: string
  name: string
  hierarchy_level: number
}

export async function fetchMembers(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/users`)
  return data.data as Member[]
}

export async function fetchRoles(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/roles`)
  return data.data as RoleOption[]
}

export async function inviteMember(
  organizationId: string,
  payload: { email: string; full_name?: string; role_code: string }
) {
  const { data } = await api.post(`/organizations/${organizationId}/users`, payload)
  return data.data
}

export async function updateMember(
  organizationId: string,
  userId: string,
  payload: { role_code?: string; status?: 'active' | 'suspended' }
) {
  await api.patch(`/organizations/${organizationId}/users/${userId}`, payload)
}

export async function removeMember(organizationId: string, userId: string) {
  await api.delete(`/organizations/${organizationId}/users/${userId}`)
}
