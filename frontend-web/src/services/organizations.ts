import { api } from './api'

export interface OrganizationDetail {
  id: string
  name: string
  acronym: string | null
  legal_status: string | null
  registration_number: string | null
  country: string
  city: string | null
  address: string | null
  default_currency: string
  fiscal_year_start_month: number
}

export async function fetchMyOrganizations() {
  const { data } = await api.get('/organizations')
  return data.data as OrganizationDetail[]
}

export async function fetchOrganization(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}`)
  return data.data as OrganizationDetail
}

export async function updateOrganization(
  organizationId: string,
  payload: Partial<OrganizationDetail>
) {
  const { data } = await api.patch(`/organizations/${organizationId}`, payload)
  return data.data as OrganizationDetail
}
