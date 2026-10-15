import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// --- Server-side clients ---

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://api.asaas.com'

// --- System prompt ---

const SYSTEM_PROMPT = `Voce e a Ana, assistente financeira da MP Assessoria Digital. Voce tem acesso aos dados financeiros da empresa via ferramentas. Responda sempre em portugues brasileiro, de forma clara e direta. Formate valores em BRL (R$ X.XXX,XX). Voce so pode consultar dados — nao pode alterar nada.

Quando o usuario perguntar sobre dados financeiros, use as ferramentas disponiveis para buscar as informacoes antes de responder. Sempre traga dados reais, nunca invente valores.

Ferramentas disponiveis:
- query_clients: Buscar clientes (com filtro opcional de status)
- query_mrr: Calcular o MRR atual (soma do monthly_value dos clientes ativos)
- query_monthly_summary: Buscar resumo mensal para um ano/mes especifico
- query_costs: Buscar custos fixos e variaveis de um mes
- query_overdue: Buscar cobrancas em atraso no Asaas
- query_balance: Buscar saldo da conta Asaas
- query_revenue: Buscar receita total de um mes

Ao receber perguntas genericas como "como estamos?" ou "resumo do mes", use query_monthly_summary com o mes/ano atual. Se nao souber o mes, use outubro/2026.

- generate_report: Gerar PDF de DRE mensal ou Visao Anual. Quando o usuario pedir DRE, relatorio, PDF, exportar, etc, use esta ferramenta. Responda com o link de download formatado como: [Clique aqui para baixar o PDF](url)`

// --- Tool definitions ---

const tools: Anthropic.Tool[] = [
  {
    name: 'query_clients',
    description:
      'Busca clientes da MP Assessoria no banco de dados. Pode filtrar por status (ativo, cancelado, todos).',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          description:
            'Filtro de status: "ativo", "cancelado", ou vazio para todos',
          enum: ['ativo', 'cancelado', ''],
        },
      },
      required: [],
    },
  },
  {
    name: 'query_mrr',
    description:
      'Calcula o MRR (Monthly Recurring Revenue) atual somando o monthly_value de todos os clientes ativos.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'query_monthly_summary',
    description:
      'Busca o resumo financeiro mensal (receita, custos, lucro, margem, MRR, etc) para um ano e mes especifico.',
    input_schema: {
      type: 'object' as const,
      properties: {
        year: {
          type: 'number',
          description: 'Ano (ex: 2026)',
        },
        month: {
          type: 'number',
          description: 'Mes (1-12)',
        },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'query_costs',
    description:
      'Busca os custos fixos e variaveis de um mes/ano especifico.',
    input_schema: {
      type: 'object' as const,
      properties: {
        year: {
          type: 'number',
          description: 'Ano (ex: 2026)',
        },
        month: {
          type: 'number',
          description: 'Mes (1-12)',
        },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'query_overdue',
    description:
      'Busca as cobrancas em atraso (inadimplentes) na API do Asaas. Retorna quantidade e valor total.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'query_balance',
    description: 'Busca o saldo atual da conta Asaas da empresa.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'query_revenue',
    description:
      'Busca a receita total de um mes/ano especifico (MRR + receitas variaveis).',
    input_schema: {
      type: 'object' as const,
      properties: {
        year: {
          type: 'number',
          description: 'Ano (ex: 2026)',
        },
        month: {
          type: 'number',
          description: 'Mes (1-12)',
        },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'generate_report',
    description:
      'Gera um link para download de relatorio financeiro em PDF. Tipos disponiveis: "dre" (DRE mensal) e "anual" (visao anual).',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['dre', 'anual'],
          description: 'Tipo de relatorio',
        },
        year: {
          type: 'number',
          description: 'Ano (ex: 2026)',
        },
        month: {
          type: 'number',
          description: 'Mes (1-12), obrigatorio apenas para DRE',
        },
      },
      required: ['type', 'year'],
    },
  },
]

// --- Tool execution ---

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'query_clients': {
      const status = input.status as string | undefined
      let query = supabase.from('clients').select('*')
      if (status && status !== '') {
        query = query.eq('status', status)
      }
      const { data, error } = await query.order('name')
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({
        total: data?.length ?? 0,
        clients: data,
      })
    }

    case 'query_mrr': {
      const { data, error } = await supabase
        .from('clients')
        .select('monthly_value')
        .eq('status', 'active')
      if (error) return JSON.stringify({ error: error.message })
      const mrr = (data ?? []).reduce(
        (sum, c) => sum + (c.monthly_value || 0),
        0,
      )
      return JSON.stringify({
        mrr,
        active_clients: data?.length ?? 0,
      })
    }

    case 'query_monthly_summary': {
      const year = input.year as number
      const month = input.month as number
      const { data, error } = await supabase
        .from('monthly_summary')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single()
      if (error)
        return JSON.stringify({
          error: error.message,
          message: `Nao encontrei resumo para ${month}/${year}`,
        })
      return JSON.stringify(data)
    }

    case 'query_costs': {
      const year = input.year as number
      const month = input.month as number
      const [fixedRes, variableRes] = await Promise.all([
        supabase
          .from('fixed_costs')
          .select('*')
          .eq('year', year)
          .eq('month', month),
        supabase
          .from('variable_costs')
          .select('*')
          .eq('year', year)
          .eq('month', month),
      ])
      const fixedCosts = fixedRes.data ?? []
      const variableCosts = variableRes.data ?? []
      const totalFixed = fixedCosts.reduce((s, c) => s + c.amount, 0)
      const totalVariable = variableCosts.reduce((s, c) => s + c.amount, 0)
      return JSON.stringify({
        fixed_costs: fixedCosts,
        variable_costs: variableCosts,
        total_fixed: totalFixed,
        total_variable: totalVariable,
        total: totalFixed + totalVariable,
      })
    }

    case 'query_overdue': {
      if (!ASAAS_API_KEY) {
        return JSON.stringify({ error: 'ASAAS_API_KEY nao configurada' })
      }
      try {
        const response = await fetch(
          `${ASAAS_BASE_URL}/v3/payments?status=OVERDUE&limit=100`,
          {
            headers: { access_token: ASAAS_API_KEY },
            cache: 'no-store',
          },
        )
        if (!response.ok) {
          return JSON.stringify({
            error: `Asaas API error: ${response.status}`,
          })
        }
        const data = await response.json()
        const payments = data.data || []
        const totalValue = payments.reduce(
          (sum: number, p: { value: number }) => sum + p.value,
          0,
        )
        return JSON.stringify({
          overdue_count: payments.length,
          total_overdue_value: totalValue,
          has_more: data.hasMore,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao buscar inadimplencia'
        return JSON.stringify({ error: message })
      }
    }

    case 'query_balance': {
      if (!ASAAS_API_KEY) {
        return JSON.stringify({ error: 'ASAAS_API_KEY nao configurada' })
      }
      try {
        const response = await fetch(
          `${ASAAS_BASE_URL}/v3/finance/balance`,
          {
            headers: { access_token: ASAAS_API_KEY },
            cache: 'no-store',
          },
        )
        if (!response.ok) {
          return JSON.stringify({
            error: `Asaas API error: ${response.status}`,
          })
        }
        const data = await response.json()
        return JSON.stringify(data)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao buscar saldo'
        return JSON.stringify({ error: message })
      }
    }

    case 'query_revenue': {
      const year = input.year as number
      const month = input.month as number
      const { data, error } = await supabase
        .from('monthly_summary')
        .select('mrr, variable_revenue, total_revenue')
        .eq('year', year)
        .eq('month', month)
        .single()
      if (error)
        return JSON.stringify({
          error: error.message,
          message: `Nao encontrei dados de receita para ${month}/${year}`,
        })
      return JSON.stringify(data)
    }

    case 'generate_report': {
      const reportType = input.type as string
      const year = input.year as number
      const month = input.month as number | undefined
      const monthNames = [
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
      if (reportType === 'dre' && month) {
        return JSON.stringify({
          download_url: `/api/export/dre?year=${year}&month=${month}`,
          filename: `DRE-${monthNames[month - 1]}-${year}.pdf`,
          message: `DRE de ${monthNames[month - 1]} ${year} gerado com sucesso.`,
        })
      } else if (reportType === 'anual') {
        return JSON.stringify({
          download_url: `/api/export/anual?year=${year}`,
          filename: `Visao-Anual-${year}.pdf`,
          message: `Visao Anual de ${year} gerada com sucesso.`,
        })
      }
      return JSON.stringify({ error: 'Tipo de relatorio invalido' })
    }

    default:
      return JSON.stringify({ error: `Ferramenta desconhecida: ${name}` })
  }
}

// --- Route Handler ---

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  message: string
  history: ChatMessage[]
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY nao configurada' },
      { status: 500 },
    )
  }

  try {
    const body: ChatRequest = await request.json()
    const { message, history } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem e obrigatoria' },
        { status: 400 },
      )
    }

    // Build messages array from history + new message
    const messages: Anthropic.MessageParam[] = [
      ...(history || []).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Tool use loop: keep calling until we get a final text response
    let currentMessages = messages
    const MAX_TOOL_ROUNDS = 10

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools,
        messages: currentMessages,
      })

      // Check if we have tool use blocks
      const toolUseBlocks = response.content.filter(
        (block) => block.type === 'tool_use',
      )

      if (toolUseBlocks.length === 0) {
        // No tool calls -- extract text response
        const textBlocks = response.content.filter(
          (block) => block.type === 'text',
        )
        const finalText =
          textBlocks
            .map((b) => ('text' in b ? b.text : ''))
            .join('\n') ||
          'Desculpe, nao consegui gerar uma resposta.'
        return NextResponse.json({ response: finalText })
      }

      // Execute each tool call and build tool results
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolBlock) => {
          const block = toolBlock as Anthropic.ToolUseBlock
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
          )
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: result,
          }
        }),
      )

      // Append the assistant response and tool results to the conversation
      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ]
    }

    // If we exhausted the tool loop, return whatever we have
    return NextResponse.json({
      response:
        'Desculpe, a consulta ficou muito complexa. Tente reformular sua pergunta.',
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
