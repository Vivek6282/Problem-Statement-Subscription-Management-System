import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Layers,
  Menu,
  Repeat,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import './landing.css'

const features = [
  {
    icon: Repeat,
    number: '01',
    title: 'Subscriptions, engineered.',
    description:
      'Manage recurring plans across flexible intervals: daily, weekly, monthly, and annual. Handle renewals, pauses, resumes, and cancellations with deterministic state safety.',
    detail: 'Complete lifecycle state management',
  },
  {
    icon: FileText,
    number: '02',
    title: 'From proposal to recurring contract.',
    description:
      'Turn formal business quotations into ongoing subscriptions. Taxes, discounts, and line-item snapshots remain connected from initial quote to final settlement.',
    detail: 'Snapshot-locked pricing & automated conversion',
  },
  {
    icon: Layers,
    number: '03',
    title: 'Disciplined financial operations.',
    description:
      'Autonomous background workers advance billing dates, compute taxes, generate itemized PDF invoices, and allocate incoming payments with zero duplicate billing.',
    detail: 'Idempotent worker execution & full audit logs',
  },
]

const lifecycleSteps = [
  {
    title: 'Agreement & Pricing',
    tag: 'Proposal',
    desc: 'Catalog modeling with dynamic variant pricing, regional taxes, and snapshot-locked commercial terms.',
  },
  {
    title: 'Autonomous Renewal',
    tag: 'Idempotent',
    desc: 'Scheduled workers advance billing dates safely across leap years and month-ends with database locks.',
  },
  {
    title: 'Instant PDF Invoicing',
    tag: 'Server-side',
    desc: 'Sequentially numbered, tamper-proof invoices rendered and archived the second a cycle concludes.',
  },
  {
    title: 'Reconciliation & Portal',
    tag: 'Zero drift',
    desc: 'Payments allocated to balances in real time, with immediate receipt access in the client portal.',
  },
]

const workflowStages = [
  {
    step: '01',
    title: 'Define your subscription models',
    subtitle: 'Plan & Catalog Setup',
    description:
      'Set up products with customizable variants, define recurring intervals, and configure regional tax rules for automated calculation.',
    specifications: [
      { name: 'Interval Cadence', detail: 'Daily, Weekly, Monthly, and Annual options' },
      { name: 'Variant Pricing', detail: 'Calculated dynamically from base prices' },
      { name: 'Tax Policies', detail: 'Automated jurisdiction percentage application' },
      { name: 'Discount Rules', detail: 'Usage-capped and percentage thresholds' },
    ],
    note: 'Flexible foundations for any recurring revenue model.',
  },
  {
    step: '02',
    title: 'Establish agreements & onboard clients',
    subtitle: 'Commercial Quotations',
    description:
      'Generate professional quotations with validity dates. When approved, convert quotes directly into active subscriptions with automatic customer portal access.',
    specifications: [
      { name: 'Quotation Workflow', detail: 'Draft, send, validate, and convert seamlessly' },
      { name: 'Customer Portal', detail: 'Instant client self-service account creation' },
      { name: 'PDF Export', detail: 'Downloadable formal quotation documents' },
      { name: 'Snapshot Lock', detail: 'Immutable agreement state upon acceptance' },
    ],
    note: 'Frictionless transition from proposal to recurring contract.',
  },
  {
    step: '03',
    title: 'Automate recurring billing & accounting',
    subtitle: 'Autonomous Execution',
    description:
      'Background workers advance billing dates, generate itemized PDF invoices, record payments, and track outstanding balances automatically.',
    specifications: [
      { name: 'Idempotent Billing', detail: 'Database locking prevents duplicate invoicing' },
      { name: 'Invoice Generation', detail: 'Automated sequential numbered invoices' },
      { name: 'Payment Tracking', detail: 'Real-time allocation against balances due' },
      { name: 'Audit Logging', detail: 'Every event recorded for accountability' },
    ],
    note: 'Disciplined recurring operations running quietly in the background.',
  },
]

const cadences = ['Monthly', 'Quarterly', 'Annual'] as const
type Cadence = (typeof cadences)[number]

const cadenceDetails: Record<Cadence, { intervalLabel: string; advancePoint: string }> = {
  Monthly: { intervalLabel: '30-day interval', advancePoint: 'T+30D' },
  Quarterly: { intervalLabel: '90-day interval', advancePoint: 'T+90D' },
  Annual: { intervalLabel: '365-day interval', advancePoint: 'T+365D' },
}

const guarantees = [
  { icon: Repeat, label: 'Autonomous recurring engine' },
  { icon: Layers, label: 'Dual-role tenant isolation' },
  { icon: FileText, label: 'Server-side PDF invoicing' },
  { icon: ShieldCheck, label: 'End-to-end audit trail' },
]

const navLinks = [
  { href: '#features', label: 'Capabilities' },
  { href: '#pipeline', label: 'Workflow' },
  { href: '#guarantees', label: 'Guarantees' },
]

function Brand() {
  return (
    <span className="lp-brand">
      <span className="lp-brand-mark" aria-hidden="true">
        <Repeat size={15} strokeWidth={2.4} />
      </span>
      brightloop<span className="lp-brand-period">.</span>
    </span>
  )
}

export const LandingPage = () => {
  const { isAuthenticated, user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedCadence, setSelectedCadence] = useState<Cadence>('Monthly')
  const [activeWorkflow, setActiveWorkflow] = useState(0)
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

  const currentWorkflow = workflowStages[activeWorkflow]
  const cadence = cadenceDetails[selectedCadence]

  return (
    <div className="landing-page">
      <a className="lp-skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="lp-header">
        <div className="lp-header-inner">
          <Link to="/" aria-label="Brightloop home">
            <Brand />
          </Link>
          <nav className="lp-desktop-nav" aria-label="Main navigation">
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="lp-header-actions">
            {!isAuthenticated && (
              <Link className="lp-sign-in" to="/login">
                Sign in
              </Link>
            )}
            <Link className="lp-button lp-button-small" to={destination}>
              {actionLabel}
              <ArrowUpRight size={14} />
            </Link>
            <button
              className="lp-menu-toggle"
              type="button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="lp-mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
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
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
            {!isAuthenticated && <Link to="/login">Sign in</Link>}
          </nav>
        )}
      </header>

      <main id="main-content">
        {/* Hero */}
        <section
          className="lp-container lp-hero"
          id="overview"
          aria-labelledby="hero-title"
        >
          <div className="lp-hero-left">
            <span className="lp-eyebrow">
              <span className="lp-status-dot" aria-hidden="true" />
              The disciplined subscription engine
            </span>

            <h1 id="hero-title">
              Recurring revenue,
              <br />
              in <span>perfect rhythm.</span>
            </h1>

            <p className="lp-hero-desc">
              Brightloop brings subscription lifecycles, formal quotations,
              automated invoicing, and payments into one calm workspace.
              Engineered for accuracy. Crafted for simplicity.
            </p>

            <div className="lp-hero-actions">
              <Link className="lp-button" to={destination}>
                {actionLabel}
                <ArrowUpRight size={16} />
              </Link>
              <a className="lp-text-link" href="#pipeline">
                See how it works <ArrowRight size={15} />
              </a>
            </div>

            <dl className="lp-hero-specs">
              <div>
                <dt>Deterministic billing</dt>
                <dd>100%</dd>
              </div>
              <div>
                <dt>Rounding discrepancy</dt>
                <dd>±0.00</dd>
              </div>
              <div>
                <dt>Admin & client portals</dt>
                <dd>Dual</dd>
              </div>
            </dl>
          </div>

          {/* Cadence display */}
          <div className="lp-hero-stage" aria-label="Subscription lifecycle">
            <div className="lp-cadence-bar">
              <div className="lp-cadence-label">
                <span>Billing cadence</span>
                <strong>{cadence.intervalLabel}</strong>
              </div>
              <div
                className="lp-cadence-toggles"
                role="tablist"
                aria-label="Select billing interval"
              >
                {cadences.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={selectedCadence === c}
                    className={`lp-cadence-toggle ${
                      selectedCadence === c ? 'is-active' : ''
                    }`}
                    onClick={() => setSelectedCadence(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="lp-rhythm">
              <svg
                className="lp-rhythm-canvas"
                viewBox="0 0 400 24"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="lp-rhythm-path"
                  d="M4 12 C 48 2, 90 2, 134.7 12 S 221 22, 265.3 12 S 352 2, 396 12"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="lp-rhythm-dots" aria-hidden="true">
                <span />
                <span className="is-active" />
                <span />
                <span />
              </div>
              <div className="lp-rhythm-stops">
                <span>T+0</span>
                <span className="is-active">{cadence.advancePoint}</span>
                <span>Invoice</span>
                <span>Settle</span>
              </div>
            </div>

            <ol className="lp-milestones">
              {lifecycleSteps.map((step, idx) => (
                <li key={step.title} className="lp-milestone">
                  <span className="lp-milestone-index">0{idx + 1}</span>
                  <div>
                    <div className="lp-milestone-head">
                      <span className="lp-milestone-title">{step.title}</span>
                      <span className="lp-milestone-tag">{step.tag}</span>
                    </div>
                    <p className="lp-milestone-desc">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Guarantees */}
        <div className="lp-container lp-principles" id="guarantees">
          <span className="lp-eyebrow">Core system guarantees</span>
          <ul className="lp-principles-list">
            {guarantees.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Capabilities */}
        <section
          className="lp-container lp-section"
          id="features"
          aria-labelledby="features-title"
        >
          <div className="lp-section-heading">
            <div>
              <span className="lp-eyebrow">Thoughtfully connected</span>
              <h2 id="features-title">
                Everything you need.
                <br />
                <span>Nothing in your way.</span>
              </h2>
            </div>
            <p>
              Less time piecing systems together. More time moving your
              business forward.
            </p>
          </div>

          <div className="lp-features">
            {features.map(
              ({ icon: Icon, number, title, description, detail }) => (
                <article className="lp-feature" key={number}>
                  <span className="lp-feature-number">{number}</span>
                  <div className="lp-feature-title">
                    <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    <h3>{title}</h3>
                  </div>
                  <div className="lp-feature-copy">
                    <p>{description}</p>
                    <span className="lp-feature-detail">{detail}</span>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>

        {/* Workflow */}
        <section
          className="lp-workflow-section"
          id="pipeline"
          aria-labelledby="workflow-title"
        >
          <div className="lp-container lp-section">
            <div className="lp-section-heading">
              <div>
                <span className="lp-eyebrow">A disciplined way forward</span>
                <h2 id="workflow-title">
                  Set it up.
                  <br />
                  <span>Find your flow.</span>
                </h2>
              </div>
              <p>
                From catalog modeling to automated payment reconciliation. A
                straightforward, auditable process at every step.
              </p>
            </div>

            <div
              className="lp-steps"
              role="tablist"
              aria-label="Explore the operational workflow"
            >
              {workflowStages.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  role="tab"
                  className={`lp-step ${activeWorkflow === index ? 'is-active' : ''}`}
                  aria-selected={activeWorkflow === index}
                  aria-controls="lp-workflow-spec"
                  onClick={() => setActiveWorkflow(index)}
                >
                  <span className="lp-step-number">{item.step}</span>
                  <span className="lp-step-body">
                    <strong>{item.title}</strong>
                    <span className="lp-step-description">
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div
              className="lp-flow"
              id="lp-workflow-spec"
              role="tabpanel"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="lp-flow-summary">
                <span className="lp-eyebrow">Stage {currentWorkflow.step}</span>
                <h3>{currentWorkflow.subtitle}</h3>
                <p className="lp-flow-note">{currentWorkflow.note}</p>
              </div>

              <dl className="lp-flow-details">
                {currentWorkflow.specifications.map(({ name, detail }) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="lp-final-section" aria-labelledby="cta-title">
          <div className="lp-container lp-final-cta">
            <div>
              <span className="lp-eyebrow">Make room for what’s next</span>
              <h2 id="cta-title">
                Your business is growing.
                <br />
                <span>Keep things simple.</span>
              </h2>
              <p>Give your recurring revenue a place to feel at home.</p>
            </div>
            <Link className="lp-button lp-button-light" to={destination}>
              {actionLabel}
              <ArrowUpRight size={16} />
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
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
            <Link to={isAuthenticated ? destination : '/login'}>
              {isAuthenticated ? 'Your workspace' : 'Sign in'}
              <ArrowUpRight size={13} />
            </Link>
          </nav>
          <span>© {copyrightYear} Brightloop. Built with discipline.</span>
        </div>
      </footer>
    </div>
  )
}
