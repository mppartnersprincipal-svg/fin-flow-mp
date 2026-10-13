export interface Client {
  id: string
  name: string
  service: string
  monthly_value: number
  status: string
  start_month: string | null
  end_month: string | null
  asaas_customer_id: string | null
  notes: string | null
}

export interface FixedCost {
  id: string
  year: number
  month: number
  category: string
  description: string
  amount: number
  cost_type: string
}

export interface VariableCost {
  id: string
  year: number
  month: number
  category: string
  description: string
  amount: number
}

export interface VariableRevenue {
  id: string
  year: number
  month: number
  description: string
  amount: number
  date_registered: string | null
}

export interface MonthlySummary {
  id: string
  year: number
  month: number
  active_clients: number
  mrr: number
  variable_revenue: number
  total_revenue: number
  fixed_costs: number
  variable_costs: number
  total_costs: number
  profit: number
  margin: number
  asaas_received: number | null
  asaas_payments_count: number | null
  asaas_fees: number | null
  asaas_pending: number | null
  asaas_overdue: number | null
  source: string | null
  notes: string | null
}
