import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

// Cores da marca
const BRAND_BLUE: [number, number, number] = [37, 99, 235]
const HEADER_BG: [number, number, number] = [30, 58, 138]
const LIGHT_ROW: [number, number, number] = [239, 246, 255]
const WHITE: [number, number, number] = [255, 255, 255]
const DARK_TEXT: [number, number, number] = [15, 23, 42]
const MUTED_TEXT: [number, number, number] = [100, 116, 139]

function brl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function pct(value: number): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

interface SummaryRow {
  month: number
  active_clients: number
  mrr: number
  total_revenue: number
  total_costs: number
  profit: number
  margin: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year'))

  if (!year) {
    return NextResponse.json(
      { error: 'Parametro year e obrigatorio' },
      { status: 400 },
    )
  }

  const { data: summaries, error } = await supabase
    .from('monthly_summary')
    .select('*')
    .eq('year', year)
    .order('month')

  if (error || !summaries || summaries.length === 0) {
    return NextResponse.json(
      { error: `Nao encontrei dados para o ano ${year}` },
      { status: 404 },
    )
  }

  const doc = new jsPDF({ orientation: 'landscape' })

  // Titulo
  doc.setFontSize(18)
  doc.setTextColor(...HEADER_BG)
  doc.text('MP Assessoria Digital', 14, 20)

  doc.setFontSize(12)
  doc.setTextColor(...MUTED_TEXT)
  doc.text(`Visao Anual — ${year}`, 14, 28)

  // Linha decorativa
  doc.setDrawColor(...BRAND_BLUE)
  doc.setLineWidth(0.8)
  doc.line(14, 32, 283, 32)

  // Ordenar por mes
  const sorted = [...summaries].sort(
    (a: SummaryRow, b: SummaryRow) => a.month - b.month,
  )

  // Montar linhas
  const rows = sorted.map((s: SummaryRow) => [
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
    (acc, s: SummaryRow) => ({
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
    head: [
      ['Mes', 'Clientes', 'MRR', 'Receita', 'Custos', 'Lucro', 'Margem'],
    ],
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

  // Rodape
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(...MUTED_TEXT)
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} — MP Assessoria Digital`,
    14,
    pageHeight - 10,
  )

  const pdfBuffer = doc.output('arraybuffer')
  const filename = `Visao-Anual-${year}.pdf`

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
