'use client'

import { useEffect, useState, useMemo, Suspense, useCallback } from 'react'
import {
  AlertTriangle,
  DollarSign,
  Hash,
  Clock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

import { KpiCard } from '@/components/KpiCard'
import { DataTable } from '@/components/DataTable'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { OverduePayment } from '@/lib/types'

const BILLING_TYPE_LABELS: Record<string, string> = {
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartao',
  PIX: 'PIX',
  UNDEFINED: 'Indefinido',
  DEBIT_CARD: 'Debito',
  TRANSFER: 'Transferencia',
  DEPOSIT: 'Deposito',
}

function getRowColorClass(daysOverdue: number): string {
  if (daysOverdue >= 30) return 'bg-red-50/60'
  if (daysOverdue >= 15) return 'bg-orange-50/60'
  return 'bg-yellow-50/40'
}

function getDaysBadge(daysOverdue: number): React.ReactNode {
  let colorClasses = 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (daysOverdue >= 30) {
    colorClasses = 'bg-red-100 text-red-700 border-red-200'
  } else if (daysOverdue >= 15) {
    colorClasses = 'bg-orange-100 text-orange-700 border-orange-200'
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClasses}`}
    >
      {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'}
    </span>
  )
}

function InadimplenciaContent() {
  const [payments, setPayments] = useState<OverduePayment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await fetch('/api/asaas/inadimplencia')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao carregar dados')
        setPayments([])
        return
      }

      setPayments(data.payments || [])
    } catch {
      setError('Erro de conexao ao buscar dados')
      setPayments([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalOverdue = useMemo(
    () => payments.reduce((sum, p) => sum + p.value, 0),
    [payments]
  )

  const averageDaysOverdue = useMemo(() => {
    if (payments.length === 0) return 0
    const totalDays = payments.reduce((sum, p) => sum + p.daysOverdue, 0)
    return Math.round(totalDays / payments.length)
  }, [payments])

  const columns = [
    {
      key: 'customerName',
      header: 'Cliente',
      sortable: true,
      sortValue: (p: OverduePayment) => p.customerName,
      render: (p: OverduePayment) => (
        <div>
          <span className="font-medium text-gray-900">{p.customerName}</span>
          {p.description && (
            <p className="mt-0.5 text-xs text-gray-400 truncate max-w-[200px]">
              {p.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      align: 'right' as const,
      sortable: true,
      sortValue: (p: OverduePayment) => p.value,
      render: (p: OverduePayment) => (
        <span className="font-semibold text-red-600">
          {formatCurrency(p.value)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Vencimento',
      align: 'center' as const,
      sortable: true,
      sortValue: (p: OverduePayment) => p.dueDate,
      render: (p: OverduePayment) => (
        <span className="text-gray-600">{formatDate(p.dueDate)}</span>
      ),
    },
    {
      key: 'daysOverdue',
      header: 'Dias de Atraso',
      align: 'center' as const,
      sortable: true,
      sortValue: (p: OverduePayment) => p.daysOverdue,
      render: (p: OverduePayment) => getDaysBadge(p.daysOverdue),
    },
    {
      key: 'billingType',
      header: 'Tipo',
      align: 'center' as const,
      sortable: true,
      sortValue: (p: OverduePayment) => p.billingType,
      render: (p: OverduePayment) => (
        <span className="text-gray-600 text-xs">
          {BILLING_TYPE_LABELS[p.billingType] || p.billingType}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acoes',
      align: 'center' as const,
      render: (p: OverduePayment) =>
        p.invoiceUrl ? (
          <a
            href={p.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            <ExternalLink size={14} />
            Fatura
          </a>
        ) : (
          <span className="text-xs text-gray-300">--</span>
        ),
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Inadimplencia
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Cobrancas vencidas e pendentes no Asaas
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? 'animate-spin' : ''}
          />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
            <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
            <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
          </>
        ) : (
          <>
            <KpiCard
              title="Total Vencido"
              value={formatCurrency(totalOverdue)}
              icon={DollarSign}
              colorClass="text-red-600"
            />
            <KpiCard
              title="Cobrancas Vencidas"
              value={String(payments.length)}
              icon={Hash}
              colorClass="text-orange-600"
            />
            <KpiCard
              title="Dias Medio de Atraso"
              value={`${averageDaysOverdue} dias`}
              icon={Clock}
              colorClass="text-amber-600"
            />
          </>
        )}
      </div>

      {/* Table */}
      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-xl border border-gray-200 bg-white" />
            <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            keyExtractor={(p) => p.id}
            emptyMessage="Nenhuma cobranca vencida encontrada. Tudo em dia!"
          />
        )}
      </div>

      {/* Legend */}
      {!isLoading && payments.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
          <span className="text-xs font-medium text-gray-500">Legenda:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-yellow-300" />
            <span className="text-xs text-gray-500">1-14 dias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-orange-400" />
            <span className="text-xs text-gray-500">15-29 dias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">30+ dias</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InadimplenciaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
            <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
            <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
          </div>
          <div className="mt-6 h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <InadimplenciaContent />
    </Suspense>
  )
}
