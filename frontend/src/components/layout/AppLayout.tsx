import React, { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { useAuth } from '@/features/auth/AuthContext'
import { Skeleton } from '@/components/ui/Skeleton'

export const AppLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-72 text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Authenticating Brightloop session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If customer logs in, redirect to customer portal if at root/dashboard
  if (user?.role === 'CUSTOMER' && window.location.pathname === '/dashboard') {
    return <Navigate to="/portal" replace />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

