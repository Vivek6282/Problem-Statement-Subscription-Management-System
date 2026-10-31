import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { AccessDeniedPage } from '@/features/auth/AccessDeniedPage'

interface RoleRouteProps {
  /** 'admin' = Admin only, 'staff' = Admin or Staff, 'customer' = customer portal users only */
  allow: 'admin' | 'staff' | 'customer'
}

/**
 * Route-level role guard, used inside <AppLayout> in App.tsx.
 * The API enforces the same rules (hiding a screen is never the only protection);
 * this explains the restriction instead of letting the page fail with 403 errors.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allow }) => {
  const { isAdmin, isStaff, isCustomer, isLoading } = useAuth()
  if (isLoading) return null
  if (allow === 'admin' && !isAdmin) return <AccessDeniedPage requiredRole="administrators" />
  if (allow === 'staff' && !isStaff) return <AccessDeniedPage requiredRole="Brightloop staff" />
  // Staff have no portal of their own, so send them to their dashboard rather than a dead end.
  if (allow === 'customer' && !isCustomer) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
