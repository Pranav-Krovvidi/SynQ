'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { mockCurrentUser, mockProjects, type Project } from '@/lib/mockData'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null)

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored))

      const storedProject = localStorage.getItem(PROJECT_KEY)
      if (storedProject) {
        setCurrentProjectState(JSON.parse(storedProject))
      } else {
        // Default to first project
        setCurrentProjectState(mockProjects[0])
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Demo: accept any email that matches the mock user, any password
    const lower = email.toLowerCase()
    if (lower === mockCurrentUser.email || lower === 'demo@synq.dev' || lower === 'admin@novapay.com') {
      const authUser: AuthUser = {
        id: mockCurrentUser.id,
        name: mockCurrentUser.name,
        email: mockCurrentUser.email,
        role: mockCurrentUser.role,
        avatar: mockCurrentUser.avatar,
        team: mockCurrentUser.team,
        title: mockCurrentUser.title,
      }
      setUser(authUser)
      setCurrentProjectState(mockProjects[0])
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
      localStorage.setItem(PROJECT_KEY, JSON.stringify(mockProjects[0]))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    setCurrentProjectState(null)
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
      projects: mockProjects,
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
