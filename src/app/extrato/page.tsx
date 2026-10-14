'use client'

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Wallet,
  RefreshCw,
  MessageSquare,
  Mail,
  CreditCard,
  Filter,
} from 'lucide-react'

import { KpiCard } from '@/components/KpiCard'
import { formatCurrency, MONTH_NAMES } from '@/lib/formatters'

interface Transaction {
  id: string
  value: number
  balance: number
  type: string
  typeLabel: string
  category: string
  date: string
  description: string
}

interface SummaryItem {
  type: string
  count: number
  total: number
  label: string
  category: string
}

interface ExtratoData {
  transactions: Transaction[]
  summary: SummaryItem[]
  totals: {
    entradas: number
    saidas: number
    taxas: number
    saldo: number
  }
  period: { startDate: string; finishDate: string }
  totalTransactions: number
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'entrada':
      return 'text-emerald-600'
    case 'saida':
      return 'text-red-600'
    case 'taxa':
      return 'text-orange-600'
    default:
      return 'text-gray-600'
  }
}

function getCategoryBadge(category: string): React.ReactNode {
  const colors: Record<string, string> = {
    entrada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    saida: 'bg-red-50 text-red-600 border-red-200',
    taxa: 'bg-orange-50 text-orange-700 border-orange-200',
    outro: 'bg-gray-50 text-gray-600 border-gray-200',
  }
  const labels: Record<string, string> = {
    entrada: 'Entrada',
    saida: 'Saída',
    taxa: 'Taxa',
    outro: 'Outro',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors[category] || colors.outro}`}
    >
      {labels[category] || category}
    </span>
  )
}

function ExtratoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const selectedYear = Number(searchParams.get('year')) || currentYear
  const selectedMonth = Number(searchParams.get('month')) || currentMonth

  const [data, setData] = useState<ExtratoData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  function navigate(year: number, month: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(year))
    params.set('month', String(month))
    router.push(`${pathname}?${params.toString()}`)
  }

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true)
      else setIsLoading(true)
      setError(null)

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const lastDay = getLastDayOfMonth(selectedYear, selectedMonth)
      const finishDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      try {
        const response = await fetch(
          `/api/asaas/extrato?startDate=${startDate}&finishDate=${finishDate}`,
        )
        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Erro ao carregar extrato')
          return
        }

        setData(result)
      } catch {
        setError('Erro de conexão ao buscar extrato')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [selectedYear, selectedMonth],
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredTransactions = useMemo(() => {
    if (!data) return []
    if (categoryFilter === 'all') return data.transactions
    return data.transactions.filter((t) => t.category === categoryFilter)
  }, [data, categoryFilter])

  const feeBreakdown = useMemo(() => {
    if (!data) return []
    return data.summary
      .filter((s) => s.category === 'taxa')
      .sort((a, b) => a.total - b.total)
  }, [data])

  const AVAILABLE_YEARS = [2024, 2025, 2026, 2027]
  const MONTH_SHORT = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Wallet size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Extrato Asaas</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Movimentações financeiras em tempo real
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Year / Month selector */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Ano:</span>
          <div className="flex gap-1">
            {AVAILABLE_YEARS.map((year) => (
              <button
                key={year}
                onClick={() => navigate(year, selectedMonth)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  year === selectedYear
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {MONTH_SHORT.map((name, index) => {
            const month = index + 1
            return (
              <button
                key={month}
                onClick={() => navigate(selectedYear, month)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  month === selectedMonth
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <Receipt size={18} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
          ))
        ) : data ? (
          <>
            <KpiCard
              title="Entradas"
              value={formatCurrency(data.totals.entradas)}
              icon={ArrowDownCircle}
              colorClass="text-emerald-600"
            />
            <KpiCard
              title="Saídas"
              value={formatCurrency(Math.abs(data.totals.saidas))}
              icon={ArrowUpCircle}
              colorClass="text-red-600"
            />
            <KpiCard
              title="Taxas Asaas"
              value={formatCurrency(Math.abs(data.totals.taxas))}
              icon={CreditCard}
              colorClass="text-orange-600"
            />
            <KpiCard
              title="Saldo Período"
              value={formatCurrency(data.totals.saldo)}
              icon={Wallet}
              colorClass={data.totals.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}
            />
          </>
        ) : null}
      </div>

      {!isLoading && data && (
        <>
          {/* Fee Breakdown */}
          {feeBreakdown.length > 0 && (
            <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50/50 p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MessageSquare size={16} className="text-orange-600" />
                Detalhamento de Taxas — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {feeBreakdown.map((fee) => (
                  <div
                    key={fee.type}
                    className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-orange-100"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {fee.type === 'INSTANT_TEXT_MESSAGE_FEE' && (
                          <MessageSquare size={13} className="text-green-600" />
                        )}
                        {fee.type === 'PAYMENT_MESSAGING_NOTIFICATION_FEE' && (
                          <Mail size={13} className="text-blue-600" />
                        )}
                        {fee.type === 'PAYMENT_FEE' && (
                          <CreditCard size={13} className="text-gray-600" />
                        )}
                        <span className="text-xs font-medium text-gray-700">
                          {fee.label}
                        </span>
                      </div>
                      <span className="mt-0.5 text-[10px] text-gray-400">
                        {fee.count} {fee.count === 1 ? 'cobrança' : 'cobranças'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-orange-700">
                      {formatCurrency(Math.abs(fee.total))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-orange-200 pt-3">
                <span className="text-xs font-semibold text-gray-600">
                  Total de taxas no mês
                </span>
                <span className="text-base font-bold text-orange-700">
                  {formatCurrency(Math.abs(data.totals.taxas))}
                </span>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="mt-6 flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Filtrar:</span>
            {[
              { value: 'all', label: 'Todos' },
              { value: 'entrada', label: 'Entradas' },
              { value: 'saida', label: 'Saídas' },
              { value: 'taxa', label: 'Taxas' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setCategoryFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === f.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">
              {filteredTransactions.length} de {data.totalTransactions} transações
            </span>
          </div>

          {/* Transaction Table */}
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-gray-400">
                        Nenhuma transação encontrada para este período.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t, index) => (
                      <tr
                        key={t.id}
                        className={`border-b border-gray-50 transition-colors hover:bg-blue-50/30 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-900">
                          {t.description}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          {getCategoryBadge(t.category)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${getCategoryColor(t.category)}`}
                        >
                          {t.value > 0 ? '+' : ''}
                          {formatCurrency(t.value)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">
                          {formatCurrency(t.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isLoading && (
        <div className="mt-6 space-y-2">
          <div className="h-12 animate-pulse rounded-xl border border-gray-200 bg-white" />
          <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      )}
    </div>
  )
}

export default function ExtratoPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
            ))}
          </div>
          <div className="mt-6 h-96 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <ExtratoContent />
    </Suspense>
  )
}
