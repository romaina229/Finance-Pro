import { useEffect, useState, type FormEvent } from 'react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import {
  fetchMembers,
  fetchRoles,
  inviteMember,
  updateMember,
  removeMember,
  type Member,
  type RoleOption,
} from '../services/members'

export default function Members() {
  const { currentOrganization } = useOrganization()
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviting, setInviting] = useState(false)

  async function loadData() {
    if (!currentOrganization) return
    setLoading(true)
    try {
      const [membersData, rolesData] = await Promise.all([
        fetchMembers(currentOrganization.id),
        fetchRoles(currentOrganization.id),
      ])
      setMembers(membersData)
      setRoles(rolesData)
      if (!inviteRole && rolesData.length > 0) setInviteRole(rolesData[rolesData.length - 1].code)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id])

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    if (!currentOrganization) return
    setInviting(true)
    setError(null)
    try {
      await inviteMember(currentOrganization.id, {
        email: inviteEmail,
        full_name: inviteName || undefined,
        role_code: inviteRole,
      })
      setInviteEmail('')
      setInviteName('')
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Impossible d'ajouter ce membre.")
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(userId: string, roleCode: string) {
    if (!currentOrganization) return
    await updateMember(currentOrganization.id, userId, { role_code: roleCode })
    await loadData()
  }

  async function handleRemove(userId: string) {
    if (!currentOrganization) return
    if (!confirm("Retirer ce membre de l'organisation ?")) return
    try {
      await removeMember(currentOrganization.id, userId)
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Suppression impossible.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Membres de l'organisation</h1>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form
          onSubmit={handleInvite}
          className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex flex-wrap gap-3 items-end"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="membre@ong.bj"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nom (si nouveau)</label>
            <input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Rôle</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="bg-slate-900 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
          >
            {inviting ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-5 text-slate-500 text-sm">Chargement...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Rôle</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-900">
                      {m.full_name} {m.is_primary && <span className="text-xs text-slate-400">(admin principal)</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.email}</td>
                    <td className="px-4 py-2">
                      <select
                        value={m.role?.code ?? ''}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        disabled={m.is_primary}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.code}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.status}</td>
                    <td className="px-4 py-2 text-right">
                      {!m.is_primary && (
                        <button
                          onClick={() => handleRemove(m.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Retirer
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
