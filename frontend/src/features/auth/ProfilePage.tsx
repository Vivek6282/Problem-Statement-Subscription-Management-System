import React, { useState } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import '@/styles/brightloop.css'

export const ProfilePage: React.FC = () => {
  const { user, refetchUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [phone, setPhone] = useState(user?.phone || '')

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

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
    setProfileError(null)
    try {
      await api.patch('/auth/me/', {
        first_name: firstName,
        last_name: lastName,
        phone,
      })
      await refetchUser()
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err: any) {
      setProfileError(err?.response?.data?.detail || 'We couldn’t save your details. Please try again.')
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

  const role = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ''
  const name = user?.first_name || user?.full_name || 'there'

  return (
    <div className="bl-portal">
      <div className="bl-portal-heading">
        <div>
          <span className="bl-eyebrow">Account settings</span>
          <h1>
            Your profile, {name}
            <span>.</span>
          </h1>
          <p>Keep your details and password up to date. Changes apply right away.</p>
        </div>
        {role && <span className="bl-section-count">{role} account</span>}
      </div>

      <div className="bl-settings">
        {/* 01 Personal details */}
        <section className="bl-settings-row" aria-labelledby="details-heading">
          <div className="bl-settings-intro">
            <span className="bl-eyebrow">01 / Personal details</span>
            <h2 id="details-heading">About you.</h2>
            <p>How your name and contact number appear across Brightloop.</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="bl-settings-fields">
            <div className="bl-readonly">
              <span>Email address</span>
              <strong>{user?.email}</strong>
              <small>Your sign-in email can’t be changed here.</small>
            </div>
            <div className="bl-field-row">
              <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
              <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </div>
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              autoComplete="tel"
            />

            {profileError && (
              <div className="bl-notice bl-notice-error" role="alert">
                <AlertCircle size={18} />
                <span>{profileError}</span>
              </div>
            )}
            <div className="bl-settings-actions">
              <Button type="submit" isLoading={isUpdatingProfile}>
                Save changes
              </Button>
              {profileSuccess && (
                <span className="bl-saved" role="status">
                  <Check size={15} /> Saved
                </span>
              )}
            </div>
          </form>
        </section>

        {/* 02 Security */}
        <section className="bl-settings-row" aria-labelledby="security-heading">
          <div className="bl-settings-intro">
            <span className="bl-eyebrow">02 / Security</span>
            <h2 id="security-heading">Your password.</h2>
            <p>Use at least 9 characters, with uppercase and lowercase letters and a special character.</p>
          </div>

          <form onSubmit={handleChangePassword} className="bl-settings-fields">
            <Input
              label="Current password"
              type="password"
              required
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
            <div className="bl-field-row">
              <Input
                label="New password"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Confirm new password"
                type="password"
                required
                autoComplete="new-password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />
            </div>

            {passError && (
              <div className="bl-notice bl-notice-error" role="alert">
                <AlertCircle size={18} />
                <span>{passError}</span>
              </div>
            )}
            <div className="bl-settings-actions">
              <Button type="submit" isLoading={isChangingPass}>
                Update password
              </Button>
              {passSuccess && (
                <span className="bl-saved" role="status">
                  <Check size={15} /> Password updated
                </span>
              )}
            </div>
          </form>
        </section>
      </div>

      <div className="bl-portal-endnote">
        <span>Everything in its place.</span>
        <p>Keep your contact details current for a smoother billing experience.</p>
      </div>
    </div>
  )
}
