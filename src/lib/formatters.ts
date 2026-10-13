/**
 * Formata um valor numérico para moeda BRL (R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formata um valor numérico como porcentagem (ex: 45,2%)
 */
export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

/**
 * Formata data no padrão brasileiro (DD/MM/AAAA)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR')
}

/**
 * Nomes dos meses em português
 */
export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

/**
 * Abreviações dos meses
 */
export const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const

/**
 * Mapa de categorias de custos fixos para labels em português
 */
export const FIXED_COST_CATEGORIES: Record<string, string> = {
  salarios: 'Salários',
  aluguel: 'Aluguel',
  contador: 'Contador',
  internet_telefone: 'Internet/Telefone',
  outros: 'Outros',
}

/**
 * Mapa de categorias de custos variáveis para labels em português
 */
export const VARIABLE_COST_CATEGORIES: Record<string, string> = {
  comissoes: 'Comissões',
  freelancers: 'Freelancers',
  marketing_anuncios: 'Marketing/Anúncios',
  viagens: 'Viagens',
  eventos: 'Eventos',
  outros: 'Outros',
}

/**
 * Cores para gráficos
 */
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
] as const
