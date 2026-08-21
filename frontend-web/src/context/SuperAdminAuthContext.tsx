import { createContext, useContext, useState, type ReactNode } from 'react'
import * as superAdminService from '../services/superAdmin'
import type { SuperAdminAccount } from '../services/superAdmin'

interface SuperAdminAuthContextValue {
  admin: SuperAdminAccount | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | undefined>(undefined)

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<SuperAdminAccount | null>(superAdminService.getCurrentSuperAdmin())

  async function login(email: string, password: string) {
    const account = await superAdminService.superAdminLogin(email, password)
    setAdmin(account)
  }

  async function logout() {
    await superAdminService.superAdminLogout()
    setAdmin(null)
  }

  return (
    <SuperAdminAuthContext.Provider value={{ admin, isAuthenticated: Boolean(admin), login, logout }}>
      {children}
    </SuperAdminAuthContext.Provider>
  )
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext)
  if (!ctx) throw new Error('useSuperAdminAuth doit être utilisé à l\'intérieur de <SuperAdminAuthProvider>')
  return ctx
}
