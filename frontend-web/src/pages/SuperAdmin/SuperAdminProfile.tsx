import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentSuperAdmin, updateSuperAdminProfile, type SuperAdminAccount } from '../../services/superAdmin'

export default function SuperAdminProfile() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState<SuperAdminAccount | null>(getCurrentSuperAdmin())
  const [fullName, setFullName] = useState(admin?.full_name ?? '')
  const [email, setEmail] = useState(admin?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!admin) navigate('/super-admin/login', { replace: true })
  }, [admin, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null); setMessage(null)
    if (password && password !== confirmation) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password && !currentPassword) { setError('Saisissez le mot de passe actuel pour le modifier.'); return }
    setLoading(true)
    try {
      const updated = await updateSuperAdminProfile({ full_name: fullName, email, current_password: currentPassword || undefined, password: password || undefined, password_confirmation: password ? confirmation : undefined })
      setAdmin(updated); setFullName(updated.full_name); setEmail(updated.email); setCurrentPassword(''); setPassword(''); setConfirmation('')
      setMessage('Les informations du Super Admin ont été mises à jour.')
    } catch (err: any) {
      const validation = err.response?.data?.errors
      const firstError = validation ? Object.values(validation).flat()[0] : null
      setError((firstError as string) ?? err.response?.data?.message ?? 'Modification impossible.')
    } finally { setLoading(false) }
  }

  if (!admin) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-950 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Espace plateforme</p><h1 className="text-lg font-semibold text-white">Profil Super Admin</h1></div>
          <button onClick={() => navigate('/super-admin')} className="text-sm text-slate-400 hover:text-white">Retour au tableau de bord</button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-7"><h2 className="text-xl font-semibold text-slate-900">Informations du compte</h2><p className="mt-1 text-sm text-slate-500">Modifiez le nom, l'adresse e-mail ou le mot de passe du compte de supervision.</p></div>
          {message && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
          {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Nom complet"><input value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClass} /></Field>
            <Field label="Adresse e-mail"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} /></Field>
            <div className="border-t border-slate-200 pt-5"><p className="mb-4 text-sm font-semibold text-slate-900">Changer le mot de passe</p><div className="space-y-4"><Field label="Mot de passe actuel"><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} /></Field><Field label="Nouveau mot de passe"><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Laisser vide pour ne pas changer" /></Field><Field label="Confirmer le nouveau mot de passe"><input type="password" minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={inputClass} /></Field></div></div>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => navigate('/super-admin')} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Annuler</button><button type="submit" disabled={loading} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{loading ? 'Enregistrement...' : 'Enregistrer les modifications'}</button></div>
          </form>
        </div>
      </main>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>{children}</label> }
