import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-slate-900">ONG Finance Pro</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.full_name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          Bienvenue, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 mt-1">
          Le tableau de bord complet arrivera à l'étape 18 de la construction (Projets, Dépenses,
          Recettes, Budgets en attendant).
        </p>
      </main>
    </div>
  )
}
