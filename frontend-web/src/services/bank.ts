import { api } from './api'

export interface BankAccount {
  id: string
  code: string
  name: string
  bank_name: string
  account_number: string | null
  currency: string
  opening_balance: string
  current_balance: string
  status: 'open' | 'closed'
}
export interface BankTransaction { id: string; type: 'in' | 'out'; amount: string; transaction_date: string; reference: string | null; description: string | null; project?: { id: string; name: string } | null }
export interface BankReconciliation { id: string; reconciliation_date: string; statement_balance: string; book_balance: string; difference: string; notes: string | null }
export type BankAccountPayload = { code: string; name: string; bank_name: string; account_number?: string | null; currency: string; opening_balance: number }
export type BankTransactionPayload = { type: 'in' | 'out'; amount: number; transaction_date: string; reference?: string; description?: string; project_id?: string | null }

export async function fetchBankAccounts(organizationId: string) { const { data } = await api.get(`/organizations/${organizationId}/banks`); return data.data as BankAccount[] }
export async function createBankAccount(organizationId: string, payload: BankAccountPayload) { const { data } = await api.post(`/organizations/${organizationId}/banks`, payload); return data.data as BankAccount }
export async function fetchBankTransactions(organizationId: string, accountId: string) { const { data } = await api.get(`/organizations/${organizationId}/banks/${accountId}/transactions`); return (data.data ?? []) as BankTransaction[] }
export async function createBankTransaction(organizationId: string, accountId: string, payload: BankTransactionPayload) { const { data } = await api.post(`/organizations/${organizationId}/banks/${accountId}/transactions`, payload); return data.data as BankTransaction }
export async function fetchBankReconciliations(organizationId: string, accountId: string) { const { data } = await api.get(`/organizations/${organizationId}/banks/${accountId}/reconciliations`); return data.data as BankReconciliation[] }
export async function reconcileBank(organizationId: string, accountId: string, payload: { reconciliation_date: string; statement_balance: number; notes?: string }) { const { data } = await api.post(`/organizations/${organizationId}/banks/${accountId}/reconciliations`, payload); return data.data as BankReconciliation }
