import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Repeat,
  FileText,
  CreditCard,
  BarChart3,
  Layers,
  Users,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Check,
  Star,
  Clock,
  Calendar,
  MessageSquare,
  Search,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Building,
  Briefcase,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthContext'

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const [activeStep, setActiveStep] = useState(1)

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#5B4DF6]/15 selection:text-[#5B4DF6] relative overflow-hidden">
      {/* Ethereal Lavender Ambient Glow in Background */}
      <div className="absolute top-0 inset-x-0 h-[820px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_90%_65%_at_50%_-10%,rgba(167,139,250,0.28),rgba(129,140,248,0.18),rgba(255,255,255,0)_75%)]" />

      {/* Decorative Soft Clouds Graphic Behind Hero */}
      <div className="absolute top-44 -left-20 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-36 -right-20 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* =========================================================================
          1. TOP NAVIGATION BAR (TaskGo Style)
         ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5B4DF6] to-[#818CF8] flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900">Brightloop</span>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#home" className="text-slate-900 font-bold hover:text-[#5B4DF6] transition-colors">Home</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#why-choose" className="hover:text-slate-900 transition-colors">Why Choose</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-slate-900 transition-colors">Testimonial</a>
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors inline-flex items-center gap-1"
            >
              API Docs <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to={user?.role === 'CUSTOMER' ? '/portal' : '/dashboard'}>
                <button className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
                  Go to {user?.role === 'CUSTOMER' ? 'Portal' : 'Dashboard'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-block text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register">
                  <button className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95">
                    Contact Us
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION WITH ETHEREAL SKY & FLOATING PRODUCT SHOWCASE
         ========================================================================= */}
      <section id="home" className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center relative">
        {/* Centered Heading */}
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
            Simplify Subscription Management<br />
            <span className="text-[#5B4DF6]">Boost Recurring Revenue</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
            Easily manage subscriptions, automate recurring billing cycles, and scale customer operations from start to finish.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-3 pt-4 pb-2">
            <Link to="/register">
              <button className="px-7 py-3 rounded-full bg-[#5B4DF6] hover:bg-[#4E3FE6] text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95">
                Get Started Free
              </button>
            </Link>
            <Link to="/invoices">
              <button className="px-7 py-3 rounded-full bg-white/90 hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95">
                Book a Demo
              </button>
            </Link>
          </div>
        </div>

        {/* Floating Product Showcase with Role Badges */}
        <div className="mt-14 relative max-w-5xl mx-auto">
          {/* Floating Pill Badges around Showcase */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md absolute -top-4 -left-6 z-20 text-[11px] font-semibold text-slate-700 animate-bounce duration-1000">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>📊 Revenue Analytics</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md absolute top-20 -left-12 z-20 text-[11px] font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-[#5B4DF6]" />
            <span>Tech Developer</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md absolute -top-3 -right-6 z-20 text-[11px] font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>⚡ Automated Billing</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md absolute top-24 -right-12 z-20 text-[11px] font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Human Resources</span>
          </div>

          {/* Main App Showcase Card (White Island with Rounded Borders & Shadow) */}
          <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-2xl shadow-indigo-500/10 p-5 sm:p-7 overflow-hidden text-left">
            {/* Mockup Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#5B4DF6] flex items-center justify-center text-white text-xs font-bold">
                    B
                  </div>
                  <span className="font-bold text-sm text-slate-900">Task Boards</span>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold">Dashboard</span>
                  <span>My Tasks</span>
                  <span>Activity</span>
                  <span>Analytics</span>
                  <span>Calendar</span>
                </div>
              </div>

              {/* Avatars Stack & Filter */}
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
                <span className="hover:text-slate-800 cursor-pointer">List View</span>
                <span className="hover:text-slate-800 cursor-pointer">Timeline</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Search Tasks:</span>
                <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  <span>Filter by SKU, invoice #</span>
                </div>
              </div>
            </div>

            {/* Kanban Columns (4 Columns matching Reference Mockup) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
              {/* Column 1: To Do */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>To Do</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center">3</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-[#5B4DF6]">Subscription Tier</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Competitive Analysis & Base Pricing</p>
                  <p className="text-[10px] text-slate-400">Benchmark recurring plan charges against industry tiers.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-bold text-slate-900">$68,750.00</span>
                    <span>In 2 days</span>
                  </div>
                </div>
              </div>

              {/* Column 2: In Process */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>In Process</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center">2</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600">UI / Frontend</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Dashboard UI Refinement</p>
                  <p className="text-[10px] text-slate-400">Polished finnova dark workbench and inspector card.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-bold text-slate-900">$21,480.00</span>
                    <span>In 4 days</span>
                  </div>
                </div>
              </div>

              {/* Column 3: In Review */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>In Review</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center">4</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700">Automated Run</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Review Task Automation Rules</p>
                  <p className="text-[10px] text-slate-400">Monthly billing cycle generation and PDF render engine.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-bold text-slate-900">$47,980.00</span>
                    <span>In 5 days</span>
                  </div>
                </div>
              </div>

              {/* Column 4: Completed */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Completed</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center">8</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">Settled & Paid</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">End-to-End Consistency</p>
                  <p className="text-[10px] text-slate-400">All tests verified and transaction-safe idempotency.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-bold text-slate-900">$55,230.00</span>
                    <span className="text-emerald-600 font-bold">Paid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. ENTERPRISE CLIENT LOGOS STRIP
           ========================================================================= */}
        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-slate-500 max-w-xs text-left">
            Endorsed by the globe's leading innovative enterprises.
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 justify-center">
            {['IP/UM', 'Legalpium', '∞ Infinity', 'LOGO', 'Vercel'].map((client, idx) => (
              <div
                key={idx}
                className="px-5 py-2.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-600 tracking-wider shadow-sm"
              >
                {client}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. BENTO GRID FEATURES ("Unlock Premium Benefits With Our Advanced Features.")
         ========================================================================= */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Unlock Premium Benefits With<br />Our Advanced Features.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Unlock premium benefits with advanced billing features designed to scale.
          </p>
        </div>

        {/* Bento Grid (Matching reference layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-6xl mx-auto">
          {/* Top Left: Smart Task Organization (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-6">
              <h3 className="font-extrabold text-base text-slate-900">Smart Task Organization</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Create, categorize, and prioritize customer plans with ease using flexible schedules, tiers, and auto-renewals.
              </p>
            </div>

            {/* Inner Sub-Card Preview */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Volume</span>
                  <span className="text-base font-black text-slate-900">105 Tasks</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                  Active Sprint
                </div>
              </div>

              {/* Progress Bar (Pink, Purple, Cyan, Gray) */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
                <div className="h-full bg-purple-500 w-[42%]" />
                <div className="h-full bg-[#5B4DF6] w-[28%]" />
                <div className="h-full bg-amber-400 w-[18%]" />
                <div className="h-full bg-slate-300 w-[12%]" />
              </div>

              <div className="space-y-1.5 pt-1 text-[11px] text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Active Plan</span>
                  <span className="font-bold text-slate-900">42 items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#5B4DF6]" /> In Progress</span>
                  <span className="font-bold text-slate-900">30 items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Under Review</span>
                  <span className="font-bold text-slate-900">18 items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Middle: Automated Workflows (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-6">
              <h3 className="font-extrabold text-base text-slate-900">Automated Workflows</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Streamline recurring billing runs with automated invoice generation, safe retries, and scheduled notifications.
              </p>
            </div>

            {/* Inner Workflow Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Assignments / Pipeline</span>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-[#5B4DF6]">Billing Engine Run</span>
                <p className="text-xs font-bold text-slate-900">User Journey Mapping & Design System Status</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Due in 3 days</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Ready</span>
                </div>
              </div>

              <button className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                <Plus className="w-3.5 h-3.5 text-[#5B4DF6]" />
                <span>Add new component</span>
              </button>
            </div>
          </div>

          {/* Right Tall Card: File & Comment Management (4 cols, spans 2 rows) */}
          <div className="lg:col-span-4 lg:row-span-2 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-6">
              <h3 className="font-extrabold text-base text-slate-900">File & Comment Management</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Consolidate immutable PDF invoices, email receipts, payment logs, and comprehensive tamper-evident audit threads.
              </p>
            </div>

            {/* Live Message / Audit Feed */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold text-slate-900">New Messages & Audit</span>
                <span className="w-2 h-2 rounded-full bg-[#5B4DF6]" />
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Henry Mason', text: 'Invoice #INV-1003 confirmed & due', time: '10:30 AM', online: true },
                  { name: 'Boni Rey', text: 'Payment of $47,980 allocated via Stripe', time: '11:15 AM', online: false },
                  { name: 'Liam Parker', text: 'Downloaded PDF report for Acme Global', time: '01:20 PM', online: true },
                  { name: 'Emma Collins', text: 'Plan auto-renewed for next cycle', time: '02:45 PM', online: true },
                  { name: 'Boni Rey', text: 'Batch billing completed with 0 errors', time: '04:10 PM', online: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-left">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold text-[10px] flex items-center justify-center relative flex-shrink-0">
                      {item.name[0]}
                      {item.online && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Left: Real-Time Progress Tracking (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">Real-Time Progress Tracking</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Track deadlines, milestones, and performance with live status updates and visual indicators.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">MRR Velocity</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  +18.4%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-[#5B4DF6] h-2 rounded-full w-[82%]" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">82% of target quarterly recurring collections realized.</p>
            </div>
          </div>

          {/* Bottom Middle: Project Overview (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">Project Overview</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Consolidated accounts, team allocations, and organizational status at a glance.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Acme Enterprise</span>
                  <span className="text-[10px] text-slate-400">Software & Support</span>
                </div>
                <div className="flex -space-x-1.5 overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">A</div>
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center">B</div>
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">+20</div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-600 flex justify-between">
                <span>Enterprise SLA: Active</span>
                <span className="font-bold text-slate-900">₹42,000 / mo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. "WHY TEAMS CHOOSE TASK PILOT / BRIGHTLOOP" STATS SECTION
         ========================================================================= */}
      <section id="why-choose" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Why Teams Choose Brightloop
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Trusted by teams to manage work more efficiently. Designed to help teams do their best work.
          </p>
        </div>

        {/* 4 Clean Minimalist Stat Cards with Violet Dot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {/* Card 1 */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <span className="text-4xl font-black text-slate-950 tracking-tight">40%</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B4DF6]" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Faster Task Completion and automated workflows.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <span className="text-4xl font-black text-slate-950 tracking-tight">3x</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B4DF6]" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Higher Team Alignment and Real-time updates.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <span className="text-4xl font-black text-slate-950 tracking-tight">100%</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B4DF6]" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Real-Time Insights Across end-to-end progress boundaries.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 shadow-sm text-left flex flex-col justify-between h-48 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <span className="text-4xl font-black text-slate-950 tracking-tight">10k+</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B4DF6]" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Active Users from Startups, agencies, and growing teams.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. "GET STARTED IN JUST 3 EASY STEPS"
         ========================================================================= */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Get Started In Just 3 Easy Steps
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Get started in just 3 easy steps with a guided onboarding experience designed for speed and simplicity.
          </p>
        </div>

        {/* Split 2-Column Section: Left Mockup, Right 3 Steps */}
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
                  <span className="text-[10px] text-[#5B4DF6] font-bold">Step 1: Setup</span>
                  <p className="text-xs font-bold text-slate-800">Add Product & Pricing Tiers</p>
                  <p className="text-[10px] text-slate-400">Configure recurring intervals (daily, weekly, monthly, yearly).</p>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <span className="text-[10px] text-[#5B4DF6] font-bold">Step 2: Automate</span>
                  <p className="text-xs font-bold text-indigo-950">Batch Billing Engine</p>
                  <p className="text-[10px] text-slate-500">Atomic invoice generation with PostgreSQL row-locking.</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-[#5B4DF6] font-bold">Step 3: Collect</span>
                  <p className="text-xs font-bold text-slate-800">PDF Invoices & Instant Payouts</p>
                  <p className="text-[10px] text-slate-400">Automated receipts with multi-rail payments.</p>
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
                  ? 'bg-slate-50/90 border-slate-200 shadow-sm ring-1 ring-[#5B4DF6]/20'
                  : 'bg-white border-slate-100 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#5B4DF6] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                  01
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">Simple And Fast Setup</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Sales teams powered by AI for top-notch decision making. Configure your products, variants, and tax rules in under 5 minutes.
                  </p>

                  {activeStep === 1 && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>✓ Ready-made demo data seeder built-in</span>
                      <span className="font-bold text-[#5B4DF6]">Auto-configured</span>
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
                  ? 'bg-slate-50/90 border-slate-200 shadow-sm ring-1 ring-[#5B4DF6]/20'
                  : 'bg-white border-slate-100 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-[#5B4DF6] font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                  02
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">Work Together Effortlessly</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Sales teams enhanced by AI for superior decision making. Multi-tenant access controls keep customer, staff, and admin workflows strictly isolated.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div
              onClick={() => setActiveStep(3)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                activeStep === 3
                  ? 'bg-slate-50/90 border-slate-200 shadow-sm ring-1 ring-[#5B4DF6]/20'
                  : 'bg-white border-slate-100 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-[#5B4DF6] font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                  03
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">Monitor Your Progress</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    AI-empowered sales teams for exceptional decision making. Live MRR/ARR velocity reports and instant invoice resolution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. "REAL RESULTS, REAL IMPACT. OUR SUCCESS STORIES"
         ========================================================================= */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Real Results, Real Impact.<br />Our Success Stories
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Real-world success stories showcasing growth, performance, and productivity improvements.
          </p>
        </div>

        {/* Testimonial Card */}
        <div className="max-w-3xl mx-auto p-8 rounded-[32px] bg-slate-50/80 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-center gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>

          <blockquote className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed max-w-xl mx-auto">
            "Brightloop completely transformed our recurring revenue workflow. We eliminated manual billing errors, cut reconciliation time by 80%, and our cash collection has never been faster."
          </blockquote>

          <div className="pt-2">
            <span className="block font-black text-xs text-slate-900">Sarah Jenkins</span>
            <span className="text-[11px] text-slate-400">VP of Finance & Operations, BrightWave Global</span>
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
              <button className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#5B4DF6] hover:bg-[#4E3FE6] text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-95 whitespace-nowrap">
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
          8. CLEAN MINIMALIST FOOTER
         ========================================================================= */}
      <footer className="py-10 bg-white border-t border-slate-100 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#5B4DF6] flex items-center justify-center text-white text-[10px] font-bold">
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
