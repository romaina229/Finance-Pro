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

export type PaymentProvider = 'fedapay' | 'kkiapay'

export interface KkiapayWidgetConfig {
  requires_client_widget: true
  public_key: string
  sandbox: boolean
  amount: number
}

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

  return data as {
    data: { id: string }
    checkout_url: string | null
    widget: KkiapayWidgetConfig | null
    message: string
  }
}

export async function confirmKkiapayPayment(
  organizationId: string,
  invoiceId: string,
  paymentId: string,
  transactionId: string
) {
  const { data } = await api.post(
    `/organizations/${organizationId}/invoices/${invoiceId}/payments/${paymentId}/confirm-kkiapay`,
    { transaction_id: transactionId }
  )

  return data as { data: unknown; message: string }
}
