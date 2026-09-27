'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { servicesApi, adrsApi, documentsApi } from '@/lib/api'
import { Search, Layers, BookOpen, FileText, ExternalLink, Eye } from 'lucide-react'
import Link from 'next/link'
import type { Service, Adr, Document } from '@/types'
import { clsx } from 'clsx'

type Tab = 'all' | 'services' | 'adrs' | 'documents'

const STATUS_COLORS: Record<string, string> = {
  accepted:   'bg-green-100 text-green-700',
  proposed:   'bg-yellow-100 text-yellow-700',
  deprecated: 'bg-gray-100 text-gray-500',
  superseded: 'bg-red-100 text-red-600',
}

export default function ExplorerPage() {
  const { currentProject } = useAuthStore()
  const pid = currentProject?.id
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services', pid],
    queryFn: async () => (await servicesApi.list(pid!)).data,
    enabled: !!pid,
  })
  const { data: adrs = [] } = useQuery<Adr[]>({
    queryKey: ['adrs', pid],
    queryFn: async () => (await adrsApi.list(pid!)).data,
    enabled: !!pid,
  })
  const { data: docs = [] } = useQuery<Document[]>({
    queryKey: ['documents', pid],
    queryFn: async () => (await documentsApi.list(pid!)).data,
    enabled: !!pid,
  })

  const q = query.toLowerCase()
  const filtered = useMemo(() => {
    const svc = services.filter((s) =>
      (tab === 'all' || tab === 'services') &&
      (s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q))
    )
    const adr = adrs.filter((a) =>
      (tab === 'all' || tab === 'adrs') &&
      (a.title.toLowerCase().includes(q) || (a.decision ?? '').toLowerCase().includes(q))
    )
    const doc = docs.filter((d) =>
      (tab === 'all' || tab === 'documents') &&
      d.filename.toLowerCase().includes(q)
    )
    return { svc, adr, doc }
  }, [services, adrs, docs, q, tab])

  if (!currentProject) {
    return <div className="p-8 text-gray-400 text-center">Select a project first.</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Explorer</h1>
        <p className="text-gray-500 text-sm mt-1">Browse and search everything in {currentProject.name}</p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services, ADRs, documents…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white shadow-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['all', 'services', 'adrs', 'documents'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-8">
        {/* Services */}
        {filtered.svc.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <Layers className="w-4 h-4" /> Services ({filtered.svc.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.svc.map((s) => (
                <div key={s.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>
                      )}
                    </div>
                  </div>
                  {s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.tags.map((t) => (
                        <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    {/* View → dedicated service detail page */}
                    <Link
                      href={`/explorer/services/${s.id}`}
                      className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <Eye className="w-3 h-3" /> View
                    </Link>
                    <span className="text-gray-200">|</span>
                    {/* Ask AI → scoped chat */}
                    <Link
                      href={`/chat?service=${s.id}&name=${encodeURIComponent(s.name)}`}
                      className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                    >
                      Ask AI
                    </Link>
                    {s.repo_url && (
                      <>
                        <span className="text-gray-200">|</span>
                        <a
                          href={s.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" /> Repo
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ADRs */}
        {filtered.adr.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <BookOpen className="w-4 h-4" /> ADRs ({filtered.adr.length})
            </h2>
            <div className="space-y-2">
              {filtered.adr.map((a) => (
                <div key={a.id}
                  className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm
                             hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{a.title}</p>
                    {a.decision && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.decision}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize
                                    ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {a.status}
                    </span>
                    {/* View → ADR detail page */}
                    <Link
                      href={`/adrs/${a.id}`}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Documents */}
        {filtered.doc.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <FileText className="w-4 h-4" /> Documents ({filtered.doc.length})
            </h2>
            <div className="space-y-2">
              {filtered.doc.map((d) => (
                <div key={d.id}
                  className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm
                             hover:shadow-md transition-shadow flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <p className="text-sm font-medium text-gray-800">{d.filename}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {filtered.svc.length === 0 && filtered.adr.length === 0 && filtered.doc.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No results found</p>
            <p className="text-sm mt-1">Try a different search term or tab</p>
          </div>
        )}
      </div>
    </div>
  )
}
