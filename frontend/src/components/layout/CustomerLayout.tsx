import { CreditCard, FileCheck, FileText, LayoutDashboard, Repeat } from 'lucide-react'
import { WorkspaceShell, type WorkspaceGroup } from './WorkspaceShell'

const groups: WorkspaceGroup[] = [
  {
    items: [
      { label: 'Overview', path: '/portal', icon: LayoutDashboard },
      { label: 'Subscriptions', path: '/subscriptions', icon: Repeat },
      { label: 'Quotations', path: '/quotations', icon: FileCheck },
      { label: 'Invoices', path: '/invoices', icon: FileText },
      { label: 'Payments', path: '/payments', icon: CreditCard },
    ],
  },
]

export function CustomerLayout() {
  return (
    <WorkspaceShell
      rootLabel="Your workspace"
      intro={{ eyebrow: 'Your workspace', text: 'A little more clarity.' }}
      groups={groups}
      accountNote="Personal account"
    />
  )
}
