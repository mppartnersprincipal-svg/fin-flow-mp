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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json(
      { error: 'Parametros year e month sao obrigatorios (month: 1-12)' },
      { status: 400 },
    )
  }

  const { data: summary, error } = await supabase
    .from('monthly_summary')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .single()

  if (error || !summary) {
    return NextResponse.json(
      { error: `Nao encontrei resumo para ${month}/${year}` },
      { status: 404 },
    )
  }

  const doc = new jsPDF()
  const monthName = MONTH_NAMES[month - 1]

  // Titulo
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
    ['  Receitas Variaveis', brl(summary.variable_revenue)],
    ['(-) Custos Fixos', brl(summary.fixed_costs)],
    ['(-) Custos Variaveis', brl(summary.variable_costs)],
    ['(=) Custo Total', brl(summary.total_costs)],
    ['(=) Lucro Liquido', brl(summary.profit)],
    ['Margem (%)', pct(summary.margin)],
  ]

  autoTable(doc, {
    startY: 38,
    head: [['Descricao', 'Valor']],
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
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    didParseCell(data) {
      if (data.section === 'body' && data.row.index === 6) {
        data.cell.styles.fontStyle = 'bold'
        if (summary.profit >= 0) {
          data.cell.styles.textColor = [22, 163, 74]
        } else {
          data.cell.styles.textColor = [220, 38, 38]
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
  const filename = `DRE-${monthName}-${year}.pdf`

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
