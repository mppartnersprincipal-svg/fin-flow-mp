'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { BarChart3 } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import {
  formatCurrency,
  formatPercent,
  MONTH_NAMES,
  MONTH_SHORT,
} from '@/lib/formatters'
import type { MonthlySummary } from '@/lib/types'

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027]

interface ChartDataItem {
  month: number
  name: string
  receita: number
  custos: number
  lucro: number
  mrr: number
}

function currencyTickFormatter(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  }
  return `R$ ${value.toLocaleString('pt-BR')}`
}

function CustomTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-gray-900">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function VisaoAnualContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const selectedYear = Number(searchParams.get('year')) || 2026

  const [summaries, setSummaries] = useState<MonthlySummary[]>([])
  const [loading, setLoading] = useState(true)

  function navigateYear(year: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(year))
    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    async function fetchSummaries() {
      setLoading(true)
      const { data } = await supabase
        .from('monthly_summary')
        .select('*')
        .eq('year', selectedYear)
        .order('month', { ascending: true })
      setSummaries(data || [])
      setLoading(false)
    }
    fetchSummaries()
  }, [selectedYear])

  const chartData: ChartDataItem[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const summary = summaries.find((s) => s.month === month)
      return {
        month,
        name: MONTH_SHORT[i],
        receita: summary?.total_revenue ?? 0,
        custos: summary?.total_costs ?? 0,
        lucro: summary?.profit ?? 0,
        mrr: summary?.mrr ?? 0,
      }
    })
  }, [summaries])

  const accumulated = useMemo(() => {
    return {
      clients: summaries.length > 0
        ? summaries[summaries.length - 1].active_clients
        : 0,
      mrr: summaries.reduce((sum, s) => sum + s.mrr, 0),
      receita: summaries.reduce((sum, s) => sum + s.total_revenue, 0),
      custos: summaries.reduce((sum, s) => sum + s.total_costs, 0),
      lucro: summaries.reduce((sum, s) => sum + s.profit, 0),
      margin: (() => {
        const totalRev = summaries.reduce((sum, s) => sum + s.total_revenue, 0)
        return totalRev > 0
          ? (summaries.reduce((sum, s) => sum + s.profit, 0) / totalRev) * 100
          : 0
      })(),
    }
  }, [summaries])

  return (
    <div className="p-8">
      {/* Year selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Visão Anual</h2>
              <p className="text-sm text-gray-500">
                Evolução financeira de {selectedYear}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Ano:</span>
          <div className="flex gap-1">
            {AVAILABLE_YEARS.map((year) => (
              <button
                key={year}
                onClick={() => navigateYear(year)}
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
      </div>

      {loading ? (
        <div className="mt-8 space-y-6">
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white" />
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      ) : (
        <>
          {/* Receita / Custos / Lucro Area Chart */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Receita, Custos e Lucro
            </h3>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCustos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={currencyTickFormatter}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltipContent />} />
                <Legend
                  wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita Total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gradReceita)"
                />
                <Area
                  type="monotone"
                  dataKey="custos"
                  name="Custos Total"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#gradCustos)"
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradLucro)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* MRR Bar Chart */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Evolução do MRR
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={currencyTickFormatter}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltipContent />} />
                <Bar
                  dataKey="mrr"
                  name="MRR"
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Table */}
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                Resumo Mensal — {selectedYear}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Mês
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Clientes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      MRR
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Receita Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Custos
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Lucro
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Margem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1
                    const summary = summaries.find((s) => s.month === month)
                    const hasData = !!summary
                    return (
                      <tr
                        key={month}
                        className={`border-b border-gray-50 transition-colors hover:bg-blue-50/30 ${
                          i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        } ${!hasData ? 'opacity-40' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {MONTH_NAMES[i]}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {summary?.active_clients ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-violet-700">
                          {hasData ? formatCurrency(summary.mrr) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-blue-700">
                          {hasData ? formatCurrency(summary.total_revenue) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">
                          {hasData ? formatCurrency(summary.total_costs) : '—'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            hasData && summary.profit >= 0
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                        >
                          {hasData ? formatCurrency(summary.profit) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {hasData ? formatPercent(summary.margin) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-gray-900">
                      Acumulado {selectedYear}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {accumulated.clients}
                    </td>
                    <td className="px-4 py-3 text-right text-violet-700">
                      {formatCurrency(accumulated.mrr)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700">
                      {formatCurrency(accumulated.receita)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatCurrency(accumulated.custos)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        accumulated.lucro >= 0
                          ? 'text-emerald-700'
                          : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(accumulated.lucro)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {formatPercent(accumulated.margin)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function VisaoAnualPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-8 h-80 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <VisaoAnualContent />
    </Suspense>
  )
}
