import React, { useState, useEffect } from 'react'
import {
  UserPlus,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Edit2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { User, Role } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const StaffPage: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'STAFF'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  // Create Staff modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'STAFF' as Role,
    password: '',
    password_confirm: '',
  })
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({})
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Edit Staff modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    role: 'STAFF' as Role,
  })
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({})
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Deactivate / Reactivate modal state
  const [actionTargetUser, setActionTargetUser] = useState<User | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/users/')
      setUsers(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
    let pwd = ''
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCreateForm((prev) => ({
      ...prev,
      password: pwd,
      password_confirm: pwd,
    }))
  }

  const openCreateModal = () => {
    setCreateForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'STAFF',
      password: '',
      password_confirm: '',
    })
    setCreateFieldErrors({})
    setCreateFormError(null)
    setIsCreateModalOpen(true)
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateFieldErrors({})
    setCreateFormError(null)

    if (createForm.password !== createForm.password_confirm) {
      setCreateFieldErrors({ password_confirm: 'Passwords do not match.' })
      setIsCreating(false)
      return
    }

    try {
      const payload = {
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        email: createForm.email.trim().toLowerCase(),
        phone: createForm.phone.trim(),
        role: createForm.role,
        password: createForm.password,
      }
      await api.post('/users/', payload)
      setFeedback({
        type: 'success',
        message: `Account for ${payload.first_name} ${payload.last_name} (${payload.email}) created successfully with role ${payload.role}.`,
      })
      setIsCreateModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        const errors: Record<string, string> = {}
        let genericMsg: string | null = null
        Object.entries(data).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            errors[k] = v.join(' ')
          } else if (typeof v === 'string') {
            if (k === 'detail' || k === 'non_field_errors') {
              genericMsg = v
            } else {
              errors[k] = v
            }
          }
        })
        setCreateFieldErrors(errors)
        setCreateFormError(genericMsg || (Object.keys(errors).length === 0 ? 'Failed to create staff account.' : null))
      } else {
        setCreateFormError('An unexpected server error occurred.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const openEditModal = (u: User) => {
    setEditingUser(u)
    setEditForm({
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      phone: u.phone || '',
      role: u.role,
    })
    setEditFieldErrors({})
    setEditFormError(null)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setIsSavingEdit(true)
    setEditFieldErrors({})
    setEditFormError(null)

    try {
      const payload = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
      }
      await api.patch(`/users/${editingUser.id}/`, payload)
      setFeedback({
        type: 'success',
        message: `User profile for ${editingUser.email} updated successfully.`,
      })
      setIsEditModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        const errors: Record<string, string> = {}
        let genericMsg: string | null = null
        Object.entries(data).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            errors[k] = v.join(' ')
          } else if (typeof v === 'string') {
            if (k === 'detail' || k === 'non_field_errors') {
              genericMsg = v
            } else {
              errors[k] = v
            }
          }
        })
        setEditFieldErrors(errors)
        setEditFormError(genericMsg || (Object.keys(errors).length === 0 ? 'Failed to update user.' : null))
      } else {
        setEditFormError('An unexpected server error occurred.')
      }
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!actionTargetUser) return
    setIsTogglingStatus(true)
    try {
      if (actionTargetUser.is_active) {
        await api.post(`/users/${actionTargetUser.id}/deactivate/`)
        setFeedback({
          type: 'info',
          message: `User ${actionTargetUser.email} has been deactivated. All active sessions have been terminated.`,
        })
      } else {
        await api.post(`/users/${actionTargetUser.id}/reactivate/`)
        setFeedback({
          type: 'success',
          message: `User ${actionTargetUser.email} has been reactivated.`,
        })
      }
      setActionTargetUser(null)
      fetchUsers()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.is_active || 'Failed to update user status.'
      setFeedback({ type: 'error', message: typeof msg === 'string' ? msg : JSON.stringify(msg) })
      setActionTargetUser(null)
    } finally {
      setIsTogglingStatus(false)
    }
  }

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const nameMatch =
      `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const roleMatch = roleFilter === 'ALL' || u.role === roleFilter
    const statusMatch =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.is_active) ||
      (statusFilter === 'INACTIVE' && !u.is_active)
    return nameMatch && roleMatch && statusMatch
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff & Access Control</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage system administrators, billing staff, permissions, and security lifecycle
          </p>
        </div>
        <div>
          {isAdmin ? (
            <Button onClick={openCreateModal}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add Staff Member
            </Button>
          ) : (
            <div title="Admin permission required to add staff">
              <Button disabled variant="outline">
                <UserPlus className="w-4 h-4 mr-1.5" />
                Add Staff Member
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Permission alert if not admin */}
      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Only Administrators have permissions to manage staff accounts and roles.</span>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start justify-between gap-3 ${
            feedback.type === 'info'
              ? 'bg-blue-50 border border-blue-200 text-blue-900'
              : feedback.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-900'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'info' && <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name or email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                roleFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                roleFilter === 'ADMIN' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setRoleFilter('STAFF')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                roleFilter === 'STAFF' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Staff
            </button>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'INACTIVE' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title={searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'No Matching Staff' : 'No Staff Members'}
          description="Create your first internal staff or administrator account."
          actionLabel={isAdmin && !searchQuery && roleFilter === 'ALL' && statusFilter === 'ALL' ? 'Add Staff Member' : undefined}
          onAction={isAdmin ? openCreateModal : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>
                            {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : 'Unnamed'}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-semibold">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'neutral'}>
                          <Shield className="w-3 h-3 mr-1 inline" />
                          {u.role === 'ADMIN' ? 'Administrator' : 'Billing Staff'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.is_active ? 'success' : 'danger'}>
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {u.last_login ? formatDate(u.last_login) : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {formatDate(u.date_joined)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Staff Member"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {u.is_active ? (
                              <button
                                disabled={isCurrent}
                                onClick={() => setActionTargetUser(u)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isCurrent
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={isCurrent ? 'You cannot deactivate yourself' : 'Deactivate user'}
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setActionTargetUser(u)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Reactivate user"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Read-only</span>
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
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Staff Member"
        description="Add a new administrator or billing staff account with dedicated credentials."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {createFormError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {createFormError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="First Name"
                required
                value={createForm.first_name}
                onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                placeholder="Jane"
              />
              {createFieldErrors.first_name && (
                <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.first_name}</p>
              )}
            </div>
            <div>
              <Input
                label="Last Name"
                required
                value={createForm.last_name}
                onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                placeholder="Doe"
              />
              {createFieldErrors.last_name && (
                <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.last_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Email Address"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="jane.doe@brightloop.io"
              />
              {createFieldErrors.email && (
                <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.email}</p>
              )}
            </div>
            <div>
              <Select
                label="Assigned System Role"
                value={createForm.role}
                onChange={(e: any) => setCreateForm({ ...createForm, role: e.target.value })}
                options={[
                  { label: 'Billing Staff (Catalog & Ops Read/Write)', value: 'STAFF' },
                  { label: 'Administrator (Full Platform Control)', value: 'ADMIN' },
                ]}
              />
              {createFieldErrors.role && (
                <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.role}</p>
              )}
            </div>
          </div>

          <div>
            <Input
              label="Phone Number (Optional)"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Initial Password</label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <KeyRound className="w-3 h-3" />
                Auto-generate secure password
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label=""
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Enter initial password"
                />
                {createFieldErrors.password && (
                  <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.password}</p>
                )}
              </div>
              <div>
                <Input
                  label=""
                  type="password"
                  required
                  value={createForm.password_confirm}
                  onChange={(e) => setCreateForm({ ...createForm, password_confirm: e.target.value })}
                  placeholder="Confirm initial password"
                />
                {createFieldErrors.password_confirm && (
                  <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.password_confirm}</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Staff Member"
        description={`Modify profile and system permissions for ${editingUser?.email}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editFormError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {editFormError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="First Name"
                required
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              />
              {editFieldErrors.first_name && (
                <p className="text-[11px] text-red-600 mt-1">{editFieldErrors.first_name}</p>
              )}
            </div>
            <div>
              <Input
                label="Last Name"
                required
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              />
              {editFieldErrors.last_name && (
                <p className="text-[11px] text-red-600 mt-1">{editFieldErrors.last_name}</p>
              )}
            </div>
          </div>

          <div>
            <Input
              label="Phone Number"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>

          <div>
            <Select
              label="System Role"
              value={editForm.role}
              disabled={currentUser?.id === editingUser?.id}
              onChange={(e: any) => setEditForm({ ...editForm, role: e.target.value })}
              options={[
                { label: 'Billing Staff (Catalog & Ops Read/Write)', value: 'STAFF' },
                { label: 'Administrator (Full Platform Control)', value: 'ADMIN' },
              ]}
            />
            {currentUser?.id === editingUser?.id && (
              <p className="text-[11px] text-slate-500 mt-1">
                You cannot alter your own administrative role.
              </p>
            )}
            {editFieldErrors.role && (
              <p className="text-[11px] text-red-600 mt-1">{editFieldErrors.role}</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate / Reactivate Confirmation Modal */}
      <Modal
        isOpen={!!actionTargetUser}
        onClose={() => setActionTargetUser(null)}
        title={actionTargetUser?.is_active ? 'Deactivate Staff Account' : 'Reactivate Staff Account'}
        description={`Confirm lifecycle change for ${actionTargetUser?.email}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {actionTargetUser?.is_active ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Immediate Session Termination</p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Deactivating this staff member will immediately terminate all their active login sessions and prevent them from accessing the administrative portal or making any operational modifications.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Restore Portal Access</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Reactivating this account will permit the user to log in again with their existing credentials and resume their assigned role responsibilities.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Are you sure you want to {actionTargetUser?.is_active ? 'deactivate' : 'reactivate'}{' '}
            <strong className="text-slate-900">{actionTargetUser?.email}</strong>?
          </p>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setActionTargetUser(null)}>
              Cancel
            </Button>
            <Button
              variant={actionTargetUser?.is_active ? 'danger' : 'primary'}
              isLoading={isTogglingStatus}
              onClick={handleToggleStatus}
            >
              {actionTargetUser?.is_active ? 'Deactivate Account' : 'Reactivate Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

