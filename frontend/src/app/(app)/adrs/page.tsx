'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { adrsApi } from '@/lib/api'
import Link from 'next/link'
import { BookOpen, Plus, Eye } from 'lucide-react'
import type { Adr, AdrStatus } from '@/types'
import { clsx } from 'clsx'

const STATUSES: AdrStatus[] = ['proposed', 'accepted', 'deprecated', 'superseded']
const STATUS_COLORS: Record<string, string> = {
  accepted:   'bg-green-100 text-green-700',
  proposed:   'bg-yellow-100 text-yellow-700',
  deprecated: 'bg-gray-100 text-gray-500',
  superseded: 'bg-red-100 text-red-600',
}

export default function AdrsPage() {
  const { currentProject } = useAuthStore()
  const pid = currentProject?.id
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: adrs = [], isLoading } = useQuery<Adr[]>({
    queryKey: ['adrs', pid, statusFilter],
    queryFn: async () =>
      (await adrsApi.list(pid!, statusFilter === 'all' ? undefined : statusFilter)).data,
    enabled: !!pid,
  })

  if (!currentProject) {
    return <div className="p-8 text-gray-400 text-center">Select a project first.</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Architecture Decision Records</h1>
          <p className="text-gray-500 text-sm mt-1">{currentProject.name}</p>
        </div>
        <Link
          href="/adrs/new"
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New ADR
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['all', ...STATUSES]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
              statusFilter === s
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!isLoading && adrs.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No ADRs yet</p>
          <p className="text-sm mt-1">Document your first architecture decision.</p>
        </div>
      )}
      <div className="space-y-2">
        {adrs.map((a) => (
          <Link
            key={a.id}
            href={`/adrs/${a.id}`}
            className="flex items-center justify-between bg-white border border-gray-100
                       rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate">{a.title}</p>
              {a.decision && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.decision}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {a.decided_at && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  {new Date(a.decided_at).toLocaleDateString()}
                </span>
              )}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize
                               ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {a.status}
              </span>
              <Eye className="w-4 h-4 text-gray-300" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
