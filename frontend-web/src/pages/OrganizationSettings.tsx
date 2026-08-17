import { useEffect, useState, type FormEvent } from 'react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import { updateOrganization, type OrganizationDetail } from '../services/organizations'

const CURRENCIES = ['XOF', 'EUR', 'USD']

export default function OrganizationSettings() {
  const { currentOrganization, refresh, loading } = useOrganization()
  const [form, setForm] = useState<Partial<OrganizationDetail>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentOrganization) setForm(currentOrganization)
  }, [currentOrganization])

  function update<K extends keyof OrganizationDetail>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentOrganization) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateOrganization(currentOrganization.id, form)
      await refresh()
      setMessage('Organisation mise à jour.')
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? "Vous n'avez peut-être pas la permission de modifier l'organisation."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <p className="p-6 text-slate-500">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Paramètres de l'organisation</h1>

        {message && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
            <input
              value={form.name ?? ''}
              onChange={update('name')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sigle</label>
              <input
                value={form.acronym ?? ''}
                onChange={update('acronym')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statut juridique</label>
              <input
                value={form.legal_status ?? ''}
                onChange={update('legal_status')}
                placeholder="ONG, Association..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Numéro d'enregistrement (si applicable)
            </label>
            <input
              value={form.registration_number ?? ''}
              onChange={update('registration_number')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
              <input
                value={form.country ?? ''}
                onChange={update('country')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
              <input
                value={form.city ?? ''}
                onChange={update('city')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Devise par défaut</label>
            <select
              value={form.default_currency ?? 'XOF'}
              onChange={update('default_currency')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </main>
    </div>
  )
}
