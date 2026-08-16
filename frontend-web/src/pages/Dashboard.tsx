import { NavBar } from '../components/NavBar'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'

export default function Dashboard() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          Bienvenue, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 mt-1">
          {currentOrganization
            ? `Organisation active : ${currentOrganization.name}`
            : 'Chargement de votre organisation...'}
        </p>
        <p className="text-slate-400 text-sm mt-4">
          Le tableau de bord complet (projets, dépenses, budgets) arrive aux étapes suivantes.
        </p>
      </main>
    </div>
  )
}
