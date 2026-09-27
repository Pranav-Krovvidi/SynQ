'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { servicesApi, adrsApi, documentsApi } from '@/lib/api'
import { Layers, BookOpen, FileText, MessageSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Service, Adr } from '@/types'

function StatCard({
  icon: Icon, label, value, color, href,
}: {
  icon: React.ElementType; label: string; value: number | string
  color: string; href: string
}) {
  return (
    <Link href={href}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6
                 hover:shadow-md transition-shadow flex items-center gap-4 group">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
    </Link>
  )
}

export default function DashboardPage() {
  const { currentProject } = useAuthStore()
  const pid = currentProject?.id

  // All three queries key on pid — they automatically refetch when project changes
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

  const { data: docs = [] } = useQuery({
    queryKey: ['documents', pid],
    queryFn: async () => (await documentsApi.list(pid!)).data,
    enabled: !!pid,
  })

  if (!currentProject) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-lg font-medium">No project selected</p>
        <p className="text-sm mt-1">Create a project to get started.</p>
      </div>
    )
  }

  const acceptedAdrs = adrs.filter((a) => a.status === 'accepted').length
  const recentAdrs = [...adrs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
  const recentServices = [...services]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{currentProject.name}</h1>
        {currentProject.description && (
          <p className="text-gray-500 mt-1">{currentProject.description}</p>
        )}
      </div>

      {/* Stats grid — keys on pid so re-renders on project switch */}
      <div key={pid} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Services"
          value={services.length}
          color="bg-blue-50 text-blue-600"
          href="/explorer"
        />
        <StatCard
          icon={BookOpen}
          label={`ADRs (${acceptedAdrs} accepted)`}
          value={adrs.length}
          color="bg-purple-50 text-purple-600"
          href="/adrs"
        />
        <StatCard
          icon={FileText}
          label="Documents"
          value={(docs as object[]).length}
          color="bg-emerald-50 text-emerald-600"
          href="/explorer"
        />
        <StatCard
          icon={MessageSquare}
          label="AI Chat"
          value="Ask"
          color="bg-amber-50 text-amber-600"
          href="/chat"
        />
      </div>

      {/* Recent sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent services */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Services</h2>
            <Link href="/explorer" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {recentServices.length === 0 && (
            <p className="text-sm text-gray-400">No services yet.</p>
          )}
          <ul className="space-y-2">
            {recentServices.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/explorer/services/${s.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800">{s.name}</span>
                  <div className="flex gap-1">
                    {s.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent ADRs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent ADRs</h2>
            <Link href="/adrs" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {recentAdrs.length === 0 && (
            <p className="text-sm text-gray-400">No ADRs yet.</p>
          )}
          <ul className="space-y-2">
            {recentAdrs.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/adrs/${a.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 truncate pr-2">{a.title}</span>
                  <AdrBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function AdrBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    accepted:   'bg-green-100 text-green-700',
    proposed:   'bg-yellow-100 text-yellow-700',
    deprecated: 'bg-gray-100 text-gray-500',
    superseded: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}
