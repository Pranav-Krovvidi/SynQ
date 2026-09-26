'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { servicesApi, adrsApi } from '@/lib/api'
import { ArrowLeft, ExternalLink, MessageSquare, BookOpen, Tag } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Service, Adr } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  accepted:   'bg-green-100 text-green-700',
  proposed:   'bg-yellow-100 text-yellow-700',
  deprecated: 'bg-gray-100 text-gray-500',
  superseded: 'bg-red-100 text-red-600',
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { currentProject } = useAuthStore()
  const pid = currentProject?.id

  const { data: svc, isLoading } = useQuery<Service>({
    queryKey: ['service', pid, id],
    queryFn: async () => (await servicesApi.get(pid!, id)).data,
    enabled: !!pid && !!id,
  })

  // All ADRs for the project — filter to those linked to this service
  const { data: allAdrs = [] } = useQuery<Adr[]>({
    queryKey: ['adrs', pid],
    queryFn: async () => (await adrsApi.list(pid!)).data,
    enabled: !!pid,
  })

  if (isLoading || !svc) {
    return <div className="p-8 text-gray-400">Loading…</div>
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Back */}
      <Link href="/explorer" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Explorer
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{svc.name}</h1>
            {svc.description && <p className="text-gray-500 mt-2">{svc.description}</p>}
          </div>
          <Link
            href={`/chat?service=${svc.id}&name=${encodeURIComponent(svc.name)}`}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white
                       text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            Before You Change
          </Link>
        </div>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          {svc.tech_stack && (
            <span><span className="font-medium text-gray-700">Stack:</span> {svc.tech_stack}</span>
          )}
          {svc.repo_url && (
            <a href={svc.repo_url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-brand-600 hover:underline">
              <ExternalLink className="w-3 h-3" /> Repository
            </a>
          )}
          <span>Added {new Date(svc.created_at).toLocaleDateString()}</span>
        </div>

        {svc.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {svc.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                <Tag className="w-3 h-3" /> {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ADRs panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
          <BookOpen className="w-4 h-4 text-purple-500" />
          Architecture Decisions
        </h2>
        {allAdrs.length === 0 ? (
          <p className="text-sm text-gray-400">No ADRs in this project yet.</p>
        ) : (
          <div className="space-y-2">
            {allAdrs.map((a) => (
              <Link
                key={a.id}
                href={`/adrs/${a.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-800 truncate pr-3">{a.title}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0
                                 ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {a.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
