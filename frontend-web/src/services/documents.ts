import { api } from './api'

export interface DocumentItem {
  id: string
  original_name: string
  mime_type: string | null
  size: number
  description: string | null
  documentable_type: string | null
  documentable_id: string | null
  created_at: string
  uploader?: { id: string; full_name: string; email: string } | null
}

export async function fetchDocuments(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/documents`)
  const payload = data.data
  return Array.isArray(payload) ? payload : (payload?.data ?? []) as DocumentItem[]
}

export async function uploadDocument(organizationId: string, file: File, description?: string) {
  const form = new FormData()
  form.append('file', file)
  if (description) form.append('description', description)
  const { data } = await api.post(`/organizations/${organizationId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data as DocumentItem
}

export async function deleteDocument(organizationId: string, documentId: string) {
  await api.delete(`/organizations/${organizationId}/documents/${documentId}`)
}

export function documentDownloadUrl(organizationId: string, documentId: string) {
  const base = api.defaults.baseURL ?? ''
  return `${base}/organizations/${organizationId}/documents/${documentId}/download`
}
