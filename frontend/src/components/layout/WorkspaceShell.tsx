import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LogOut, Menu, UserRound, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { BrightloopBrand } from './BrightloopBrand'
import '@/styles/brightloop.css'

export interface WorkspaceLink {
  label: string
  path: string
  icon: LucideIcon
}

export interface WorkspaceGroup {
  label?: string
  items: WorkspaceLink[]
}

interface WorkspaceShellProps {
  /** Breadcrumb root, e.g. "Your workspace". */
  rootLabel: string
  intro: { eyebrow: string; text: string }
  groups: WorkspaceGroup[]
  accountNote: string
  headerActions?: ReactNode
  className?: string
}

/** The shared frame for the customer portal and the staff workspace. */
export function WorkspaceShell({
  rootLabel,
  intro,
  groups,
  accountNote,
  headerActions,
  className = '',
}: WorkspaceShellProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const links = groups.flatMap((group) => group.items)
  const title =
    links.find((link) => location.pathname.startsWith(link.path))?.label || 'Account settings'
  const initial = (user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className={`bl-theme bl-customer-shell ${className}`}>
      <a className="bl-skip-link" href="#workspace-main">
        Skip to content
      </a>

      <aside className="bl-sidebar">
        <BrightloopBrand />
        <div className="bl-sidebar-intro">
          <span className="bl-eyebrow">{intro.eyebrow}</span>
          <p>{intro.text}</p>
        </div>
        <nav aria-label="Workspace navigation">
          {groups.map((group, index) => (
            <div className="bl-nav-group" key={group.label ?? index}>
              {group.label && <p className="bl-nav-group-label">{group.label}</p>}
              {group.items.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => (isActive ? 'is-active' : '')}
                >
                  <Icon size={18} strokeWidth={1.6} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="bl-sidebar-bottom">
          <Link className="bl-account-link" to="/profile">
            <span className="bl-avatar">{initial}</span>
            <span>
              {user?.full_name || user?.email}
              <small>{accountNote}</small>
            </span>
          </Link>
          <button className="bl-signout" type="button" onClick={handleLogout} disabled={signingOut}>
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
            {rootLabel} <span>/</span> <strong>{title}</strong>
          </div>
          <div className="bl-header-actions">
            {headerActions}
            <Link to="/" className="bl-home-link">
              Back to home <ArrowUpRight size={14} />
            </Link>
            <Link className="bl-avatar" to="/profile" aria-label="Account settings">
              {initial}
            </Link>
            <button
              type="button"
              className="bl-menu-toggle"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="workspace-mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        {menuOpen && (
          <nav
            id="workspace-mobile-nav"
            className="bl-mobile-nav"
            aria-label="Mobile navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenuOpen(false)
            }}
          >
            {[...links, { label: 'Account settings', path: '/profile', icon: UserRound }].map(
              ({ label, path, icon: Icon }) => (
                <NavLink key={path} to={path} onClick={() => setMenuOpen(false)}>
                  <Icon size={17} />
                  {label}
                </NavLink>
              ),
            )}
            <button type="button" onClick={handleLogout} disabled={signingOut}>
              <LogOut size={17} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </nav>
        )}

        <main id="workspace-main" className="bl-customer-content">
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
