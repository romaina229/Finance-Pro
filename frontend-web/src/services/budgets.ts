import { api } from './api'

export interface BudgetLine {
  id: string
  project_id: string
  category_id: string | null
  category: { id: string; code: string | null; name: string } | null
  fiscal_year: number
  label: string
  planned_amount: number
  currency: string
  notes: string | null
}

export interface BudgetSummary {
  year: number
  project_budget: number
  planned: number
  actual: number
  remaining: number
  consumption_rate: number
}

export async function fetchBudgetLines(organizationId: string, projectId: string, year: number) {
  const { data } = await api.get(`/organizations/${organizationId}/projects/${projectId}/budget-lines`, { params: { year } })
  return { lines: data.data as BudgetLine[], summary: data.summary as BudgetSummary }
}

export async function createBudgetLine(organizationId: string, projectId: string, payload: Omit<BudgetLine, 'id'|'project_id'|'category'>) {
  const { data } = await api.post(`/organizations/${organizationId}/projects/${projectId}/budget-lines`, payload)
  return data.data as BudgetLine
}

export async function updateBudgetLine(organizationId: string, projectId: string, lineId: string, payload: Partial<Omit<BudgetLine, 'id'|'project_id'|'category'>>) {
  const { data } = await api.put(`/organizations/${organizationId}/projects/${projectId}/budget-lines/${lineId}`, payload)
  return data.data as BudgetLine
}

export async function deleteBudgetLine(organizationId: string, projectId: string, lineId: string) {
  await api.delete(`/organizations/${organizationId}/projects/${projectId}/budget-lines/${lineId}`)
}
