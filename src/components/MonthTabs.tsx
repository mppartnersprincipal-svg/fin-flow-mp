'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MONTH_SHORT } from '@/lib/formatters'

interface MonthTabsProps {
  selectedYear: number
  selectedMonth: number
}

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027]

export function MonthTabs({ selectedYear, selectedMonth }: MonthTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(year: number, month: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(year))
    params.set('month', String(month))
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleYearChange(year: number) {
    navigate(year, selectedMonth)
  }

  function handleMonthChange(month: number) {
    navigate(selectedYear, month)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Ano:</span>
        <div className="flex gap-1">
          {AVAILABLE_YEARS.map((year) => (
            <button
              key={year}
              onClick={() => handleYearChange(year)}
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

      {/* Month tabs */}
      <div className="flex flex-wrap gap-1">
        {MONTH_SHORT.map((name, index) => {
          const month = index + 1
          return (
            <button
              key={month}
              onClick={() => handleMonthChange(month)}
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
  )
}
