import { useEffect, useMemo, useState } from 'react'
import { FileBarChart2, TrendingDown, TrendingUp, Wallet, RefreshCw } from 'lucide-react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import { fetchFinancialReport, type FinancialReport } from '../services/reports'
import { formatDate } from '../utils/date'

const money = (value: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

export default function Reports() {
  const { currentOrganization } = useOrganization()
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [from, setFrom] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    if (!currentOrganization) return
    setLoading(true); setError('')
    try { setReport(await fetchFinancialReport(currentOrganization.id, from, to)) }
    catch (e: any) { setError(e?.response?.data?.message || 'Impossible de charger le rapport.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [currentOrganization])

  const maxMonthly = useMemo(() => Math.max(...(report?.monthly.map((m) => Math.max(m.revenues, m.expenses)) || [1]), 1), [report])
  const currency = currentOrganization?.default_currency || 'FCFA'

  return <div className="min-h-screen bg-slate-50">
    <NavBar />
    <main className="min-h-screen px-4 pb-10 pt-24 sm:px-6 lg:ml-[var(--finance-sidebar-width)] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><FileBarChart2 size={15}/> Rapports</div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Rapport financier</h1><p className="mt-1 text-sm text-slate-500">Vue synthétique des recettes, dépenses et soldes de l'organisation.</p></div>
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Du<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-2 text-sm"/></label>
            <label className="text-xs font-medium text-slate-500">Au<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-2 text-sm"/></label>
            <button onClick={load} disabled={loading} className="flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Actualiser</button>
          </div>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading && !report ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Chargement du rapport…</div> : report && <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[['Recettes', report.totals.revenues, TrendingUp], ['Dépenses', report.totals.expenses, TrendingDown], ['Solde', report.totals.balance, Wallet], ['Projets', report.totals.projects, FileBarChart2]].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><Icon size={18}/></span></div><div className="text-2xl font-bold text-slate-900">{label === 'Projets' ? value : `${money(value)} ${currency}`}</div></div>)}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-6"><h2 className="font-semibold text-slate-900">Évolution mensuelle</h2><p className="text-xs text-slate-400">Montants approuvés ou payés sur la période.</p></div><div className="space-y-4">{report.monthly.map(m => <div key={m.month}><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-600">{m.label}</span><span className="text-slate-400">{money(m.revenues - m.expenses)} {currency}</span></div><div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${(m.revenues / maxMonthly) * 100}%` }}/></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-300" style={{ width: `${(m.expenses / maxMonthly) * 100}%` }}/></div></div></div>)}</div><div className="mt-5 flex gap-5 text-xs text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-800"/>Recettes</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300"/>Dépenses</span></div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Période</h2><div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-400">Du</div><div className="mt-1 font-semibold text-slate-800">{formatDate(report.period.from)}</div><div className="mt-4 text-xs text-slate-400">Au</div><div className="mt-1 font-semibold text-slate-800">{formatDate(report.period.to)}</div></div><div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">Les totaux excluent les opérations en brouillon, soumises ou rejetées.</div></section>
          </div>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Synthèse par projet</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Projet</th><th className="px-5 py-3">Budget</th><th className="px-5 py-3">Recettes</th><th className="px-5 py-3">Dépenses</th><th className="px-5 py-3">Solde</th><th className="px-5 py-3">Statut</th></tr></thead><tbody className="divide-y divide-slate-100">{report.projects.map(p => <tr key={p.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-semibold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.code}</div></td><td className="px-5 py-4">{money(p.total_budget)} {p.currency}</td><td className="px-5 py-4 text-slate-700">{money(p.revenues)} {currency}</td><td className="px-5 py-4 text-slate-700">{money(p.expenses)} {currency}</td><td className={`px-5 py-4 font-semibold ${p.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(p.balance)} {currency}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">{p.status}</span></td></tr>)}{report.projects.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Aucun projet sur cette organisation.</td></tr>}</tbody></table></div></section>
        </>}
      </div>
    </main>
  </div>
}
