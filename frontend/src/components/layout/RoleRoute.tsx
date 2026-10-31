import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

interface RoleRouteProps {
  /** 'staff' = Admin or Staff, 'customer' = customer portal users only */
  allow: 'staff' | 'customer'
}

/**
 * Route-level role guard. The API enforces the same rules (hiding a screen is never the only protection);
 * this just stops people landing on pages that would only show them 403 errors.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allow }) => {
  const { isStaff, isCustomer, isLoading } = useAuth()
  if (isLoading) return null
  if (allow === 'staff' && !isStaff) return <Navigate to="/portal" replace />
  if (allow === 'customer' && !isCustomer) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
