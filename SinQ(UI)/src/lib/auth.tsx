'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiFetch, apiLogin, apiLogout, type CatalogProject, type MeResponse } from '@/lib/api'
import type { Project } from '@/lib/mockData'

interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'contributor' | 'viewer'
  avatar: string
  team: string
  title: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  currentProject: Project | null
  projects: Project[]
  setCurrentProject: (project: Project) => void
  login: (email: string, _password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'synq_auth'
const PROJECT_KEY = 'synq_project'

function toAuthUser(profile: MeResponse): AuthUser {
  const name = profile.full_name || profile.email
  return {
    id: profile.id,
    name,
    email: profile.email,
    role: profile.role as AuthUser['role'],
    avatar: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    team: 'Engineering',
    title: profile.role,
  }
}

function toProject(project: CatalogProject): Project {
  return {
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
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    let active = true
    const token = localStorage.getItem('synq_jwt')
    if (!token) {
      setUser(null)
      return () => { active = false }
    }

    const refreshProjects = async () => {
      try {
        const result = await apiFetch<CatalogProject[]>('/catalog/projects')
        if (!active) return
        const liveProjects = result.map(toProject)
        setProjects(liveProjects)
        setCurrentProjectState((current) => {
          const savedId = current?.id ?? (() => {
            try { return JSON.parse(localStorage.getItem(PROJECT_KEY) ?? 'null')?.id } catch { return null }
          })()
          const selected = liveProjects.find((project) => project.id === savedId) ?? liveProjects[0] ?? null
          if (selected) localStorage.setItem(PROJECT_KEY, JSON.stringify(selected))
          return selected
        })
      } catch {
        if (active) setProjects([])
      }
    }

    void apiFetch<MeResponse>('/auth/me')
      .then((profile) => {
        if (active) {
          const authUser = toAuthUser(profile)
          setUser(authUser)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
          void refreshProjects()
        }
      })
      .catch(() => {
        apiLogout()
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(PROJECT_KEY)
        if (active) setUser(null)
      })

    const timer = window.setInterval(() => void refreshProjects(), 15000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await apiLogin(email, password)
      const profile = await apiFetch<MeResponse>('/auth/me')
      const authUser = toAuthUser(profile)
      setUser(authUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
      const result = await apiFetch<CatalogProject[]>('/catalog/projects')
      const liveProjects = result.map(toProject)
      setProjects(liveProjects)
      const selected = liveProjects[0] ?? null
      setCurrentProjectState(selected)
      if (selected) localStorage.setItem(PROJECT_KEY, JSON.stringify(selected))
      return true
    } catch {
      apiLogout()
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setProjects([])
    setCurrentProjectState(null)
    apiLogout()
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(PROJECT_KEY)
  }

  const setCurrentProject = (project: Project) => {
    setCurrentProjectState(project)
    localStorage.setItem(PROJECT_KEY, JSON.stringify(project))
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      currentProject,
      projects,
      setCurrentProject,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
