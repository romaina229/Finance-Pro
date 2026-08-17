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
  status?: string
  role_id?: string | null
  is_primary?: boolean
}

interface OrganizationApiResponse extends Omit<OrganizationDetail, 'status' | 'role_id' | 'is_primary'> {
  pivot?: {
    role_id?: string | null
    is_primary?: boolean
    status?: string
  }
}

export async function fetchMyOrganizations() {
  const { data } = await api.get('/organizations')
  const organizations = data.data as OrganizationApiResponse[]

  return organizations.map((organization) => ({
    ...organization,
    role_id: organization.pivot?.role_id ?? null,
    is_primary: organization.pivot?.is_primary ?? false,
    status: organization.pivot?.status ?? 'inactive',
  })) as OrganizationDetail[]
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
