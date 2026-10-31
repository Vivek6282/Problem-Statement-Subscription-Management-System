import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isStaff: boolean
  isCustomer: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: any) => Promise<User>
  logout: () => Promise<void>
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCurrentUser = async () => {
    try {
      // First ensure CSRF cookie is initialized
      await api.get('/auth/csrf/').catch(() => null)
      const res = await api.get<User>('/auth/me/')
      setUser(res.data)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const login = async (email: string, password: string) => {
    // Get fresh CSRF token first
    await api.get('/auth/csrf/')
    const res = await api.post('/auth/login/', { email, password })
    const userData = res.data.user
    setUser(userData)
    return userData
  }

  const register = async (data: any) => {
    await api.get('/auth/csrf/')
    const res = await api.post('/auth/register/', data)
    const userData = res.data.user
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout/')
    } finally {
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    // Staff accounts also carry is_staff=true, so is_staff alone never makes an admin.
    // Django superusers count as admins (and therefore staff).
    isAdmin: user?.role === 'ADMIN' || !!user?.is_superuser,
    isStaff: user?.role === 'STAFF' || user?.role === 'ADMIN' || !!user?.is_staff || !!user?.is_superuser,
    isCustomer: user?.role === 'CUSTOMER',
    login,
    register,
    logout,
    refetchUser: fetchCurrentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
