'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function useLiveCatalog<T>(path: string, intervalMs = 15000) {
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setData([])
      setError(null)
      setLoading(true)
      return
    }

    let active = true
    let requestPending = false

    const refresh = async () => {
      if (requestPending) return
      requestPending = true
      try {
        const result = await apiFetch<T[]>(path)
        if (active) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        const message = (err as Error).message
        if (active && message.startsWith('API 403:') && message.includes('Not authenticated')) {
          localStorage.removeItem('synq_jwt')
          localStorage.removeItem('synq_auth')
          localStorage.removeItem('synq_project')
          window.location.assign('/login')
          return
        }
        if (active) setError(message)
      } finally {
        requestPending = false
        if (active) setLoading(false)
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), intervalMs)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [path, intervalMs, isAuthenticated])

  return { data, loading, error }
}