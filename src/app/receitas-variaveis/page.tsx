'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, DollarSign, Info, Edit2, Trash2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { MonthTabs } from '@/components/MonthTabs'
import { DataTable } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { formatCurrency, formatDate, MONTH_NAMES } from '@/lib/formatters'
import type { VariableRevenue } from '@/lib/types'

function ReceitasVariaveisContent() {
  const searchParams = useSearchParams()
  const selectedYear = Number(searchParams.get('year')) || 2026
  const selectedMonth = Number(searchParams.get('month')) || 10

  const [revenues, setRevenues] = useState<VariableRevenue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRevenue, setEditingRevenue] = useState<VariableRevenue | null>(null)

  // Form state
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function fetchRevenues() {
    setIsLoading(true)
    const { data } = await supabase
      .from('variable_revenues')
      .select('*')
      .eq('year', selectedYear)
      .eq('month', selectedMonth)
      .order('date_registered', { ascending: false })
    setRevenues(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchRevenues()
  }, [selectedYear, selectedMonth])

  const total = useMemo(
    () => revenues.reduce((sum, r) => sum + r.amount, 0),
    [revenues]
  )

  function openNewModal() {
    setEditingRevenue(null)
    setFormDescription('')
    setFormAmount('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setIsModalOpen(true)
  }

  function openEditModal(rev: VariableRevenue) {
    setEditingRevenue(rev)
    setFormDescription(rev.description)
    setFormAmount(String(rev.amount))
    setFormDate(rev.date_registered || '')
    setIsModalOpen(true)
  }

  async function handleSave() {
    setIsSaving(true)

    const payload = {
      year: selectedYear,
      month: selectedMonth,
      description: formDescription,
      amount: Number(formAmount) || 0,
      date_registered: formDate || null,
    }

    if (editingRevenue) {
      await supabase
        .from('variable_revenues')
        .update(payload)
        .eq('id', editingRevenue.id)
    } else {
      await supabase.from('variable_revenues').insert(payload)
    }

    setIsSaving(false)
    setIsModalOpen(false)
    fetchRevenues()
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return
    await supabase.from('variable_revenues').delete().eq('id', id)
    fetchRevenues()
  }

  const columns = [
    {
      key: 'description',
      header: 'Descrição',
      sortable: true,
      sortValue: (r: VariableRevenue) => r.description,
      render: (r: VariableRevenue) => (
        <span className="font-medium text-gray-900">{r.description}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right' as const,
      sortable: true,
      sortValue: (r: VariableRevenue) => r.amount,
      render: (r: VariableRevenue) => (
        <span className="font-medium text-emerald-600">
          {formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Mês/Ano',
      align: 'center' as const,
      render: (r: VariableRevenue) => (
        <span className="text-gray-600">
          {MONTH_NAMES[r.month - 1]} {r.year}
        </span>
      ),
    },
    {
      key: 'date_registered',
      header: 'Data Cadastro',
      align: 'center' as const,
      sortable: true,
      sortValue: (r: VariableRevenue) => r.date_registered || '',
      render: (r: VariableRevenue) => (
        <span className="text-gray-500">
          {r.date_registered ? formatDate(r.date_registered) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'center' as const,
      render: (r: VariableRevenue) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => openEditModal(r)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(r.id)}
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
          <h2 className="text-2xl font-bold text-gray-900">
            Receitas Variáveis
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus size={18} />
          Nova Receita
        </button>
      </div>

      {/* Info box */}
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700">
          Receitas variáveis são valores recebidos fora do MRR (Monthly Recurring
          Revenue). Incluem projetos avulsos, consultorias pontuais, criação de
          sites one-time, bônus de indicação e outros rendimentos não recorrentes.
        </p>
      </div>

      {/* Table */}
      <div className="mt-5">
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        ) : (
          <DataTable
            columns={columns}
            data={revenues}
            keyExtractor={(r) => r.id}
            emptyMessage="Nenhuma receita variável neste mês."
          />
        )}
      </div>

      {/* Total */}
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <DollarSign size={18} className="text-emerald-600" />
        <span className="text-sm text-gray-500">
          Total Receitas Variáveis:
        </span>
        <span className="text-sm font-bold text-emerald-600">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRevenue ? 'Editar Receita' : 'Nova Receita Variável'}
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
              Descrição
            </label>
            <input
              type="text"
              required
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Descrição da receita"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$)
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

export default function ReceitasVariaveisPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-8 h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <ReceitasVariaveisContent />
    </Suspense>
  )
}
