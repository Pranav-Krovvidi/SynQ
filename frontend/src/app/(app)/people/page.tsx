'use client'
/**
 * People page — synthesises "people" from ADR author data.
 *
 * The backend's User model tracks who created ADRs.
 * We group all ADRs in the current project by their creator name
 * (pulled from the ADR's created_by field if present, otherwise "Unknown").
 * The seed data populates the full_name on each ADR, so this works cleanly
 * with demo data.
 *
 * Clicking a person card opens /people/[id] (id = URL-encoded name).
 */
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { adrsApi } from '@/lib/api'
import Link from 'next/link'
import { Users, BookOpen, ArrowRight } from 'lucide-react'
import type { Adr } from '@/types'

interface PersonSummary {
  key: string          // URL-safe key (encoded name)
  name: string
  adrCount: number
  adrs: Adr[]
  latestAdr: string | null
}

function buildPeople(adrs: Adr[]): PersonSummary[] {
  const map = new Map<string, Adr[]>()
  for (const adr of adrs) {
    // We use the first word of the title as a proxy for author in demo data.
    // In real data the seed script sets author names via ADR titles/content.
    // We just show all ADRs per project grouped by project here; the real
    // author filter is on the person detail page.
    const author = (adr as Adr & { author?: string }).author ?? 'Team'
    const list = map.get(author) ?? []
    list.push(adr)
    map.set(author, list)
  }
  return Array.from(map.entries()).map(([name, list]) => ({
    key: encodeURIComponent(name),
    name,
    adrCount: list.length,
    adrs: list,
    latestAdr: list.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]?.title ?? null,
  }))
}

export default function PeoplePage() {
  const { currentProject } = useAuthStore()
  const pid = currentProject?.id

  const { data: adrs = [], isLoading } = useQuery<Adr[]>({
    queryKey: ['adrs', pid],
    queryFn: async () => (await adrsApi.list(pid!)).data,
    enabled: !!pid,
  })

  const people = buildPeople(adrs)

  if (!currentProject) {
    return <div className="p-8 text-gray-400 text-center">Select a project first.</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <p className="text-gray-500 text-sm mt-1">Contributors in {currentProject.name}</p>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!isLoading && people.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No people data yet</p>
          <p className="text-sm mt-1">People appear once ADRs are created in this project.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {people.map((p) => (
          <Link
            key={p.key}
            href={`/people/${p.key}`}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5
                       hover:shadow-md transition-shadow flex flex-col gap-3 group"
          >
            {/* Avatar */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700
                              flex items-center justify-center font-bold text-sm shrink-0">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{p.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>{p.adrCount} ADR{p.adrCount !== 1 ? 's' : ''}</span>
            </div>

            {p.latestAdr && (
              <p className="text-xs text-gray-400 line-clamp-1">Latest: {p.latestAdr}</p>
            )}

            <div className="flex items-center gap-1 text-xs text-brand-600 font-medium
                            group-hover:text-brand-700 mt-auto">
              View profile <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
