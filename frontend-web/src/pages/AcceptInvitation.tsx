import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchInvitation, type InvitationInfo } from '../services/auth'

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>()
  const { acceptInvitation } = useAuth()
  const navigate = useNavigate()

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [checking, setChecking] = useState(true)
  const [invalid, setInvalid] = useState(false)

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchInvitation(token)
      .then(setInvitation)
      .catch(() => setInvalid(true))
      .finally(() => setChecking(false))
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)

    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await acceptInvitation(token, password, passwordConfirmation)
      navigate('/')
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
          "Impossible de finaliser l'inscription. Le lien a peut-être déjà été utilisé."
      )
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-500">Vérification de l'invitation...</p>
      </div>
    )
  }

  if (invalid || !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Lien invalide ou expiré</h1>
          <p className="text-sm text-slate-500">
            Ce lien d'invitation n'est plus valable. Demandez à l'administrateur de votre
            organisation de vous envoyer une nouvelle invitation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-center mb-1">Bienvenue, {invitation.full_name}</h1>
        <p className="text-sm text-center text-slate-500 mb-6">
          Vous êtes invité(e) à rejoindre{' '}
          <strong>{invitation.organizations.map((o) => o.name).join(', ')}</strong> sur Finance
          Pro. Choisissez votre mot de passe pour activer votre compte ({invitation.email}).
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="8 caractères minimum"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              required
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white text-sm font-medium rounded-md py-2 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Activation...' : 'Activer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
