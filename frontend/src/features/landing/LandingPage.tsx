import React from 'react'
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
  CheckCircle2,
  Lock,
  Cpu,
  Users,
  ExternalLink,
  ChevronRight,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/features/auth/AuthContext'

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-primary/10 selection:text-primary">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:bg-primary-700 transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">Brightloop</span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">Subscription Infrastructure</span>
            </div>
          </Link>

          {/* Clean Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-950 transition-colors">Features</a>
            <a href="#plans" className="hover:text-slate-950 transition-colors">Plans & Pricing</a>
            <a href="#architecture" className="hover:text-slate-950 transition-colors">Architecture</a>
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-950 transition-colors inline-flex items-center gap-1"
            >
              OpenAPI Docs <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link to={user?.role === 'CUSTOMER' ? '/portal' : '/dashboard'}>
                <Button size="sm" className="font-semibold shadow-sm">
                  Go to {user?.role === 'CUSTOMER' ? 'Portal' : 'Dashboard'}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-semibold">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="font-semibold shadow-sm">
                    Get Started Free
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40 border-b border-slate-200/60 overflow-hidden">
        {/* Subtle background ambient light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[380px] bg-blue-100/40 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Pill Announcement */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Brightloop 2.0 • Enterprise Recurring Billing Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Modern Subscription Billing.{' '}
            <span className="text-primary">
              Precise, Automated & Zero Leakage.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            A minimalist, full-stack platform built on Django REST Framework and React 19. Manage recurring cycles, immutable invoice snapshots, variant delta adjustments, and client self-service with absolute financial accuracy.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto font-bold px-8 shadow-sm">
                Open Live Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-semibold px-6 bg-white hover:bg-slate-50 text-slate-800 border-slate-300"
              >
                <Cpu className="w-4 h-4 mr-2 text-primary" />
                Swagger API Explorer
              </Button>
            </a>
          </div>

          {/* Minimalist Light UI Preview */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xl overflow-hidden text-left">
              {/* Window Header */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400">brightloop.io/dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">All Systems Live</Badge>
                  <span className="font-mono text-[11px] text-slate-500">PostgreSQL • 10.4ms</span>
                </div>
              </div>

              {/* Mock Dashboard Metric Tiles */}
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500">Monthly Recurring Revenue</span>
                    <p className="text-xl font-black text-slate-900 mt-1">$4,581.80</p>
                    <span className="text-[10px] text-emerald-600 font-medium">↑ Normalized recurring charges</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500">Annual Run Rate (ARR)</span>
                    <p className="text-xl font-black text-blue-600 mt-1">$54,981.60</p>
                    <span className="text-[10px] text-slate-400 font-medium">MRR × 12 annualized</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500">Active Subscriptions</span>
                    <p className="text-xl font-black text-slate-900 mt-1">2 Live Tiers</p>
                    <span className="text-[10px] text-slate-400 font-medium">Zero duplicate invoices</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500">Cash Collected</span>
                    <p className="text-xl font-black text-emerald-600 mt-1">$4,581.62</p>
                    <span className="text-[10px] text-slate-400 font-medium">Bank transfer & card</span>
                  </div>
                </div>

                {/* Quick login demo bar */}
                <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Includes preloaded enterprise data. Test as Admin, Staff, or Client in 1-click.</span>
                  </div>
                  <Link to="/login">
                    <Button size="sm" className="text-xs font-semibold">
                      Sign In Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats Bar */}
      <section className="py-10 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-black text-slate-950">10.4 ms</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Average API Latency</p>
            </div>
            <div>
              <p className="text-3xl font-black text-primary">100%</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Billing Idempotency</p>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-600">Zero Overpay</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Balance Guard Protection</p>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-950">ACID Safe</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">PostgreSQL + Celery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider">Modular Platform</h2>
            <p className="text-3xl font-black text-slate-950 tracking-tight mt-1.5">
              Built for Scale, Simplicity and Auditability
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Every component works seamlessly together out of the box with zero mock data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center mb-4">
                <Repeat className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automated Recurring Billing</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Daily, weekly, monthly, and yearly billing cycles. Uses month-end safe calendar math and exclusive database row locks to prevent duplicate invoices.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Immutable Invoice Snapshots</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Confirmed invoices lock pricing snapshots permanently. Historical balances and PDF documents remain accurate even if catalog prices change later.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Payment Ledger & Overpay Guard</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Multi-payment recording (Bank Wire, UPI, Card, Cash) with strict balance enforcement to prevent accidental overpayments.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Product Variants & Price Delta</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Configure base catalog items with variant price adjustments (e.g. Base $2,000 + Addon $560 = $2,560). Admin-only pricing authorization.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Customer Self-Service Portal</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Dedicated customer portal with strict database tenant isolation. Customers view plans, download PDF invoices, and request pauses or closures.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Normalized MRR & ARR Reports</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Live database analytics tracking normalized recurring velocity rather than cash timing fluctuations. Includes instant CSV export.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plan / Pricing Section */}
      <section id="plans" className="py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider">Subscription Tiers</h2>
            <p className="text-3xl font-black text-slate-950 tracking-tight mt-1.5">
              Configured Recurring Plans
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Ready to subscribe or customize via the administrative console.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {/* Plan 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <Badge variant="neutral">Starter</Badge>
                <h3 className="text-lg font-bold text-slate-900 mt-3">Starter Monthly</h3>
                <p className="text-xs text-slate-500 mt-1">For small teams getting started with recurring billing.</p>
                <div className="mt-5">
                  <span className="text-3xl font-black text-slate-950">$99</span>
                  <span className="text-xs text-slate-400 font-medium"> / month</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Automated monthly cycles</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> PDF invoices & downloads</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Pause & resume allowed</li>
                </ul>
              </div>
              <Link to="/login" className="mt-7">
                <Button variant="outline" className="w-full text-xs font-semibold">
                  Subscribe in Portal
                </Button>
              </Link>
            </div>

            {/* Plan 2 - Featured */}
            <div className="p-6 rounded-2xl bg-white border-2 border-primary shadow-md relative flex flex-col justify-between">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                Recommended
              </div>
              <div>
                <Badge variant="default">Business</Badge>
                <h3 className="text-lg font-bold text-slate-900 mt-3">Pro Business Monthly</h3>
                <p className="text-xs text-slate-500 mt-1">Full feature access, priority engine execution, and unlimited invoices.</p>
                <div className="mt-5">
                  <span className="text-3xl font-black text-slate-950">$499</span>
                  <span className="text-xs text-slate-400 font-medium"> / month</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Variant adjustment engine</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Automated overdue detection</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Multi-method manual payments</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Audit trail logging</li>
                </ul>
              </div>
              <Link to="/login" className="mt-7">
                <Button className="w-full text-xs font-bold shadow-sm">
                  Subscribe in Portal
                </Button>
              </Link>
            </div>

            {/* Plan 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <Badge variant="neutral">Enterprise</Badge>
                <h3 className="text-lg font-bold text-slate-900 mt-3">Enterprise Annual</h3>
                <p className="text-xs text-slate-500 mt-1">Annual commitment with custom discount allocations and SLA.</p>
                <div className="mt-5">
                  <span className="text-3xl font-black text-slate-950">$4,999</span>
                  <span className="text-xs text-slate-400 font-medium"> / year</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Annualized discount yield</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Customer self-service portal</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Full CSV financial reporting</li>
                </ul>
              </div>
              <Link to="/login" className="mt-7">
                <Button variant="outline" className="w-full text-xs font-semibold">
                  Subscribe in Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Security Section */}
      <section id="architecture" className="py-16 bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <Badge variant="info">Security & Infrastructure</Badge>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Production-Ready Django REST & React Monorepo
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                Django session authentication with HttpOnly cookies, SameSite=Lax, and automatic CSRF tokens. Protected by row-level locking and comprehensive automated test coverage.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="md" className="w-full sm:w-auto font-bold shadow-sm">
                  Sign In to Live App
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Minimalist Footer */}
      <footer className="py-8 bg-white border-t border-slate-200/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-white text-[10px] font-bold">
              B
            </div>
            <span className="font-semibold text-slate-700">Brightloop Subscription Management System</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="http://127.0.0.1:8000/api/v1/docs/" target="_blank" rel="noreferrer" className="hover:text-slate-800 transition-colors">Swagger API</a>
            <Link to="/login" className="hover:text-slate-800 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-slate-800 transition-colors">Register</Link>
          </div>
          <p>© 2026 Brightloop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
