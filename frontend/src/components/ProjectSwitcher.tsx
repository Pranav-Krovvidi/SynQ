'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { projectsApi } from '@/lib/api'
import { ChevronDown, Check, Plus, FolderOpen } from 'lucide-react'
import type { Project } from '@/types'

export default function ProjectSwitcher() {
  const { currentProject, setCurrentProject } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => (await projectsApi.list()).data,
  })

  // Auto-select first project if none selected or selected project no longer in list
  useEffect(() => {
    if (projects.length === 0) return
    const valid = currentProject && projects.find((p) => p.id === currentProject.id)
    if (!valid) setCurrentProject(projects[0])
  }, [projects, currentProject, setCurrentProject])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
                   bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium text-white"
      >
        <FolderOpen className="w-4 h-4 shrink-0 opacity-80" />
        <span className="truncate flex-1 text-left">
          {currentProject?.name ?? 'Select project…'}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100
                        z-50 py-1 max-h-64 overflow-y-auto">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => { setCurrentProject(p); setOpen(false) }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-800
                         hover:bg-brand-50 transition-colors"
            >
              <Check className={`w-4 h-4 shrink-0 ${currentProject?.id === p.id ? 'text-brand-600' : 'invisible'}`} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          {projects.length === 0 && (
            <p className="px-4 py-3 text-xs text-gray-400">No projects yet</p>
          )}
        </div>
      )}
    </div>
  )
}
