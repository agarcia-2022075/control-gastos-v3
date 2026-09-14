-- Migration 008: Alert Preferences in Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_card_due BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_budget_limit BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_fixed_expenses BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_legal_benefits BOOLEAN DEFAULT true;
