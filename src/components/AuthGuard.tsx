'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session && pathname !== '/login') {
        router.replace('/login')
        return
      }

      if (session && pathname === '/login') {
        router.replace('/')
        return
      }

      setIsAuthenticated(!!session)
      setIsLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && pathname !== '/login') {
          router.replace('/login')
        } else if (session && pathname === '/login') {
          router.replace('/')
        }
        setIsAuthenticated(!!session)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null
  }

  return <>{children}</>
}
