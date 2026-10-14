-- Criação da tabela audit_log para registrar histórico de alterações
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_email text,
  action text NOT NULL,  -- 'create', 'update', 'delete'
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  description text
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow anon read" ON audit_log FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert" ON audit_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_table_name ON audit_log (table_name);
