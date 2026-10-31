import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Repeat,
  FileText,
  CreditCard,
} from 'lucide-react'
import { BrightloopBrand } from '@/components/layout/BrightloopBrand'
import '@/styles/brightloop.css'

export function AuthLayout({
  children,
  mode = 'login',
}: {
  children: ReactNode
  mode?: 'login' | 'register' | 'reset'
}) {
  return (
    <div className="bl-theme bl-auth">
      <aside className="bl-auth-story">
        <BrightloopBrand />
        <div className="bl-auth-story-content">
          <span className="bl-eyebrow">A LITTLE LESS TO MANAGE</span>
          <h2>
            Your subscriptions.
            <br />
            Your space.
            <br />
            <em>A simpler day.</em>
          </h2>
          <p>
            A clear view of your plans, payments, and everything in between. All
            together in Brightloop.
          </p>
          <div className="bl-auth-benefits">
            <div>
              <Repeat size={19} />
              <span>Subscriptions that fit your rhythm.</span>
            </div>
            <div>
              <FileText size={19} />
              <span>Every invoice, right where you need it.</span>
            </div>
            <div>
              <CreditCard size={19} />
              <span>A clear picture of your payments.</span>
            </div>
          </div>
        </div>
        <div className="bl-auth-story-footer">
          <span>Less busywork. More breathing room.</span>
          <ArrowUpRight size={22} />
        </div>
      </aside>
      <main className="bl-auth-main">
        <div className="bl-auth-top">
          <Link to="/" className="bl-text-link">
            <ArrowLeft size={15} /> Back to home
          </Link>
          <span>
            {mode === 'register' ? 'Already a member?' : 'New to Brightloop?'}{' '}
            <Link to={mode === 'register' ? '/login' : '/register'}>
              {mode === 'register' ? 'Sign in' : 'Create an account'}{' '}
              <ArrowUpRight size={13} />
            </Link>
          </span>
        </div>
        <div className={`bl-auth-form bl-auth-form-${mode}`}>{children}</div>
        <footer className="bl-auth-footer">
          A brighter way to manage your subscriptions.
        </footer>
      </main>
    </div>
  )
}
