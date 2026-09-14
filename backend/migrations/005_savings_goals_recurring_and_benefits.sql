-- Migration 005: Multi-goal savings, recurring expenses, and salary benefits (Bono 14 / Aguinaldo)

-- 1. Upgrade savings_goals table to support multiple realistic goals per user
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS name VARCHAR(100) DEFAULT 'Meta Principal';
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS color_gradient VARCHAR(50) DEFAULT 'purple';
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS target_date DATE DEFAULT NULL;
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- 2. Create recurring_expenses table for recurring fixed monthly commitments
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  source_card_id INTEGER REFERENCES cards_accounts(id) ON DELETE SET NULL,
  payment_method_name VARCHAR(100) DEFAULT 'Efectivo en Mano / Caja',
  billing_day INTEGER NOT NULL CHECK (billing_day >= 1 AND billing_day <= 31),
  is_active BOOLEAN DEFAULT TRUE,
  last_charged_month VARCHAR(7) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add base salary column to users for Bono 14 and Aguinaldo projections
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_base_salary NUMERIC(12,2) DEFAULT NULL;
