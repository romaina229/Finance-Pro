import { useEffect, useState, type FormEvent } from 'react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import { fetchDonors, createDonor, deleteDonor, type Donor } from '../services/donors'

const DONOR_TYPES = ['bailleur_institutionnel', 'fondation', 'etat', 'particulier', 'autre']

export default function Donors() {
  const { currentOrganization } = useOrganization()
  const [donors, setDonors] = useState<Donor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    donor_type: DONOR_TYPES[0],
    country: '',
    contact_email: '',
  })

  async function load() {
    if (!currentOrganization) return
    setLoading(true)
    try {
      setDonors(await fetchDonors(currentOrganization.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentOrganization) return
    setSaving(true)
    setError(null)
    try {
      await createDonor(currentOrganization.id, form)
      setForm({ name: '', donor_type: DONOR_TYPES[0], country: '', contact_email: '' })
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Impossible d'ajouter ce bailleur.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!currentOrganization) return
    if (!confirm('Supprimer ce bailleur ?')) return
    try {
      await deleteDonor(currentOrganization.id, id)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Suppression impossible.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Bailleurs</h1>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Union Européenne, UNICEF..."
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={form.donor_type}
              onChange={(e) => setForm((f) => ({ ...f, donor_type: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {DONOR_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Pays</label>
            <input
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Email de contact</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
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

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-5 text-slate-500 text-sm">Chargement...</p>
          ) : donors.length === 0 ? (
            <p className="p-5 text-slate-400 text-sm">Aucun bailleur pour l'instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Pays</th>
                  <th className="px-4 py-2 font-medium">Contact</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {donors.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-900">{d.name}</td>
                    <td className="px-4 py-2 text-slate-600">{d.donor_type?.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-slate-600">{d.country}</td>
                    <td className="px-4 py-2 text-slate-600">{d.contact_email}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleDelete(d.id)} className="text-xs text-red-600 hover:underline">
                        Supprimer
                      </button>
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
