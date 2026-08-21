import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSuperAdminAuth } from '../../context/SuperAdminAuthContext'

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSuperAdminAuth()

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />
  }

  return <>{children}</>
}
