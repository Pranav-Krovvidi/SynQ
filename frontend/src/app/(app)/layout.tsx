'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Providers from '@/components/Providers'
import { useAuthStore } from '@/store/auth'

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  if (!token) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ marginLeft: 'var(--sidebar-w)' }}
      >
        {children}
      </main>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Providers>
  )
}
