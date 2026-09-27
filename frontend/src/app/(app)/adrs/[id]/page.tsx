'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { adrsApi } from '@/lib/api'
import { ArrowLeft, BookOpen, Calendar, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Adr } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  accepted:   'bg-green-100 text-green-700 border-green-200',
  proposed:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  deprecated: 'bg-gray-100 text-gray-500 border-gray-200',
  superseded: 'bg-red-100 text-red-600 border-red-200',
}

function Section({ label, content }: { label: string; content: string | null }) {
  if (!content) return null
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</h3>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  )
}

export default function AdrDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { currentProject } = useAuthStore()
  const pid = currentProject?.id

  const { data: adr, isLoading } = useQuery<Adr>({
    queryKey: ['adr', pid, id],
    queryFn: async () => (await adrsApi.get(pid!, id)).data,
    enabled: !!pid && !!id,
  })

  if (isLoading || !adr) {
    return <div className="p-8 text-gray-400">Loading…</div>
  }

  const colorClass = STATUS_COLORS[adr.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <Link href="/adrs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to ADRs
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-purple-500 shrink-0" />
            <h1 className="text-xl font-bold text-gray-900">{adr.title}</h1>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full border capitalize shrink-0 ${colorClass}`}>
            {adr.status}
          </span>
        </div>

        <div className="flex gap-4 text-xs text-gray-400">
          {adr.decided_at && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Decided {new Date(adr.decided_at).toLocaleDateString()}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Created {new Date(adr.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Body sections */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <Section label="Context" content={adr.context} />
        <Section label="Decision" content={adr.decision} />
        <Section label="Consequences" content={adr.consequences} />
      </div>
    </div>
  )
}
