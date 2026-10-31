import React, { useState } from 'react'
import { User, KeyRound, Shield, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

export const ProfilePage: React.FC = () => {
  const { user, refetchUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [phone, setPhone] = useState(user?.phone || '')

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Password change state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [isChangingPass, setIsChangingPass] = useState(false)
  const [passSuccess, setPassSuccess] = useState(false)
  const [passError, setPassError] = useState<string | null>(null)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    setProfileSuccess(false)
    try {
      await api.patch('/auth/me/', {
        first_name: firstName,
        last_name: lastName,
        phone,
      })
      await refetchUser()
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChangingPass(false)
    setPassError(null)
    setPassSuccess(false)

    if (newPassword !== newPasswordConfirm) {
      setPassError('New passwords do not match.')
      return
    }

    setIsChangingPass(true)
    try {
      await api.post('/auth/password-change/', {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      })
      setPassSuccess(true)
      setOldPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      setTimeout(() => setPassSuccess(false), 4000)
    } catch (err: any) {
      setPassError(
        err?.response?.data?.old_password?.[0] ||
        err?.response?.data?.new_password?.[0] ||
        'Password update failed. Ensure password meets complexity rules.'
      )
    } finally {
      setIsChangingPass(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Profile & Security</h1>
        <p className="text-xs text-slate-500 mt-1">Manage personal contact information and authentication settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Personal Information</CardTitle>
            </div>
            <Badge variant="neutral">{user?.role}</Badge>
          </CardHeader>
          <CardContent>
            {profileSuccess && (
              <div className="mb-4 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Profile updated successfully.
              </div>
            )}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input label="Email Address" type="email" value={user?.email || ''} disabled helperText="Email cannot be altered directly." />
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
              <Button type="submit" isLoading={isUpdatingProfile} className="w-full">
                Save Profile Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <Shield className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {passSuccess && (
              <div className="mb-4 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Password changed successfully!
              </div>
            )}
            {passError && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500" />
                {passError}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <Input
                label="Current Password"
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <Input
                label="New Password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 9 chars, uppercase, lowercase, special"
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />
              <Button type="submit" variant="secondary" isLoading={isChangingPass} className="w-full mt-2">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

