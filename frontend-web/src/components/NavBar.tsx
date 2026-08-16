import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'

export function NavBar() {
  const { user, logout } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-slate-900">ONG Finance Pro</span>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link to="/" className="hover:text-slate-900">Tableau de bord</Link>
          <Link to="/organization" className="hover:text-slate-900">Organisation</Link>
          <Link to="/members" className="hover:text-slate-900">Membres</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {currentOrganization && (
          <span className="text-sm text-slate-400">{currentOrganization.name}</span>
        )}
        <span className="text-sm text-slate-600">{user?.full_name}</span>
        <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-900">
          Déconnexion
        </button>
      </div>
    </header>
  )
}
