import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatCurrency, formatPercent, MONTH_NAMES, MONTH_SHORT } from '@/lib/formatters'
import type { MonthlySummary } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formata valor em BRL para uso nas células do PDF */
function brl(value: number): string {
  return formatCurrency(value)
}

/** Formata margem como porcentagem */
function pct(value: number): string {
  return formatPercent(value)
}

// Cores da marca
const BRAND_BLUE: [number, number, number] = [37, 99, 235] // blue-600
const HEADER_BG: [number, number, number] = [30, 58, 138] // blue-900
const LIGHT_ROW: [number, number, number] = [239, 246, 255] // blue-50
const WHITE: [number, number, number] = [255, 255, 255]
const DARK_TEXT: [number, number, number] = [15, 23, 42] // slate-900
const MUTED_TEXT: [number, number, number] = [100, 116, 139] // slate-500

// ---------------------------------------------------------------------------
// DRE Mensal — PDF
// ---------------------------------------------------------------------------

export function exportDrePdf(
  summary: MonthlySummary,
  monthName: string,
  year: number,
): void {
  const doc = new jsPDF()

  // Título
  doc.setFontSize(18)
  doc.setTextColor(...HEADER_BG)
  doc.text('MP Assessoria Digital', 14, 20)

  doc.setFontSize(12)
  doc.setTextColor(...MUTED_TEXT)
  doc.text(`DRE — ${monthName} ${year}`, 14, 28)

  // Linha decorativa
  doc.setDrawColor(...BRAND_BLUE)
  doc.setLineWidth(0.8)
  doc.line(14, 32, 196, 32)

  // Dados da tabela
  const rows = [
    ['Receita Total', brl(summary.total_revenue)],
    ['  MRR (Recorrente)', brl(summary.mrr)],
    ['  Receitas Variáveis', brl(summary.variable_revenue)],
    ['(-) Custos Fixos', brl(summary.fixed_costs)],
    ['(-) Custos Variáveis', brl(summary.variable_costs)],
    ['(=) Custo Total', brl(summary.total_costs)],
    ['(=) Lucro Líquido', brl(summary.profit)],
    ['Margem (%)', pct(summary.margin)],
  ]

  autoTable(doc, {
    startY: 38,
    head: [['Descrição', 'Valor']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_BG,
      textColor: WHITE,
      fontSize: 11,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 10,
      textColor: DARK_TEXT,
    },
    alternateRowStyles: {
      fillColor: LIGHT_ROW,
    },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { cellWidth: 66, halign: 'right' },
    },
    styles: {
      cellPadding: 5,
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.3,
    },
    didParseCell(data) {
      // Destaca a linha de Lucro Líquido
      if (data.section === 'body' && data.row.index === 6) {
        data.cell.styles.fontStyle = 'bold'
        if (summary.profit >= 0) {
          data.cell.styles.textColor = [22, 163, 74] // green-600
        } else {
          data.cell.styles.textColor = [220, 38, 38] // red-600
        }
      }
    },
  })

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(...MUTED_TEXT)
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} — MP Assessoria Digital`,
    14,
    pageHeight - 10,
  )

  doc.save(`DRE-${monthName}-${year}.pdf`)
}

// ---------------------------------------------------------------------------
// DRE Mensal — Excel
// ---------------------------------------------------------------------------

export function exportDreExcel(
  summary: MonthlySummary,
  monthName: string,
  year: number,
): void {
  const data = [
    ['Descrição', 'Valor'],
    ['Receita Total', summary.total_revenue],
    ['MRR (Recorrente)', summary.mrr],
    ['Receitas Variáveis', summary.variable_revenue],
    ['(-) Custos Fixos', summary.fixed_costs],
    ['(-) Custos Variáveis', summary.variable_costs],
    ['(=) Custo Total', summary.total_costs],
    ['(=) Lucro Líquido', summary.profit],
    ['Margem (%)', summary.margin / 100],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Formatar colunas de moeda (linhas 2–8, coluna B)
  const currencyFmt = '#.##0,00'
  for (let r = 1; r <= 7; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 1 })]
    if (cell) cell.z = currencyFmt
  }
  // Margem como porcentagem
  const marginCell = ws[XLSX.utils.encode_cell({ r: 8, c: 1 })]
  if (marginCell) marginCell.z = '0.0%'

  // Largura das colunas
  ws['!cols'] = [{ wch: 25 }, { wch: 18 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `DRE ${monthName}`)
  XLSX.writeFile(wb, `DRE-${monthName}-${year}.xlsx`)
}

// ---------------------------------------------------------------------------
// Visão Anual — PDF
// ---------------------------------------------------------------------------

export function exportAnualPdf(
  summaries: MonthlySummary[],
  year: number,
): void {
  const doc = new jsPDF({ orientation: 'landscape' })

  // Título
  doc.setFontSize(18)
  doc.setTextColor(...HEADER_BG)
  doc.text('MP Assessoria Digital', 14, 20)

  doc.setFontSize(12)
  doc.setTextColor(...MUTED_TEXT)
  doc.text(`Visão Anual — ${year}`, 14, 28)

  // Linha decorativa
  doc.setDrawColor(...BRAND_BLUE)
  doc.setLineWidth(0.8)
  doc.line(14, 32, 283, 32)

  // Ordenar por mês
  const sorted = [...summaries].sort((a, b) => a.month - b.month)

  // Montar linhas
  const rows = sorted.map((s) => [
    MONTH_NAMES[s.month - 1],
    String(s.active_clients),
    brl(s.mrr),
    brl(s.total_revenue),
    brl(s.total_costs),
    brl(s.profit),
    pct(s.margin),
  ])

  // Totais acumulados
  const totals = sorted.reduce(
    (acc, s) => ({
      clients: Math.max(acc.clients, s.active_clients),
      mrr: acc.mrr + s.mrr,
      revenue: acc.revenue + s.total_revenue,
      costs: acc.costs + s.total_costs,
      profit: acc.profit + s.profit,
    }),
    { clients: 0, mrr: 0, revenue: 0, costs: 0, profit: 0 },
  )

  const avgMargin =
    totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

  autoTable(doc, {
    startY: 38,
    head: [['Mês', 'Clientes', 'MRR', 'Receita', 'Custos', 'Lucro', 'Margem']],
    body: rows,
    foot: [
      [
        'ACUMULADO',
        String(totals.clients),
        brl(totals.mrr),
        brl(totals.revenue),
        brl(totals.costs),
        brl(totals.profit),
        pct(avgMargin),
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_BG,
      textColor: WHITE,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK_TEXT,
      halign: 'right',
    },
    footStyles: {
      fillColor: [30, 58, 138],
      textColor: WHITE,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'right',
    },
    alternateRowStyles: {
      fillColor: LIGHT_ROW,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 35 },
      1: { halign: 'center', cellWidth: 25 },
    },
    styles: {
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    didParseCell(data) {
      // Colorir coluna de Lucro
      if (data.section === 'body' && data.column.index === 5) {
        const s = sorted[data.row.index]
        if (s) {
          data.cell.styles.textColor =
            s.profit >= 0 ? [22, 163, 74] : [220, 38, 38]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(...MUTED_TEXT)
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} — MP Assessoria Digital`,
    14,
    pageHeight - 10,
  )

  doc.save(`Visao-Anual-${year}.pdf`)
}

// ---------------------------------------------------------------------------
// Visão Anual — Excel
// ---------------------------------------------------------------------------

export function exportAnualExcel(
  summaries: MonthlySummary[],
  year: number,
): void {
  const sorted = [...summaries].sort((a, b) => a.month - b.month)

  const header = ['Mês', 'Clientes', 'MRR', 'Receita', 'Custos', 'Lucro', 'Margem']

  const rows = sorted.map((s) => [
    MONTH_NAMES[s.month - 1],
    s.active_clients,
    s.mrr,
    s.total_revenue,
    s.total_costs,
    s.profit,
    s.margin / 100,
  ])

  // Totais acumulados
  const totals = sorted.reduce(
    (acc, s) => ({
      clients: Math.max(acc.clients, s.active_clients),
      mrr: acc.mrr + s.mrr,
      revenue: acc.revenue + s.total_revenue,
      costs: acc.costs + s.total_costs,
      profit: acc.profit + s.profit,
    }),
    { clients: 0, mrr: 0, revenue: 0, costs: 0, profit: 0 },
  )

  const avgMargin =
    totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

  const footerRow = [
    'ACUMULADO',
    totals.clients,
    totals.mrr,
    totals.revenue,
    totals.costs,
    totals.profit,
    avgMargin / 100,
  ]

  const data = [header, ...rows, footerRow]

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Formatar colunas monetárias (colunas C–F, ou seja c=2..5)
  const currencyFmt = '#.##0,00'
  const totalRows = data.length
  for (let r = 1; r < totalRows; r++) {
    for (let c = 2; c <= 5; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell) cell.z = currencyFmt
    }
    // Margem como porcentagem
    const marginCell = ws[XLSX.utils.encode_cell({ r, c: 6 })]
    if (marginCell) marginCell.z = '0.0%'
  }

  // Largura das colunas
  ws['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Anual ${year}`)
  XLSX.writeFile(wb, `Visao-Anual-${year}.xlsx`)
}
