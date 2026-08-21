import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuperAdminAuth } from '../../context/SuperAdminAuthContext'

export default function SuperAdminLogin() {
  const { login } = useSuperAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/super-admin')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-500 text-center">Espace plateforme</p>
        <h1 className="text-xl font-semibold text-white mb-1 mt-2 text-center">Super Admin</h1>
        <p className="text-sm text-slate-400 mb-6 mt-3 text-center">
          Supervision de toutes les organisations — accès réservé à l'équipe Finance Pro.
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-amber-500 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
