import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import {
  fetchExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory,
  type ExpenseCategory,
} from '../services/expenseCategories'

export default function ChartOfAccounts() {
  const { currentOrganization } = useOrganization()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ parent_id: '', code: '', name: '' })

  async function load() {
    if (!currentOrganization) return
    setLoading(true)
    try {
      setCategories(await fetchExpenseCategories(currentOrganization.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id])

  // Regroupe les catégories par parent pour construire l'arborescence à l'affichage
  const topLevel = useMemo(() => categories.filter((c) => !c.parent_id), [categories])
  function childrenOf(parentId: string) {
    return categories.filter((c) => c.parent_id === parentId)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentOrganization) return
    setSaving(true)
    setError(null)
    try {
      await createExpenseCategory(currentOrganization.id, {
        parent_id: form.parent_id || null,
        code: form.code || undefined,
        name: form.name,
      })
      setForm({ parent_id: '', code: '', name: '' })
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Impossible d'ajouter cette catégorie.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!currentOrganization) return
    if (!confirm('Supprimer cette catégorie personnalisée ?')) return
    try {
      await deleteExpenseCategory(currentOrganization.id, id)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Suppression impossible.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Plan comptable</h1>
        <p className="text-sm text-slate-500 mb-6">
          Modèle de départ aligné sur le référentiel SYSCOHADA. Les catégories en gris sont
          communes à toutes les organisations ; ajoutez les vôtres ci-dessous.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Catégorie parente</label>
            <select
              value={form.parent_id}
              onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Aucune (niveau racine) —</option>
              {topLevel.map((c) => (
                <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ''}{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-slate-500 mb-1">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="6229"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Carburant véhicules terrain"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {loading ? (
            <p className="p-5 text-slate-500 text-sm">Chargement...</p>
          ) : (
            topLevel.map((parent) => (
              <div key={parent.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">
                    {parent.code && <span className="text-slate-400 mr-2">{parent.code}</span>}
                    {parent.name}
                  </span>
                  {parent.organization_id && (
                    <button onClick={() => handleDelete(parent.id)} className="text-xs text-red-600 hover:underline">
                      Supprimer
                    </button>
                  )}
                </div>
                <ul className="mt-2 ml-4 space-y-1">
                  {childrenOf(parent.id).map((child) => (
                    <li key={child.id} className="flex items-center justify-between text-sm text-slate-600">
                      <span>
                        {child.code && <span className="text-slate-400 mr-2">{child.code}</span>}
                        {child.name}
                        {!child.organization_id && (
                          <span className="ml-2 text-xs text-slate-400">(modèle global)</span>
                        )}
                      </span>
                      {child.organization_id && (
                        <button onClick={() => handleDelete(child.id)} className="text-xs text-red-600 hover:underline">
                          Supprimer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
