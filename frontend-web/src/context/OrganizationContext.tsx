import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchMyOrganizations, type OrganizationDetail } from '../services/organizations'
import { useAuth } from './AuthContext'

interface OrganizationContextValue {
  organizations: OrganizationDetail[]
  currentOrganization: OrganizationDetail | null
  setCurrentOrganizationId: (id: string) => void
  loading: boolean
  refresh: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

const STORAGE_KEY = 'ong_finance_pro_current_org_id'

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationDetail[]>([])
  const [currentId, setCurrentId] = useState<string | null>(
    localStorage.getItem(STORAGE_KEY)
  )
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!isAuthenticated) {
      setOrganizations([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const orgs = await fetchMyOrganizations()
      setOrganizations(orgs)
      if (orgs.length > 0 && !orgs.find((o) => o.id === currentId)) {
        setCurrentOrganizationId(orgs[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  function setCurrentOrganizationId(id: string) {
    localStorage.setItem(STORAGE_KEY, id)
    setCurrentId(id)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const currentOrganization = organizations.find((o) => o.id === currentId) ?? null

  return (
    <OrganizationContext.Provider
      value={{ organizations, currentOrganization, setCurrentOrganizationId, loading, refresh }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error('useOrganization doit être utilisé à l\'intérieur de <OrganizationProvider>')
  return ctx
}
