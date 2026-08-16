import { api } from './api'

export interface Project {
  id: string
  code: string
  name: string
  description: string | null
  total_budget: string
  currency: string
  start_date: string | null
  end_date: string | null
  status: 'draft' | 'active' | 'suspended' | 'closed'
  donor_id: string | null
  donor?: { id: string; name: string } | null
  project_manager_id: string | null
  project_manager?: { id: string; full_name: string } | null
}

export interface ProjectPayload {
  donor_id?: string | null
  code: string
  name: string
  description?: string
  total_budget?: number
  currency?: string
  start_date?: string
  end_date?: string
  status?: Project['status']
  project_manager_id?: string | null
}

export async function fetchProjects(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/projects`)
  return data.data as Project[]
}

export async function createProject(organizationId: string, payload: ProjectPayload) {
  const { data } = await api.post(`/organizations/${organizationId}/projects`, payload)
  return data.data as Project
}

export async function updateProject(
  organizationId: string,
  projectId: string,
  payload: Partial<ProjectPayload>
) {
  const { data } = await api.patch(`/organizations/${organizationId}/projects/${projectId}`, payload)
  return data.data as Project
}

export async function deleteProject(organizationId: string, projectId: string) {
  await api.delete(`/organizations/${organizationId}/projects/${projectId}`)
}
