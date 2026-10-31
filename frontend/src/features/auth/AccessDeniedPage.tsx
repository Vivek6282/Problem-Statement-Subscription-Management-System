import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface AccessDeniedProps {
  /** Who can open this screen, e.g. "Administrators". Shown to the user. */
  requiredRole?: string
}

/**
 * Shown inside the app shell when a signed-in user opens a screen their role cannot use.
 * The API enforces the same rules; this only explains why the screen is empty.
 */
export const AccessDeniedPage: React.FC<AccessDeniedProps> = ({ requiredRole }) => {
  const { user, isCustomer } = useAuth()
  const navigate = useNavigate()
  const homePath = isCustomer ? '/portal' : '/dashboard'

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center" role="alert">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Access denied</h1>
          <p className="text-sm text-slate-600 mt-2">
            {requiredRole
              ? `This screen is available to ${requiredRole} only.`
              : 'Your account does not have permission to view this screen.'}
          </p>
          {user?.role && (
            <p className="text-xs text-slate-500 mt-1.5">
              You are signed in as {user.email} with the {user.role.toLowerCase()} role.
            </p>
          )}
          <Button className="mt-6" onClick={() => navigate(homePath)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Back to {isCustomer ? 'my portal' : 'dashboard'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
