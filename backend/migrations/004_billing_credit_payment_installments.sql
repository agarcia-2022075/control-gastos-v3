-- Migration 004: Credit payments, billing cycle, and installment plans

-- 1. Update transactions constraint to allow CREDIT_PAYMENT
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('EXPENSE', 'INCOME', 'CREDIT_PAYMENT'));

-- 2. Add source and destination card references to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_card_id INTEGER REFERENCES cards_accounts(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_card_id INTEGER REFERENCES cards_accounts(id) ON DELETE SET NULL;

-- 3. Add billing cycle days to cards_accounts
ALTER TABLE cards_accounts ADD COLUMN IF NOT EXISTS billing_cut_day INTEGER DEFAULT NULL;
ALTER TABLE cards_accounts ADD COLUMN IF NOT EXISTS payment_due_day INTEGER DEFAULT NULL;

-- 4. Create installment_plans table
CREATE TABLE IF NOT EXISTS installment_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES cards_accounts(id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  installment_count INTEGER NOT NULL CHECK (installment_count > 0),
  installment_amount NUMERIC(12,2) NOT NULL,
  installments_paid INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
