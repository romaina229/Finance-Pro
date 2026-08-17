import { api } from './api'

export interface CashCustodian {
  id: string
  full_name: string
  email: string
}

export interface CashRegister {
  id: string
  code: string
  name: string
  currency: string
  location: string | null
  status: 'open' | 'closed'
  opening_balance: string
  current_balance: string
  custodian: CashCustodian | null
}

export interface CashTransaction {
  id: string
  type: 'in' | 'out'
  amount: string
  transaction_date: string
  reference: string | null
  description: string | null
  status: string
  creator?: { id: string; full_name: string }
  project?: { id: string; name: string } | null
}

export interface CashReconciliation {
  id: string
  reconciliation_date: string
  theoretical_balance: string
  physical_balance: string
  difference: string
  notes: string | null
  reconciler?: { id: string; full_name: string }
}

export interface CashRegisterPayload {
  code: string
  name: string
  currency: string
  custodian_id?: string | null
  location?: string
  opening_balance: number
}

export interface CashTransactionPayload {
  type: 'in' | 'out'
  amount: number
  transaction_date: string
  reference?: string
  description?: string
  project_id?: string | null
}

export async function fetchCashRegisters(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/cash-registers`)
  return data.data as CashRegister[]
}

export async function createCashRegister(organizationId: string, payload: CashRegisterPayload) {
  const { data } = await api.post(`/organizations/${organizationId}/cash-registers`, payload)
  return data.data as CashRegister
}

export async function updateCashRegister(
  organizationId: string,
  registerId: string,
  payload: Partial<CashRegisterPayload> & { status?: 'open' | 'closed' },
) {
  const { data } = await api.patch(`/organizations/${organizationId}/cash-registers/${registerId}`, payload)
  return data.data as CashRegister
}

export async function deleteCashRegister(organizationId: string, registerId: string) {
  await api.delete(`/organizations/${organizationId}/cash-registers/${registerId}`)
}

export async function fetchCashTransactions(organizationId: string, registerId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/cash-registers/${registerId}/transactions`)
  return (data.data ?? []) as CashTransaction[]
}

export async function createCashTransaction(
  organizationId: string,
  registerId: string,
  payload: CashTransactionPayload,
) {
  const { data } = await api.post(`/organizations/${organizationId}/cash-registers/${registerId}/transactions`, payload)
  return data.data as CashTransaction
}

export async function fetchCashReconciliations(organizationId: string, registerId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/cash-registers/${registerId}/reconciliations`)
  return data.data as CashReconciliation[]
}

export async function reconcileCash(
  organizationId: string,
  registerId: string,
  payload: { reconciliation_date: string; physical_balance: number; notes?: string },
) {
  const { data } = await api.post(`/organizations/${organizationId}/cash-registers/${registerId}/reconciliations`, payload)
  return data.data as CashReconciliation
}
