import { api } from './api'

export interface PaymentMethod {
  id: number
  code: string
  name: string
  requires_reference: boolean
}

export async function fetchPaymentMethods(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/payment-methods`)
  return data.data as PaymentMethod[]
}
