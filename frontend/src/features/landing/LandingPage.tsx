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
  Globe,
  Cpu,
  Download,
  Users,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/features/auth/AuthContext'

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-primary selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-white leading-tight">Brightloop</span>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Billing Infrastructure</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#plans" className="hover:text-white transition-colors">Pricing & Plans</a>
            <a
              href="http://127.0.0.1:8000/api/v1/docs/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              API Docs <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to={user?.role === 'CUSTOMER' ? '/portal' : '/dashboard'}>
                <Button size="md" className="font-semibold shadow-md shadow-primary/25">
                  Go to {user?.role === 'CUSTOMER' ? 'Customer Portal' : 'Dashboard'}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="md" className="text-slate-300 hover:text-white hover:bg-slate-800">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="md" className="font-semibold shadow-md shadow-primary/25">
                    Start Free
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/20 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-blue-300 mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Brightloop Billing Core 2.0 • Django REST + React 19 Monorepo
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
            Automated Subscription Billing{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-primary to-indigo-400">
              Without Friction or Leakage.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Brightloop unites transactional recurring billing engines, strict tenant isolation, immutable invoice snapshots, dynamic product variant adjustments, and customer self-service into an enterprise system.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 py-3.5 h-auto shadow-xl shadow-primary/25 font-bold">
                Launch Live Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
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
                className="w-full sm:w-auto text-base px-6 py-3.5 h-auto border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <Cpu className="w-5 h-5 mr-2 text-primary" />
                OpenAPI Specification
              </Button>
            </a>
          </div>

          {/* Dashboard Preview Graphic */}
          <div className="mt-16 max-w-5xl mx-auto relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-primary via-blue-500 to-indigo-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition duration-500" />
            
            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-6 shadow-2xl text-left">
              {/* Fake Window Controls */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-3 font-mono text-xs text-slate-500">brightloop.io/dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">All Services Operational</Badge>
                  <span className="font-mono text-xs text-slate-500">API 10.4ms</span>
                </div>
              </div>

              {/* Live Mock Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Monthly Recurring Revenue</span>
                  <p className="text-xl sm:text-2xl font-black text-white mt-1">$4,581.80</p>
                  <span className="text-[10px] text-green-400 font-medium">↑ Normalized baseline</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Annual Run Rate (ARR)</span>
                  <p className="text-xl sm:text-2xl font-black text-blue-400 mt-1">$54,981.60</p>
                  <span className="text-[10px] text-slate-500 font-medium">MRR × 12 annualized</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Active Subscriptions</span>
                  <p className="text-xl sm:text-2xl font-black text-green-400 mt-1">2 Live Tiers</p>
                  <span className="text-[10px] text-slate-500 font-medium">0% churn leakage</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Billing Engine Health</span>
                  <p className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">100% Idempotent</p>
                  <span className="text-[10px] text-slate-500 font-medium">Row lock guaranteed</span>
                </div>
              </div>

              {/* Interactive Quick Try CTA inside preview */}
              <div className="mt-6 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-white">Preloaded with realistic enterprise demo data.</span>
                    <span className="text-slate-400 ml-1">Explore as Administrator, Staff, or Client.</span>
                  </div>
                </div>
                <Link to="/login">
                  <Button size="sm" variant="secondary" className="text-xs">
                    Sign In with 1-Click Fill
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="py-12 border-y border-slate-800 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white">10.4 ms</p>
              <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Avg API Latency</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-primary">100%</p>
              <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Billing Idempotency</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-green-400">0 Overpay</p>
              <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Balance Guard Protection</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-indigo-400">ACID Safe</p>
              <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">PostgreSQL + Celery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Enterprise Architecture</h2>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Everything Needed to Power Subscription Billing
            </p>
            <p className="text-slate-400 text-sm mt-3">
              Built from first principles for reliability, auditability, and speed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Repeat className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Automated Recurring Engine</h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Daily, weekly, monthly, and yearly recurring periods. Features leap-year safe arithmetic and database row-level locking (<code className="text-blue-300">select_for_update</code>) to prevent race conditions.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-primary font-semibold">
                <span>Safe Retries & Zero Duplicates</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Immutable Invoice Snapshots</h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Confirmed invoices capture an immutable snapshot of items, SKUs, and taxes. Historical accounting balances remain intact even when catalog product prices change.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-green-400 font-semibold">
                <span>Vector ReportLab PDF Generation</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Payment Ledger & Overpay Guard</h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Transaction-safe payment recording with automatic balance reductions. Enforces balance constraints to prevent accidental overpayments while transitioning statuses.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-amber-400 font-semibold">
                <span>Bank, UPI, Card, Cash & Gateways</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Product Variants & Price Delta</h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Support modular product variants with customized price delta adjustments (e.g. Base $2,000 + Odoo Module $560 = $2,560 unit price). Admin pricing controls enforced.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-indigo-400 font-semibold">
                <span>Admin RBAC Pricing Guards</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Customer Self-Service Portal</h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Dedicated tenant-isolated customer views (<code className="text-blue-300">/portal</code>). Customers can view active plans, download official invoice PDFs, inspect receipts, and pause or cancel subscriptions.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-blue-400 font-semibold">
                <span>Strict Database Query Isolation</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Real-Time MRR & Financial Metrics</h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Live normalized calculation of Monthly Recurring Revenue (MRR) and Annual Run Rate (ARR) based on normalized subscription frequency rather than cash timing. Includes CSV exports.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-purple-400 font-semibold">
                <span>Accurate Revenue Recognition</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Plan Catalog Section */}
      <section id="plans" className="py-24 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Subscription Tiers</h2>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Transparent, High-Velocity Plans
            </p>
            <p className="text-slate-400 text-sm mt-3">
              Explore the billing plans preconfigured in Brightloop.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Plan 1 */}
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <Badge variant="neutral">Starter</Badge>
                <h3 className="text-xl font-bold text-white mt-4">Starter Monthly</h3>
                <p className="text-xs text-slate-400 mt-1">Designed for agile teams starting subscription automation.</p>
                <div className="mt-6">
                  <span className="text-4xl font-black text-white">$99</span>
                  <span className="text-xs text-slate-400 font-medium"> / month</span>
                </div>
                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Automated monthly cycles</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> PDF invoices & downloads</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Pause & resume allowed</li>
                </ul>
              </div>
              <Link to="/login" className="mt-8">
                <Button variant="outline" className="w-full text-xs border-slate-700 bg-slate-800 text-slate-200 hover:text-white">
                  Subscribe via Portal
                </Button>
              </Link>
            </div>

            {/* Plan 2 - Featured */}
            <div className="p-8 rounded-2xl bg-slate-900 border-2 border-primary relative flex flex-col justify-between shadow-xl shadow-primary/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                Most Popular Tier
              </div>
              <div>
                <Badge variant="default">Business</Badge>
                <h3 className="text-xl font-bold text-white mt-4">Pro Business Monthly</h3>
                <p className="text-xs text-slate-400 mt-1">Full feature access, priority engine execution, and unlimited invoices.</p>
                <div className="mt-6">
                  <span className="text-4xl font-black text-white">$499</span>
                  <span className="text-xs text-slate-400 font-medium"> / month</span>
                </div>
                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Full variant adjustment engine</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Automated overdue detection</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Multi-method manual payments</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Audit logs & notifications</li>
                </ul>
              </div>
              <Link to="/login" className="mt-8">
                <Button className="w-full text-xs font-bold shadow-md shadow-primary/20">
                  Subscribe via Portal
                </Button>
              </Link>
            </div>

            {/* Plan 3 */}
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <Badge variant="neutral">Enterprise</Badge>
                <h3 className="text-xl font-bold text-white mt-4">Enterprise Annual</h3>
                <p className="text-xs text-slate-400 mt-1">Annual commitment with custom discount allocations and SLA.</p>
                <div className="mt-6">
                  <span className="text-4xl font-black text-white">$4,999</span>
                  <span className="text-xs text-slate-400 font-medium"> / year</span>
                </div>
                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Annualized discount yield</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Dedicated customer portal access</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Full CSV financial reporting</li>
                </ul>
              </div>
              <Link to="/login" className="mt-8">
                <Button variant="outline" className="w-full text-xs border-slate-700 bg-slate-800 text-slate-200 hover:text-white">
                  Subscribe via Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Architecture Highlight */}
      <section id="architecture" className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl space-y-4">
              <Badge variant="info">Security & Compliance</Badge>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Enterprise Data Isolation & Safe Financial Transitions
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Brightloop isolates customer records at the ORM queryset level, guards authenticated sessions with SameSite HttpOnly cookies, and requires complex passwords (min. 9 characters with uppercase, lowercase, and special characters).
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-green-400" /> HttpOnly + CSRF Guard
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Lock className="w-4 h-4 text-blue-400" /> Role-Based Access Control
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" /> 100% Passing Test Suite
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 w-full sm:w-auto">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto font-bold px-8">
                  Sign In to Brightloop
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
              B
            </div>
            <span className="font-bold text-slate-300">Brightloop Subscription Management System</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="http://127.0.0.1:8000/api/v1/docs/" target="_blank" rel="noreferrer" className="hover:text-slate-300">Swagger Docs</a>
            <Link to="/login" className="hover:text-slate-300">Login</Link>
            <Link to="/register" className="hover:text-slate-300">Register</Link>
          </div>
          <p>© 2026 Brightloop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
