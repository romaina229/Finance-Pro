import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'
import { LayoutDashboard, FolderKanban, Receipt, WalletCards, HandCoins, Calculator, Landmark, ChartNoAxesCombined, Building2, Users, Settings, LogOut, Menu, X, ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react'

const sections = [
  { label: 'PRINCIPAL', items: [
    { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { label: 'Projets', path: '/projects', icon: FolderKanban },
  ]},
  { label: 'FINANCES', items: [
    { label: 'Dépenses', path: '/expenses', icon: Receipt },
    { label: 'Recettes', path: '/revenues', icon: WalletCards },
    { label: 'Caisse', path: '/cash', icon: WalletCards },
    { label: 'Banque', path: '/bank', icon: Landmark },
    { label: 'Budgets', path: '/budgets', icon: ChartNoAxesCombined },
    { label: 'Bailleurs', path: '/donors', icon: HandCoins },
    { label: 'Plan comptable', path: '/chart-of-accounts', icon: Calculator },
  ]},
  { label: 'ORGANISATION', items: [
    { label: 'Organisation', path: '/organization', icon: Building2 },
    { label: 'Membres', path: '/members', icon: Users },
  ]},
]

export function NavBar() {
  const { user, logout } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--finance-sidebar-width', collapsed ? '72px' : '240px')
    return () => document.documentElement.style.removeProperty('--finance-sidebar-width')
  }, [collapsed])

  useEffect(() => { setMobileOpen(false); setProfileOpen(false) }, [location.pathname])

  async function handleLogout() { await logout(); navigate('/login') }
  const active = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const initials = user?.full_name?.split(' ').map((name) => name[0]).slice(0, 2).join('').toUpperCase() || 'U'

  const links = (mobile = false) => sections.map((section) => <div key={section.label} className="mb-5">
    {(!collapsed || mobile) && <div className="mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] text-slate-400">{section.label}</div>}
    <div className="space-y-1">{section.items.map((item) => { const Icon = item.icon; return <Link key={item.path} to={item.path} onClick={() => mobile && setMobileOpen(false)} title={!mobile && collapsed ? item.label : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active(item.path) ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${!mobile && collapsed ? 'justify-center' : ''}`}><Icon size={18} strokeWidth={active(item.path) ? 2.2 : 1.8} className={active(item.path) ? 'text-slate-900' : 'text-slate-400'} />{(!collapsed || mobile) && <span className="truncate">{item.label}</span>}</Link> })}</div>
  </div>)

  return <>
    <aside className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex ${collapsed ? 'w-[72px]' : 'w-60'}`}>
      <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-4"><Link to="/" className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm"><WalletCards size={19}/></div>{!collapsed && <div><div className="text-sm font-bold tracking-tight text-slate-900">Finance Pro</div><div className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">Gestion financière</div></div>}</Link></div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">{links()}<div className="mt-5 border-t border-slate-100 pt-4"><Link to="/organization" title={collapsed ? 'Paramètres' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 ${collapsed ? 'justify-center' : ''}`}><Settings size={18}/>{!collapsed && <span>Paramètres</span>}</Link></div></nav>
      <div className="border-t border-slate-100 p-3"><div className={`flex items-center gap-3 rounded-xl bg-slate-50 p-2 ${collapsed ? 'justify-center' : ''}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{initials}</div>{!collapsed && <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-slate-700">{user?.full_name}</div><button onClick={handleLogout} className="mt-0.5 text-[11px] text-slate-400 hover:text-red-600">Déconnexion</button></div>}</div></div>
    </aside>
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-slate-200 bg-white/95 backdrop-blur lg:left-[var(--finance-sidebar-width)]"><div className="flex h-full items-center justify-between px-4 sm:px-6"><div className="flex items-center gap-3"><button type="button" onClick={() => setCollapsed((v) => !v)} className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:flex">{collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}</button><button type="button" onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={20}/></button><div className="hidden sm:block"><div className="text-sm font-semibold text-slate-800">Finance Pro</div><div className="text-[11px] text-slate-400">Espace de gestion</div></div></div><div className="flex items-center gap-2 sm:gap-3">{currentOrganization && <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:block"><div className="text-xs font-semibold">{currentOrganization.name}</div></div>}<div className="relative"><button type="button" onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{initials}</div><span className="hidden text-sm font-semibold md:block">{user?.full_name}</span><ChevronDown size={15} className="hidden md:block"/></button>{profileOpen && <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><Link to="/organization" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"><Settings size={16}/>Paramètres</Link><button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut size={16}/>Déconnexion</button></div>}</div></div></div></header>
    {mobileOpen && <div className="fixed inset-0 z-[60] lg:hidden"><button type="button" aria-label="Fermer" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/30"/><aside className="relative flex h-full w-[min(86vw,320px)] flex-col bg-white"><div className="flex h-16 items-center justify-between border-b px-4"><b>Finance Pro</b><button type="button" onClick={() => setMobileOpen(false)}><X size={20}/></button></div><nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">{links(true)}<Link to="/organization" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 border-t border-slate-100 px-3 py-4 text-sm text-slate-500"><Settings size={18}/>Paramètres</Link></nav><button onClick={handleLogout} className="border-t p-4 text-left text-sm text-red-600"><LogOut size={18} className="mr-2 inline"/>Déconnexion</button></aside></div>}
  </>
}
