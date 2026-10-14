'use client'

import { useEffect, useState, useCallback } from 'react'
import { History, Search, Eye, ChevronDown } from 'lucide-react'

import { getAuditLog, type AuditEntry } from '@/lib/audit'
import { Modal } from '@/components/Modal'

const PAGE_SIZE = 50

const TABLE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'clients', label: 'Clientes' },
  { value: 'fixed_costs', label: 'Custos Fixos' },
  { value: 'variable_costs', label: 'Custos Variáveis' },
  { value: 'variable_revenues', label: 'Receitas Variáveis' },
  { value: 'monthly_summary', label: 'Resumo Mensal' },
] as const

const ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
}

const TABLE_LABELS: Record<string, string> = {
  clients: 'Clientes',
  fixed_costs: 'Custos Fixos',
  variable_costs: 'Custos Variáveis',
  variable_revenues: 'Receitas Variáveis',
  monthly_summary: 'Resumo Mensal',
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    update: 'bg-blue-50 text-blue-700 border-blue-200',
    delete: 'bg-red-50 text-red-600 border-red-200',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        colors[action] || 'bg-gray-50 text-gray-500 border-gray-200'
      }`}
    >
      {ACTION_LABELS[action] || action}
    </span>
  )
}

function DiffView({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
}) {
  if (!oldData && !newData) {
    return <p className="text-sm text-gray-400">Nenhum dado registrado.</p>
  }

  const allKeys = Array.from(
    new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ])
  )

  return (
    <div className="space-y-3">
      {oldData && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Dados Anteriores
          </h4>
          <div className="rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm">
            {allKeys.map((key) => {
              if (oldData[key] === undefined) return null
              return (
                <div key={key} className="flex gap-2 py-0.5">
                  <span className="font-medium text-gray-600 min-w-[120px]">
                    {key}:
                  </span>
                  <span className="text-gray-800">
                    {formatValue(oldData[key])}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {newData && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Dados Novos
          </h4>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-sm">
            {allKeys.map((key) => {
              if (newData[key] === undefined) return null
              const changed =
                oldData && JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
              return (
                <div key={key} className="flex gap-2 py-0.5">
                  <span className="font-medium text-gray-600 min-w-[120px]">
                    {key}:
                  </span>
                  <span
                    className={changed ? 'font-semibold text-emerald-700' : 'text-gray-800'}
                  >
                    {formatValue(newData[key])}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg bg-gray-100"
        />
      ))}
    </div>
  )
}

export default function HistoricoPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Filters
  const [tableFilter, setTableFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Detail modal
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)

  const fetchEntries = useCallback(
    async (append = false) => {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      const currentCount = append ? entries.length : 0
      const limit = PAGE_SIZE

      const data = await getAuditLog({
        table_name: tableFilter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: currentCount + limit,
      })

      if (append) {
        // Pegamos apenas os novos registros (offset simulado)
        const newEntries = data.slice(currentCount)
        setEntries((prev) => [...prev, ...newEntries])
        setHasMore(newEntries.length >= limit)
        setIsLoadingMore(false)
      } else {
        setEntries(data.slice(0, limit))
        setHasMore(data.length >= limit)
        setIsLoading(false)
      }
    },
    [tableFilter, fromDate, toDate, entries.length]
  )

  useEffect(() => {
    setEntries([])
    setHasMore(true)
    fetchInitial()
  }, [tableFilter, fromDate, toDate])

  async function fetchInitial() {
    setIsLoading(true)
    const data = await getAuditLog({
      table_name: tableFilter || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      limit: PAGE_SIZE,
    })
    setEntries(data)
    setHasMore(data.length >= PAGE_SIZE)
    setIsLoading(false)
  }

  async function loadMore() {
    setIsLoadingMore(true)
    const data = await getAuditLog({
      table_name: tableFilter || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      limit: entries.length + PAGE_SIZE,
    })
    const newEntries = data.slice(entries.length)
    setEntries((prev) => [...prev, ...newEntries])
    setHasMore(newEntries.length >= PAGE_SIZE)
    setIsLoadingMore(false)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <History size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Histórico de Alterações
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Registro de todas as ações realizadas no sistema
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Tabela
          </label>
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TABLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Data início
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Data fim
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => {
            setTableFilter('')
            setFromDate('')
            setToDate('')
          }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Limpar
        </button>
      </div>

      {/* Table */}
      <div className="mt-5">
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <SkeletonRows />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center">
            <Search size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">
              Nenhum registro encontrado.
            </p>
            <p className="text-gray-300 text-xs mt-1">
              As alterações feitas no sistema aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Data/Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Usuário
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Ação
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Tabela
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-gray-50 transition-colors hover:bg-blue-50/30 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {entry.user_email || (
                          <span className="text-gray-400 italic">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {TABLE_LABELS[entry.table_name] || entry.table_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {entry.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center border-t border-gray-100 py-4">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    'Carregando...'
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Carregar mais
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        title="Detalhes da Alteração"
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs font-medium text-gray-500">
                  Data/Hora
                </span>
                <p className="text-gray-900">
                  {formatDateTime(selectedEntry.created_at)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">
                  Usuário
                </span>
                <p className="text-gray-900">
                  {selectedEntry.user_email || 'Sistema'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Ação</span>
                <div className="mt-0.5">
                  <ActionBadge action={selectedEntry.action} />
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">
                  Tabela
                </span>
                <p className="text-gray-900">
                  {TABLE_LABELS[selectedEntry.table_name] ||
                    selectedEntry.table_name}
                </p>
              </div>
              {selectedEntry.record_id && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-gray-500">
                    ID do Registro
                  </span>
                  <p className="text-gray-900 font-mono text-xs">
                    {selectedEntry.record_id}
                  </p>
                </div>
              )}
              {selectedEntry.description && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-gray-500">
                    Descrição
                  </span>
                  <p className="text-gray-900">{selectedEntry.description}</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <DiffView
                oldData={selectedEntry.old_data}
                newData={selectedEntry.new_data}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
