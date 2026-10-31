import {
  BarChart3,
  CreditCard,
  FileCheck,
  FileText,
  Layers,
  LayoutDashboard,
  Package,
  Percent,
  Receipt,
  Repeat,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  staffOnly?: boolean
  adminOnly?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', staffOnly: true },
      { label: 'Customers', icon: Users, path: '/customers', staffOnly: true },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Subscriptions', icon: Repeat, path: '/subscriptions' },
      { label: 'Quotations', icon: FileCheck, path: '/quotations' },
      { label: 'Invoices', icon: FileText, path: '/invoices' },
      { label: 'Payments', icon: CreditCard, path: '/payments' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', icon: Package, path: '/products', staffOnly: true },
      { label: 'Plans', icon: Layers, path: '/plans', staffOnly: true },
      { label: 'Tax Rules', icon: Receipt, path: '/taxes', staffOnly: true },
      { label: 'Discounts', icon: Percent, path: '/discounts', staffOnly: true },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', icon: BarChart3, path: '/reports', staffOnly: true },
      { label: 'Audit Trail', icon: ShieldCheck, path: '/audit', staffOnly: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Team & Access', icon: UserCog, path: '/team', adminOnly: true },
    ],
  },
]
