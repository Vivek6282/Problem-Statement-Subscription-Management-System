import React, { useState, useEffect } from 'react'
import { ShieldCheck, Search, Filter, Clock, User as UserIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { AuditEvent } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchAuditEvents = async () => {
    setIsLoading(true)
    try {
      let url = '/audit/'
      if (search) url += `?search=${encodeURIComponent(search)}`
      const res = await api.get(url)
      setEvents(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditEvents()
  }, [search])

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Audit Log</h1>
        <p className="text-xs text-slate-500 mt-1">Immutable security ledger tracking lifecycle transitions and billing actions</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, entity ID, user email..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No Audit Events Recorded"
          description={search ? `No log matched "${search}".` : 'System operations will appear here.'}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDateTime(ev.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.user_email || 'System Daemon'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="info">{ev.action}</Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="block text-xs text-slate-500">{ev.entity_type}</span>
                      <span className="block font-medium text-slate-800">{ev.entity_id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-md truncate">
                      {ev.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

