import { api } from './api'

export type ExpenseStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid'

export interface Expense {
  id: string
  project_id: string
  project?: { id: string; name: string; code: string }
  category_id: string | null
  category?: { id: string; name: string; code: string | null } | null
  budget_line_id?: string | null
  budget_line?: { id: string; label: string } | null
  amount: string
  currency: string
  supplier_name: string | null
  supplier_contact: string | null
  payment_method_id: number
  payment_method?: { id: number; name: string; code?: string }
  cash_register_id?: string | null
  bank_account_id?: string | null
  cash_register?: { id: string; name: string; code: string } | null
  bank_account?: { id: string; name: string; code: string } | null
  payment_reference: string | null
  expense_date: string
  description: string | null
  status: ExpenseStatus
  creator?: { id: string; full_name: string }
  rejection_reason: string | null
}

export interface ExpensePayload {
  project_id: string
  category_id?: string | null
  budget_line_id?: string | null
  amount: number
  currency?: string
  supplier_name?: string
  supplier_contact?: string
  payment_method_id: number
  cash_register_id?: string | null
  bank_account_id?: string | null
  payment_reference?: string
  expense_date: string
  description?: string
}

export async function fetchExpenses(organizationId: string, filters?: { project_id?: string; status?: ExpenseStatus }) {
  const { data } = await api.get(`/organizations/${organizationId}/expenses`, { params: filters })
  return data.data as Expense[]
}
export async function createExpense(organizationId: string, payload: ExpensePayload) { const { data } = await api.post(`/organizations/${organizationId}/expenses`, payload); return data.data as Expense }
export async function updateExpense(organizationId: string, expenseId: string, payload: Partial<ExpensePayload>) { const { data } = await api.patch(`/organizations/${organizationId}/expenses/${expenseId}`, payload); return data.data as Expense }
export async function deleteExpense(organizationId: string, expenseId: string) { await api.delete(`/organizations/${organizationId}/expenses/${expenseId}`) }
export async function submitExpense(organizationId: string, expenseId: string) { const { data } = await api.post(`/organizations/${organizationId}/expenses/${expenseId}/submit`); return data.data as Expense }
export async function approveExpense(organizationId: string, expenseId: string) { const { data } = await api.post(`/organizations/${organizationId}/expenses/${expenseId}/approve`); return data.data as Expense }
export async function rejectExpense(organizationId: string, expenseId: string, reason: string) { const { data } = await api.post(`/organizations/${organizationId}/expenses/${expenseId}/reject`, { rejection_reason: reason }); return data.data as Expense }
export async function markExpensePaid(organizationId: string, expenseId: string) { const { data } = await api.post(`/organizations/${organizationId}/expenses/${expenseId}/mark-paid`); return data.data as Expense }
