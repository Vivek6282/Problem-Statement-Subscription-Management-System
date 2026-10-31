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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#6366F1]/15 selection:text-[#4F46E5] relative antialiased overflow-hidden">
      {/* Ethereal Sky Aura: Lavender, Lilac & Warm Sunlight Horizon */}
      <div className="absolute top-0 inset-x-0 h-[820px] pointer-events-none -z-10 bg-[radial-gradient(120%_80%_at_50%_-15%,rgba(165,180,252,0.40)_0%,rgba(216,180,254,0.25)_35%,rgba(254,215,170,0.16)_65%,rgba(255,255,255,0)_88%)]" />

      {/* Aesthetic Soft Background Blurs */}
      <div className="absolute top-28 -left-28 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-20 -right-24 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-violet-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* =========================================================================
          1. TOP NAVIGATION BAR (Clean, Frosted Glass)
         ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/75 border-b border-indigo-100/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo with Aesthetic Iris Gradient */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4F46E5] via-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">Brightloop</span>
              <span className="text-[10px] text-indigo-500 font-medium tracking-wide">Billing Infrastructure</span>
            </div>
          </Link>

          {/* Minimalist Centered Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#overview" className="text-slate-900 font-bold hover:text-[#4F46E5] transition-colors">Overview</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">Architecture</a>
            <a href="#pipeline" className="hover:text-slate-900 transition-colors">Pipeline</a>
            <a href="#stories" className="hover:text-slate-900 transition-colors">Case Studies</a>
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors inline-flex items-center gap-1 text-slate-500"
            >
              OpenAPI <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to={user?.role === 'CUSTOMER' ? '/portal' : '/dashboard'}>
                <button className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
                  Open {user?.role === 'CUSTOMER' ? 'Portal' : 'Dashboard'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register">
                  <button className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5] text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95">
                    Start Free Trial
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION (Aesthetic Sky & High-Fidelity Mockup)
         ========================================================================= */}
      <section id="overview" className="pt-14 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center">
        {/* Subtle Violet Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-200/60 text-[11px] font-semibold text-indigo-900 mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
          <span>PostgreSQL $\cdot$ Celery Recurring Billing Core</span>
        </div>

        {/* Hero Title with Aesthetic Iris Gradient Accent */}
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
            Simplify recurring billing.<br />
            <span className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent">
              Scale predictable revenue.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
            Automate subscription lifecycles, run transaction-safe billing cycles, and deliver immutable PDF invoices with zero race conditions.
          </p>

          {/* Action CTAs */}
          <div className="flex items-center justify-center gap-3 pt-3">
            <Link to="/register">
              <button className="px-7 py-3 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5] text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95">
                Start Free Trial
              </button>
            </Link>
            <Link to="/invoices">
              <button className="px-7 py-3 rounded-full bg-white/90 hover:bg-slate-50 border border-indigo-100 text-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95">
                Explore Live Workspace
              </button>
            </Link>
          </div>
        </div>

        {/* Aesthetic Product Showcase Window */}
        <div className="mt-14 max-w-5xl mx-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-[28px] border border-indigo-100/80 shadow-[0_16px_50px_rgba(99,102,241,0.08)] p-5 sm:p-7 overflow-hidden text-left">
            {/* Window Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-bold text-slate-800 ml-2">Brightloop Core Workspace</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Live Postgres Queue
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/60 text-[11px] text-slate-400">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>Search subscriptions, SKU, invoice...</span>
                </div>
                <div className="flex -space-x-1.5 overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-[9px] flex items-center justify-center">JC</div>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-[9px] flex items-center justify-center">AK</div>
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-[9px] flex items-center justify-center">+4</div>
                </div>
              </div>
            </div>

            {/* 4 Pastel Tinted Kanban Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
              {/* Draft & Quotes (Soft Lavender) */}
              <div className="bg-[#FAF9FF] rounded-2xl p-3 border border-indigo-100/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950">
                  <span>Draft & Quotes</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px]">2</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-indigo-50 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-[#4F46E5] border border-indigo-100/60 inline-block">Enterprise SLA</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Acme Global SLA</p>
                  <p className="text-[10px] text-slate-400">Net 30 payment terms $\cdot$ 1-click binding convert</p>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-extrabold text-slate-900">$68,750.00</span>
                    <span className="text-indigo-600 font-semibold">Valid 30d</span>
                  </div>
                </div>
              </div>

              {/* Active Subscriptions (Soft Lilac) */}
              <div className="bg-[#FAF5FF] rounded-2xl p-3 border border-purple-100/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-950">
                  <span>Active Recurring</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-[10px]">5</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-purple-50 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-[#7C3AED] border border-purple-100/60 inline-block">Monthly Cycle</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">BrightWave Dedicated</p>
                  <p className="text-[10px] text-slate-400">Auto-close on expiry $\cdot$ Pause/resume allowed</p>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-extrabold text-slate-900">$21,480.00</span>
                    <span className="text-[#7C3AED] font-bold">Next in 4d</span>
                  </div>
                </div>
              </div>

              {/* Due Invoices (Soft Amber / Sunset) */}
              <div className="bg-[#FFFBEB] rounded-2xl p-3 border border-amber-100/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                  <span>Due Invoices</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">3</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-50 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-100 inline-block">Confirmed</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">#INV-2026-0083</p>
                  <p className="text-[10px] text-slate-400">PDF rendered $\cdot$ Multi-rail balance allocation</p>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-extrabold text-slate-900">$47,980.00</span>
                    <span className="text-amber-700 font-bold">Due Soon</span>
                  </div>
                </div>
              </div>

              {/* Settled & Paid (Soft Mint / Emerald) */}
              <div className="bg-[#ECFDF5] rounded-2xl p-3 border border-emerald-100/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950">
                  <span>Settled & Paid</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">8</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-emerald-50 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 inline-block">Stripe Settlement</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">#INV-2026-0079</p>
                  <p className="text-[10px] text-slate-400">Zero balance $\cdot$ Receipt dispatched via email</p>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-extrabold text-slate-900">$55,230.00</span>
                    <span className="text-emerald-700 font-bold">Paid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Logo Capsules */}
        <div className="mt-14 pt-8 border-t border-indigo-100/60 flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-xs font-bold tracking-widest text-slate-400 uppercase select-none">
          <span className="hover:text-indigo-600 transition-colors">RAMP</span>
          <span className="hover:text-indigo-600 transition-colors">VERCEL</span>
          <span className="hover:text-indigo-600 transition-colors">RETOOL</span>
          <span className="hover:text-indigo-600 transition-colors">SUPABASE</span>
          <span className="hover:text-indigo-600 transition-colors">LINEAR</span>
        </div>
      </section>

      {/* =========================================================================
          3. BENTO GRID: AESTHETIC PALETTES & RESTRAINED CRAFT
         ========================================================================= */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Financial clarity.<br />
            <span className="text-[#4F46E5]">Minimal overhead.</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Zero duplicate charges, automatic leap-year handling, and tamper-evident audit logs.
          </p>
        </div>

        {/* Bento Grid with Pastel Gradients */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Card 1: Subscription Tier Breakdown (Soft Lavender Fill) */}
          <div className="lg:col-span-4 bg-gradient-to-b from-[#FAF9FF] to-[#F5F3FF]/70 rounded-3xl p-5 border border-indigo-100/70 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-5">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Plan Catalog</span>
              <h3 className="font-extrabold text-sm text-slate-900">Subscription Plan Management</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Daily, Weekly, Monthly, and Yearly intervals with minimum commitments and auto-renewals.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-indigo-100/60 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">4 Active Tiers</span>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Normalized MRR</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
                <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] w-[45%]" />
                <div className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] w-[30%]" />
                <div className="h-full bg-[#EC4899] w-[15%]" />
                <div className="h-full bg-amber-400 w-[10%]" />
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-600 pt-1">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4F46E5]" /> Enterprise SLA ($2,500/mo)</span>
                  <span className="font-bold text-slate-900">6 subs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> Scale Pro ($950/mo)</span>
                  <span className="font-bold text-slate-900">14 subs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Celery Terminal Execution (Aesthetic Midnight Palette) */}
          <div className="lg:col-span-4 bg-gradient-to-b from-[#0F1026] to-[#151636] rounded-3xl p-5 border border-indigo-900/40 shadow-sm flex flex-col justify-between text-slate-200">
            <div className="space-y-1.5 mb-5">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Concurrency Guard</span>
              <h3 className="font-extrabold text-sm text-white">Automated Billing Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Celery tasks scan due contracts, acquire row locks, advance billing dates, and generate PDF invoices.
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-indigo-500/20 text-[10px] font-mono space-y-1 text-left">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-indigo-500/20">
                <span className="text-emerald-400 font-bold">run_billing_cycle</span>
                <span className="text-indigo-300">celery@worker-1</span>
              </div>
              <p className="text-slate-400">&gt; Evaluating active contracts...</p>
              <p className="text-indigo-300">&gt; select_for_update() locked</p>
              <p className="text-emerald-400">&gt; Generated #INV-2026-0084 ($47,980)</p>
              <p className="text-slate-400">&gt; Next cycle date: 2026-11-30</p>
            </div>
          </div>

          {/* Card 3: Tamper-Evident Audit Trail (Soft Lilac Fill) */}
          <div className="lg:col-span-4 lg:row-span-2 bg-gradient-to-b from-[#FAF5FF] to-[#FAF8FF] rounded-3xl p-5 border border-purple-100/70 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-5">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Security Ledger</span>
              <h3 className="font-extrabold text-sm text-slate-900">Tamper-Evident Audit Trail</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Every state transition, quotation approval, invoice payment, and PDF download is immutably logged with actor and timestamp.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-purple-100/60 shadow-sm space-y-3 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                <span>Security Events</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {[
                { action: 'INVOICE_CONFIRMED', detail: '#INV-2026-0083 moved to Due state', time: '10:30 AM', color: 'text-indigo-600 bg-indigo-50' },
                { action: 'PAYMENT_ALLOCATED', detail: 'Received $47,980 via Bank Wire', time: '11:15 AM', color: 'text-emerald-600 bg-emerald-50' },
                { action: 'PDF_EXPORTED', detail: 'ReportLab invoice PDF generated', time: '01:20 PM', color: 'text-purple-600 bg-purple-50' },
                { action: 'CYCLE_ADVANCED', detail: 'Advanced next_billing_date automatically', time: '02:45 PM', color: 'text-blue-600 bg-blue-50' },
                { action: 'BATCH_BILLING_OK', detail: '0 duplicate charges recorded', time: '04:10 PM', color: 'text-emerald-600 bg-emerald-50' },
              ].map((ev, i) => (
                <div key={i} className="text-[11px] space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${ev.color}`}>{ev.action}</span>
                    <span className="text-[9px] text-slate-400">{ev.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{ev.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: MRR & ARR Run Rate (Soft Mint / Emerald Fill) */}
          <div className="lg:col-span-4 bg-gradient-to-b from-[#F0FDF4]/50 to-[#F8FAFC] rounded-3xl p-5 border border-emerald-100/70 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-4">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Financial Velocity</span>
              <h3 className="font-extrabold text-sm text-slate-900">Normalized Revenue</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Metrics calculated strictly on recurring subscription contracts, not cash timing.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-100/60 shadow-sm space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-black text-slate-900">$2,450,800</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">+18.4% YoY</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full w-[84%]" />
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Daily, Weekly, Monthly, and Yearly normalization.</span>
            </div>
          </div>

          {/* Card 5: Multi-Tenant Customer Accounts (Soft Amber Fill) */}
          <div className="lg:col-span-4 bg-gradient-to-b from-[#FFFBEB]/50 to-[#F8FAFC] rounded-3xl p-5 border border-amber-100/70 shadow-sm flex flex-col justify-between">
            <div className="space-y-1.5 mb-4">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Data Isolation</span>
              <h3 className="font-extrabold text-sm text-slate-900">Customer Multi-Tenancy</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Queryset-level filtering ensures clients strictly access their own records.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-100/60 shadow-sm space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Acme Global Systems</span>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-100">Active</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Outstanding Balance</span>
                <span className="font-extrabold text-slate-900">$0.00 (All Settled)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. AESTHETIC METRICS (Jewel Dots & Soft Tint Cards)
         ========================================================================= */}
      <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        <div className="max-w-md mx-auto space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Engineered for reliability.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Transaction safety and strict data isolation across every financial boundary.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              stat: '40%',
              desc: 'Faster billing reconciliation via automated database invoice generation.',
              dot: 'bg-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.6)]',
              bg: 'bg-gradient-to-b from-[#FBFBFF] to-[#F5F3FF]/40 border-indigo-100/60',
            },
            {
              stat: '3x',
              desc: 'Higher revenue recovery using automated overdue notifications and payment tracking.',
              dot: 'bg-[#EC4899] shadow-[0_0_12px_rgba(236,72,153,0.6)]',
              bg: 'bg-gradient-to-b from-[#FFF1F2]/30 to-[#FAFAFB] border-rose-100/60',
            },
            {
              stat: '100%',
              desc: 'Idempotency guarantee with row locking to eliminate duplicate charges.',
              dot: 'bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.6)]',
              bg: 'bg-gradient-to-b from-[#ECFDF5]/30 to-[#FAFAFB] border-emerald-100/60',
            },
            {
              stat: '10k+',
              desc: 'Recurring cycles executed reliably without manual intervention.',
              dot: 'bg-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.6)]',
              bg: 'bg-gradient-to-b from-[#FFFBEB]/30 to-[#FAFAFB] border-amber-100/60',
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`${item.bg} rounded-3xl p-5 border shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl font-black text-slate-950 tracking-tight">{item.stat}</span>
                <span className={`w-2 h-2 rounded-full ${item.dot} mt-2`} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. GUIDED 3-STEP PIPELINE (Gradient Number Badges)
         ========================================================================= */}
      <section id="pipeline" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-md mx-auto space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Deploy in three steps.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            From product catalog configuration to automated recurring billing runs in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Clean Miniature Preview Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-50/50 via-purple-50/40 to-slate-50 p-5 rounded-3xl border border-indigo-100/70 shadow-sm">
            <div className="bg-white rounded-2xl border border-indigo-100/60 p-4 space-y-2.5 text-xs shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-[10px] text-slate-400 font-mono">
                brightloop.io/dashboard
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-0.5">
                <span className="text-[10px] font-bold text-[#4F46E5]">Step 1: Catalog</span>
                <p className="font-bold text-slate-900 text-xs">Products, Variants & Tax Rules</p>
                <p className="text-[10px] text-slate-400">Base prices, SKU adjustments, and tax rules.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-0.5">
                <span className="text-[10px] font-bold text-[#7C3AED]">Step 2: Subscriptions</span>
                <p className="font-bold text-slate-900 text-xs">Active Recurring Contracts</p>
                <p className="text-[10px] text-slate-500">Row-locked recurring cycle evaluation.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-700">Step 3: Payments</span>
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
                gradient: 'from-[#6366F1] to-[#4F46E5]',
              },
              {
                num: '02',
                title: 'Convert Quotes to Binding Subscriptions',
                desc: 'Generate quotations with automatic tax calculations, discount rules, and PDF exports. Confirm with a single click to trigger recurring contracts.',
                gradient: 'from-[#8B5CF6] to-[#7C3AED]',
              },
              {
                num: '03',
                title: 'Automate Execution & Collect Payments',
                desc: 'The billing engine evaluates due contracts, advances dates without month-end drift, and accepts multi-rail payments with zero overpayment tolerance.',
                gradient: 'from-[#EC4899] to-[#D946EF]',
              },
            ].map((step, idx) => (
              <div
                key={idx}
                onClick={() => setActiveStep(idx + 1)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  activeStep === idx + 1
                    ? 'bg-indigo-50/40 border-indigo-200 shadow-sm ring-1 ring-indigo-200'
                    : 'bg-white border-slate-100 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${step.gradient} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm`}>
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
          6. CASE STUDY & AESTHETIC MIDNIGHT CTA
         ========================================================================= */}
      <section id="stories" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        {/* Testimonial Quote */}
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex justify-center gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
          <blockquote className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
            "Brightloop completely transformed our recurring revenue workflow. We eliminated billing race conditions, cut monthly reconciliation time by 80%, and our cash collections are tracked in real-time."
          </blockquote>
          <div className="text-xs pt-1">
            <span className="font-bold text-slate-900 block">Marcus Vance</span>
            <span className="text-slate-400">VP of Financial Operations, BrightWave Global</span>
          </div>
        </div>

        {/* Midnight Violet Aesthetic CTA Box */}
        <div className="mt-16 p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#0F1026] via-[#161738] to-[#251A4E] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-left border border-indigo-900/40">
          <div className="space-y-1.5 max-w-lg">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ready to automate your billing engine?
            </h3>
            <p className="text-xs text-indigo-200/80 font-normal">
              Sign in with demo credentials or register a customer account to experience live recurring billing.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link to="/register" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:brightness-110 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-95 whitespace-nowrap">
                Start Free Trial
              </button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all active:scale-95 whitespace-nowrap">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. WHISPER-QUIET MINIMALIST FOOTER
         ========================================================================= */}
      <footer className="py-8 bg-white border-t border-indigo-100/60 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] text-white text-[10px] font-bold flex items-center justify-center">
              B
            </div>
            <span className="font-bold text-slate-800">Brightloop</span>
            <span>© 2026</span>
          </div>

          <div className="flex items-center gap-6 text-slate-500 font-medium">
            <a href="http://127.0.0.1:8000/api/v1/docs/" target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">API Docs</a>
            <Link to="/login" className="hover:text-indigo-600 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-indigo-600 transition-colors">Register</Link>
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
