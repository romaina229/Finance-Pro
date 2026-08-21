import { useEffect, useState, type FormEvent } from 'react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import { fetchProjects, type Project } from '../services/projects'
import { fetchExpenseCategories, type ExpenseCategory } from '../services/expenseCategories'
import { fetchPaymentMethods, type PaymentMethod } from '../services/paymentMethods'
import { fetchCashRegisters, type CashRegister } from '../services/cash'
import { fetchBankAccounts, type BankAccount } from '../services/bank'
import { formatDate } from '../utils/date'
import { fetchBudgetLines, type BudgetLine as BudgetLineOption } from '../services/budgets'
import { BudgetOverageModal, type BudgetOverageDetails } from '../components/BudgetOverageModal'
import { fetchExpenses, createExpense, deleteExpense, submitExpense, approveExpense, rejectExpense, markExpensePaid, type Expense, type ExpenseStatus, type ExpensePayload } from '../services/expenses'

const STATUS_LABELS: Record<ExpenseStatus, string> = { draft: 'Brouillon', pending_approval: 'En attente', approved: 'Approuvée', rejected: 'Rejetée', paid: 'Payée' }
const STATUS_COLORS: Record<ExpenseStatus, string> = { draft: 'bg-slate-100 text-slate-600', pending_approval: 'bg-amber-100 text-amber-700', approved: 'bg-blue-100 text-blue-700', rejected: 'bg-red-100 text-red-700', paid: 'bg-green-100 text-green-700' }
const EMPTY_FORM: ExpensePayload = { project_id: '', category_id: null, budget_line_id: null, amount: 0, payment_method_id: 0, cash_register_id: null, bank_account_id: null, expense_date: new Date().toISOString().slice(0, 10), description: '', supplier_name: '' }

export default function Expenses() {
  const { currentOrganization } = useOrganization()
  const [expenses, setExpenses] = useState<Expense[]>([]), [projects, setProjects] = useState<Project[]>([]), [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]), [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]), [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLineOption[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null), [saving, setSaving] = useState(false), [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ExpensePayload>(EMPTY_FORM), [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('')

  async function load() {
    if (!currentOrganization) return
    setLoading(true); setError(null)
    try {
      const [e, p, c, m, cash, bank] = await Promise.all([fetchExpenses(currentOrganization.id, statusFilter ? { status: statusFilter } : undefined), fetchProjects(currentOrganization.id), fetchExpenseCategories(currentOrganization.id), fetchPaymentMethods(currentOrganization.id), fetchCashRegisters(currentOrganization.id), fetchBankAccounts(currentOrganization.id)])
      setExpenses(e); setProjects(p); setCategories(c); setPaymentMethods(m); setCashRegisters(cash); setBankAccounts(bank)
      if (!form.payment_method_id && m.length) setForm(f => ({ ...f, payment_method_id: m[0].id }))
    } catch (err: any) { setError(err.response?.data?.message ?? "Impossible de charger les dépenses.") } finally { setLoading(false) }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currentOrganization?.id, statusFilter])

  // Lignes budgétaires du projet sélectionné (exercice en cours) — permet de rattacher
  // la dépense à une ligne précise pour un suivi de consommation fiable (voir Budgets.tsx).
  useEffect(() => {
    if (!currentOrganization || !form.project_id) { setBudgetLines([]); return }
    fetchBudgetLines(currentOrganization.id, form.project_id, new Date().getFullYear())
      .then(r => setBudgetLines(r.lines))
      .catch(() => setBudgetLines([]))
  }, [currentOrganization?.id, form.project_id])

  const method = paymentMethods.find(m => m.id === form.payment_method_id)
  const needsCash = method?.code === 'cash'
  const needsBank = ['bank_transfer', 'cheque', 'mobile_money_mtn', 'mobile_money_moov', 'mobile_money_orange'].includes(method?.code ?? '')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!currentOrganization) return
    setSaving(true); setError(null)
    try {
      const result = await createExpense(currentOrganization.id, form)
      setForm({ ...EMPTY_FORM, payment_method_id: paymentMethods[0]?.id ?? 0 }); setShowForm(false)
      if ((result as any)?._offlineQueued) {
        // Hors ligne : le serveur n'a jamais reçu la dépense, donc un rechargement
        // classique (load()) ne l'aurait jamais fait apparaître avant la synchronisation.
        // On enrichit l'objet synthétisé avec les libellés déjà chargés localement
        // (projet, catégorie, moyen de paiement) pour un affichage immédiat cohérent.
        const enriched: Expense = {
          ...result,
          project: projects.find(p => p.id === result.project_id) as any,
          category: categories.find(c => c.id === result.category_id) as any ?? null,
          payment_method: paymentMethods.find(m => m.id === result.payment_method_id) as any,
        }
        setExpenses(list => [enriched, ...list])
      } else {
        await load()
      }
    }
    catch (err: any) { const messages = err.response?.data?.errors; setError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'enregistrer la dépense.") }
    finally { setSaving(false) }
  }
  async function runAction(action: () => Promise<any>) { setError(null); try { await action(); await load() } catch (err: any) { const messages = err.response?.data?.errors; setError(messages ? Object.values(messages).flat().join(' ') : err.response?.data?.message ?? 'Action impossible.') } }
  function handleReject(id: string) { if (!currentOrganization) return; const reason = prompt('Motif du rejet :'); if (reason) runAction(() => rejectExpense(currentOrganization.id, id, reason)) }

  const [budgetOverage, setBudgetOverage] = useState<{ expenseId: string; details: BudgetOverageDetails } | null>(null)
  const [confirmingOverage, setConfirmingOverage] = useState(false)

  async function handleApprove(id: string) {
    if (!currentOrganization) return
    setError(null)
    try {
      await approveExpense(currentOrganization.id, id)
      await load()
    } catch (err: any) {
      const control = err.response?.data?.budget_control
      if (control) {
        setBudgetOverage({ expenseId: id, details: control })
        return
      }
      setError(err.response?.data?.message ?? 'Action impossible.')
    }
  }

  async function confirmBudgetOverage() {
    if (!currentOrganization || !budgetOverage) return
    setConfirmingOverage(true)
    try {
      await approveExpense(currentOrganization.id, budgetOverage.expenseId, true)
      setBudgetOverage(null)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Action impossible.')
      setBudgetOverage(null)
    } finally {
      setConfirmingOverage(false)
    }
  }

  return <div className="min-h-screen bg-slate-50"><NavBar /><main className="min-h-screen px-4 pb-10 pt-24 sm:px-6 lg:ml-[var(--finance-sidebar-width)] lg:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">FINANCES</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Dépenses</h1><p className="mt-1 text-sm text-slate-500">Suivez les engagements, validations et décaissements de l'organisation.</p></div><button onClick={() => setShowForm(v => !v)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">+ Nouvelle dépense</button></header>
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {showForm && <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="font-semibold text-slate-900">Nouvelle dépense</h2><p className="text-xs text-slate-500">Le compte choisi sera débité au moment du passage à « Payée ».</p></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Projet<select required value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value, budget_line_id: null }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">— Choisir —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Catégorie<select value={form.category_id ?? ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value || null }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">— Aucune —</option>{categories.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ''}{c.name}</option>)}</select></label></div>
        {budgetLines.length > 0 && <label className="mt-4 block text-sm font-medium text-slate-700">Ligne budgétaire <span className="font-normal text-slate-400">(optionnel — pour un suivi de consommation précis)</span><select value={form.budget_line_id ?? ''} onChange={e => setForm(f => ({ ...f, budget_line_id: e.target.value || null }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">— Non affectée —</option>{budgetLines.map(l => <option key={l.id} value={l.id}>{l.label} ({Number(l.planned_amount).toLocaleString('fr-FR')} {l.currency} prévu, {Number(l.remaining).toLocaleString('fr-FR')} restant)</option>)}</select>
          {(() => {
            const line = budgetLines.find(l => l.id === form.budget_line_id)
            if (!line || !form.amount) return null
            const wouldBe = line.actual + Number(form.amount)
            if (wouldBe <= line.planned_amount) return null
            return <p className="mt-1.5 text-xs font-medium text-amber-600">⚠️ Dépasserait le budget de cette ligne de {(wouldBe - line.planned_amount).toLocaleString('fr-FR')} {line.currency} (contrôle appliqué à l'approbation).</p>
          })()}
        </label>}
        <div className="mt-4 grid gap-4 md:grid-cols-3"><label className="text-sm font-medium text-slate-700">Montant<input type="number" required min={0.01} step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="text-sm font-medium text-slate-700">Moyen de paiement<select required value={form.payment_method_id} onChange={e => setForm(f => ({ ...f, payment_method_id: Number(e.target.value), cash_register_id: null, bank_account_id: null }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">{paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Date<input type="date" required value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label></div>
        {needsCash && <label className="mt-4 block text-sm font-medium text-slate-700">Caisse à débiter<select required value={form.cash_register_id ?? ''} onChange={e => setForm(f => ({ ...f, cash_register_id: e.target.value || null }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">— Choisir la caisse —</option>{cashRegisters.filter(c => c.status === 'open').map(c => <option key={c.id} value={c.id}>{c.code} — {c.name} ({c.currency})</option>)}</select></label>}
        {needsBank && <label className="mt-4 block text-sm font-medium text-slate-700">Compte à débiter<select required value={form.bank_account_id ?? ''} onChange={e => setForm(f => ({ ...f, bank_account_id: e.target.value || null }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">— Choisir le compte / portefeuille —</option>{bankAccounts.filter(a => a.status === 'open').map(a => <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.currency})</option>)}</select></label>}
        <div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Fournisseur<input value={form.supplier_name ?? ''} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="text-sm font-medium text-slate-700">Référence<input value={form.payment_reference ?? ''} onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label></div>
        <label className="mt-4 block text-sm font-medium text-slate-700">Description<textarea rows={2} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
        <div className="mt-5 flex flex-wrap gap-3"><button disabled={saving} type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer en brouillon'}</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600">Annuler</button></div>
      </form>}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{(['', 'draft', 'pending_approval', 'approved', 'rejected', 'paid'] as const).map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${statusFilter === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{s === '' ? 'Toutes' : STATUS_LABELS[s]}</button>)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto">{loading ? <p className="p-6 text-sm text-slate-500">Chargement...</p> : expenses.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Aucune dépense.</p> : <table className="min-w-[900px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Projet</th><th className="px-4 py-3">Fournisseur</th><th className="px-4 py-3">Montant</th><th className="px-4 py-3">Règlement</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3"></th></tr></thead><tbody>{expenses.map(exp => { const pendingSync = (exp as any)._offlineQueued; return <tr key={exp.id} className={`border-t border-slate-100 ${pendingSync ? 'bg-amber-50/40' : ''}`}><td className="px-4 py-3 text-slate-600">{formatDate(exp.expense_date)}</td><td className="px-4 py-3 font-medium text-slate-900">{exp.project?.code ?? '—'}</td><td className="px-4 py-3 text-slate-600">{exp.supplier_name ?? '—'}</td><td className="px-4 py-3 font-semibold text-slate-800">{Number(exp.amount).toLocaleString('fr-FR')} {exp.currency}</td><td className="px-4 py-3 text-xs text-slate-500">{exp.cash_register?.name ?? exp.bank_account?.name ?? exp.payment_method?.name ?? '—'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLORS[exp.status]}`}>{STATUS_LABELS[exp.status]}</span>{pendingSync && <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">⏳ en attente de sync</span>}</td><td className="whitespace-nowrap px-4 py-3 text-right">{pendingSync ? <span className="text-xs text-slate-400">Actions disponibles après synchronisation</span> : <>{(exp.status === 'draft' || exp.status === 'rejected') && currentOrganization && <><button onClick={() => runAction(() => submitExpense(currentOrganization.id, exp.id))} className="mr-3 text-xs font-medium text-blue-600">Soumettre</button>{exp.status === 'draft' && <button onClick={() => runAction(() => deleteExpense(currentOrganization.id, exp.id))} className="text-xs font-medium text-red-600">Supprimer</button>}</>}{exp.status === 'pending_approval' && currentOrganization && <><button onClick={() => handleApprove(exp.id)} className="mr-3 text-xs font-medium text-green-600">Approuver</button><button onClick={() => handleReject(exp.id)} className="text-xs font-medium text-red-600">Rejeter</button></>}{exp.status === 'approved' && currentOrganization && <button onClick={() => runAction(() => markExpensePaid(currentOrganization.id, exp.id))} className="text-xs font-medium text-green-700">Marquer payée</button>}</>}</td></tr> })}</tbody></table>}</div></div>
    </div>
    {budgetOverage && (
      <BudgetOverageModal
        details={budgetOverage.details}
        confirming={confirmingOverage}
        onConfirm={confirmBudgetOverage}
        onCancel={() => setBudgetOverage(null)}
      />
    )}
  </main></div>
}
