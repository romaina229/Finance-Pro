import { api } from './api'

export interface Donor {
  id: string
  name: string
  donor_type: string | null
  country: string | null
  contact_name: string | null
  contact_email: string | null
  default_currency: string
}

export async function fetchDonors(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/donors`)
  return data.data as Donor[]
}

export async function createDonor(organizationId: string, payload: Partial<Donor>) {
  const { data } = await api.post(`/organizations/${organizationId}/donors`, payload)
  return data.data as Donor
}

export async function updateDonor(organizationId: string, donorId: string, payload: Partial<Donor>) {
  const { data } = await api.patch(`/organizations/${organizationId}/donors/${donorId}`, payload)
  return data.data as Donor
}

export async function deleteDonor(organizationId: string, donorId: string) {
  await api.delete(`/organizations/${organizationId}/donors/${donorId}`)
}
