import { api } from './api'

export interface ExpenseCategory {
  id: string
  organization_id: string | null
  parent_id: string | null
  code: string | null
  name: string
}

export async function fetchExpenseCategories(organizationId: string) {
  const { data } = await api.get(`/organizations/${organizationId}/expense-categories`)
  return data.data as ExpenseCategory[]
}

export async function createExpenseCategory(
  organizationId: string,
  payload: { parent_id?: string | null; code?: string; name: string }
) {
  const { data } = await api.post(`/organizations/${organizationId}/expense-categories`, payload)
  return data.data as ExpenseCategory
}

export async function deleteExpenseCategory(organizationId: string, categoryId: string) {
  await api.delete(`/organizations/${organizationId}/expense-categories/${categoryId}`)
}
