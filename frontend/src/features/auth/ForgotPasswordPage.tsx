import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await api.post('/auth/password-reset-request/', { email })
      setMessage(
        res.data.message ||
          'If an account exists, a reset link has been dispatched.',
      )
      setIsSubmitted(true)
    } catch {
      setMessage('If an account exists, a reset link has been dispatched.')
      setIsSubmitted(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout mode="reset">
      <span className="auth-eyebrow">Let’s get you back in</span>
      <h1>
        A fresh start
        <br />
        <em>for your password.</em>
      </h1>
      <p className="auth-lede">
        Enter your email and we’ll send you reset instructions.
      </p>
      {isSubmitted ? (
        <div className="auth-success" role="status">
          <CheckCircle2 size={24} aria-hidden="true" />
          <h2>Check your inbox.</h2>
          <p>{message}</p>
          <Link className="auth-link" to="/login">
            <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Button type="submit" className="auth-submit" isLoading={isLoading}>
            Send reset link <ArrowRight size={16} aria-hidden="true" />
          </Button>
          <Link className="auth-link" to="/login">
            <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
