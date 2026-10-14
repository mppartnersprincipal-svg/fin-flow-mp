import { NextRequest, NextResponse } from 'next/server'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://api.asaas.com'

interface AsaasTransaction {
  id: string
  value: number
  balance: number
  type: string
  date: string
  description: string
  paymentId: string | null
  transferId: string | null
}

interface AsaasListResponse {
  data: AsaasTransaction[]
  hasMore: boolean
  totalCount: number
  offset: number
  limit: number
}

const TYPE_LABELS: Record<string, string> = {
  PAYMENT_RECEIVED: 'Recebimento',
  PAYMENT_FEE: 'Taxa de cobrança',
  TRANSFER: 'Transferência',
  INSTANT_TEXT_MESSAGE_FEE: 'Taxa WhatsApp',
  PAYMENT_MESSAGING_NOTIFICATION_FEE: 'Taxa de mensageria',
  RECEIVABLE_ANTICIPATION_DEBIT: 'Antecipação',
  RECEIVABLE_ANTICIPATION_CREDIT: 'Crédito antecipação',
  BILL_PAYMENT: 'Pagamento de conta',
  ASAAS_CARD_BILL_PAYMENT: 'Fatura Cartão Asaas',
  REFUND: 'Estorno',
  CHARGEBACK: 'Chargeback',
  PAYMENT_DUNNING_RECEIVED: 'Recuperação cobrança',
  PROMOTIONAL_CODE_CREDIT: 'Crédito promocional',
  CUSTODY_BLOCK: 'Bloqueio custódia',
  CUSTODY_RELEASE: 'Liberação custódia',
}

const TYPE_CATEGORIES: Record<string, string> = {
  PAYMENT_RECEIVED: 'entrada',
  RECEIVABLE_ANTICIPATION_CREDIT: 'entrada',
  PAYMENT_DUNNING_RECEIVED: 'entrada',
  PROMOTIONAL_CODE_CREDIT: 'entrada',
  CUSTODY_RELEASE: 'entrada',
  TRANSFER: 'saida',
  BILL_PAYMENT: 'saida',
  ASAAS_CARD_BILL_PAYMENT: 'saida',
  RECEIVABLE_ANTICIPATION_DEBIT: 'saida',
  CUSTODY_BLOCK: 'saida',
  PAYMENT_FEE: 'taxa',
  INSTANT_TEXT_MESSAGE_FEE: 'taxa',
  PAYMENT_MESSAGING_NOTIFICATION_FEE: 'taxa',
  REFUND: 'saida',
  CHARGEBACK: 'saida',
}

export async function GET(request: NextRequest) {
  if (!ASAAS_API_KEY) {
    return NextResponse.json({ error: 'ASAAS_API_KEY not configured' }, { status: 500 })
  }

  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('startDate')
  const finishDate = searchParams.get('finishDate')

  if (!startDate || !finishDate) {
    return NextResponse.json(
      { error: 'startDate and finishDate are required (YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  try {
    const allTransactions: AsaasTransaction[] = []
    let offset = 0
    const limit = 100

    while (true) {
      const url = new URL('/v3/financialTransactions', ASAAS_BASE_URL)
      url.searchParams.set('startDate', startDate)
      url.searchParams.set('finishDate', finishDate)
      url.searchParams.set('offset', String(offset))
      url.searchParams.set('limit', String(limit))

      const response = await fetch(url, {
        headers: { access_token: ASAAS_API_KEY },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Asaas API error: ${response.status}`)
      }

      const data: AsaasListResponse = await response.json()
      allTransactions.push(...data.data)

      if (!data.hasMore) break
      offset += limit
      if (offset >= 10000) break
    }

    // Build summary by type
    const summary: Record<string, { count: number; total: number; label: string; category: string }> = {}

    for (const t of allTransactions) {
      if (!summary[t.type]) {
        summary[t.type] = {
          count: 0,
          total: 0,
          label: TYPE_LABELS[t.type] || t.type,
          category: TYPE_CATEGORIES[t.type] || 'outro',
        }
      }
      summary[t.type].count++
      summary[t.type].total = Math.round((summary[t.type].total + t.value) * 100) / 100
    }

    // Calculate totals
    const totalEntradas = allTransactions
      .filter((t) => t.value > 0)
      .reduce((sum, t) => sum + t.value, 0)

    const totalSaidas = allTransactions
      .filter((t) => t.value < 0 && TYPE_CATEGORIES[t.type] !== 'taxa')
      .reduce((sum, t) => sum + t.value, 0)

    const totalTaxas = allTransactions
      .filter((t) => TYPE_CATEGORIES[t.type] === 'taxa')
      .reduce((sum, t) => sum + t.value, 0)

    // Format transactions for display
    const transactions = allTransactions.map((t) => ({
      id: t.id,
      value: t.value,
      balance: t.balance,
      type: t.type,
      typeLabel: TYPE_LABELS[t.type] || t.type,
      category: TYPE_CATEGORIES[t.type] || 'outro',
      date: t.date,
      description: t.description,
    }))

    return NextResponse.json({
      transactions,
      summary: Object.entries(summary).map(([type, data]) => ({
        type,
        ...data,
      })),
      totals: {
        entradas: Math.round(totalEntradas * 100) / 100,
        saidas: Math.round(totalSaidas * 100) / 100,
        taxas: Math.round(totalTaxas * 100) / 100,
        saldo: Math.round((totalEntradas + totalSaidas + totalTaxas) * 100) / 100,
      },
      period: { startDate, finishDate },
      totalTransactions: allTransactions.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar extrato'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
