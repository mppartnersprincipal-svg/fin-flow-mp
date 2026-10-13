'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Edit2, Trash2, Receipt, Wallet } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { MonthTabs } from '@/components/MonthTabs'
import { DataTable } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import {
  formatCurrency,
  MONTH_NAMES,
  FIXED_COST_CATEGORIES,
  VARIABLE_COST_CATEGORIES,
} from '@/lib/formatters'
import type { FixedCost, VariableCost } from '@/lib/types'

type TabType = 'fixos' | 'variaveis'

function CustosContent() {
  const searchParams = useSearchParams()
  const selectedYear = Number(searchParams.get('year')) || 2026
  const selectedMonth = Number(searchParams.get('month')) || 10

  const [activeTab, setActiveTab] = useState<TabType>('fixos')

  // Fixed costs state
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [fixedLoading, setFixedLoading] = useState(true)
  const [fixedCategoryFilter, setFixedCategoryFilter] = useState('Todos')
  const [fixedTypeFilter, setFixedTypeFilter] = useState('Todos')

  // Variable costs state
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([])
  const [variableLoading, setVariableLoading] = useState(true)
  const [variableCategoryFilter, setVariableCategoryFilter] = useState('Todos')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFixed, setEditingFixed] = useState<FixedCost | null>(null)
  const [editingVariable, setEditingVariable] = useState<VariableCost | null>(null)

  // Form state
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCostType, setFormCostType] = useState('recorrente')
  const [isSaving, setIsSaving] = useState(false)

  async function fetchFixedCosts() {
    setFixedLoading(true)
    const { data } = await supabase
      .from('fixed_costs')
      .select('*')
      .eq('year', selectedYear)
      .eq('month', selectedMonth)
      .order('category', { ascending: true })
    setFixedCosts(data || [])
    setFixedLoading(false)
  }

  async function fetchVariableCosts() {
    setVariableLoading(true)
    const { data } = await supabase
      .from('variable_costs')
      .select('*')
      .eq('year', selectedYear)
      .eq('month', selectedMonth)
      .order('category', { ascending: true })
    setVariableCosts(data || [])
    setVariableLoading(false)
  }

  useEffect(() => {
    fetchFixedCosts()
    fetchVariableCosts()
  }, [selectedYear, selectedMonth])

  // Filtered data
  const filteredFixed = useMemo(() => {
    let data = fixedCosts
    if (fixedCategoryFilter !== 'Todos') {
      data = data.filter((c) => c.category === fixedCategoryFilter)
    }
    if (fixedTypeFilter !== 'Todos') {
      data = data.filter((c) => c.cost_type === fixedTypeFilter)
    }
    return data
  }, [fixedCosts, fixedCategoryFilter, fixedTypeFilter])

  const filteredVariable = useMemo(() => {
    if (variableCategoryFilter === 'Todos') return variableCosts
    return variableCosts.filter((c) => c.category === variableCategoryFilter)
  }, [variableCosts, variableCategoryFilter])

  // Totals
  const fixedTotal = useMemo(
    () => filteredFixed.reduce((sum, c) => sum + c.amount, 0),
    [filteredFixed]
  )
  const fixedRecorrente = useMemo(
    () =>
      fixedCosts
        .filter((c) => c.cost_type === 'recorrente')
        .reduce((sum, c) => sum + c.amount, 0),
    [fixedCosts]
  )
  const fixedPontual = useMemo(
    () =>
      fixedCosts
        .filter((c) => c.cost_type === 'pontual')
        .reduce((sum, c) => sum + c.amount, 0),
    [fixedCosts]
  )
  const variableTotal = useMemo(
    () => filteredVariable.reduce((sum, c) => sum + c.amount, 0),
    [filteredVariable]
  )

  // Modal handlers
  function openNewFixedModal() {
    setEditingFixed(null)
    setEditingVariable(null)
    setFormCategory(Object.keys(FIXED_COST_CATEGORIES)[0])
    setFormDescription('')
    setFormAmount('')
    setFormCostType('recorrente')
    setIsModalOpen(true)
  }

  function openNewVariableModal() {
    setEditingFixed(null)
    setEditingVariable(null)
    setFormCategory(Object.keys(VARIABLE_COST_CATEGORIES)[0])
    setFormDescription('')
    setFormAmount('')
    setIsModalOpen(true)
  }

  function openEditFixedModal(cost: FixedCost) {
    setEditingFixed(cost)
    setEditingVariable(null)
    setFormCategory(cost.category)
    setFormDescription(cost.description)
    setFormAmount(String(cost.amount))
    setFormCostType(cost.cost_type)
    setIsModalOpen(true)
  }

  function openEditVariableModal(cost: VariableCost) {
    setEditingVariable(cost)
    setEditingFixed(null)
    setFormCategory(cost.category)
    setFormDescription(cost.description)
    setFormAmount(String(cost.amount))
    setIsModalOpen(true)
  }

  async function handleSaveFixed() {
    setIsSaving(true)
    const payload = {
      year: selectedYear,
      month: selectedMonth,
      category: formCategory,
      description: formDescription,
      amount: Number(formAmount) || 0,
      cost_type: formCostType,
    }
    if (editingFixed) {
      await supabase.from('fixed_costs').update(payload).eq('id', editingFixed.id)
    } else {
      await supabase.from('fixed_costs').insert(payload)
    }
    setIsSaving(false)
    setIsModalOpen(false)
    fetchFixedCosts()
  }

  async function handleSaveVariable() {
    setIsSaving(true)
    const payload = {
      year: selectedYear,
      month: selectedMonth,
      category: formCategory,
      description: formDescription,
      amount: Number(formAmount) || 0,
    }
    if (editingVariable) {
      await supabase
        .from('variable_costs')
        .update(payload)
        .eq('id', editingVariable.id)
    } else {
      await supabase.from('variable_costs').insert(payload)
    }
    setIsSaving(false)
    setIsModalOpen(false)
    fetchVariableCosts()
  }

  async function handleDeleteFixed(id: string) {
    if (!confirm('Tem certeza que deseja excluir este custo?')) return
    await supabase.from('fixed_costs').delete().eq('id', id)
    fetchFixedCosts()
  }

  async function handleDeleteVariable(id: string) {
    if (!confirm('Tem certeza que deseja excluir este custo?')) return
    await supabase.from('variable_costs').delete().eq('id', id)
    fetchVariableCosts()
  }

  const typeBadge = (type: string) => {
    const isRecorrente = type === 'recorrente'
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          isRecorrente
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        {isRecorrente ? 'Recorrente' : 'Pontual'}
      </span>
    )
  }

  // Fixed costs columns
  const fixedColumns = [
    {
      key: 'category',
      header: 'Categoria',
      sortable: true,
      sortValue: (c: FixedCost) => FIXED_COST_CATEGORIES[c.category] || c.category,
      render: (c: FixedCost) => (
        <span className="font-medium text-gray-900">
          {FIXED_COST_CATEGORIES[c.category] || c.category}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      sortable: true,
      sortValue: (c: FixedCost) => c.description,
      render: (c: FixedCost) => (
        <span className="text-gray-600">{c.description}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right' as const,
      sortable: true,
      sortValue: (c: FixedCost) => c.amount,
      render: (c: FixedCost) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(c.amount)}
        </span>
      ),
    },
    {
      key: 'cost_type',
      header: 'Tipo',
      align: 'center' as const,
      sortable: true,
      sortValue: (c: FixedCost) => c.cost_type,
      render: (c: FixedCost) => typeBadge(c.cost_type),
    },
    {
      key: 'period',
      header: 'Mês/Ano',
      align: 'center' as const,
      render: (c: FixedCost) => (
        <span className="text-gray-500">
          {MONTH_NAMES[c.month - 1]} {c.year}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'center' as const,
      render: (c: FixedCost) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => openEditFixedModal(c)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteFixed(c.id)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  // Variable costs columns
  const variableColumns = [
    {
      key: 'category',
      header: 'Categoria',
      sortable: true,
      sortValue: (c: VariableCost) =>
        VARIABLE_COST_CATEGORIES[c.category] || c.category,
      render: (c: VariableCost) => (
        <span className="font-medium text-gray-900">
          {VARIABLE_COST_CATEGORIES[c.category] || c.category}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      sortable: true,
      sortValue: (c: VariableCost) => c.description,
      render: (c: VariableCost) => (
        <span className="text-gray-600">{c.description}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right' as const,
      sortable: true,
      sortValue: (c: VariableCost) => c.amount,
      render: (c: VariableCost) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(c.amount)}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Mês/Ano',
      align: 'center' as const,
      render: (c: VariableCost) => (
        <span className="text-gray-500">
          {MONTH_NAMES[c.month - 1]} {c.year}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'center' as const,
      render: (c: VariableCost) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => openEditVariableModal(c)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteVariable(c.id)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  const currentCategories =
    activeTab === 'fixos' ? FIXED_COST_CATEGORIES : VARIABLE_COST_CATEGORIES
  const currentFilter =
    activeTab === 'fixos' ? fixedCategoryFilter : variableCategoryFilter
  const setCurrentFilter =
    activeTab === 'fixos' ? setFixedCategoryFilter : setVariableCategoryFilter

  return (
    <div className="p-8">
      <MonthTabs selectedYear={selectedYear} selectedMonth={selectedMonth} />

      {/* Header */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Custos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <button
          onClick={activeTab === 'fixos' ? openNewFixedModal : openNewVariableModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo Custo
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex items-center gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('fixos')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'fixos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Receipt size={16} />
          Custos Fixos
        </button>
        <button
          onClick={() => setActiveTab('variaveis')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'variaveis'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wallet size={16} />
          Custos Variáveis
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">Categoria:</span>
        <button
          onClick={() => setCurrentFilter('Todos')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            currentFilter === 'Todos'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {Object.entries(currentCategories).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCurrentFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              currentFilter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}

        {activeTab === 'fixos' && (
          <>
            <div className="h-5 w-px bg-gray-300 mx-1" />
            <span className="text-sm text-gray-500">Tipo:</span>
            {['Todos', 'recorrente', 'pontual'].map((opt) => (
              <button
                key={opt}
                onClick={() => setFixedTypeFilter(opt)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  fixedTypeFilter === opt
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt === 'Todos'
                  ? 'Todos'
                  : opt === 'recorrente'
                    ? 'Recorrente'
                    : 'Pontual'}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Table */}
      <div className="mt-4">
        {activeTab === 'fixos' ? (
          fixedLoading ? (
            <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
          ) : (
            <DataTable
              columns={fixedColumns}
              data={filteredFixed}
              keyExtractor={(c) => c.id}
              emptyMessage="Nenhum custo fixo neste mês."
            />
          )
        ) : variableLoading ? (
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        ) : (
          <DataTable
            columns={variableColumns}
            data={filteredVariable}
            keyExtractor={(c) => c.id}
            emptyMessage="Nenhum custo variável neste mês."
          />
        )}
      </div>

      {/* Totals */}
      <div className="mt-5 flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        {activeTab === 'fixos' ? (
          <>
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-orange-500" />
              <span className="text-sm text-gray-500">Total Filtrado:</span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(fixedTotal)}
              </span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Recorrentes:</span>
              <span className="text-sm font-bold text-blue-700">
                {formatCurrency(fixedRecorrente)}
              </span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Pontuais:</span>
              <span className="text-sm font-bold text-amber-600">
                {formatCurrency(fixedPontual)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-orange-500" />
            <span className="text-sm text-gray-500">
              Total Custos Variáveis:
            </span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(variableTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingFixed || editingVariable
            ? 'Editar Custo'
            : activeTab === 'fixos'
              ? 'Novo Custo Fixo'
              : 'Novo Custo Variável'
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (activeTab === 'fixos' || editingFixed) {
              handleSaveFixed()
            } else {
              handleSaveVariable()
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {Object.entries(
                activeTab === 'fixos' || editingFixed
                  ? FIXED_COST_CATEGORIES
                  : VARIABLE_COST_CATEGORIES
              ).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
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
              placeholder="Descrição do custo"
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

          {(activeTab === 'fixos' || editingFixed) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={formCostType}
                onChange={(e) => setFormCostType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="recorrente">Recorrente</option>
                <option value="pontual">Pontual</option>
              </select>
            </div>
          )}

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

export default function CustosPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-8 h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      }
    >
      <CustosContent />
    </Suspense>
  )
}
