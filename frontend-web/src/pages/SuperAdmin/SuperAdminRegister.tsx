import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerSuperAdmin } from '../../services/superAdmin'

export default function SuperAdminRegister() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await registerSuperAdmin(fullName, email, password, confirmation)
      navigate('/super-admin')
    } catch (err: any) {
      const validation = err.response?.data?.errors
      const firstError = validation ? Object.values(validation).flat()[0] : null
      setError((firstError as string) ?? err.response?.data?.message ?? 'Création du compte impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">Finance Pro</p>
          <h1 className="mt-2 text-2xl font-semibold">Créer le Super Admin</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Cette page sert à initialiser le premier compte de supervision de la plateforme.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
          {error && (
            <div className="mb-5 rounded-lg border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Nom complet">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={255} className={inputClass} placeholder="Nom et prénom" />
            </Field>
            <Field label="Adresse e-mail">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="admin@finance-pro.com" />
            </Field>
            <Field label="Mot de passe">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} placeholder="8 caractères minimum" />
            </Field>
            <Field label="Confirmer le mot de passe">
              <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required minLength={8} className={inputClass} placeholder="Répéter le mot de passe" />
            </Field>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Création du compte...' : 'Créer le compte Super Admin'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-5 text-center text-sm text-slate-400">
            <Link to="/super-admin/login" className="font-medium text-amber-500 hover:text-amber-400">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  )
}
