import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, BarChart3, Edit3, Plus, RefreshCw, Trash2, WalletCards } from 'lucide-react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import { fetchProjects, type Project } from '../services/projects'
import { fetchExpenseCategories, type ExpenseCategory } from '../services/expenseCategories'
import { createBudgetLine, deleteBudgetLine, fetchBudgetLines, updateBudgetLine, type BudgetLine, type BudgetSummary } from '../services/budgets'

const currentYear = new Date().getFullYear()
const emptyForm = { category_id: '', fiscal_year: currentYear, label: '', planned_amount: 0, currency: 'XOF', notes: '' }
const money = (value: number, currency: string) => `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
const message = (error: any, fallback: string) => error?.response?.data?.message ?? fallback

export default function Budgets() {
  const { currentOrganization } = useOrganization()
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [year, setYear] = useState(currentYear)
  const [lines, setLines] = useState<BudgetLine[]>([])
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<BudgetLine | null>(null)
  const [form, setForm] = useState(emptyForm)

  async function loadProjects() {
    if (!currentOrganization) return
    const [projectData, categoryData] = await Promise.all([
      fetchProjects(currentOrganization.id),
      fetchExpenseCategories(currentOrganization.id),
    ])
    setProjects(projectData)
    setCategories(categoryData)
    setSelectedProject((current) => current && projectData.some((p) => p.id === current) ? current : projectData[0]?.id ?? '')
  }

  async function loadBudget(projectId = selectedProject, selectedYear = year) {
    if (!currentOrganization || !projectId) {
      setLines([]); setSummary(null); setLoading(false); return
    }
    setLoading(true); setError(null)
    try {
      const result = await fetchBudgetLines(currentOrganization.id, projectId, selectedYear)
      setLines(result.lines); setSummary(result.summary)
    } catch (e) {
      setError(message(e, 'Impossible de charger le budget du projet.'))
    } finally { setLoading(false) }
  }

  useEffect(() => { loadProjects().catch((e) => setError(message(e, 'Impossible de charger les projets.'))) }, [currentOrganization?.id])
  useEffect(() => { loadBudget() }, [currentOrganization?.id, selectedProject, year])

  const selected = projects.find((p) => p.id === selectedProject)
  const currency = selected?.currency ?? currentOrganization?.default_currency ?? 'XOF'
  const projectBudget = Number(selected?.total_budget ?? summary?.project_budget ?? 0)
  const lineTotal = useMemo(() => lines.reduce((sum, line) => sum + Number(line.planned_amount), 0), [lines])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, fiscal_year: year, currency })
    setModal(true)
  }

  function openEdit(line: BudgetLine) {
    setEditing(line)
    setForm({ category_id: line.category_id ?? '', fiscal_year: line.fiscal_year, label: line.label, planned_amount: line.planned_amount, currency: line.currency, notes: line.notes ?? '' })
    setModal(true)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!currentOrganization || !selectedProject) return
    setSaving(true); setError(null)
    try {
      const payload = { ...form, category_id: form.category_id || null, currency: form.currency.toUpperCase() }
      if (editing) await updateBudgetLine(currentOrganization.id, selectedProject, editing.id, payload)
      else await createBudgetLine(currentOrganization.id, selectedProject, payload)
      setModal(false)
      await loadBudget(selectedProject, year)
    } catch (e) { setError(message(e, 'Impossible d’enregistrer la ligne budgétaire.')) }
    finally { setSaving(false) }
  }

  async function remove(line: BudgetLine) {
    if (!currentOrganization || !selectedProject || !window.confirm(`Supprimer « ${line.label} » ?`)) return
    try {
      await deleteBudgetLine(currentOrganization.id, selectedProject, line.id)
      await loadBudget(selectedProject, year)
    } catch (e) { setError(message(e, 'Impossible de supprimer la ligne budgétaire.')) }
  }

  return <div className="min-h-screen bg-slate-50">
    <NavBar />
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-slate-500">FINANCES</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Budgets</h1><p className="mt-1 text-sm text-slate-500">Prévision, consommation et suivi budgétaire par projet.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => loadBudget()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><RefreshCw size={16} className="mr-1 inline"/>Actualiser</button><button disabled={!selectedProject} onClick={openCreate} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><Plus size={16} className="mr-1 inline"/>Ligne budgétaire</button></div>
      </header>

      {error && <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle size={16}/>{error}</div>}

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-[1fr_150px]"><label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Projet</span><select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-400"><option value="">Sélectionner un projet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} — {project.name}</option>)}</select></label><label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Exercice</span><input type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5"/></label></div></section>

      {!selectedProject ? <Empty text="Sélectionnez un projet pour consulter son budget."/> : loading ? <Empty text="Chargement du budget…"/> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Budget projet" value={money(projectBudget, currency)} icon={<WalletCards size={18}/>}/>
          <Stat label="Prévision détaillée" value={money(summary?.planned ?? lineTotal, currency)} icon={<BarChart3 size={18}/>}/>
          <Stat label="Consommé" value={money(summary?.actual ?? 0, currency)} />
          <Stat label="Reste prévisionnel" value={money(summary?.remaining ?? 0, currency)} alert={(summary?.remaining ?? 0) < 0}/>
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">Consommation {year}</h2><p className="mt-1 text-xs text-slate-500">Dépenses du projet comparées aux lignes budgétaires.</p></div><div className="text-right"><span className={`text-lg font-semibold ${(summary?.consumption_rate ?? 0) > 100 ? 'text-red-600' : 'text-slate-900'}`}>{summary?.consumption_rate ?? 0}%</span><p className="text-[11px] text-slate-400">consommation</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${(summary?.consumption_rate ?? 0) > 100 ? 'bg-red-500' : 'bg-slate-900'}`} style={{ width: `${Math.min(summary?.consumption_rate ?? 0, 100)}%` }}/></div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Lignes budgétaires</h2><p className="mt-1 text-xs text-slate-500">Montants prévus par poste de dépense, et consommation réelle des dépenses qui y sont rattachées. {summary && summary.unallocated !== 0 && <span className="text-amber-600">{money(summary.unallocated, currency)} de dépenses non affectées à une ligne précise.</span>}</p></div>{lines.length === 0 ? <Empty text="Aucune ligne budgétaire pour cet exercice."/> : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Poste</th><th className="px-5 py-3">Catégorie</th><th className="px-5 py-3 text-right">Prévision</th><th className="px-5 py-3 text-right">Consommé</th><th className="px-5 py-3">Taux</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{lines.map((line) => <tr key={line.id} className="border-t border-slate-100"><td className="px-5 py-3"><div className="font-medium text-slate-800">{line.label}</div>{line.notes && <div className="mt-0.5 text-xs text-slate-400">{line.notes}</div>}</td><td className="px-5 py-3 text-slate-500">{line.category ? `${line.category.code ?? ''} ${line.category.name}` : 'Non catégorisé'}</td><td className="px-5 py-3 text-right font-semibold">{money(line.planned_amount, line.currency)}</td><td className={`px-5 py-3 text-right font-medium ${line.consumption_rate > 100 ? 'text-red-600' : 'text-slate-700'}`}>{money(line.actual, line.currency)}</td><td className="px-5 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${line.consumption_rate > 100 ? 'bg-red-500' : 'bg-slate-900'}`} style={{ width: `${Math.min(line.consumption_rate, 100)}%` }}/></div><span className="text-xs text-slate-500">{line.consumption_rate}%</span></div></td><td className="px-5 py-3"><div className="flex justify-end gap-1"><button onClick={() => openEdit(line)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Modifier"><Edit3 size={16}/></button><button onClick={() => remove(line)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Supprimer"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}</section>
      </>}

      {modal && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">{editing ? 'Modifier la ligne' : 'Nouvelle ligne budgétaire'}</h2><p className="mt-1 text-xs text-slate-400">{selected?.name}</p></div><button onClick={() => setModal(false)} className="text-xl text-slate-400">×</button></div><form onSubmit={save} className="space-y-3"><Field label="Libellé" required value={form.label} onChange={(v) => setForm({...form,label:v})}/><label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Catégorie</span><select value={form.category_id} onChange={(e) => setForm({...form,category_id:e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2.5"><option value="">Non catégorisé</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.code ? `${category.code} — ` : ''}{category.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><Field label="Exercice" type="number" required value={form.fiscal_year} onChange={(v) => setForm({...form,fiscal_year:Number(v)})}/><Field label="Montant prévu" type="number" required value={form.planned_amount} onChange={(v) => setForm({...form,planned_amount:Number(v)})}/></div><Field label="Devise" required value={form.currency} onChange={(v) => setForm({...form,currency:v})}/><Field label="Notes" value={form.notes} onChange={(v) => setForm({...form,notes:v})}/><button disabled={saving} className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></form></div></div>}
    </main>
  </div>
}

function Stat({ label, value, icon, alert = false }: { label: string; value: string; icon?: React.ReactNode; alert?: boolean }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</div><div className={`mt-2 text-xl font-semibold ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</div></div> }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div> }
function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: any; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"/></label> }
