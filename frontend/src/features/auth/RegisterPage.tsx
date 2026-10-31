import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export const RegisterPage: React.FC = () => {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    company_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    password_confirm: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.')
      return
    }

    if (formData.password.length < 9) {
      setError('Password must be at least 9 characters long.')
      return
    }

    setIsLoading(true)
    try {
      await register(formData)
      navigate('/portal')
    } catch (err: any) {
      const resp = err?.response?.data
      if (resp) {
        const firstErrKey = Object.keys(resp)[0]
        const errVal = Array.isArray(resp[firstErrKey]) ? resp[firstErrKey][0] : resp[firstErrKey]
        setError(`${firstErrKey}: ${errVal}`)
      } else {
        setError('Registration failed. Please check the details and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-primary/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Customer Account</h1>
          <p className="text-xs text-slate-500 mt-1">Get started with self-service subscription management</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              name="first_name"
              required
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Alice"
            />
            <Input
              label="Last Name"
              name="last_name"
              required
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Smith"
            />
          </div>

          <Input
            label="Company Name"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            placeholder="Acme Innovations Ltd"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Work Email"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="alice@company.com"
            />
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Password"
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 9 characters"
            />
            <Input
              label="Confirm Password"
              type="password"
              name="password_confirm"
              required
              value={formData.password_confirm}
              onChange={handleChange}
              placeholder="Confirm password"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Password Policy Requirements:</p>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>At least 9 characters long</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Contains uppercase (A-Z) and lowercase (a-z) letters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Contains special character (!@#$%^&*)</span>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading}>
            Complete Registration
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  )
}

