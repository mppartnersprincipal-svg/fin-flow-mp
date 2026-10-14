'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  PiggyBank,
  BarChart3,
  Percent,
  Calculator,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { supabase } from '@/lib/supabase'
import { MonthTabs } from '@/components/MonthTabs'
import { KpiCard } from '@/components/KpiCard'
import {
  formatCurrency,
  formatPercent,
  MONTH_NAMES,
  FIXED_COST_CATEGORIES,
  VARIABLE_COST_CATEGORIES,
  CHART_COLORS,
} from '@/lib/formatters'
import type {
  MonthlySummary,
  FixedCost,
  VariableCost,
} from '@/lib/types'

function DashboardContent() {
  const searchParams = useSearchParams()
  const selectedYear = Number(searchParams.get('year')) || 2026
  const selectedMonth = Number(searchParams.get('month')) || 10

  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [prevMonthSummary, setPrevMonthSummary] = useState<MonthlySummary | null>(null)
  const [prevYearSummary, setPrevYearSummary] = useState<MonthlySummary | null>(null)
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)

      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
      const prevMonthYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear

      const [
        summaryRes,
        prevMonthRes,
        prevYearRes,
        fixedRes,
        variableRes,
      ] = await Promise.all([
        supabase
          .from('monthly_summary')
          .select('*')
          .eq('year', selectedYear)
          .eq('month', selectedMonth)
          .single(),
        supabase
          .from('monthly_summary')
          .select('*')
          .eq('year', prevMonthYear)
          .eq('month', prevMonth)
          .single(),
        supabase
          .from('monthly_summary')
          .select('*')
          .eq('year', selectedYear - 1)
          .eq('month', selectedMonth)
          .single(),
        supabase
          .from('fixed_costs')
          .select('*')
          .eq('year', selectedYear)
          .eq('month', selectedMonth),
        supabase
          .from('variable_costs')
          .select('*')
          .eq('year', selectedYear)
          .eq('month', selectedMonth),
      ])

      setSummary(summaryRes.data)
      setPrevMonthSummary(prevMonthRes.data)
      setPrevYearSummary(prevYearRes.data)
      setFixedCosts(fixedRes.data || [])
      setVariableCosts(variableRes.data || [])
      setIsLoading(false)
    }

    fetchData()
  }, [selectedYear, selectedMonth])

  // Calculate trends vs previous month
  const monthTrends = useMemo(() => {
    if (!summary || !prevMonthSummary) return null
    function pctChange(current: number, previous: number): number | null {
      if (previous === 0) return null
      return ((current - previous) / Math.abs(previous)) * 100
    }
    return {
      totalRevenue: pctChange(summary.total_revenue, prevMonthSummary.total_revenue),
      mrr: pctChange(summary.mrr, prevMonthSummary.mrr),
      fixedCosts: pctChange(summary.fixed_costs, prevMonthSummary.fixed_costs),
      variableCosts: pctChange(summary.variable_costs, prevMonthSummary.variable_costs),
      totalCosts: pctChange(summary.total_costs, prevMonthSummary.total_costs),
      profit: pctChange(summary.profit, prevMonthSummary.profit),
      margin: summary.margin - prevMonthSummary.margin,
    }
  }, [summary, prevMonthSummary])

  // Calculate trends vs previous year
  const yearTrends = useMemo(() => {
    if (!summary || !prevYearSummary) return null
    function pctChange(current: number, previous: number): number | null {
      if (previous === 0) return null
      return ((current - previous) / Math.abs(previous)) * 100
    }
    return {
      totalRevenue: pctChange(summary.total_revenue, prevYearSummary.total_revenue),
      mrr: pctChange(summary.mrr, prevYearSummary.mrr),
      fixedCosts: pctChange(summary.fixed_costs, prevYearSummary.fixed_costs),
      variableCosts: pctChange(summary.variable_costs, prevYearSummary.variable_costs),
      totalCosts: pctChange(summary.total_costs, prevYearSummary.total_costs),
      profit: pctChange(summary.profit, prevYearSummary.profit),
      margin: summary.margin - prevYearSummary.margin,
    }
  }, [summary, prevYearSummary])

  // Chart data: Revenue composition
  const revenueCompositionData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'MRR', value: summary.mrr },
      { name: 'Receitas Variáveis', value: summary.variable_revenue },
    ].filter((d) => d.value > 0)
  }, [summary])

  // Chart data: Cost distribution
  const costDistributionData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Custos Fixos', value: summary.fixed_costs },
      { name: 'Custos Variáveis', value: summary.variable_costs },
    ].filter((d) => d.value > 0)
  }, [summary])

  // Chart data: Fixed costs by category
  const fixedCostsByCategory = useMemo(() => {
    const grouped: Record<string, number> = {}
    for (const cost of fixedCosts) {
      const label = FIXED_COST_CATEGORIES[cost.category] || cost.category
      grouped[label] = (grouped[label] || 0) + cost.amount
    }
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [fixedCosts])

  // Chart data: Variable costs by category
  const variableCostsByCategory = useMemo(() => {
    const grouped: Record<string, number> = {}
    for (const cost of variableCosts) {
      const label = VARIABLE_COST_CATEGORIES[cost.category] || cost.category
      grouped[label] = (grouped[label] || 0) + cost.amount
    }
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [variableCosts])

  const ebitda = summary ? summary.profit : 0

  if (isLoading) {
    return (
      <div className="p-8">
        <MonthTabs selectedYear={selectedYear} selectedMonth={selectedMonth} />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-8">
        <MonthTabs selectedYear={selectedYear} selectedMonth={selectedMonth} />
        <div className="mt-12 flex flex-col items-center justify-center text-gray-400">
          <BarChart3 size={48} className="mb-4" />
          <p className="text-lg font-medium">Sem dados para {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
          <p className="text-sm mt-1">Selecione outro mês ou ano.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Month/Year selector */}
      <MonthTabs selectedYear={selectedYear} selectedMonth={selectedMonth} />

      {/* Page title + export buttons */}
      <div className="mt-6 mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Dashboard — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={async () => {
              const { exportDrePdf } = await import('@/lib/export')
              exportDrePdf(summary, MONTH_NAMES[selectedMonth - 1], selectedYear)
            }}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            title="Exportar DRE em PDF"
          >
            <FileDown size={14} />
            PDF
          </button>
          <button
            onClick={async () => {
              const { exportDreExcel } = await import('@/lib/export')
              exportDreExcel(summary, MONTH_NAMES[selectedMonth - 1], selectedYear)
            }}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            title="Exportar DRE em Excel"
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receita Total"
          value={formatCurrency(summary.total_revenue)}
          icon={DollarSign}
          trend={monthTrends?.totalRevenue}
          trendLabel="vs mês ant."
          colorClass="text-blue-700"
        />
        <KpiCard
          title="MRR"
          value={formatCurrency(summary.mrr)}
          icon={TrendingUp}
          trend={monthTrends?.mrr}
          trendLabel="vs mês ant."
          colorClass="text-blue-700"
        />
        <KpiCard
          title="Custos Fixos"
          value={formatCurrency(summary.fixed_costs)}
          icon={Receipt}
          trend={monthTrends?.fixedCosts}
          trendLabel="vs mês ant."
          colorClass="text-orange-600"
        />
        <KpiCard
          title="Custos Variáveis"
          value={formatCurrency(summary.variable_costs)}
          icon={Wallet}
          trend={monthTrends?.variableCosts}
          trendLabel="vs mês ant."
          colorClass="text-orange-600"
        />
        <KpiCard
          title="Custo Total"
          value={formatCurrency(summary.total_costs)}
          icon={Calculator}
          trend={monthTrends?.totalCosts}
          trendLabel="vs mês ant."
          colorClass="text-red-600"
        />
        <KpiCard
          title="Lucro Líquido"
          value={formatCurrency(summary.profit)}
          icon={PiggyBank}
          trend={monthTrends?.profit}
          trendLabel="vs mês ant."
          colorClass={summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <KpiCard
          title="Margem de Lucro"
          value={formatPercent(summary.margin)}
          icon={Percent}
          trend={monthTrends?.margin}
          trendLabel="pp vs mês ant."
          colorClass={summary.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <KpiCard
          title="EBITDA"
          value={formatCurrency(ebitda)}
          icon={BarChart3}
          trend={monthTrends?.profit}
          trendLabel="vs mês ant."
          colorClass={ebitda >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
      </div>

      {/* Comparison sections */}
      {(prevMonthSummary || prevYearSummary) && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* vs Previous Month */}
          {prevMonthSummary && monthTrends && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                vs. Mês Anterior ({MONTH_NAMES[(selectedMonth - 2 + 12) % 12]})
              </h3>
              <div className="space-y-3">
                <ComparisonRow
                  label="Receita Total"
                  current={summary.total_revenue}
                  previous={prevMonthSummary.total_revenue}
                  pctChange={monthTrends.totalRevenue}
                />
                <ComparisonRow
                  label="Custos Totais"
                  current={summary.total_costs}
                  previous={prevMonthSummary.total_costs}
                  pctChange={monthTrends.totalCosts}
                  invertColor
                />
                <ComparisonRow
                  label="Lucro"
                  current={summary.profit}
                  previous={prevMonthSummary.profit}
                  pctChange={monthTrends.profit}
                />
                <ComparisonRow
                  label="Margem"
                  current={summary.margin}
                  previous={prevMonthSummary.margin}
                  pctChange={monthTrends.margin}
                  isPercent
                />
              </div>
            </div>
          )}

          {/* vs Previous Year */}
          {prevYearSummary && yearTrends && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                vs. Ano Anterior ({MONTH_NAMES[selectedMonth - 1]} {selectedYear - 1})
              </h3>
              <div className="space-y-3">
                <ComparisonRow
                  label="Receita Total"
                  current={summary.total_revenue}
                  previous={prevYearSummary.total_revenue}
                  pctChange={yearTrends.totalRevenue}
                />
                <ComparisonRow
                  label="Custos Totais"
                  current={summary.total_costs}
                  previous={prevYearSummary.total_costs}
                  pctChange={yearTrends.totalCosts}
                  invertColor
                />
                <ComparisonRow
                  label="Lucro"
                  current={summary.profit}
                  previous={prevYearSummary.profit}
                  pctChange={yearTrends.profit}
                />
                <ComparisonRow
                  label="Margem"
                  current={summary.margin}
                  previous={prevYearSummary.margin}
                  pctChange={yearTrends.margin}
                  isPercent
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Composition Pie */}
        {revenueCompositionData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Composição da Receita
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueCompositionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} (${((percent ?? 0) * 100).toFixed(1)}%)`
                    }
                  >
                    {revenueCompositionData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Cost Distribution Pie */}
        {costDistributionData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Distribuição de Custos
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} (${((percent ?? 0) * 100).toFixed(1)}%)`
                    }
                  >
                    {costDistributionData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Fixed Costs Bar */}
        {fixedCostsByCategory.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Custos Fixos Detalhados
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fixedCostsByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                    }
                    fontSize={12}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    fontSize={12}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Valor']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Variable Costs Bar */}
        {variableCostsByCategory.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Custos Variáveis Detalhados
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={variableCostsByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                    }
                    fontSize={12}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    fontSize={12}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Valor']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* Comparison row sub-component */
interface ComparisonRowProps {
  label: string
  current: number
  previous: number
  pctChange: number | null
  invertColor?: boolean
  isPercent?: boolean
}

function ComparisonRow({
  label,
  current,
  previous,
  pctChange,
  invertColor = false,
  isPercent = false,
}: ComparisonRowProps) {
  const formatVal = isPercent ? formatPercent : formatCurrency

  let changeColor = 'text-gray-400'
  if (pctChange !== null && pctChange !== 0) {
    const isPositive = pctChange > 0
    if (invertColor) {
      changeColor = isPositive ? 'text-red-500' : 'text-emerald-600'
    } else {
      changeColor = isPositive ? 'text-emerald-600' : 'text-red-500'
    }
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-gray-400">{formatVal(previous)}</span>
        <span className="font-medium text-gray-900">{formatVal(current)}</span>
        {pctChange !== null && (
          <span className={`font-medium ${changeColor} w-16 text-right`}>
            {pctChange > 0 ? '+' : ''}
            {pctChange.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
