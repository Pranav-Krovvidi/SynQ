'use client'
/**
 * Person profile page — shows the person's ADRs + allows filtering
 * by status, project keyword, etc.
 *
 * For the NovaPay demo the seed data embeds author names in ADR titles/context.
 * The real backend's /auth/me returns the logged-in user's full_name — for now
 * we show all ADRs in the project and label them under this person.
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { adrsApi } from '@/lib/api'
import { ArrowLeft, BookOpen, Filter } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Adr, AdrStatus } from '@/types'
import { clsx } from 'clsx'

const STATUS_COLORS: Record<string, string> = {
  accepted:   'bg-green-100 text-green-700',
  proposed:   'bg-yellow-100 text-yellow-700',
  deprecated: 'bg-gray-100 text-gray-500',
  superseded: 'bg-red-100 text-red-600',
}

const ALL_STATUSES: AdrStatus[] = ['proposed', 'accepted', 'deprecated', 'superseded']

export default function PersonProfilePage() {
  const { id } = useParams<{ id: string }>()
  const name = decodeURIComponent(id)
  const { currentProject } = useAuthStore()
  const pid = currentProject?.id

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const { data: allAdrs = [], isLoading } = useQuery<Adr[]>({
    queryKey: ['adrs', pid],
    queryFn: async () => (await adrsApi.list(pid!)).data,
    enabled: !!pid,
  })

  // Filter ADRs for this person (author match) + user's local filters
  const personAdrs = useMemo(() => {
    return allAdrs.filter((a) => {
      // Author match: check if name appears in title or context (demo heuristic)
      const authorMatch =
        (a as Adr & { author?: string }).author === name ||
        name === 'Team' // fallback: show all if author not set

      const statusMatch = statusFilter === 'all' || a.status === statusFilter
      const searchMatch =
        search === '' ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.decision ?? '').toLowerCase().includes(search.toLowerCase())

      return authorMatch && statusMatch && searchMatch
    })
  }, [allAdrs, name, statusFilter, search])

  const adrsByStatus = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of allAdrs) counts[a.status] = (counts[a.status] ?? 0) + 1
    return counts
  }, [allAdrs])

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <Link href="/people" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to People
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700
                        flex items-center justify-center font-bold text-xl shrink-0">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          {currentProject && (
            <p className="text-sm text-gray-500 mt-1">
              Contributor · {currentProject.name}
            </p>
          )}
          {/* ADR summary stats */}
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="flex items-center gap-1 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full border">
              <BookOpen className="w-3.5 h-3.5" />
              {allAdrs.length} ADR{allAdrs.length !== 1 ? 's' : ''} total
            </span>
            {Object.entries(adrsByStatus).map(([s, c]) => (
              <span key={s}
                className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-500'}`}>
                {c} {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['all', ...ALL_STATUSES]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors',
                statusFilter === s
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ADRs…"
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* ADR list */}
      <div className="space-y-2">
        {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
        {!isLoading && personAdrs.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No ADRs match these filters.</p>
          </div>
        )}
        {personAdrs.map((a) => (
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
              <p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`ml-4 shrink-0 text-xs font-medium px-2.5 py-1 rounded-full capitalize
                             ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {a.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
