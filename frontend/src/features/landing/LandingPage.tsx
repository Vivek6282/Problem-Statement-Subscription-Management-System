import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Star,
  Search,
  ExternalLink,
  Terminal,
  Layers,
  Repeat,
  FileText,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const [activeStep, setActiveStep] = useState(1)

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#4F46E5]/10 selection:text-[#4F46E5] relative antialiased">
      {/* Ethereal Minimalist Background Lighting (Ultra-subtle, airy) */}
      <div className="absolute top-0 inset-x-0 h-[720px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(199,210,254,0.35),rgba(245,243,255,0.20),rgba(255,255,255,0)_75%)]" />

      {/* =========================================================================
          1. MINIMALIST TOP NAV
         ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              B
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">Brightloop</span>
          </Link>

          {/* Minimalist Centered Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-500">
            <a href="#overview" className="text-slate-900 font-semibold hover:text-slate-950 transition-colors">Overview</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">Architecture</a>
            <a href="#pipeline" className="hover:text-slate-900 transition-colors">Pipeline</a>
            <a href="#stories" className="hover:text-slate-900 transition-colors">Case Studies</a>
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors inline-flex items-center gap-1"
            >
              OpenAPI <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link to={user?.role === 'CUSTOMER' ? '/portal' : '/dashboard'}>
                <button className="px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
                  Open {user?.role === 'CUSTOMER' ? 'Portal' : 'Dashboard'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5">
                  Sign In
                </Link>
                <Link to="/register">
                  <button className="px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm active:scale-95">
                    Start Free
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION (Aesthetic, Calm, Airy)
         ========================================================================= */}
      <section id="overview" className="pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center">
        {/* Subdued Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/60 text-[11px] font-medium text-slate-600 mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>PostgreSQL $\cdot$ Celery Recurring Billing Core</span>
        </div>

        {/* Hero Title */}
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
            Simplify recurring billing.<br />
            <span className="text-[#4F46E5]">Scale predictable revenue.</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-normal max-w-lg mx-auto leading-relaxed">
            Automate subscription lifecycles, run transaction-safe billing cycles, and deliver immutable PDF invoices with zero race conditions.
          </p>

          {/* Action CTAs */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Link to="/register">
              <button className="px-6 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm active:scale-95">
                Start Free Trial
              </button>
            </Link>
            <Link to="/invoices">
              <button className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-semibold transition-all shadow-sm active:scale-95">
                Explore Live Workspace
              </button>
            </Link>
          </div>
        </div>

        {/* Aesthetic Product Showcase Window */}
        <div className="mt-14 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-7 overflow-hidden text-left">
            {/* Window Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                </div>
                <span className="text-xs font-bold text-slate-800 ml-2">Brightloop Core Workspace</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-400">
                  <Search className="w-3 h-3" />
                  <span>Search subscriptions, SKU...</span>
                </div>
                <div className="flex -space-x-1.5 overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-semibold text-[9px] flex items-center justify-center">JC</div>
                  <div className="w-6 h-6 rounded-full bg-slate-700 text-white font-semibold text-[9px] flex items-center justify-center">AK</div>
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-semibold text-[9px] flex items-center justify-center">+4</div>
                </div>
              </div>
            </div>

            {/* 4 Serene Minimalist Kanban Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
              {/* Draft */}
              <div className="bg-[#FAFAFB] rounded-xl p-3 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Draft & Quotes</span>
                  <span className="text-slate-400">2</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200/60 shadow-sm space-y-1.5">
                  <span className="text-[9px] font-semibold text-[#4F46E5] uppercase tracking-wider block">Enterprise Plan</span>
                  <p className="text-xs font-bold text-slate-900">Acme Global SLA</p>
                  <p className="text-[10px] text-slate-400">Net 30 payment terms $\cdot$ 1-click binding convert</p>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-extrabold text-slate-900">$68,750.00</span>
                    <span className="text-slate-400">Valid 30d</span>
                  </div>
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="bg-[#FAFAFB] rounded-xl p-3 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Active Recurring</span>
                  <span className="text-slate-400">5</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200/60 shadow-sm space-y-1.5">
                  <span className="text-[9px] font-semibold text-indigo-600 uppercase tracking-wider block">Monthly Cycle</span>
                  <p className="text-xs font-bold text-slate-900">BrightWave Dedicated</p>
                  <p className="text-[10px] text-slate-400">Auto-close on expiry $\cdot$ Pause/resume allowed</p>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-extrabold text-slate-900">$21,480.00</span>
                    <span className="text-indigo-600 font-semibold">Next in 4d</span>
                  </div>
                </div>
              </div>

              {/* Due Invoices */}
              <div className="bg-[#FAFAFB] rounded-xl p-3 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Due Invoices</span>
                  <span className="text-slate-400">3</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200/60 shadow-sm space-y-1.5">
                  <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider block">Confirmed</span>
                  <p className="text-xs font-bold text-slate-900">#INV-2026-0083</p>
                  <p className="text-[10px] text-slate-400">PDF rendered $\cdot$ Multi-rail balance allocation</p>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-extrabold text-slate-900">$47,980.00</span>
                    <span className="text-amber-600 font-semibold">Due Soon</span>
                  </div>
                </div>
              </div>

              {/* Settled */}
              <div className="bg-[#FAFAFB] rounded-xl p-3 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Settled & Paid</span>
                  <span className="text-slate-400">8</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200/60 shadow-sm space-y-1.5">
                  <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider block">Stripe Settlement</span>
                  <p className="text-xs font-bold text-slate-900">#INV-2026-0079</p>
                  <p className="text-[10px] text-slate-400">Zero balance $\cdot$ Receipt dispatched via email</p>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-extrabold text-slate-900">$55,230.00</span>
                    <span className="text-emerald-600 font-semibold">Paid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Typographic Brand Strip */}
        <div className="mt-14 pt-8 border-t border-slate-100 flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-xs font-bold tracking-widest text-slate-400 uppercase select-none">
          <span className="hover:text-slate-600 transition-colors">RAMP</span>
          <span className="hover:text-slate-600 transition-colors">VERCEL</span>
          <span className="hover:text-slate-600 transition-colors">RETOOL</span>
          <span className="hover:text-slate-600 transition-colors">SUPABASE</span>
          <span className="hover:text-slate-600 transition-colors">LINEAR</span>
        </div>
      </section>

      {/* =========================================================================
          3. BENTO GRID: RESTRAINED, ELEGANT ARCHITECTURE
         ========================================================================= */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Financial clarity. Minimal overhead.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Zero duplicate charges, automatic leap-year handling, and tamper-evident audit logs.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Card 1: Subscription Tier Breakdown (4 cols) */}
          <div className="lg:col-span-4 bg-[#FAFAFB] rounded-2xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-5">
              <h3 className="font-bold text-sm text-slate-900">Subscription Plan Management</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Daily, Weekly, Monthly, and Yearly intervals with minimum commitments and auto-renewals.
              </p>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200/60 shadow-sm space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">4 Active Tiers</span>
                <span className="text-[10px] text-slate-400 font-medium">Normalized MRR</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
                <div className="h-full bg-slate-900 w-[50%]" />
                <div className="h-full bg-indigo-600 w-[30%]" />
                <div className="h-full bg-slate-300 w-[20%]" />
              </div>
              <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>Enterprise SLA ($2,500/mo)</span>
                  <span className="font-bold text-slate-900">6 subs</span>
                </div>
                <div className="flex justify-between">
                  <span>Scale Pro ($950/mo)</span>
                  <span className="font-bold text-slate-900">14 subs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Celery Terminal Execution (4 cols) */}
          <div className="lg:col-span-4 bg-[#FAFAFB] rounded-2xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-5">
              <h3 className="font-bold text-sm text-slate-900">Automated Billing Engine</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Celery tasks scan due contracts, acquire row locks, advance billing dates, and generate PDF invoices.
              </p>
            </div>

            <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1 text-left">
              <div className="flex items-center justify-between text-slate-500 pb-1.5 border-b border-slate-800">
                <span className="text-emerald-400">run_billing_cycle</span>
                <span>worker-1</span>
              </div>
              <p className="text-slate-400">&gt; Evaluating active contracts...</p>
              <p className="text-indigo-300">&gt; select_for_update() locked</p>
              <p className="text-emerald-400">&gt; Generated #INV-2026-0084</p>
              <p className="text-slate-400">&gt; Next cycle date: 2026-11-30</p>
            </div>
          </div>

          {/* Card 3: Audit Trail (4 cols, 2 rows) */}
          <div className="lg:col-span-4 lg:row-span-2 bg-[#FAFAFB] rounded-2xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-5">
              <h3 className="font-bold text-sm text-slate-900">Tamper-Evident Audit Trail</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Every state transition, quotation approval, invoice payment, and PDF download is immutably logged with actor and timestamp.
              </p>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200/60 shadow-sm space-y-2.5 text-left">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs font-bold text-slate-800">
                <span>Security Events</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>

              {[
                { action: 'INVOICE_CONFIRMED', detail: '#INV-2026-0083 moved to Due state', time: '10:30 AM' },
                { action: 'PAYMENT_ALLOCATED', detail: 'Received $47,980 via Bank Wire', time: '11:15 AM' },
                { action: 'PDF_EXPORTED', detail: 'Official ReportLab invoice PDF generated', time: '01:20 PM' },
                { action: 'CYCLE_ADVANCED', detail: 'Advanced next_billing_date automatically', time: '02:45 PM' },
                { action: 'BATCH_BILLING_OK', detail: '0 duplicate charges recorded', time: '04:10 PM' },
              ].map((ev, i) => (
                <div key={i} className="text-[11px] space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-[10px]">{ev.action}</span>
                    <span className="text-[9px] text-slate-400">{ev.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{ev.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: MRR & ARR Run Rate (4 cols) */}
          <div className="lg:col-span-4 bg-[#FAFAFB] rounded-2xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-4">
              <h3 className="font-bold text-sm text-slate-900">Normalized Revenue</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Metrics calculated strictly on recurring subscription contracts, not cash timing.
              </p>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200/60 shadow-sm space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-base font-black text-slate-900">$2,450,800</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+18.4% YoY</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-slate-900 h-1.5 rounded-full w-[84%]" />
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Daily, Weekly, Monthly, and Yearly normalization.</span>
            </div>
          </div>

          {/* Card 5: Multi-Tenant Customer Accounts (4 cols) */}
          <div className="lg:col-span-4 bg-[#FAFAFB] rounded-2xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-4">
              <h3 className="font-bold text-sm text-slate-900">Customer Multi-Tenancy</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Queryset-level filtering ensures clients strictly access their own records.
              </p>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200/60 shadow-sm space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Acme Global Systems</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Active</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Outstanding Balance</span>
                <span className="font-bold text-slate-900">$0.00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. MINIMALIST METRICS (Clean Numbers with Indicator Dot)
         ========================================================================= */}
      <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        <div className="max-w-md mx-auto space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Engineered for reliability.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Transaction safety and strict data isolation across every financial boundary.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { stat: '40%', desc: 'Faster billing reconciliation via automated database invoice generation.' },
            { stat: '3x', desc: 'Higher revenue recovery using automated overdue notifications and payment tracking.' },
            { stat: '100%', desc: 'Idempotency guarantee with row locking to eliminate duplicate charges.' },
            { stat: '10k+', desc: 'Recurring cycles executed reliably without manual intervention.' },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-[#FAFAFB] rounded-2xl p-5 border border-slate-200/60 shadow-sm text-left flex flex-col justify-between h-44 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl font-black text-slate-950 tracking-tight">{item.stat}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] mt-2" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. GUIDED 3-STEP PIPELINE
         ========================================================================= */}
      <section id="pipeline" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-md mx-auto space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Deploy in three steps.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            From product catalog configuration to automated recurring billing runs in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Clean Miniature Preview Card */}
          <div className="lg:col-span-5 bg-[#FAFAFB] p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="bg-white rounded-xl border border-slate-200/60 p-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-[10px] text-slate-400 font-mono">
                brightloop.io/dashboard
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-bold text-[#4F46E5]">Step 1: Catalog</span>
                <p className="font-bold text-slate-900 text-xs">Products, Variants & Tax Rules</p>
                <p className="text-[10px] text-slate-400">Base prices, SKU adjustments, and tax rules.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-0.5">
                <span className="text-[10px] font-bold text-[#4F46E5]">Step 2: Subscriptions</span>
                <p className="font-bold text-slate-900 text-xs">Active Recurring Contracts</p>
                <p className="text-[10px] text-slate-500">Row-locked recurring cycle evaluation.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-bold text-[#4F46E5]">Step 3: Payments</span>
                <p className="font-bold text-slate-900 text-xs">PDF Invoices & Instant Payouts</p>
                <p className="text-[10px] text-slate-400">Multi-rail allocation with zero overpayments.</p>
              </div>
            </div>
          </div>

          {/* Right: 3 Steps */}
          <div className="lg:col-span-7 space-y-3">
            {[
              {
                num: '01',
                title: 'Define Products, Variants & Plans',
                desc: 'Set up your catalog with base prices and variant price deltas. Configure flexible daily, weekly, monthly, and yearly billing plans.',
              },
              {
                num: '02',
                title: 'Convert Quotes to Binding Subscriptions',
                desc: 'Generate quotations with automatic tax calculations, discount rules, and PDF exports. Confirm with a single click to trigger recurring contracts.',
              },
              {
                num: '03',
                title: 'Automate Execution & Collect Payments',
                desc: 'The billing engine evaluates due contracts, advances dates without month-end drift, and accepts multi-rail payments with zero overpayment tolerance.',
              },
            ].map((step, idx) => (
              <div
                key={idx}
                onClick={() => setActiveStep(idx + 1)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  activeStep === idx + 1
                    ? 'bg-[#FAFAFB] border-slate-200 shadow-sm'
                    : 'bg-white border-slate-100 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {step.num}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. EDITORIAL TESTIMONIAL & BOTTOM CTA
         ========================================================================= */}
      <section id="stories" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        {/* Testimonial Quote */}
        <div className="max-w-2xl mx-auto space-y-3">
          <blockquote className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
            "Brightloop completely transformed our recurring revenue workflow. We eliminated billing race conditions, cut monthly reconciliation time by 80%, and our cash collections are tracked in real-time."
          </blockquote>
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">Marcus Vance</span>
            <span className="text-slate-400">VP of Financial Operations, BrightWave Global</span>
          </div>
        </div>

        {/* Minimalist Dark CTA Box */}
        <div className="mt-16 p-8 sm:p-10 rounded-2xl sm:rounded-3xl bg-slate-950 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div className="space-y-1.5 max-w-lg">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Ready to automate your billing engine?
            </h3>
            <p className="text-xs text-slate-400 font-normal">
              Sign in with demo credentials or register a customer account to experience live recurring billing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link to="/register" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold transition-all active:scale-95 whitespace-nowrap">
                Start Free Trial
              </button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all active:scale-95 whitespace-nowrap">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. WHISPER-QUIET MINIMALIST FOOTER
         ========================================================================= */}
      <footer className="py-8 bg-white border-t border-slate-100 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-950 text-white text-[10px] font-bold flex items-center justify-center">
              B
            </div>
            <span className="font-bold text-slate-800">Brightloop</span>
            <span>© 2026</span>
          </div>

          <div className="flex items-center gap-6 text-slate-500 font-medium">
            <a href="http://127.0.0.1:8000/api/v1/docs/" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">API Docs</a>
            <Link to="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-slate-900 transition-colors">Register</Link>
            <Link to="/dashboard" className="hover:text-slate-900 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
