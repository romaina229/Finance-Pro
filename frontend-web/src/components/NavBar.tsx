import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  WalletCards,
  HandCoins,
  Calculator,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'

const navigation = [
  {
    label: 'Tableau de bord',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Projets',
    path: '/projects',
    icon: FolderKanban,
  },
  {
    label: 'Dépenses',
    path: '/expenses',
    icon: Receipt,
  },
  {
    label: 'Recettes',
    path: '/revenues',
    icon: WalletCards,
  },
  {
    label: 'Bailleurs',
    path: '/donors',
    icon: HandCoins,
  },
  {
    label: 'Plan comptable',
    path: '/chart-of-accounts',
    icon: Calculator,
  },
  {
    label: 'Organisation',
    path: '/organization',
    icon: Building2,
  },
  {
    label: 'Membres',
    path: '/members',
    icon: Users,
  },
]

export function NavBar() {
  const { user, logout } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function isActive(path: string) {
    if (path === '/') {
      return location.pathname === '/'
    }

    return location.pathname.startsWith(path)
  }

  const initials =
    user?.full_name
      ?.split(' ')
      .map((name) => name[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">

      {/* BARRE PRINCIPALE */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* LOGO */}
        <div className="flex items-center gap-8">

          <Link
            to="/"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <WalletCards size={21} strokeWidth={2} />
            </div>

            <div className="hidden sm:block">
              <div className="text-base font-bold tracking-tight text-slate-900">
                Finance Pro
              </div>

              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Gestion financière
              </div>
            </div>
          </Link>

          {/* NAVIGATION DESKTOP */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    group flex items-center gap-2 rounded-lg px-3 py-2
                    text-sm font-medium transition-all duration-200
                    ${
                      active
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon
                    size={16}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={
                      active
                        ? 'text-slate-900'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }
                  />

                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* PARTIE DROITE */}
        <div className="flex items-center gap-3">

          {/* ORGANISATION */}
          {currentOrganization && (
            <div className="hidden xl:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Building2 size={15} className="text-slate-400" />

              <div className="max-w-[180px]">
                <div className="truncate text-xs font-semibold text-slate-700">
                  {currentOrganization.name}
                </div>

                <div className="text-[10px] text-slate-400">
                  Organisation active
                </div>
              </div>
            </div>
          )}

          {/* PROFIL */}
          <div className="relative">

            <button
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {initials}
              </div>

              <div className="hidden md:block text-left">
                <div className="max-w-[130px] truncate text-sm font-semibold text-slate-700">
                  {user?.full_name}
                </div>

                <div className="text-[11px] text-slate-400">
                  Administrateur
                </div>
              </div>

              <ChevronDown
                size={15}
                className={`hidden md:block text-slate-400 transition-transform ${
                  profileOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* MENU PROFIL */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {user?.full_name}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {user?.email}
                  </p>
                </div>

                {currentOrganization && (
                  <div className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-slate-400" />

                      <div>
                        <p className="text-xs font-medium text-slate-700">
                          Organisation
                        </p>

                        <p className="max-w-[190px] truncate text-xs text-slate-400">
                          {currentOrganization.name}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-1.5">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BOUTON MOBILE */}
          <button
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MENU MOBILE */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">

          {currentOrganization && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200">
                <Building2 size={17} className="text-slate-500" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {currentOrganization.name}
                </p>

                <p className="text-xs text-slate-400">
                  Organisation active
                </p>
              </div>
            </div>
          )}

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2.5
                    text-sm font-medium
                    ${
                      active
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </header>
  )
}