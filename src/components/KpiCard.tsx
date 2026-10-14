import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: number | null
  trendLabel?: string
  colorClass?: string
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  colorClass = 'text-gray-900',
}: KpiCardProps) {
  const trendColor =
    trend === undefined || trend === null
      ? 'text-gray-400'
      : trend > 0
        ? 'text-emerald-600'
        : trend < 0
          ? 'text-red-500'
          : 'text-gray-400'

  const TrendIcon =
    trend === undefined || trend === null
      ? Minus
      : trend > 0
        ? TrendingUp
        : trend < 0
          ? TrendingDown
          : Minus

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${colorClass}`}>
            {value}
          </p>
        </div>
        <div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0C239]/10 text-[#F0C239]">
          <Icon size={20} />
        </div>
      </div>

      {trend !== undefined && trend !== null && (
        <div className="mt-3 flex items-center gap-1.5">
          <TrendIcon size={14} className={trendColor} />
          <span className={`text-xs font-medium ${trendColor}`}>
            {trend > 0 ? '+' : ''}
            {trend.toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </span>
          {trendLabel && (
            <span className="text-xs text-gray-400">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
