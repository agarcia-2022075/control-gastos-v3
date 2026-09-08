import { pool } from '../../../config/database.js';

export interface TransactionRow {
  id: number;
  user_id: number;
  type: 'EXPENSE' | 'INCOME';
  title: string;
  merchant: string | null;
  category: string;
  amount: string;
  status: 'COMPLETED' | 'PENDING';
  date: string;
  created_at: string;
}

export interface SavingsGoalRow {
  id: number;
  user_id: number;
  target_amount: string;
  current_amount: string;
}

export interface PaymentAlertRow {
  id: number;
  user_id: number;
  title: string;
  description: string;
  alert_type: string;
  is_active: boolean;
}

export class DashboardRepository {
  async ensureUserData(userId: number): Promise<void> {
    // Only ensure a savings_goal record exists for the user if none exists
    const goalCheck = await pool.query('SELECT COUNT(*) FROM savings_goals WHERE user_id = $1', [userId]);
    if (parseInt(goalCheck.rows[0].count, 10) === 0) {
      await pool.query(
        `INSERT INTO savings_goals (user_id, target_amount, current_amount) VALUES ($1, 10000.00, 0.00)`,
        [userId]
      );
    }
  }

  async getTransactionsByUserId(userId: number): Promise<TransactionRow[]> {
    const query = `
      SELECT id, user_id, type, title, merchant, category, amount, status,
             TO_CHAR(date, 'YYYY-MM-DD') as date, created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY date DESC, id DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async createTransaction(userId: number, data: {
    type: 'EXPENSE' | 'INCOME';
    title: string;
    merchant?: string | null;
    category: string;
    amount: number;
    status?: 'COMPLETED' | 'PENDING';
    date?: string | null;
  }): Promise<TransactionRow> {
    const query = `
      INSERT INTO transactions (user_id, type, title, merchant, category, amount, status, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE))
      RETURNING id, user_id, type, title, merchant, category, amount, status,
                TO_CHAR(date, 'YYYY-MM-DD') as date, created_at
    `;
    const values = [
      userId,
      data.type,
      data.title,
      data.merchant || null,
      data.category,
      data.amount,
      data.status || 'COMPLETED',
      data.date || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateTransactionById(id: number, userId: number, data: {
    title?: string;
    merchant?: string | null;
    category?: string;
    amount?: number;
    date?: string | null;
  }): Promise<TransactionRow | null> {
    const query = `
      UPDATE transactions
      SET title = COALESCE($1, title),
          merchant = COALESCE($2, merchant),
          category = COALESCE($3, category),
          amount = COALESCE($4, amount),
          date = COALESCE($5::date, date)
      WHERE id = $6 AND user_id = $7
      RETURNING id, user_id, type, title, merchant, category, amount, status,
                TO_CHAR(date, 'YYYY-MM-DD') as date, created_at
    `;
    const values = [
      data.title || null,
      data.merchant !== undefined ? data.merchant : null,
      data.category || null,
      data.amount !== undefined ? data.amount : null,
      data.date || null,
      id,
      userId
    ];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async deleteTransactionById(id: number, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM transactions
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getSavingsGoalByUserId(userId: number): Promise<SavingsGoalRow | null> {
    const query = `
      SELECT id, user_id, target_amount, current_amount
      FROM savings_goals
      WHERE user_id = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  async updateSavingsGoal(userId: number, data: {
    targetAmount?: number;
    currentAmount?: number;
  }): Promise<SavingsGoalRow> {
    await this.ensureUserData(userId);

    const query = `
      UPDATE savings_goals
      SET target_amount = COALESCE($1, target_amount),
          current_amount = COALESCE($2, current_amount),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3
      RETURNING id, user_id, target_amount, current_amount
    `;
    const values = [
      data.targetAmount !== undefined ? data.targetAmount : null,
      data.currentAmount !== undefined ? data.currentAmount : null,
      userId
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getActiveAlertsByUserId(userId: number): Promise<PaymentAlertRow[]> {
    const query = `
      SELECT id, user_id, title, description, alert_type, is_active
      FROM payment_alerts
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY id ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async dismissAlert(userId: number, alertId: number): Promise<boolean> {
    const query = `
      UPDATE payment_alerts
      SET is_active = FALSE
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [alertId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createAlert(userId: number, data: {
    title: string;
    description: string;
    alertType?: string;
  }): Promise<PaymentAlertRow> {
    const query = `
      INSERT INTO payment_alerts (user_id, title, description, alert_type, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, user_id, title, description, alert_type, is_active
    `;
    const values = [
      userId,
      data.title,
      data.description,
      data.alertType || 'WARNING'
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
}
