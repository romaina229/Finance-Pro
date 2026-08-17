import { api } from './api'

export interface ReportProject {
  id: string
  code: string
  name: string
  total_budget: number
  currency: string
  status: string
  revenues: number
  expenses: number
  balance: number
}

export interface FinancialReport {
  period: { from: string; to: string }
  totals: { revenues: number; expenses: number; balance: number; projects: number }
  monthly: Array<{ month: string; label: string; revenues: number; expenses: number }>
  projects: ReportProject[]
}

export async function fetchFinancialReport(organizationId: string, from?: string, to?: string) {
  const { data } = await api.get(`/organizations/${organizationId}/reports`, {
    params: { from, to },
  })
  return data.data as FinancialReport
}
