import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CreditCard, FileText, Repeat } from 'lucide-react'
import './auth.css'

function AuthBrand() {
  return (
    <Link className="auth-brand" to="/" aria-label="Brightloop home">
      <span className="auth-brand-mark" aria-hidden="true">
        <Repeat size={15} strokeWidth={2.4} />
      </span>
      brightloop<span className="auth-brand-period">.</span>
    </Link>
  )
}

const benefits = [
  { icon: Repeat, label: 'Subscriptions that fit your rhythm.' },
  { icon: FileText, label: 'Every invoice, right where you need it.' },
  { icon: CreditCard, label: 'A clear picture of your payments.' },
]

export function AuthLayout({
  children,
  mode = 'login',
}: {
  children: ReactNode
  mode?: 'login' | 'register' | 'reset'
}) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <AuthBrand />
        <div className="auth-story">
          <h2>
            Your subscriptions.
            <br />
            Your space.
            <br />
            <em>A simpler day.</em>
          </h2>
          <p>
            A clear view of your plans, payments, and everything in between.
            All together in Brightloop.
          </p>
          <ul className="auth-benefits">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-aside-footer">Less busywork. More breathing room.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-top">
          <AuthBrand />
          <Link to="/" className="auth-back" aria-label="Back to home">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Back to home</span>
          </Link>
        </div>
        <div className={`auth-panel auth-panel-${mode}`}>{children}</div>
      </main>
    </div>
  )
}
