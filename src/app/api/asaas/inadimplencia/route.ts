import { NextResponse } from 'next/server'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://api.asaas.com'

interface AsaasPayment {
  id: string
  customer: string
  value: number
  netValue: number
  dueDate: string
  status: string
  billingType: string
  description: string | null
  invoiceUrl: string | null
  dateCreated: string
}

interface AsaasListResponse {
  data: AsaasPayment[]
  hasMore: boolean
  offset: number
  limit: number
}

interface AsaasCustomer {
  name: string
  email: string
  cpfCnpj: string
}

interface OverduePaymentResult {
  id: string
  customerName: string
  value: number
  dueDate: string
  daysOverdue: number
  invoiceUrl: string | null
  billingType: string
  description: string | null
}

async function fetchAsaas<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
    headers: {
      access_token: ASAAS_API_KEY!,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Asaas API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

async function fetchAllOverduePayments(): Promise<AsaasPayment[]> {
  const allPayments: AsaasPayment[] = []
  let offset = 0
  const limit = 100
  let hasMore = true

  while (hasMore) {
    const response = await fetchAsaas<AsaasListResponse>(
      `/v3/payments?status=OVERDUE&limit=${limit}&offset=${offset}`
    )
    allPayments.push(...response.data)
    hasMore = response.hasMore
    offset += limit
  }

  return allPayments
}

async function fetchPastDuePendingPayments(): Promise<AsaasPayment[]> {
  const today = new Date().toISOString().slice(0, 10)
  const pastDue: AsaasPayment[] = []
  let offset = 0
  const limit = 100
  let hasMore = true

  while (hasMore) {
    const response = await fetchAsaas<AsaasListResponse>(
      `/v3/payments?status=PENDING&dueDate[le]=${today}&limit=${limit}&offset=${offset}`
    )
    pastDue.push(...response.data)
    hasMore = response.hasMore
    offset += limit
  }

  return pastDue
}

function calculateDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - due.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export async function GET() {
  if (!ASAAS_API_KEY) {
    return NextResponse.json(
      { error: 'ASAAS_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    const [overduePayments, pendingPastDue] = await Promise.all([
      fetchAllOverduePayments(),
      fetchPastDuePendingPayments(),
    ])

    // Merge and deduplicate by payment id
    const paymentMap = new Map<string, AsaasPayment>()
    for (const payment of overduePayments) {
      paymentMap.set(payment.id, payment)
    }
    for (const payment of pendingPastDue) {
      paymentMap.set(payment.id, payment)
    }

    const allPayments = Array.from(paymentMap.values())

    // Collect unique customer IDs
    const customerIds = [...new Set(allPayments.map((p) => p.customer))]

    // Fetch customer names in parallel
    const customerNameMap = new Map<string, string>()
    const customerFetches = customerIds.map(async (customerId) => {
      try {
        const customer = await fetchAsaas<AsaasCustomer>(
          `/v3/customers/${customerId}`
        )
        customerNameMap.set(customerId, customer.name)
      } catch {
        customerNameMap.set(customerId, 'Cliente desconhecido')
      }
    })
    await Promise.all(customerFetches)

    // Build result
    const payments: OverduePaymentResult[] = allPayments
      .map((p) => ({
        id: p.id,
        customerName: customerNameMap.get(p.customer) || 'Cliente desconhecido',
        value: p.value,
        dueDate: p.dueDate,
        daysOverdue: calculateDaysOverdue(p.dueDate),
        invoiceUrl: p.invoiceUrl,
        billingType: p.billingType,
        description: p.description,
      }))
      .filter((p) => p.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)

    return NextResponse.json({ payments })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao buscar inadimplencia'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
