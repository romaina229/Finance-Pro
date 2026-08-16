import { useEffect, useState, type FormEvent } from 'react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import { fetchDonors, type Donor } from '../services/donors'
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
  type ProjectPayload,
} from '../services/projects'

const STATUS_LABELS: Record<Project['status'], string> = {
  draft: 'Brouillon',
  active: 'Actif',
  suspended: 'Suspendu',
  closed: 'Clôturé',
}

const STATUS_COLORS: Record<Project['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  closed: 'bg-slate-200 text-slate-500',
}

const EMPTY_FORM: ProjectPayload = {
  code: '',
  name: '',
  description: '',
  total_budget: 0,
  currency: 'XOF',
  status: 'draft',
  donor_id: null,
}

export default function Projects() {
  const { currentOrganization } = useOrganization()
  const [projects, setProjects] = useState<Project[]>([])
  const [donors, setDonors] = useState<Donor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProjectPayload>(EMPTY_FORM)

  async function load() {
    if (!currentOrganization) return
    setLoading(true)
    try {
      const [projectsData, donorsData] = await Promise.all([
        fetchProjects(currentOrganization.id),
        fetchDonors(currentOrganization.id),
      ])
      setProjects(projectsData)
      setDonors(donorsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id])

  function openCreateForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEditForm(project: Project) {
    setForm({
      code: project.code,
      name: project.name,
      description: project.description ?? '',
      total_budget: Number(project.total_budget),
      currency: project.currency,
      status: project.status,
      donor_id: project.donor_id,
      start_date: project.start_date ?? undefined,
      end_date: project.end_date ?? undefined,
    })
    setEditingId(project.id)
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentOrganization) return
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await updateProject(currentOrganization.id, editingId, form)
      } else {
        await createProject(currentOrganization.id, form)
      }
      setShowForm(false)
      await load()
    } catch (err: any) {
      const messages = err.response?.data?.errors
      setError(messages ? Object.values(messages).flat().join(' ') : "Impossible d'enregistrer le projet.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!currentOrganization) return
    if (!confirm('Supprimer ce projet ?')) return
    try {
      await deleteProject(currentOrganization.id, id)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Suppression impossible.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Projets</h1>
          <button
            onClick={openCreateForm}
            className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-slate-800"
          >
            + Nouveau projet
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-xl p-6 mb-6 space-y-4"
          >
            <h2 className="font-medium text-slate-900">
              {editingId ? 'Modifier le projet' : 'Nouveau projet'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="PROJ-2026-001"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bailleur</label>
                <select
                  value={form.donor_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, donor_id: e.target.value || null }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Aucun —</option>
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Budget total</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.total_budget}
                  onChange={(e) => setForm((f) => ({ ...f, total_budget: Number(e.target.value) }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="XOF">XOF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Début</label>
                <input
                  type="date"
                  value={form.start_date ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fin</label>
                <input
                  type="date"
                  value={form.end_date ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Project['status'] }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-5 text-slate-500 text-sm">Chargement...</p>
          ) : projects.length === 0 ? (
            <p className="p-5 text-slate-400 text-sm">Aucun projet pour l'instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Bailleur</th>
                  <th className="px-4 py-2 font-medium">Budget</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-600">{p.code}</td>
                    <td className="px-4 py-2 text-slate-900">{p.name}</td>
                    <td className="px-4 py-2 text-slate-600">{p.donor?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {Number(p.total_budget).toLocaleString('fr-FR')} {p.currency}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right space-x-3">
                      <button onClick={() => openEditForm(p)} className="text-xs text-slate-600 hover:underline">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 hover:underline">
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
