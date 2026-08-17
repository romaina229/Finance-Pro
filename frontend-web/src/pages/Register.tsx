import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    organization_name: '',
    country: 'Bénin',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.password_confirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err: any) {
      const response = err.response

      const messages = response?.data?.errors

      if (messages) {
        setError(Object.values(messages).flat().join(' '))
      } else if (response?.data?.message) {
        setError(response.data.message)
      } else if (response?.status === 419) {
        setError('Session CSRF expirée ou invalide. Vérifiez la configuration de l’API.')
      } else if (response?.status === 422) {
        setError('Les données fournies sont invalides.')
      } else if (response?.status === 500) {
        setError('Erreur interne du serveur. Consultez les logs Laravel.')
      } else {
        setError("Inscription impossible. Vérifiez les informations saisies.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Créer votre organisation</h1>
        <p className="text-sm text-slate-500 mb-6">
          Vous serez administrateur de cette ONG sur la plateforme.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom de l'organisation
            </label>
            <input
              required
              value={form.organization_name}
              onChange={update('organization_name')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="ONG Espoir Bénin"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Votre nom</label>
              <input
                required
                value={form.full_name}
                onChange={update('full_name')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input
                value={form.phone}
                onChange={update('phone')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="+229 ..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={update('email')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={update('password')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmer</label>
              <input
                type="password"
                required
                value={form.password_confirmation}
                onChange={update('password_confirmation')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white text-sm font-medium rounded-md py-2 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Création...' : "Créer l'organisation"}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-slate-900 font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
