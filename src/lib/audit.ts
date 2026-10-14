import { supabase } from './supabase'

export interface AuditEntry {
  id: string
  created_at: string
  user_email: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  description: string | null
}

interface LogAuditParams {
  action: string
  table_name: string
  record_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  description?: string
}

interface AuditFilters {
  table_name?: string
  from_date?: string
  to_date?: string
  limit?: number
}

/**
 * Registra uma entrada no audit_log.
 * Obtém o email do usuário autenticado automaticamente via sessão do Supabase.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  let userEmail: string | null = null

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    userEmail = sessionData.session?.user?.email ?? null
  } catch {
    // Se não conseguir obter sessão, continua sem email
  }

  await supabase.from('audit_log').insert({
    user_email: userEmail,
    action: params.action,
    table_name: params.table_name,
    record_id: params.record_id ?? null,
    old_data: params.old_data ?? null,
    new_data: params.new_data ?? null,
    description: params.description ?? null,
  })
}

/**
 * Busca entradas do audit_log com filtros opcionais.
 * Retorna ordenado por data de criação (mais recente primeiro).
 */
export async function getAuditLog(
  filters?: AuditFilters
): Promise<AuditEntry[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.table_name) {
    query = query.eq('table_name', filters.table_name)
  }

  if (filters?.from_date) {
    query = query.gte('created_at', filters.from_date)
  }

  if (filters?.to_date) {
    query = query.lte('created_at', `${filters.to_date}T23:59:59.999Z`)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data } = await query
  return (data as AuditEntry[]) || []
}
