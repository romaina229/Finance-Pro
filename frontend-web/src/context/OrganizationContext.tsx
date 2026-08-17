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
      setCurrentId(null)
      localStorage.removeItem(STORAGE_KEY)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const orgs = await fetchMyOrganizations()

      // Une adhésion inactive ne peut pas accéder aux routes métier protégées
      // par org.access. Elle ne doit donc pas être proposée comme organisation
      // courante dans l'interface.
      const activeOrgs = orgs.filter((org) => org.status === 'active')
      setOrganizations(activeOrgs)

      // Le localStorage peut contenir un ID provenant d'une ancienne session,
      // d'une autre base de données ou d'une organisation devenue inactive.
      // Dans ce cas, on sélectionne une organisation réellement accessible.
      const storedIsValid = currentId !== null && activeOrgs.some((org) => org.id === currentId)

      if (!storedIsValid) {
        const fallback = activeOrgs[0]?.id ?? null
        if (fallback) {
          localStorage.setItem(STORAGE_KEY, fallback)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
        setCurrentId(fallback)
      }
    } finally {
      setLoading(false)
    }
  }

  function setCurrentOrganizationId(id: string) {
    const organization = organizations.find((org) => org.id === id)
    if (!organization) return

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
