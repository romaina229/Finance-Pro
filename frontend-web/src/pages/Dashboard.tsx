import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  FolderKanban,
  HandCoins,
  RefreshCw,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { NavBar } from '../components/NavBar'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'
import { fetchProjects, type Project } from '../services/projects'
import { fetchExpenses, type Expense } from '../services/expenses'
import { fetchRevenues, type Revenue } from '../services/revenues'
import { formatDate } from '../utils/date'

interface DashboardData {
  projects: Project[]
  expenses: Expense[]
  revenues: Revenue[]
}

interface MonthPoint {
  key: string
  label: string
  revenues: number
  expenses: number
}

const STATUS_LABELS: Record<Project['status'], string> = {
  draft: 'Brouillon',
  active: 'Actif',
  suspended: 'Suspendu',
  closed: 'Clôturé',
}

const numberFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

function formatAmount(value: number, currency: string) {
  return `${numberFormatter.format(Math.round(value))} ${currency}`
}

function getFirstName(fullName: string | undefined) {
  return fullName?.trim().split(/\s+/)[0] || 'Administrateur'
}

function getMonthKey(date: string) {
  return date.slice(0, 7)
}

function getLastMonths(count: number): MonthPoint[] {
  const now = new Date()
  const months: MonthPoint[] = []

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '')
    months.push({
      key,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      revenues: 0,
      expenses: 0,
    })
  }

  return months
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  description: string
  icon: LucideIcon
  tone: 'dark' | 'green' | 'red' | 'blue'
}) {
  const toneClasses = {
    dark: 'bg-slate-900 text-white',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <div className="fp-stat-card">
      <div className="min-w-0">
        <div className="fp-stat-label">{label}</div>
        <div className="fp-stat-value truncate">{value}</div>
        <div className="mt-1 text-xs text-slate-400">{description}</div>
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        <Icon size={19} strokeWidth={2} />
      </div>
    </div>
  )
}

function LoadingCard() {
  return <div className="fp-stat-card animate-pulse"><div className="h-12 w-2/3 rounded-lg bg-slate-100" /><div className="h-10 w-10 rounded-xl bg-slate-100" /></div>
}

export default function Dashboard() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const [data, setData] = useState<DashboardData>({ projects: [], expenses: [], revenues: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadDashboard() {
    if (!currentOrganization) return

    setLoading(true)
    setError(null)

    try {
      const [projects, expenses, revenues] = await Promise.all([
        fetchProjects(currentOrganization.id),
        fetchExpenses(currentOrganization.id),
        fetchRevenues(currentOrganization.id),
      ])
      setData({ projects, expenses, revenues })
    } catch (err) {
      console.error('Dashboard loading error', err)
      setError('Impossible de charger les données du tableau de bord.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id])

  const currency = currentOrganization?.default_currency || 'XOF'

  // Seuls les montants "approved" et "paid" représentent de l'argent réellement
  // engagé/reçu. Les brouillons, dépenses en attente ou rejetées ne doivent
  // jamais entrer dans les totaux financiers affichés au tableau de bord.
  const CONFIRMED_STATUSES: readonly string[] = ['approved', 'paid']
  const confirmedExpenses = useMemo(
    () => data.expenses.filter((item) => CONFIRMED_STATUSES.includes(item.status)),
    [data.expenses]
  )
  const confirmedRevenues = useMemo(
    () => data.revenues.filter((item) => CONFIRMED_STATUSES.includes(item.status)),
    [data.revenues]
  )

  const totals = useMemo(() => {
    const revenues = confirmedRevenues
      .filter((item) => item.currency === currency)
      .reduce((sum, item) => sum + Number(item.amount), 0)
    const expenses = confirmedExpenses
      .filter((item) => item.currency === currency)
      .reduce((sum, item) => sum + Number(item.amount), 0)

    return {
      revenues,
      expenses,
      balance: revenues - expenses,
      activeProjects: data.projects.filter((project) => project.status === 'active').length,
    }
  }, [currency, confirmedRevenues, confirmedExpenses, data.projects])

  const months = useMemo(() => {
    const points = getLastMonths(6)
    const byKey = new Map(points.map((point) => [point.key, point]))

    confirmedRevenues
      .filter((item) => item.currency === currency)
      .forEach((item) => {
        const point = byKey.get(getMonthKey(item.received_date))
        if (point) point.revenues += Number(item.amount)
      })

    confirmedExpenses
      .filter((item) => item.currency === currency)
      .forEach((item) => {
        const point = byKey.get(getMonthKey(item.expense_date))
        if (point) point.expenses += Number(item.amount)
      })

    return points
  }, [currency, confirmedRevenues, confirmedExpenses])

  const maxMonthValue = Math.max(1, ...months.flatMap((month) => [month.revenues, month.expenses]))

  const projectSummary = useMemo(() => {
    return data.projects
      .map((project) => {
        const budget = Number(project.total_budget)
        const spent = confirmedExpenses
          .filter((expense) => expense.project_id === project.id && expense.currency === project.currency)
          .reduce((sum, expense) => sum + Number(expense.amount), 0)
        const percentage = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0

        return { project, budget, spent, percentage }
      })
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 5)
  }, [data.projects, confirmedExpenses])

  const recentActivity = useMemo(() => {
    const revenues = confirmedRevenues.map((item) => ({
      id: `revenue-${item.id}`,
      date: item.received_date,
      type: 'revenue' as const,
      title: item.donor?.name || 'Recette',
      description: item.project?.name || 'Recette générale',
      amount: Number(item.amount),
      currency: item.currency,
    }))

    const expenses = confirmedExpenses.map((item) => ({
      id: `expense-${item.id}`,
      date: item.expense_date,
      type: 'expense' as const,
      title: item.supplier_name || 'Dépense',
      description: item.project?.name || 'Dépense générale',
      amount: Number(item.amount),
      currency: item.currency,
    }))

    return [...revenues, ...expenses]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
  }, [confirmedRevenues, confirmedExpenses])

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />

      <main className="fp-page">
        <div className="fp-page-container">
          <div className="fp-page-header">
            <div>
              <h1 className="fp-page-title">Bienvenue, {getFirstName(user?.full_name)}</h1>
              <p className="fp-page-description">
                {currentOrganization
                  ? `Vue d’ensemble de ${currentOrganization.name}`
                  : 'Chargement de votre organisation...'}
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading || !currentOrganization}
              className="fp-btn fp-btn-secondary"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Données indisponibles</p>
                <p className="mt-0.5 text-red-600">{error}</p>
              </div>
            </div>
          )}

          {!currentOrganization ? (
            <div className="fp-card p-8 text-center">
              <p className="text-sm font-medium text-slate-700">Aucune organisation active</p>
              <p className="mt-1 text-sm text-slate-400">Sélectionnez ou configurez votre organisation pour afficher les indicateurs.</p>
            </div>
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => <LoadingCard key={index} />)}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Recettes" value={formatAmount(totals.revenues, currency)} description="Total enregistré" icon={ArrowUpRight} tone="green" />
                <StatCard label="Dépenses" value={formatAmount(totals.expenses, currency)} description="Total enregistré" icon={ArrowDownRight} tone="red" />
                <StatCard label="Solde" value={formatAmount(totals.balance, currency)} description="Recettes moins dépenses" icon={WalletCards} tone="dark" />
                <StatCard label="Projets actifs" value={numberFormatter.format(totals.activeProjects)} description={`${data.projects.length} projet${data.projects.length > 1 ? 's' : ''} au total`} icon={FolderKanban} tone="blue" />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
                <section className="fp-card">
                  <div className="fp-card-header">
                    <div>
                      <h2 className="fp-card-title">Évolution financière</h2>
                      <p className="fp-card-description">Recettes et dépenses des six derniers mois · {currency}</p>
                    </div>
                  </div>
                  <div className="fp-card-body">
                    <div className="flex h-64 items-end gap-2 sm:gap-4">
                      {months.map((month) => {
                        const revenueHeight = month.revenues > 0 ? Math.max(5, (month.revenues / maxMonthValue) * 100) : 2
                        const expenseHeight = month.expenses > 0 ? Math.max(5, (month.expenses / maxMonthValue) * 100) : 2

                        return (
                          <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                            <div className="flex min-h-0 flex-1 items-end justify-center gap-1 sm:gap-2">
                              <div className="w-full max-w-7 rounded-t-md bg-emerald-500/80 transition-all" style={{ height: `${revenueHeight}%` }} title={`Recettes : ${formatAmount(month.revenues, currency)}`} />
                              <div className="w-full max-w-7 rounded-t-md bg-red-400/80 transition-all" style={{ height: `${expenseHeight}%` }} title={`Dépenses : ${formatAmount(month.expenses, currency)}`} />
                            </div>
                            <div className="mt-3 text-center text-[11px] font-medium text-slate-400">{month.label}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-5 text-xs text-slate-500">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Recettes</span>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-400" />Dépenses</span>
                    </div>
                  </div>
                </section>

                <section className="fp-card">
                  <div className="fp-card-header">
                    <div>
                      <h2 className="fp-card-title">Suivi des projets</h2>
                      <p className="fp-card-description">Budget consommé par projet</p>
                    </div>
                    <Link to="/projects" className="text-xs font-semibold text-slate-600 hover:text-slate-900">Voir tout</Link>
                  </div>
                  <div className="fp-card-body">
                    {projectSummary.length === 0 ? (
                      <div className="py-8 text-center">
                        <FolderKanban size={24} className="mx-auto text-slate-300" />
                        <p className="mt-2 text-sm text-slate-500">Aucun projet à afficher.</p>
                        <Link to="/projects" className="mt-2 inline-block text-xs font-semibold text-slate-700 hover:underline">Créer un projet</Link>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {projectSummary.map(({ project, budget, spent, percentage }) => (
                          <div key={project.id}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-700">{project.name}</p>
                                <p className="mt-0.5 text-[11px] text-slate-400">{STATUS_LABELS[project.status]}</p>
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-slate-600">{percentage.toFixed(0)}%</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-slate-800 transition-all" style={{ width: `${percentage}%` }} />
                            </div>
                            <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                              <span>{formatAmount(spent, project.currency)}</span>
                              <span>{formatAmount(budget, project.currency)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="fp-card mt-6">
                <div className="fp-card-header">
                  <div>
                    <h2 className="fp-card-title">Activité récente</h2>
                    <p className="fp-card-description">Dernières recettes et dépenses enregistrées</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/revenues" className="text-xs font-semibold text-slate-600 hover:text-slate-900">Recettes</Link>
                    <span className="text-slate-300">·</span>
                    <Link to="/expenses" className="text-xs font-semibold text-slate-600 hover:text-slate-900">Dépenses</Link>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentActivity.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <HandCoins size={24} className="mx-auto text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">Aucune activité récente.</p>
                    </div>
                  ) : (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 px-5 py-3.5 sm:gap-4">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${activity.type === 'revenue' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {activity.type === 'revenue' ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-700">{activity.title}</p>
                          <p className="truncate text-xs text-slate-400">{activity.description} · {formatDate(activity.date)}</p>
                        </div>
                        <div className={`shrink-0 text-right text-sm font-semibold ${activity.type === 'revenue' ? 'text-emerald-700' : 'text-red-700'}`}>
                          {activity.type === 'revenue' ? '+' : '-'}{formatAmount(activity.amount, activity.currency)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
