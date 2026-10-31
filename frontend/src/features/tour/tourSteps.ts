import {
  BarChart3, CreditCard, FileCheck, FileText, Layers, LayoutDashboard, Package, Repeat, ShieldCheck,
  Sparkles, UserCog, Users, type LucideIcon,
} from 'lucide-react'

export type TourRole = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export interface TourStep {
  icon: LucideIcon
  title: string
  summary: string
  /** What the person actually does on this screen. */
  todo: string[]
  /** Screen to open for this step. */
  path?: string
  pathLabel?: string
}

const admin: TourStep[] = [
  {
    icon: Sparkles,
    title: 'Welcome, Administrator',
    summary: 'You can see and change everything. Staff can run billing, but only you set up the catalog and the team.',
    todo: ['Follow this short tour, or skip it and come back any time.', 'Reopen it later from “Take the tour” in the sidebar.'],
  },
  {
    icon: Package,
    title: 'Set up your catalog first',
    summary: 'Products, plans, tax rules and discounts decide what you can sell. Staff can read them but cannot change them.',
    todo: [
      'Products: add a product with a SKU and prices, then add variants if you need them.',
      'Plans: choose how often a plan bills (daily, weekly, monthly or yearly).',
      'Tax Rules and Discounts: add the rates and coupon codes you will use.',
      'Items already used on invoices are archived, not deleted.',
    ],
    path: '/products',
    pathLabel: 'Open Products',
  },
  {
    icon: UserCog,
    title: 'Add your team',
    summary: 'Give each colleague their own account and the right role.',
    todo: [
      'Add a staff member with a name, email and starting password.',
      'Change a role between ADMIN and STAFF from the Role column.',
      'Deactivate someone who leaves. You cannot deactivate yourself or the last admin.',
    ],
    path: '/team',
    pathLabel: 'Open Team & Access',
  },
  {
    icon: Layers,
    title: 'Run the billing flow',
    summary: 'Every sale follows the same path, and you can do each step yourself.',
    todo: [
      'Customers: add the customer.',
      'Quotations: prepare a quote with a plan, then convert it to a subscription.',
      'Invoices: confirm the invoice, then record the payment to close it.',
    ],
    path: '/customers',
    pathLabel: 'Open Customers',
  },
  {
    icon: LayoutDashboard,
    title: 'Watch the numbers',
    summary: 'The dashboard shows what is happening now; Reports lets you filter by date and export.',
    todo: [
      'Click “View details” on any card to see the records behind the figure.',
      'Dates and filters are saved in the page link, so you can share a view.',
      'Export a CSV from a detail view or the Reports page.',
    ],
    path: '/dashboard',
    pathLabel: 'Open Dashboard',
  },
  {
    icon: ShieldCheck,
    title: 'Keep it safe',
    summary: 'Important actions are recorded, and AI help is optional and off by default.',
    todo: [
      'Audit Trail: see who changed what and when.',
      'AI assistant (optional): when enabled, it drafts product descriptions and report summaries. You always review before anything is saved.',
    ],
    path: '/audit',
    pathLabel: 'Open Audit Trail',
  },
]

const staff: TourStep[] = [
  {
    icon: Sparkles,
    title: 'Welcome to the team',
    summary: 'You run day-to-day billing. The catalog and the team are managed by an administrator.',
    todo: ['Follow this short tour, or skip it and come back any time.', 'Reopen it later from “Take the tour” in the sidebar.'],
  },
  {
    icon: Users,
    title: '1. Start with the customer',
    summary: 'Every quotation, subscription and invoice belongs to a customer.',
    todo: ['Add a customer with their company and contact details.', 'Archive a customer you no longer bill; you can restore them later.'],
    path: '/customers',
    pathLabel: 'Open Customers',
  },
  {
    icon: FileCheck,
    title: '2. Prepare a quotation',
    summary: 'A quotation lists what the customer will buy and on which plan.',
    todo: ['Create a quotation, choose the plan and add the items.', 'When the customer agrees, convert it to a subscription.'],
    path: '/quotations',
    pathLabel: 'Open Quotations',
  },
  {
    icon: Repeat,
    title: '3. Manage the subscription',
    summary: 'A subscription bills the customer on the plan’s schedule.',
    todo: ['Activate it, or pause, resume and close it when the customer asks.', 'Use “Run billing” at the top to create invoices for everything that is due.'],
    path: '/subscriptions',
    pathLabel: 'Open Subscriptions',
  },
  {
    icon: FileText,
    title: '4. Confirm and send invoices',
    summary: 'Invoices start as drafts and become due once you confirm them.',
    todo: ['Open a draft, add or check the items, then confirm it.', 'Email the invoice or download the PDF for the customer.'],
    path: '/invoices',
    pathLabel: 'Open Invoices',
  },
  {
    icon: CreditCard,
    title: '5. Record payments',
    summary: 'When money arrives, record it so the balance is right.',
    todo: ['Record a payment against a confirmed invoice.', 'A fully paid invoice is marked paid; a partial payment leaves the remaining balance.'],
    path: '/payments',
    pathLabel: 'Open Payments',
  },
  {
    icon: BarChart3,
    title: 'Keep an eye on overdue work',
    summary: 'The dashboard and reports are yours to read. The catalog is read-only for you.',
    todo: [
      'Dashboard: “Overdue” shows past-due invoices that still have a balance.',
      'Products, Plans, Tax Rules and Discounts: look things up, and ask an administrator to change them.',
    ],
    path: '/dashboard',
    pathLabel: 'Open Dashboard',
  },
]

const customer: TourStep[] = [
  {
    icon: Sparkles,
    title: 'Welcome to your workspace',
    summary: 'Everything about your account in one place. You only ever see your own information.',
    todo: ['Follow this short tour, or skip it and come back any time.', 'Reopen it later from “Take the tour” in the sidebar.'],
  },
  {
    icon: LayoutDashboard,
    title: 'Your overview',
    summary: 'A quick picture of what you have and what is due.',
    todo: ['See your active subscriptions and recent invoices at a glance.'],
    path: '/portal',
    pathLabel: 'Open Overview',
  },
  {
    icon: FileCheck,
    title: 'Review your quotations',
    summary: 'When we prepare a proposal for you, it appears here.',
    todo: ['Read the items and the price.', 'Accept it to go ahead, or reject it if it is not right.'],
    path: '/quotations',
    pathLabel: 'Open Quotations',
  },
  {
    icon: Repeat,
    title: 'Manage your subscriptions',
    summary: 'See each plan you are on and when it renews.',
    todo: ['Pause or resume a subscription if your plan allows it.', 'Close a subscription you no longer need. You will be asked to confirm.'],
    path: '/subscriptions',
    pathLabel: 'Open Subscriptions',
  },
  {
    icon: FileText,
    title: 'Find your invoices',
    summary: 'Every invoice, with what is paid and what is still due.',
    todo: ['Open an invoice to see its items and balance.', 'Download a PDF copy for your records.'],
    path: '/invoices',
    pathLabel: 'Open Invoices',
  },
  {
    icon: CreditCard,
    title: 'See your payments',
    summary: 'A record of the payments that have been received for you.',
    todo: ['Check that each payment was received and applied to the right invoice.', 'Update your name and password from your account settings.'],
    path: '/payments',
    pathLabel: 'Open Payments',
  },
]

export function stepsFor(role: string | undefined): TourStep[] {
  if (role === 'ADMIN') return admin
  if (role === 'STAFF') return staff
  return customer
}
