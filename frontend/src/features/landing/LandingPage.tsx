import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Repeat,
  FileText,
  CreditCard,
  BarChart3,
  Layers,
  Users,
  ChevronRight,
  ExternalLink,
  Check,
  Star,
  Clock,
  Calendar,
  Search,
  Plus,
  SlidersHorizontal,
  Code2,
  Terminal,
  Activity,
  CheckCircle2,
  Lock,
  Download,
  Link2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const [activeStep, setActiveStep] = useState(1)

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#4F46E5]/10 selection:text-[#4F46E5] relative overflow-hidden">
      {/* Ethereal Lavender Ambient Gradient at Top */}
      <div className="absolute top-0 inset-x-0 h-[860px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_90%_60%_at_50%_-5%,rgba(165,180,252,0.30),rgba(196,181,253,0.18),rgba(255,255,255,0)_75%)]" />

      {/* Subtle Ethereal Side Glows */}
      <div className="absolute top-28 -left-28 w-96 h-96 bg-indigo-200/25 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-24 -right-28 w-96 h-96 bg-purple-200/25 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* =========================================================================
          1. TOP NAVIGATION BAR (Linear / TaskGo Clean Style)
         ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">Brightloop</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">Billing Infrastructure</span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#home" className="text-slate-950 font-bold hover:text-[#4F46E5] transition-colors">Overview</a>
            <a href="#features" className="hover:text-slate-950 transition-colors">Features</a>
            <a href="#why-choose" className="hover:text-slate-950 transition-colors">Architecture</a>
            <a href="#how-it-works" className="hover:text-slate-950 transition-colors">Engine Pipeline</a>
            <a href="#testimonials" className="hover:text-slate-950 transition-colors">Case Studies</a>
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-950 transition-colors inline-flex items-center gap-1"
            >
              OpenAPI <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link to={user?.role === 'CUSTOMER' ? '/portal' : '/dashboard'}>
                <button className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
                  Open {user?.role === 'CUSTOMER' ? 'Customer Portal' : 'App Dashboard'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs font-semibold text-slate-700 hover:text-slate-950 px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register">
                  <button className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95">
                    Get Started Free
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION: CLEAN, CONFIDENT & REFINED
         ========================================================================= */}
      <section id="home" className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center relative">
        {/* Centered Heading */}
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
            Simplify Recurring Billing.<br />
            <span className="text-[#4F46E5]">Scale Predictable Revenue.</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
            Automate subscription lifecycles, run transaction-safe billing cycles, and deliver immutable PDF invoices with zero race conditions.
          </p>

          {/* Action CTAs */}
          <div className="flex items-center justify-center gap-3 pt-3 pb-2">
            <Link to="/register">
              <button className="px-7 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95">
                Start Free Trial
              </button>
            </Link>
            <Link to="/invoices">
              <button className="px-7 py-3 rounded-full bg-white/90 hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95">
                Explore Live Workspace
              </button>
            </Link>
          </div>
        </div>

        {/* Floating Product Showcase with Technical Tags */}
        <div className="mt-14 relative max-w-5xl mx-auto">
          {/* Technical Role Pills around Showcase */}
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md absolute -top-4 -left-6 z-20 text-[11px] font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>MRR & ARR Normalized</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md absolute top-24 -left-12 z-20 text-[11px] font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
            <span>Celery Billing Engine</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md absolute -top-3 -right-6 z-20 text-[11px] font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>PostgreSQL Row-Locking</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md absolute top-24 -right-12 z-20 text-[11px] font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Multi-Tenant Isolation</span>
          </div>

          {/* High-Fidelity Realistic Product Mockup */}
          <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-2xl shadow-indigo-500/10 p-5 sm:p-7 overflow-hidden text-left">
            {/* Window Chrome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white text-xs font-bold">
                    B
                  </div>
                  <span className="font-extrabold text-sm text-slate-900 tracking-tight">Billing Lifecycle</span>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold">Active Queue</span>
                  <span>Invoices (4)</span>
                  <span>Subscribers (12)</span>
                  <span>Batch Engine</span>
                  <span>Audit Trail</span>
                </div>
              </div>

              {/* Avatars Stack & Filter Tool */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 border-2 border-white text-white font-bold text-[10px] flex items-center justify-center">JC</div>
                  <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white text-white font-bold text-[10px] flex items-center justify-center">AK</div>
                  <div className="w-7 h-7 rounded-full bg-purple-600 border-2 border-white text-white font-bold text-[10px] flex items-center justify-center">ML</div>
                  <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-white text-white font-bold text-[10px] flex items-center justify-center">+8</div>
                </div>

                <div className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Sub-bar Filter & Tabs */}
            <div className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 font-bold">Board View</span>
                <span className="hover:text-slate-800 cursor-pointer">List Ledger</span>
                <span className="hover:text-slate-800 cursor-pointer">Execution Timeline</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Search Records:</span>
                <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  <span>Filter by SKU, invoice #, customer...</span>
                </div>
              </div>
            </div>

            {/* Kanban Columns (4 Realistic Financial Stages) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
              {/* Column 1: Draft Quotations */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Draft & Quotes</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold">2</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-[#4F46E5]">Enterprise Contract</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Acme Global SLA & Core Nodes</p>
                  <p className="text-[10px] text-slate-400">Valid 30 days $\cdot$ 1-click subscription conversion</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-extrabold text-slate-900">$68,750.00</span>
                    <span className="text-slate-400">#QUO-2026-004</span>
                  </div>
                </div>
              </div>

              {/* Column 2: In Process / Active */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Active Subscriptions</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold">5</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600">Monthly Recurring</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">BrightWave Cloud Platform Tier</p>
                  <p className="text-[10px] text-slate-400">Auto-close on expiry $\cdot$ Pause/Resume enabled</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-extrabold text-slate-900">$21,480.00</span>
                    <span className="text-indigo-600 font-semibold">Next in 4d</span>
                  </div>
                </div>
              </div>

              {/* Column 3: In Review / Due Invoices */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Due Invoices</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold">3</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700">Confirmed / Due</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Invoice #INV-2026-0083</p>
                  <p className="text-[10px] text-slate-400">PDF generated $\cdot$ Due date: 2026-11-15</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-extrabold text-slate-900">$47,980.00</span>
                    <span className="text-amber-600 font-semibold">Balance Due</span>
                  </div>
                </div>
              </div>

              {/* Column 4: Settled & Paid */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Reconciled & Paid</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold">8</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">Settled via Stripe</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Invoice #INV-2026-0079</p>
                  <p className="text-[10px] text-slate-400">Zero balance $\cdot$ Receipt dispatched via email</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-extrabold text-slate-900">$55,230.00</span>
                    <span className="text-emerald-600 font-bold">Paid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Client Logo Bar */}
        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-slate-500 max-w-xs text-left">
            Trusted billing backbone for fast-growing B2B organizations.
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 justify-center">
            {['Ramp', 'Vercel', 'Retool', 'Supabase', 'Linear'].map((client, idx) => (
              <div
                key={idx}
                className="px-5 py-2.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-600 tracking-wider shadow-sm hover:border-slate-300 transition-colors"
              >
                {client}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. BENTO GRID FEATURES: TECHNICAL INTEGRITY & FINANCIAL CRAFT
         ========================================================================= */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Unlock Financial Clarity With<br />Our Billing Engine Architecture.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Engineered for precision: zero duplicate charges, automatic leap-year handling, and tamper-evident audit logs.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-6xl mx-auto">
          {/* Top Left: Smart Subscription Lifecycle (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-6">
              <h3 className="font-extrabold text-base text-slate-900">Subscription Plan Management</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Support Daily, Weekly, Monthly, and Yearly intervals. Configure minimum commitments, pause permissions, and auto-renewals.
              </p>
            </div>

            {/* Inner Sub-Card Preview */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Active Database Plans</span>
                  <span className="text-base font-black text-slate-900">4 Active Tiers</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-indigo-50 text-[#4F46E5] text-[10px] font-bold">
                  Normalized MRR
                </div>
              </div>

              {/* Multi-tier Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
                <div className="h-full bg-indigo-600 w-[45%]" />
                <div className="h-full bg-blue-500 w-[25%]" />
                <div className="h-full bg-amber-400 w-[18%]" />
                <div className="h-full bg-slate-300 w-[12%]" />
              </div>

              <div className="space-y-1.5 pt-1 text-[11px] text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600" /> Enterprise SLA ($2,500/mo)</span>
                  <span className="font-bold text-slate-900">6 subs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Scale Pro ($950/mo)</span>
                  <span className="font-bold text-slate-900">14 subs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Starter Cloud ($290/mo)</span>
                  <span className="font-bold text-slate-900">22 subs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Middle: Automated Workflows (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-6">
              <h3 className="font-extrabold text-base text-slate-900">Automated Billing Engine</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Celery tasks scan due subscriptions, acquire row locks, advance billing dates with dateutil math, and generate PDF invoices.
              </p>
            </div>

            {/* Terminal / Runner Simulation */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-2 text-left font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Terminal className="w-3 h-3" /> run_billing_cycle
                </span>
                <span className="text-[9px] text-slate-500">celery@worker-1</span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-300">
                <p className="text-slate-400">&gt; Evaluating active contracts...</p>
                <p className="text-indigo-300">&gt; select_for_update() acquired</p>
                <p className="text-emerald-400">&gt; Created #INV-2026-0084 ($47,980)</p>
                <p className="text-slate-400">&gt; Next cycle date: 2026-11-30</p>
              </div>
            </div>
          </div>

          {/* Right Tall Card: Live Audit Trail & Ledger (4 cols, spans 2 rows) */}
          <div className="lg:col-span-4 lg:row-span-2 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-6">
              <h3 className="font-extrabold text-base text-slate-900">Tamper-Evident Audit Trail</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Every state transition, quotation approval, invoice payment, and PDF download is immutably logged with actor, timestamp, and IP address.
              </p>
            </div>

            {/* Live Audit Log Feed */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold text-slate-900">Security & Financial Events</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              <div className="space-y-3 text-left">
                {[
                  { action: 'INVOICE_CONFIRMED', desc: 'Moved #INV-2026-0083 to Due state', user: 'admin@brightloop.io', time: '10:30 AM' },
                  { action: 'PAYMENT_ALLOCATED', desc: 'Received $47,980 via Bank Wire', user: 'staff@brightloop.io', time: '11:15 AM' },
                  { action: 'PDF_EXPORTED', desc: 'ReportLab generated official invoice PDF', user: 'acme@example.com', time: '01:20 PM' },
                  { action: 'SUBSCRIPTION_RENEWED', desc: 'Advanced next_billing_date automatically', user: 'celery_system', time: '02:45 PM' },
                  { action: 'BATCH_BILLING_OK', desc: '0 duplicate charges recorded', user: 'cron_scheduler', time: '04:10 PM' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.action[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-900 truncate">{item.action}</span>
                        <span className="text-[9px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{item.desc}</p>
                      <span className="text-[9px] text-indigo-600 font-mono block">{item.user}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Left: Real-Time MRR Tracking (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">Real-Time MRR / ARR Analytics</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Financial metrics normalized strictly on recurring schedules, not cash timing or one-off setup fees.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Annual Run Rate</span>
                  <span className="text-base font-black text-slate-900">$2,450,800.00</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  +18.4% YoY
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-[#4F46E5] h-2 rounded-full w-[84%]" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Normalized Daily, Weekly, Monthly, and Yearly calculations.</p>
            </div>
          </div>

          {/* Bottom Middle: Client Account Hierarchy (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">Customer Multi-Tenancy</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Queryset-level filtering ensures customers strictly access their own subscriptions, invoices, and payments.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Acme Global Systems</span>
                  <span className="text-[10px] text-slate-400">client_ref: CUST-2026-001</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-600 flex justify-between">
                <span>Outstanding Balance</span>
                <span className="font-bold text-slate-900">$0.00 (All Settled)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. "WHY TEAMS CHOOSE BRIGHTLOOP" STATS SECTION
         ========================================================================= */}
      <section id="why-choose" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Why Engineering & Finance Teams Choose Brightloop
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Built for transaction safety, strict data isolation, and reliable automated billing runs.
          </p>
        </div>

        {/* 4 Clean Minimalist Stat Cards with Violet Dot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {/* Card 1 */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <span className="text-4xl font-black text-slate-950 tracking-tight">40%</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Faster billing reconciliation through automated database invoice generation.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <span className="text-4xl font-black text-slate-950 tracking-tight">3x</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Higher revenue recovery using automated overdue notifications and payment tracking.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <span className="text-4xl font-black text-slate-950 tracking-tight">100%</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Idempotency guarantee with row locking to eliminate duplicate invoices.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <span className="text-4xl font-black text-slate-950 tracking-tight">10k+</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Recurring cycles executed seamlessly across enterprise organizations.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. GUIDED 3-STEP PIPELINE
         ========================================================================= */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Deploy In Just 3 Easy Steps
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            From product catalog configuration to automated recurring billing runs in minutes.
          </p>
        </div>

        {/* Split 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
          {/* Left: Interactive Preview Browser Window */}
          <div className="lg:col-span-5 bg-gradient-to-tr from-indigo-100/50 via-purple-50/40 to-slate-50 p-6 rounded-[32px] border border-slate-200/80 shadow-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400 ml-2 font-mono">brightloop.io/dashboard</span>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-[#4F46E5] font-bold">Step 1: Catalog</span>
                  <p className="text-xs font-bold text-slate-800">Products, Variants & Tax Rules</p>
                  <p className="text-[10px] text-slate-400">Configure base unit prices, SKU adjustments, and GST/VAT.</p>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <span className="text-[10px] text-[#4F46E5] font-bold">Step 2: Subscriptions</span>
                  <p className="text-xs font-bold text-indigo-950">Active Recurring Contracts</p>
                  <p className="text-[10px] text-slate-500">Atomic invoice generation with PostgreSQL row-locking.</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-[#4F46E5] font-bold">Step 3: Payments</span>
                  <p className="text-xs font-bold text-slate-800">PDF Invoices & Instant Payouts</p>
                  <p className="text-[10px] text-slate-400">Multi-rail allocation (Stripe, Wire, UPI) with zero overpayments.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: 3 Numbered Step Accordion Cards */}
          <div className="lg:col-span-7 space-y-4">
            {/* Step 01 */}
            <div
              onClick={() => setActiveStep(1)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                activeStep === 1
                  ? 'bg-slate-50/90 border-slate-200 shadow-sm ring-1 ring-[#4F46E5]/20'
                  : 'bg-white border-slate-100 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#4F46E5] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                  01
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">Define Products, Variants & Plans</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Set up your catalog with base prices and variant price deltas. Configure flexible daily, weekly, monthly, and yearly billing plans.
                  </p>

                  {activeStep === 1 && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>✓ Ready-made demo data seeder command included</span>
                      <span className="font-bold text-[#4F46E5]">python manage.py seed_demo_data</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 02 */}
            <div
              onClick={() => setActiveStep(2)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                activeStep === 2
                  ? 'bg-slate-50/90 border-slate-200 shadow-sm ring-1 ring-[#4F46E5]/20'
                  : 'bg-white border-slate-100 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-[#4F46E5] font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                  02
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">Convert Quotes to Binding Subscriptions</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Generate quotations with automatic tax calculations, discount rules, and PDF exports. Confirm with a single click to trigger recurring contracts.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div
              onClick={() => setActiveStep(3)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                activeStep === 3
                  ? 'bg-slate-50/90 border-slate-200 shadow-sm ring-1 ring-[#4F46E5]/20'
                  : 'bg-white border-slate-100 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-[#4F46E5] font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                  03
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">Automate Execution & Collect Payments</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    The billing engine evaluates due contracts, advances dates without month-end drift, and accepts multi-rail payments with zero overpayment tolerance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. CASE STUDY & BOTTOM CTA BANNER
         ========================================================================= */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Real Financial Impact.<br />Trusted by Modern SaaS.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Read how Brightloop eliminates billing discrepancies and streamlines multi-currency revenue.
          </p>
        </div>

        {/* Case Study Card */}
        <div className="max-w-3xl mx-auto p-8 rounded-[32px] bg-slate-50/80 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-center gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>

          <blockquote className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed max-w-xl mx-auto">
            "Brightloop completely transformed our recurring revenue workflow. We eliminated billing race conditions, cut monthly reconciliation time by 80%, and our cash collections are tracked in real-time."
          </blockquote>

          <div className="pt-2">
            <span className="block font-black text-xs text-slate-900">Marcus Vance</span>
            <span className="text-[11px] text-slate-400">VP of Financial Operations, BrightWave Global</span>
          </div>
        </div>

        {/* High-Impact Bottom CTA Banner */}
        <div className="mt-16 p-8 sm:p-12 rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-[#1e1b4b] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-left max-w-5xl mx-auto">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ready to automate your billing engine?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-normal">
              Sign in with demo credentials or register a customer account to experience live recurring billing.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link to="/register" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-95 whitespace-nowrap">
                Get Started Free
              </button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all active:scale-95 whitespace-nowrap">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. CLEAN MINIMALIST FOOTER
         ========================================================================= */}
      <footer className="py-10 bg-white border-t border-slate-100 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white text-[10px] font-bold">
              B
            </div>
            <span className="font-extrabold text-slate-900">Brightloop</span>
            <span className="text-slate-400">© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-medium text-slate-600">
            <a href="http://127.0.0.1:8000/api/v1/docs/" target="_blank" rel="noreferrer" className="hover:text-slate-900">OpenAPI Spec</a>
            <Link to="/login" className="hover:text-slate-900">Login</Link>
            <Link to="/register" className="hover:text-slate-900">Register</Link>
            <Link to="/dashboard" className="hover:text-slate-900">App Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
