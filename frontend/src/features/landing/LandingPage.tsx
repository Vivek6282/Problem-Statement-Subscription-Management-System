import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleCheck,
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  Menu,
  Repeat,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import './landing.css'

const features = [
  {
    icon: Repeat,
    number: '01',
    title: 'Subscriptions, simplified.',
    description:
      'Create flexible plans, manage renewals, and keep every customer’s subscription in one place.',
    detail: 'Built around your billing cycle',
  },
  {
    icon: FileText,
    number: '02',
    title: 'A smoother way to bill.',
    description:
      'Turn quotations into subscriptions. Keep invoices, taxes, and discounts connected from the start.',
    detail: 'From first quote to final receipt',
  },
  {
    icon: Layers,
    number: '03',
    title: 'See the bigger picture.',
    description:
      'Understand recurring revenue, follow payments, and give your team a clear view of what’s next.',
    detail: 'Less guesswork. More clarity.',
  },
]

const steps = [
  {
    title: 'Make it yours.',
    description:
      'Add your products and choose the pricing, billing intervals, and tax rules that work for your business.',
    label: 'Your plan',
    name: 'Studio membership',
    value: '$49.00',
    suffix: '/ month',
    rows: [
      ['Billing interval', 'Monthly'],
      ['Renewal', 'Automatic'],
      ['Plan status', 'Active'],
    ],
    footer: 'A little structure. A lot less admin.',
  },
  {
    title: 'Bring your customers in.',
    description:
      'Create a customer account, prepare a quotation, and turn an accepted quote into an ongoing subscription.',
    label: 'Your subscription',
    name: 'Acme Studio',
    value: 'Monthly',
    suffix: 'subscription',
    rows: [
      ['Plan', 'Studio membership'],
      ['Customer access', 'Personal portal'],
      ['Subscription status', 'Active'],
    ],
    footer: 'Every customer. One clear view.',
  },
  {
    title: 'Let your billing flow.',
    description:
      'Generate recurring invoices, track incoming payments, and stay on top of every billing cycle from your workspace.',
    label: 'Your invoice',
    name: 'Invoice #INV-0084',
    value: '$49.00',
    suffix: 'received',
    rows: [
      ['Customer', 'Acme Studio'],
      ['Billing period', 'Monthly'],
      ['Payment status', 'Paid'],
    ],
    footer: 'Everything accounted for.',
  },
]

const previewRows = [
  {
    initials: 'AS',
    name: 'Acme Studio',
    plan: 'Studio plan',
    amount: '$249.00',
    date: 'Nov 01, 2026',
  },
  {
    initials: 'FL',
    name: 'Forma Labs',
    plan: 'Growth plan',
    amount: '$599.00',
    date: 'Nov 03, 2026',
  },
  {
    initials: 'NW',
    name: 'Northwind',
    plan: 'Studio plan',
    amount: '$249.00',
    date: 'Nov 05, 2026',
  },
]

function Brand() {
  return (
    <span className="lp-brand">
      <span className="lp-brand-mark" aria-hidden="true">
        <Repeat size={19} strokeWidth={2.3} />
      </span>
      brightloop<span className="lp-brand-period">.</span>
    </span>
  )
}

function WorkspacePreview() {
  return (
    <div className="lp-preview" id="preview">
      <div className="lp-preview-caption">
        <span>
          <span className="lp-status-dot" /> A little clarity goes a long way.
        </span>
        <span>WORKSPACE PREVIEW · SAMPLE DATA</span>
      </div>
      <div className="lp-workspace">
        <aside
          className="lp-preview-sidebar"
          aria-label="Sample workspace navigation"
        >
          <Brand />
          <div className="lp-sample-team">
            <span>S</span>
            <div>
              Studio workspace<small>Your business, together</small>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="lp-sidebar-label">WORKSPACE</div>
          <div className="lp-preview-nav">
            {[
              { icon: LayoutDashboard, name: 'Overview' },
              { icon: Repeat, name: 'Subscriptions' },
              { icon: Users, name: 'Customers' },
              { icon: FileText, name: 'Invoices' },
              { icon: CreditCard, name: 'Payments' },
            ].map(({ icon: Icon, name }, index) => (
              <div key={name} className={index === 0 ? 'is-selected' : ''}>
                <Icon size={16} />
                <span>{name}</span>
                {index === 0 && <span className="lp-nav-dot" />}
              </div>
            ))}
          </div>
          <div className="lp-sidebar-bottom">
            <span className="lp-avatar">JD</span>
            <div>
              Jamie Davis<small>Workspace admin</small>
            </div>
          </div>
        </aside>
        <div className="lp-preview-main">
          <div className="lp-preview-topbar">
            <span>
              Workspace <span>/</span> <strong>Overview</strong>
            </span>
            <span className="lp-preview-date">
              October 2026 <ChevronDown size={12} />
            </span>
          </div>
          <div className="lp-preview-content">
            <div className="lp-preview-heading">
              <div>
                <h3>Your business, at a glance.</h3>
                <p>A clear view of everything that keeps you growing.</p>
              </div>
              <span className="lp-preview-live">
                <span className="lp-status-dot" /> Overview
              </span>
            </div>
            <div className="lp-metrics">
              <div>
                <span>Monthly recurring revenue</span>
                <div className="lp-metric-value">
                  $24,580
                  <span>
                    <ArrowUpRight size={13} /> 12.8%
                  </span>
                </div>
                <small>vs. last month</small>
              </div>
              <div>
                <span>Active subscriptions</span>
                <div className="lp-metric-value">
                  148<span>+16</span>
                </div>
                <small>Growing with you</small>
              </div>
              <div>
                <span>Collected this month</span>
                <div className="lp-metric-value">
                  $22,840
                  <span>
                    <Check size={13} /> 93%
                  </span>
                </div>
                <small>Of total invoiced</small>
              </div>
            </div>
            <div className="lp-chart-section">
              <div className="lp-chart-heading">
                <strong>Revenue overview</strong>
                <span>
                  <i /> Recurring revenue
                </span>
              </div>
              <div
                className="lp-chart"
                role="img"
                aria-label="Illustrative recurring revenue chart showing growth from May to October"
              >
                <div className="lp-chart-labels">
                  <span>$25k</span>
                  <span>$15k</span>
                  <span>$5k</span>
                </div>
                <div className="lp-chart-plot">
                  <svg
                    viewBox="0 0 700 130"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="lp-revenue-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#a9c4ae"
                          stopOpacity=".38"
                        />
                        <stop
                          offset="100%"
                          stopColor="#a9c4ae"
                          stopOpacity=".02"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 111 C45 111 51 91 100 94 S160 72 200 78 S260 47 300 57 S365 38 400 42 S462 22 500 28 S560 17 600 19 S663 5 700 6 L700 130 L0 130 Z"
                      fill="url(#lp-revenue-fill)"
                    />
                    <path
                      d="M0 111 C45 111 51 91 100 94 S160 72 200 78 S260 47 300 57 S365 38 400 42 S462 22 500 28 S560 17 600 19 S663 5 700 6"
                      fill="none"
                      stroke="#426b50"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div className="lp-chart-months">
                    {['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((month) => (
                      <span key={month}>{month}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="lp-table-heading">
              <strong>Recent subscriptions</strong>
              <span>3 subscriptions</span>
            </div>
            <div className="lp-table-scroll">
              <table className="lp-preview-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Next invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.name}>
                      <td>
                        <div className="lp-customer">
                          <span>{row.initials}</span>
                          <div>
                            {row.name}
                            <small>{row.plan}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="lp-active-badge">
                          <span className="lp-status-dot" /> Active
                        </span>
                      </td>
                      <td>
                        {row.amount}
                        <small>/ month</small>
                      </td>
                      <td>{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div className="lp-preview-footnote">
        <ShieldCheck size={14} />
        <span>Subscriptions. Invoices. Payments. All in good order.</span>
      </div>
    </div>
  )
}

export const LandingPage = () => {
  const { isAuthenticated, user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [copyrightYear] = useState(() => new Date().getFullYear())
  const destination = isAuthenticated
    ? user?.role === 'CUSTOMER'
      ? '/portal'
      : '/dashboard'
    : '/register'
  const actionLabel = isAuthenticated
    ? user?.role === 'CUSTOMER'
      ? 'Open portal'
      : 'Open dashboard'
    : 'Get started'
  const step = steps[activeStep]

  return (
    <div className="landing-page">
      <a className="lp-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Link to="/" aria-label="Brightloop home">
            <Brand />
          </Link>
          <nav className="lp-desktop-nav" aria-label="Main navigation">
            <a href="#features">Why Brightloop</a>
            <a href="#pipeline">How it works</a>
            <a href="#preview">
              The workspace <ArrowUpRight size={13} />
            </a>
          </nav>
          <div className="lp-header-actions">
            {!isAuthenticated && (
              <Link className="lp-sign-in" to="/login">
                Sign in
              </Link>
            )}
            <Link className="lp-button lp-button-small" to={destination}>
              {actionLabel}
              <ArrowUpRight size={15} />
            </Link>
            <button
              className="lp-menu-toggle"
              type="button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="lp-mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            className="lp-mobile-nav"
            id="lp-mobile-nav"
            aria-label="Mobile navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenuOpen(false)
            }}
          >
            <a href="#features" onClick={() => setMenuOpen(false)}>
              Why Brightloop
            </a>
            <a href="#pipeline" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#preview" onClick={() => setMenuOpen(false)}>
              The workspace
            </a>
            {!isAuthenticated && <Link to="/login">Sign in</Link>}
          </nav>
        )}
      </header>
      <main id="main-content">
        <section
          className="lp-container lp-hero"
          id="overview"
          aria-labelledby="hero-title"
        >
          <div className="lp-eyebrow">
            <span className="lp-status-dot" /> LESS BUSYWORK. MORE BUSINESS.
          </div>
          <div className="lp-hero-layout">
            <h1 id="hero-title">
              Goodbye, billing chaos.
              <br />
              Hello, <span>brightloop.</span>
            </h1>
            <div className="lp-hero-aside">
              <span className="lp-hero-aside-line" />
              <p>
                A little less to manage.
                <br />A lot more room to grow.
              </p>
              <a href="#preview" aria-label="Explore the workspace preview">
                <ArrowDown size={21} />
              </a>
            </div>
          </div>
          <div className="lp-hero-bottom">
            <p>
              Bring subscriptions, invoices, and payments together.
              <br className="lp-desktop-break" /> One calm workspace for your
              recurring revenue.
            </p>
            <div className="lp-hero-actions">
              <Link className="lp-button" to={destination}>
                {actionLabel}
                <ArrowUpRight size={17} />
              </Link>
              <a className="lp-text-link" href="#pipeline">
                See how it works <ArrowRight size={16} />
              </a>
            </div>
          </div>
          <WorkspacePreview />
        </section>
        <div className="lp-principles lp-container">
          <span>LESS FRICTION, AT EVERY STEP.</span>
          <div>
            <span>
              <Repeat size={17} /> Flexible subscriptions
            </span>
            <span>
              <FileText size={17} /> Connected invoicing
            </span>
            <span>
              <ShieldCheck size={17} /> Clear payment tracking
            </span>
          </div>
        </div>
        <section
          className="lp-container lp-section"
          id="features"
          aria-labelledby="features-title"
        >
          <div className="lp-section-heading">
            <div>
              <span className="lp-eyebrow">THOUGHTFULLY CONNECTED</span>
              <h2 id="features-title">
                Everything you need.
                <br />
                <span>Nothing in your way.</span>
              </h2>
            </div>
            <p>
              Less time piecing things together.
              <br />
              More time moving your business forward.
            </p>
          </div>
          <div className="lp-features">
            {features.map(
              ({ icon: Icon, number, title, description, detail }) => (
                <article className="lp-feature" key={number}>
                  <div className="lp-feature-top">
                    <span className="lp-feature-icon">
                      <Icon size={23} strokeWidth={1.5} />
                    </span>
                    <span>{number}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className="lp-feature-detail">
                    <Check size={14} />
                    {detail}
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
        <section
          className="lp-workflow-section"
          id="pipeline"
          aria-labelledby="workflow-title"
        >
          <div className="lp-container lp-workflow">
            <div className="lp-workflow-copy">
              <span className="lp-eyebrow">A SIMPLE WAY FORWARD</span>
              <h2 id="workflow-title">
                Set it up.
                <br />
                <span>Find your flow.</span>
              </h2>
              <p>
                From your first plan to your next payment.
                <br />A straightforward process, every step of the way.
              </p>
              <div className="lp-steps">
                {steps.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    className={`lp-step ${activeStep === index ? 'is-active' : ''}`}
                    aria-expanded={activeStep === index}
                    aria-controls="lp-step-preview"
                    onClick={() => setActiveStep(index)}
                  >
                    <span className="lp-step-number">0{index + 1}</span>
                    <span>
                      <strong>{item.title}</strong>
                      {activeStep === index && (
                        <span className="lp-step-description">
                          {item.description}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight size={18} />
                  </button>
                ))}
              </div>
            </div>
            <div className="lp-workflow-visual">
              <div
                className="lp-plan-card"
                id="lp-step-preview"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="lp-plan-header">
                  <span>
                    <Layers size={16} /> {step.label}
                  </span>
                  <span className="lp-plan-example">EXAMPLE</span>
                </div>
                <h3>{step.name}</h3>
                <div className="lp-plan-price">
                  {step.value}
                  <span>{step.suffix}</span>
                </div>
                <div className="lp-plan-rows">
                  {step.rows.map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>
                        {value === 'Active' || value === 'Paid' ? (
                          <span className="lp-active-badge">
                            <span className="lp-status-dot" />
                            {value}
                          </span>
                        ) : (
                          value
                        )}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="lp-plan-footer">
                  <CircleCheck size={17} />
                  {step.footer}
                </div>
              </div>
              <span className="lp-workflow-note">
                A good rhythm for your recurring revenue.
              </span>
            </div>
          </div>
        </section>
        <section
          className="lp-container lp-final-section"
          aria-labelledby="cta-title"
        >
          <div className="lp-final-cta">
            <div>
              <span className="lp-eyebrow">MAKE ROOM FOR WHAT’S NEXT</span>
              <h2 id="cta-title">
                Your business is growing.
                <br />
                <span>Keep things simple.</span>
              </h2>
              <p>Give your recurring revenue a place to feel at home.</p>
            </div>
            <Link className="lp-button lp-button-light" to={destination}>
              {actionLabel}
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="lp-container lp-footer">
        <div>
          <Link to="/" aria-label="Brightloop home">
            <Brand />
          </Link>
          <p>A brighter way to manage recurring revenue.</p>
        </div>
        <div className="lp-footer-right">
          <nav aria-label="Footer navigation">
            <a href="#features">Features</a>
            <a href="#pipeline">How it works</a>
            <Link to={isAuthenticated ? destination : '/login'}>
              {isAuthenticated ? 'Your workspace' : 'Sign in'}
              <ArrowUpRight size={13} />
            </Link>
          </nav>
          <span>© {copyrightYear} Brightloop. Keep it simple.</span>
        </div>
      </footer>
    </div>
  )
}
