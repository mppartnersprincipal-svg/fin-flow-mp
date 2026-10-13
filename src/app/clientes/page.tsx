'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Users, Edit2, Trash2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { MonthTabs } from '@/components/MonthTabs'
import { DataTable } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { formatCurrency } from '@/lib/formatters'
import type { Client } from '@/lib/types'

const STATUS_OPTIONS = ['Todos', 'Ativo', 'Inativo', 'Churned'] as const

function ClientesContent() {
  const searchParams = useSearchParams()
  const selectedYear = Number(searchParams.get('year')) || 2026
  const selectedMonth = Number(searchParams.get('month')) || 10

  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('Todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formService, setFormService] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formStatus, setFormStatus] = useState('Ativo')
  const [formNotes, setFormNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function fetchClients() {
    setIsLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })
    setClients(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = useMemo(() => {
    if (statusFilter === 'Todos') return clients
    return clients.filter(
      (c) => c.status.toLowerCase() === statusFilter.toLowerCase()
    )
  }, [clients, statusFilter])

  const activeClients = useMemo(
    () => clients.filter((c) => c.status.toLowerCase() === 'ativo'),
    [clients]
  )

  const totalMRR = useMemo(
    () => activeClients.reduce((sum, c) => sum + c.monthly_value, 0),
    [activeClients]
  )

  function openNewClientModal() {
    setEditingClient(null)
    setFormName('')
    setFormService('')
    setFormValue('')
    setFormStatus('Ativo')
    setFormNotes('')
    setIsModalOpen(true)
  }

  function openEditClientModal(client: Client) {
    setEditingClient(client)
    setFormName(client.name)
    setFormService(client.service)
    setFormValue(String(client.monthly_value))
    setFormStatus(client.status)
    setFormNotes(client.notes || '')
    setIsModalOpen(true)
  }

  async function handleSave() {
    setIsSaving(true)

    const payload = {
      name: formName,
      service: formService,
      monthly_value: Number(formValue) || 0,
      status: formStatus,
      notes: formNotes || null,
    }

    if (editingClient) {
      await supabase.from('clients').update(payload).eq('id', editingClient.id)
    } else {
      await supabase.from('clients').insert(payload)
    }

    setIsSaving(false)
    setIsModalOpen(false)
    fetchClients()
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const statusBadge = (status: string) => {
    const lower = status.toLowerCase()
    const colors: Record<string, string> = {
      ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      inativo: 'bg-gray-50 text-gray-500 border-gray-200',
      churned: 'bg-red-50 text-red-600 border-red-200',
    }
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          colors[lower] || 'bg-gray-50 text-gray-500 border-gray-200'
        }`}
      >
        {status}
      </span>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      sortable: true,
      sortValue: (c: Client) => c.name,
      render: (c: Client) => (
        <span className="font-medium text-gray-900">{c.name}</span>
      ),
    },
    {
      key: 'service',
      header: 'Serviço',
      sortable: true,
      sortValue: (c: Client) => c.service,
      render: (c: Client) => (
        <span className="text-gray-600">{c.service}</span>
      ),
    },
    {
      key: 'monthly_value',
      header: 'Valor Mensal',
      align: 'right' as const,
      sortable: true,
      sortValue: (c: Client) => c.monthly_value,
      render: (c: Client) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(c.monthly_value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      sortable: true,
      sortValue: (c: Client) => c.status,
      render: (c: Client) => statusBadge(c.status),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'center' as const,
      render: (c: Client) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => openEditClientModal(c)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(c.id)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8">
      <MonthTabs selectedYear={selectedYear} selectedMonth={selectedMonth} />

      {/* Header */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie a carteira de clientes da agência
          </p>
        </div>
        <button
          onClick={openNewClientModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Filters */}
      <div className="mt-5 flex items-center gap-2">
        <span className="text-sm text-gray-500">Status:</span>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setStatusFilter(opt)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === opt
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-5">
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        ) : (
          <DataTable
            columns={columns}
            data={filteredClients}
            keyExtractor={(c) => c.id}
            emptyMessage="Nenhum cliente encontrado."
          />
        )}
      </div>

      {/* Summary */}
      <div className="mt-5 flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-blue-600" />
          <span className="text-sm text-gray-500">Clientes Ativos:</span>
          <span className="text-sm font-bold text-gray-900">
            {activeClients.length}
          </span>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">MRR Total:</span>
          <span className="text-sm font-bold text-blue-700">
            {formatCurrency(totalMRR)}
          </span>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nome do cliente"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serviço
            </label>
            <input
              type="text"
              required
              value={formService}
              onChange={(e) => setFormService(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: Gestão de redes sociais"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor Mensal (R$)
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Notas opcionais..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default function ClientesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-8 h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <ClientesContent />
    </Suspense>
  )
}
