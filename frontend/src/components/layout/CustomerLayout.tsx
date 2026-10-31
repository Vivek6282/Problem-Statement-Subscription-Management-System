import { useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  LayoutDashboard,
  Repeat,
  FileText,
  CreditCard,
  FileCheck,
  UserRound,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { BrightloopBrand } from './BrightloopBrand'
import '@/styles/brightloop.css'

const links = [
  { label: 'Overview', path: '/portal', icon: LayoutDashboard },
  { label: 'Subscriptions', path: '/subscriptions', icon: Repeat },
  { label: 'Quotations', path: '/quotations', icon: FileCheck },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Payments', path: '/payments', icon: CreditCard },
]

export function CustomerLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const title =
    links.find((link) => location.pathname.startsWith(link.path))?.label ||
    'Account settings'
  const initial = (
    user?.first_name?.[0] ||
    user?.email?.[0] ||
    'U'
  ).toUpperCase()
  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="bl-theme bl-customer-shell">
      <a className="bl-skip-link" href="#customer-main">
        Skip to content
      </a>
      <aside className="bl-sidebar">
        <BrightloopBrand />
        <div className="bl-sidebar-intro">
          <span className="bl-eyebrow">YOUR WORKSPACE</span>
          <p>A little more clarity.</p>
        </div>
        <nav aria-label="Customer navigation">
          {links.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
            >
              <Icon size={18} strokeWidth={1.6} />
              {label}
              <ChevronRight size={14} />
            </NavLink>
          ))}
        </nav>
        <div className="bl-sidebar-bottom">
          <Link className="bl-account-link" to="/profile">
            <span className="bl-avatar">{initial}</span>
            <span>
              {user?.full_name || user?.email}
              <small>Personal account</small>
            </span>
          </Link>
          <button
            className="bl-signout"
            onClick={handleLogout}
            disabled={signingOut}
          >
            <LogOut size={16} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      <div className="bl-customer-body">
        <header className="bl-customer-header">
          <div className="bl-mobile-brand">
            <BrightloopBrand />
          </div>
          <div className="bl-breadcrumb">
            Your workspace <span>/</span> <strong>{title}</strong>
          </div>
          <div className="bl-header-actions">
            <Link to="/" className="bl-home-link">
              Back to home <ArrowUpRight size={14} />
            </Link>
            <Link
              className="bl-avatar"
              to="/profile"
              aria-label="Account settings"
            >
              {initial}
            </Link>
            <button
              type="button"
              className="bl-menu-toggle"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="customer-mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>
        {menuOpen && (
          <nav
            id="customer-mobile-nav"
            className="bl-mobile-nav"
            aria-label="Mobile customer navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenuOpen(false)
            }}
          >
            {[
              ...links,
              { label: 'Account settings', path: '/profile', icon: UserRound },
            ].map(({ label, path, icon: Icon }) => (
              <NavLink key={path} to={path} onClick={() => setMenuOpen(false)}>
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
            <button onClick={handleLogout} disabled={signingOut}>
              <LogOut size={17} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </nav>
        )}
        <main id="customer-main" className="bl-customer-content">
          <Outlet />
        </main>
        <footer className="bl-customer-footer">
          <span>Brightloop. Keep it simple.</span>
          <Link to="/profile">
            Account settings <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>
    </div>
  )
}
