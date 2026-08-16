import { useEffect, useState, type FormEvent } from 'react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import { fetchProjects, type Project } from '../services/projects'
import { fetchExpenseCategories, type ExpenseCategory } from '../services/expenseCategories'
import { fetchPaymentMethods, type PaymentMethod } from '../services/paymentMethods'
import {
  fetchExpenses,
  createExpense,
  deleteExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  type Expense,
  type ExpenseStatus,
  type ExpensePayload,
} from '../services/expenses'

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Brouillon',
  pending_approval: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  paid: 'Payée',
}

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
}

const EMPTY_FORM: ExpensePayload = {
  project_id: '',
  category_id: null,
  amount: 0,
  payment_method_id: 0,
  expense_date: new Date().toISOString().slice(0, 10),
  description: '',
  supplier_name: '',
}

export default function Expenses() {
  const { currentOrganization } = useOrganization()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ExpensePayload>(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('')

  async function load() {
    if (!currentOrganization) return
    setLoading(true)
    try {
      const [expensesData, projectsData, categoriesData, methodsData] = await Promise.all([
        fetchExpenses(currentOrganization.id, statusFilter ? { status: statusFilter } : undefined),
        fetchProjects(currentOrganization.id),
        fetchExpenseCategories(currentOrganization.id),
        fetchPaymentMethods(currentOrganization.id),
      ])
      setExpenses(expensesData)
      setProjects(projectsData)
      setCategories(categoriesData)
      setPaymentMethods(methodsData)
      if (!form.payment_method_id && methodsData.length > 0) {
        setForm((f) => ({ ...f, payment_method_id: methodsData[0].id }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id, statusFilter])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentOrganization) return
    setSaving(true)
    setError(null)
    try {
      await createExpense(currentOrganization.id, form)
      setForm({ ...EMPTY_FORM, payment_method_id: paymentMethods[0]?.id ?? 0 })
      setShowForm(false)
      await load()
    } catch (err: any) {
      const messages = err.response?.data?.errors
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'enregistrer la dépense.")
    } finally {
      setSaving(false)
    }
  }

  async function runAction(action: () => Promise<any>) {
    setError(null)
    try {
      await action()
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Action impossible (vérifiez vos permissions).')
    }
  }

  async function handleDelete(id: string) {
    if (!currentOrganization) return
    if (!confirm('Supprimer cette dépense en brouillon ?')) return
    runAction(() => deleteExpense(currentOrganization.id, id))
  }

  async function handleReject(id: string) {
    if (!currentOrganization) return
    const reason = prompt('Motif du rejet :')
    if (!reason) return
    runAction(() => rejectExpense(currentOrganization.id, id, reason))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Dépenses</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-slate-800"
          >
            + Nouvelle dépense
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Projet</label>
                <select
                  required
                  value={form.project_id}
                  onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                <select
                  value={form.category_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Aucune —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ''}{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Moyen de paiement</label>
                <select
                  required
                  value={form.payment_method_id}
                  onChange={(e) => setForm((f) => ({ ...f, payment_method_id: Number(e.target.value) }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={form.expense_date}
                  onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
                <input
                  value={form.supplier_name}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Référence paiement (n° transaction, chèque...)
                </label>
                <input
                  value={form.payment_reference ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, payment_reference: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer en brouillon'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-900">
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-2 mb-4">
          {(['', 'draft', 'pending_approval', 'approved', 'rejected', 'paid'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border ${
                statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-600'
              }`}
            >
              {s === '' ? 'Toutes' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-5 text-slate-500 text-sm">Chargement...</p>
          ) : expenses.length === 0 ? (
            <p className="p-5 text-slate-400 text-sm">Aucune dépense.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Projet</th>
                  <th className="px-4 py-2 font-medium">Fournisseur</th>
                  <th className="px-4 py-2 font-medium">Montant</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-600">{exp.expense_date}</td>
                    <td className="px-4 py-2 text-slate-900">{exp.project?.code}</td>
                    <td className="px-4 py-2 text-slate-600">{exp.supplier_name ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {Number(exp.amount).toLocaleString('fr-FR')} {exp.currency}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[exp.status]}`}>
                        {STATUS_LABELS[exp.status]}
                      </span>
                      {exp.status === 'rejected' && exp.rejection_reason && (
                        <div className="text-xs text-red-500 mt-1">{exp.rejection_reason}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                      {(exp.status === 'draft' || exp.status === 'rejected') && currentOrganization && (
                        <>
                          <button
                            onClick={() => runAction(() => submitExpense(currentOrganization.id, exp.id))}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Soumettre
                          </button>
                          {exp.status === 'draft' && (
                            <button onClick={() => handleDelete(exp.id)} className="text-xs text-red-600 hover:underline">
                              Supprimer
                            </button>
                          )}
                        </>
                      )}
                      {exp.status === 'pending_approval' && currentOrganization && (
                        <>
                          <button
                            onClick={() => runAction(() => approveExpense(currentOrganization.id, exp.id))}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Approuver
                          </button>
                          <button onClick={() => handleReject(exp.id)} className="text-xs text-red-600 hover:underline">
                            Rejeter
                          </button>
                        </>
                      )}
                      {exp.status === 'approved' && currentOrganization && (
                        <button
                          onClick={() => runAction(() => markExpensePaid(currentOrganization.id, exp.id))}
                          className="text-xs text-green-700 hover:underline"
                        >
                          Marquer payée
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
