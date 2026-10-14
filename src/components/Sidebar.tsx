'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Receipt,
  BarChart3,
  AlertTriangle,
  Wallet,
  History,
  LogOut,
} from 'lucide-react'
import { signOut } from '@/lib/auth'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/receitas-variaveis', label: 'Receitas Variáveis', icon: DollarSign },
  { href: '/custos', label: 'Custos', icon: Receipt },
  { href: '/visao-anual', label: 'Visão Anual', icon: BarChart3 },
  { href: '/extrato', label: 'Extrato Asaas', icon: Wallet },
  { href: '/inadimplencia', label: 'Inadimplência', icon: AlertTriangle },
  { href: '/historico', label: 'Histórico', icon: History },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.replace('/login')
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#1E1E2E] text-white">
      {/* Header */}
      <div className="flex flex-col items-start px-6 py-5 border-b border-white/10">
        <Image
          src="/logo-mp.png"
          alt="M|P Assessoria"
          width={140}
          height={64}
          className="object-contain"
          priority
        />
        <p className="text-xs text-[#F0C239]/80 mt-1.5 font-medium">Gestão Financeira</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#F0C239]/15 text-[#F0C239]'
                  : 'text-gray-300 hover:bg-[#F0C239]/5 hover:text-white'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={20} strokeWidth={1.8} />
          Sair
        </button>
        <p className="px-3 text-xs text-gray-500">MP Financeiro v1.0</p>
      </div>
    </aside>
  )
}
