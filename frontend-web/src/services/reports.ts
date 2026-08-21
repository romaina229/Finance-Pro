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

/**
 * Télécharge l'export CSV (dépenses + recettes détaillées sur la période).
 * Passe par axios (pas un simple lien <a href>) car la route est protégée
 * par jeton Bearer — un lien direct n'enverrait pas l'en-tête Authorization.
 */
export async function downloadReportExport(organizationId: string, from?: string, to?: string) {
  const response = await api.get(`/organizations/${organizationId}/reports/export`, {
    params: { from, to },
    responseType: 'blob',
  })

  const disposition = response.headers['content-disposition'] as string | undefined
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/)
  const filename = filenameMatch?.[1] ?? 'export-comptabilite.csv'

  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
