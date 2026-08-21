import { api } from './api'

export interface Invoice {
  id: string
  period_label: string
  amount: number
  currency: string
  due_date: string
  status: 'pending' | 'paid' | 'canceled'
  is_overdue: boolean
  paid_at: string | null
}

export type PaymentProvider = 'feedapay' | 'mtn' | 'moov' | 'orange'

export async function fetchInvoices(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/invoices`)
  return data.data as Invoice[]
}

export async function payInvoice(
  organizationId: string,
  invoiceId: string,
  provider: PaymentProvider,
  phoneNumber: string
) {
  const { data } = await api.post(`/organizations/${organizationId}/invoices/${invoiceId}/pay`, {
    provider,
    phone_number: phoneNumber,
  })
  return data as { data: any; checkout_url: string | null; message: string }
}
