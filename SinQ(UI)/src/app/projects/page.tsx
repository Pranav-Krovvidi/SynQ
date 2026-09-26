'use client'

import React, { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import type { CatalogProject } from '@/lib/api'
import type { Project } from '@/lib/mockData'
import { useAuth } from '@/lib/auth'
import { useLiveCatalog } from '@/lib/useLiveCatalog'
import { FolderKanban, Server, GitBranch, AlertTriangle, Users, Check } from 'lucide-react'

function ProjectCard({ project }: { project: Project }) {
  const { currentProject, setCurrentProject } = useAuth()
  const isActive = currentProject?.id === project.id

  return (
    <div className={`border rounded-md p-5 transition-all duration-150 ${
      isActive
        ? 'border-primary/50 bg-primary/5'
        : 'border-border bg-secondary hover:border-primary/30 hover:bg-secondary/80'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: `${project.color}18`, border: `1px solid ${project.color}30` }}
          >
            <FolderKanban size={16} style={{ color: project.color }} />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">{project.name}</h3>
            <p className="text-[11px] text-muted-foreground">{project.company}</p>
          </div>
        </div>
        {isActive && (
          <span className="flex items-center gap-1 text-[10px] text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25">
            <Check size={9} />Active
          </span>
        )}
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed mb-4">{project.description}</p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { icon: <Server size={11} />, value: project.services, label: 'Services' },
          { icon: <GitBranch size={11} />, value: project.adrs, label: 'ADRs' },
          { icon: <AlertTriangle size={11} />, value: project.incidents, label: 'Incidents' },
          { icon: <Users size={11} />, value: project.members, label: 'Members' },
        ].map((m) => (
          <div key={m.label} className="bg-background rounded-md p-2 border border-border text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">{m.icon}</div>
            <p className="text-[14px] font-bold font-mono text-foreground">{m.value}</p>
            <p className="text-[9px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-[11px] text-muted-foreground">Updated {project.lastUpdated}</span>
        {!isActive && (
          <button
            onClick={() => setCurrentProject(project)}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Switch to project →
          </button>
        )}
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const [companyFilter, setCompanyFilter] = useState('all')
  const { data, loading, error } = useLiveCatalog<CatalogProject>('/catalog/projects')
  const projects: Project[] = data.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    company: project.company_name,
    services: project.service_count,
    adrs: project.adr_count,
    incidents: project.incident_count,
    members: project.member_count,
    lastUpdated: new Date(project.updated_at).toLocaleDateString(),
    color: '#00a98f',
  }))
  const companies = Array.from(new Set(projects.map((project) => project.company))).sort()
  const filteredProjects = companyFilter === 'all'
    ? projects
    : projects.filter((project) => project.company === companyFilter)

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground mb-1">Projects</h1>
          <p className="text-[13px] text-muted-foreground">
            {projects.length} projects across {companies.length} companies · Switch context to view knowledge scoped to each project
          </p>
        </div>

        <div className="mb-5 max-w-xs">
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground">
            <option value="all">All companies</option>
            {companies.map((company) => <option key={company} value={company}>{company}</option>)}
          </select>
        </div>

        {error ? (
          <p className="py-12 text-center text-[13px] text-red-400">Unable to load projects: {error}</p>
        ) : loading ? (
          <p className="py-12 text-center text-[13px] text-muted-foreground">Loading projects…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
