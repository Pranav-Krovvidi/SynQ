'use client'
// Zustand auth + project store

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Project } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  currentProject: Project | null
  setToken: (token: string) => void
  setUser: (user: User) => void
  setCurrentProject: (project: Project | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      currentProject: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setCurrentProject: (project) => set({ currentProject: project }),
      logout: () => {
        set({ token: null, user: null, currentProject: null })
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      },
    }),
    {
      name: 'synq-auth',
      partialize: (s) => ({ token: s.token, user: s.user, currentProject: s.currentProject }),
    },
  ),
)
