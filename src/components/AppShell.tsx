'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { AiChat } from '@/components/AiChat'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen">
        {children}
      </main>
      <AiChat />
    </div>
  )
}
