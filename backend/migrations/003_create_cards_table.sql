-- Migration 003: Create cards_accounts table
CREATE TABLE IF NOT EXISTS cards_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'DEBIT' CHECK (type IN ('DEBIT', 'SAVINGS', 'CASH', 'CREDIT')),
  card_number_mask VARCHAR(50) NOT NULL,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  expiry_date VARCHAR(10) DEFAULT '12/28',
  color_gradient VARCHAR(50) DEFAULT 'cyan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
