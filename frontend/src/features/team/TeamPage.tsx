import React, { useState, useEffect } from 'react'
import { UserCog, Plus, Search, Filter, UserX, UserCheck, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { formatApiError } from '@/lib/apiErrors'
import type { User } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

type RoleFilter = 'TEAM' | 'ADMIN' | 'STAFF' | 'CUSTOMER'

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'STAFF',
  password: '',
}

const roleBadge: Record<string, 'danger' | 'info' | 'success'> = {
  ADMIN: 'danger',
  STAFF: 'info',
  CUSTOMER: 'success',
}

/** Admin-only screen for adding staff and admin accounts and switching access on or off. */
export const TeamPage: React.FC = () => {
  // Admin-only access is enforced by <RoleRoute allow="admin"> in App.tsx and by the API.
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('TEAM')
  const [listError, setListError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchUsers = async () => {
    setIsLoading(true)
    setListError(null)
    try {
      // The API filters one role at a time, so "Admins & Staff" asks for both
      // instead of hiding customers client-side (which would push staff off the first page).
      const roles = roleFilter === 'TEAM' ? ['ADMIN', 'STAFF'] : [roleFilter]
      const responses = await Promise.all(
        roles.map((role) => {
          const params = new URLSearchParams({ role })
          if (search) params.append('search', search)
          return api.get(`/auth/users/?${params.toString()}`)
        }),
      )
      setUsers(responses.flatMap((res) => (res.data.results || res.data) as User[]))
    } catch (err) {
      setListError(formatApiError(err, 'Could not load accounts. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [search, roleFilter])

  const openCreateModal = () => {
    setFormData(emptyForm)
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsSaving(true)
    try {
      await api.post('/auth/users/', formData)
      setIsModalOpen(false)
      fetchUsers()
    } catch (err) {
      setFormError(formatApiError(err, 'Could not create the account. Please check the details.'))
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActive = async (u: User) => {
    const action = u.is_active ? 'Deactivate' : 'Reactivate'
    if (!window.confirm(`${action} ${u.email}?`)) return
    try {
      await api.patch(`/auth/users/${u.id}/`, { is_active: !u.is_active })
      fetchUsers()
    } catch (err) {
      setListError(formatApiError(err, `Could not ${action.toLowerCase()} this account.`))
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Team &amp; Access</h1>
          <p className="text-xs text-slate-500 mt-1">Add internal staff and control who can sign in</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Staff Member
        </Button>
      </div>

      {/* Filters and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              aria-label="Search accounts"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              aria-label="Filter by role"
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="TEAM">Admins &amp; Staff</option>
              <option value="ADMIN">Admins Only</option>
              <option value="STAFF">Staff Only</option>
              <option value="CUSTOMER">Customers</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {listError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-medium" role="alert">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{listError}</span>
        </div>
      )}

      {/* Accounts Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UserCog className="w-6 h-6" />}
          title="No Accounts Found"
          description={search ? `No account matched "${search}".` : 'Add your first staff member to share the workload.'}
          actionLabel="Add Staff Member"
          onAction={openCreateModal}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {u.full_name || '-'} {isSelf && <span className="text-[11px] font-medium text-slate-400">(you)</span>}
                        </div>
                        {u.phone && <div className="text-[11px] text-slate-500">{u.phone}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={roleBadge[u.role] || 'neutral'}>{u.role}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{formatDate(u.date_joined)}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.is_active ? 'success' : 'neutral'}>
                          {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isSelf && (
                          <div className="flex items-center justify-end gap-1.5">
                            {u.is_active ? (
                              <button
                                onClick={() => toggleActive(u)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Deactivate account"
                                aria-label={`Deactivate ${u.email}`}
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleActive(u)}
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Reactivate account"
                                aria-label={`Reactivate ${u.email}`}
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Staff Member"
        description="Only administrators can create internal accounts. Customers sign up themselves."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-medium" role="alert">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="First Name" name="first_name" required value={formData.first_name} onChange={handleChange} />
            <Input label="Last Name" name="last_name" required value={formData.last_name} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Work Email" type="email" name="email" required value={formData.email} onChange={handleChange} />
            <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} />
          </div>
          <Select
            label="Role"
            name="role"
            required
            value={formData.role}
            onChange={handleChange}
            options={[
              { label: 'Staff — day-to-day billing work', value: 'STAFF' },
              { label: 'Admin — full system control', value: 'ADMIN' },
            ]}
          />
          <Input
            label="Temporary Password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={handleChange}
            helperText="At least 9 characters, with uppercase and lowercase letters and a special character."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
