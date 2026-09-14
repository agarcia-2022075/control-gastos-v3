import { pool } from '../../../config/database.js';

export interface TransactionRow {
  id: number;
  user_id: number;
  type: 'EXPENSE' | 'INCOME' | 'CREDIT_PAYMENT';
  title: string;
  merchant: string | null;
  category: string;
  amount: string;
  status: 'COMPLETED' | 'PENDING';
  date: string;
  source_card_id?: number | null;
  destination_card_id?: number | null;
  created_at: string;
}

export interface SavingsGoalRow {
  id: number;
  user_id: number;
  name: string;
  category: string;
  target_amount: string;
  current_amount: string;
  color_gradient: string;
  target_date?: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  created_at: string;
}

export interface RecurringExpenseRow {
  id: number;
  user_id: number;
  title: string;
  category: string;
  amount: string;
  source_card_id?: number | null;
  payment_method_name: string;
  billing_day: number;
  is_active: boolean;
  last_charged_month?: string | null;
  created_at: string;
}

export interface PaymentAlertRow {
  id: number;
  user_id: number;
  title: string;
  description: string;
  alert_type: string;
  is_active: boolean;
}

export interface CardAccountRow {
  id: number;
  user_id: number;
  name: string;
  type: 'DEBIT' | 'SAVINGS' | 'CASH' | 'CREDIT';
  card_number_mask: string;
  initial_balance: string;
  expiry_date: string;
  color_gradient: string;
  billing_cut_day?: number | null;
  payment_due_day?: number | null;
  created_at: string;
}

export interface InstallmentPlanRow {
  id: number;
  user_id: number;
  transaction_id: number;
  card_id: number | null;
  total_amount: string;
  installment_count: number;
  installment_amount: string;
  installments_paid: number;
  start_date: string;
  status: 'ACTIVE' | 'COMPLETED';
  created_at: string;
}

export interface CategoryRow {
  id: number;
  user_id: number;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string;
  color: string;
  is_system: boolean;
  transaction_count?: number;
  monthly_amount?: number;
  created_at: string;
}

export class DashboardRepository {
  async ensureUserData(userId: number): Promise<void> {
    const goalCheck = await pool.query('SELECT COUNT(*) FROM savings_goals WHERE user_id = $1', [userId]);
    if (parseInt(goalCheck.rows[0].count, 10) === 0) {
      await pool.query(
        `INSERT INTO savings_goals (user_id, name, category, target_amount, current_amount, color_gradient)
         VALUES ($1, 'Fondo de Emergencia', 'Emergencia', 10000.00, 0.00, 'purple')`,
        [userId]
      );
    }
  }

  async getCardsByUserId(userId: number): Promise<CardAccountRow[]> {
    await this.ensureUserData(userId);
    const query = `
      SELECT id, user_id, name, type, card_number_mask, initial_balance, expiry_date, color_gradient,
             billing_cut_day, payment_due_day, created_at
      FROM cards_accounts
      WHERE user_id = $1
      ORDER BY id ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async createCard(userId: number, data: {
    name: string;
    type?: string;
    cardNumberMask?: string;
    initialBalance?: number;
    expiryDate?: string;
    colorGradient?: string;
    billingCutDay?: number | null;
    paymentDueDay?: number | null;
  }): Promise<CardAccountRow> {
    await this.ensureUserData(userId);
    const query = `
      INSERT INTO cards_accounts (user_id, name, type, card_number_mask, initial_balance, expiry_date, color_gradient, billing_cut_day, payment_due_day)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, user_id, name, type, card_number_mask, initial_balance, expiry_date, color_gradient, billing_cut_day, payment_due_day, created_at
    `;
    const values = [
      userId,
      data.name,
      data.type || 'DEBIT',
      data.cardNumberMask || '•••• •••• •••• ' + Math.floor(1000 + Math.random() * 9000),
      data.initialBalance !== undefined && data.initialBalance !== null ? data.initialBalance : (data.type === 'CREDIT' ? 8000.00 : 0.00),
      data.expiryDate || '12/29',
      data.colorGradient || (data.type === 'CREDIT' ? 'rose' : 'cyan'),
      data.billingCutDay || null,
      data.paymentDueDay || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteCard(userId: number, cardId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM cards_accounts WHERE id = $1 AND user_id = $2',
      [cardId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getTransactionsByUserId(userId: number): Promise<TransactionRow[]> {
    const query = `
      SELECT id, user_id, type, title, merchant, category, amount, status,
             source_card_id, destination_card_id,
             TO_CHAR(date, 'YYYY-MM-DD') as date, created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY date DESC, id DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getTransactionById(id: number, userId: number): Promise<TransactionRow | null> {
    const query = `
      SELECT id, user_id, type, title, merchant, category, amount, status,
             source_card_id, destination_card_id,
             TO_CHAR(date, 'YYYY-MM-DD') as date, created_at
      FROM transactions
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  async createTransaction(userId: number, data: {
    type: 'EXPENSE' | 'INCOME' | 'CREDIT_PAYMENT';
    title: string;
    merchant?: string | null;
    category: string;
    amount: number;
    status?: 'COMPLETED' | 'PENDING';
    date?: string | null;
    sourceCardId?: number | null;
    destinationCardId?: number | null;
  }): Promise<TransactionRow> {
    const query = `
      INSERT INTO transactions (user_id, type, title, merchant, category, amount, status, date, source_card_id, destination_card_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE), $9, $10)
      RETURNING id, user_id, type, title, merchant, category, amount, status,
                source_card_id, destination_card_id,
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
      data.date || null,
      data.sourceCardId || null,
      data.destinationCardId || null
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
                source_card_id, destination_card_id,
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

  async createInstallmentPlan(userId: number, data: {
    transactionId: number;
    cardId?: number | null;
    totalAmount: number;
    installmentCount: number;
    installmentAmount: number;
    installmentsPaid?: number;
    startDate?: string | null;
  }): Promise<InstallmentPlanRow> {
    const query = `
      INSERT INTO installment_plans (user_id, transaction_id, card_id, total_amount, installment_count, installment_amount, installments_paid, start_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE))
      RETURNING id, user_id, transaction_id, card_id, total_amount, installment_count, installment_amount, installments_paid,
                TO_CHAR(start_date, 'YYYY-MM-DD') as start_date, status, created_at
    `;
    const values = [
      userId,
      data.transactionId,
      data.cardId || null,
      data.totalAmount,
      data.installmentCount,
      data.installmentAmount,
      data.installmentsPaid || 1,
      data.startDate || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getInstallmentPlansByUserId(userId: number): Promise<InstallmentPlanRow[]> {
    const query = `
      SELECT id, user_id, transaction_id, card_id, total_amount, installment_count, installment_amount, installments_paid,
             TO_CHAR(start_date, 'YYYY-MM-DD') as start_date, status, created_at
      FROM installment_plans
      WHERE user_id = $1 AND status = 'ACTIVE'
      ORDER BY id DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // --- Hallazgo 8: Metas de Ahorro Múltiples y Reales ---
  async getSavingsGoalsByUserId(userId: number): Promise<SavingsGoalRow[]> {
    await this.ensureUserData(userId);
    const query = `
      SELECT id, user_id, name, category, target_amount, current_amount, color_gradient,
             TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status, created_at
      FROM savings_goals
      WHERE user_id = $1 AND status = 'ACTIVE'
      ORDER BY id ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getSavingsGoalById(id: number, userId: number): Promise<SavingsGoalRow | null> {
    const query = `
      SELECT id, user_id, name, category, target_amount, current_amount, color_gradient,
             TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status, created_at
      FROM savings_goals
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  async createSavingsGoal(userId: number, data: {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    category?: string;
    colorGradient?: string;
    targetDate?: string | null;
  }): Promise<SavingsGoalRow> {
    const query = `
      INSERT INTO savings_goals (user_id, name, category, target_amount, current_amount, color_gradient, target_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7::date, 'ACTIVE')
      RETURNING id, user_id, name, category, target_amount, current_amount, color_gradient,
                TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status, created_at
    `;
    const values = [
      userId,
      data.name.trim(),
      data.category || 'General',
      data.targetAmount,
      data.currentAmount || 0.00,
      data.colorGradient || 'purple',
      data.targetDate || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateSavingsGoalAmount(goalId: number, userId: number, newCurrentAmount: number): Promise<SavingsGoalRow> {
    const query = `
      UPDATE savings_goals
      SET current_amount = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING id, user_id, name, category, target_amount, current_amount, color_gradient,
                TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status, created_at
    `;
    const result = await pool.query(query, [newCurrentAmount, goalId, userId]);
    return result.rows[0];
  }

  async deleteSavingsGoal(goalId: number, userId: number): Promise<boolean> {
    const query = `DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id`;
    const result = await pool.query(query, [goalId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  // --- Hallazgo 9: Gastos Fijos Recurrentes ---
  async getRecurringExpenses(userId: number): Promise<RecurringExpenseRow[]> {
    const query = `
      SELECT id, user_id, title, category, amount, source_card_id, payment_method_name,
             billing_day, is_active, last_charged_month, created_at
      FROM recurring_expenses
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY billing_day ASC, id ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async createRecurringExpense(userId: number, data: {
    title: string;
    category: string;
    amount: number;
    sourceCardId?: number | null;
    paymentMethodName?: string;
    billingDay: number;
  }): Promise<RecurringExpenseRow> {
    const query = `
      INSERT INTO recurring_expenses (user_id, title, category, amount, source_card_id, payment_method_name, billing_day, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING id, user_id, title, category, amount, source_card_id, payment_method_name,
                billing_day, is_active, last_charged_month, created_at
    `;
    const values = [
      userId,
      data.title.trim(),
      data.category.trim(),
      data.amount,
      data.sourceCardId || null,
      data.paymentMethodName || 'Efectivo en Mano / Caja',
      data.billingDay
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateRecurringExpenseLastChargedMonth(id: number, userId: number, yearMonth: string): Promise<void> {
    await pool.query(
      `UPDATE recurring_expenses SET last_charged_month = $1 WHERE id = $2 AND user_id = $3`,
      [yearMonth, id, userId]
    );
  }

  async deleteRecurringExpense(id: number, userId: number): Promise<boolean> {
    const query = `DELETE FROM recurring_expenses WHERE id = $1 AND user_id = $2 RETURNING id`;
    const result = await pool.query(query, [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  // --- Hallazgo 10: Salario Base para Prestaciones Laborales ---
  async getUserSalary(userId: number): Promise<number | null> {
    const query = `SELECT monthly_base_salary FROM users WHERE id = $1 LIMIT 1`;
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.monthly_base_salary ? parseFloat(result.rows[0].monthly_base_salary) : null;
  }

  async updateUserSalary(userId: number, salary: number): Promise<void> {
    await pool.query(
      `UPDATE users SET monthly_base_salary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [salary, userId]
    );
  }

  // Alertas
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
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_dismissed_alerts (
          user_id INTEGER NOT NULL,
          alert_id INTEGER NOT NULL,
          dismissed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id, alert_id)
        )
      `);

      await pool.query(
        `UPDATE payment_alerts SET is_active = FALSE WHERE id = $1 AND user_id = $2`,
        [alertId, userId]
      );

      await pool.query(
        `INSERT INTO user_dismissed_alerts (user_id, alert_id) VALUES ($1, $2) ON CONFLICT (user_id, alert_id) DO NOTHING`,
        [userId, alertId]
      );

      return true;
    } catch (err) {
      console.error('Error en dismissAlert repository:', err);
      return true;
    }
  }

  async getDismissedAlertIds(userId: number): Promise<number[]> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_dismissed_alerts (
          user_id INTEGER NOT NULL,
          alert_id INTEGER NOT NULL,
          dismissed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id, alert_id)
        )
      `);

      const res = await pool.query(
        `SELECT alert_id FROM user_dismissed_alerts WHERE user_id = $1`,
        [userId]
      );
      return res.rows.map(r => r.alert_id);
    } catch (err) {
      return [];
    }
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

  async getUserPreferences(userId: number): Promise<{
    alertCardDue: boolean;
    alertBudgetLimit: boolean;
    alertFixedExpenses: boolean;
    alertLegalBenefits: boolean;
  }> {
    const query = `
      SELECT 
        COALESCE(alert_card_due, true) as "alertCardDue",
        COALESCE(alert_budget_limit, true) as "alertBudgetLimit",
        COALESCE(alert_fixed_expenses, true) as "alertFixedExpenses",
        COALESCE(alert_legal_benefits, true) as "alertLegalBenefits"
      FROM users WHERE id = $1 LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    const row = result.rows[0];
    return {
      alertCardDue: row?.alertCardDue ?? true,
      alertBudgetLimit: row?.alertBudgetLimit ?? true,
      alertFixedExpenses: row?.alertFixedExpenses ?? true,
      alertLegalBenefits: row?.alertLegalBenefits ?? true
    };
  }

  async updateUserPreferences(userId: number, prefs: {
    alertCardDue?: boolean;
    alertBudgetLimit?: boolean;
    alertFixedExpenses?: boolean;
    alertLegalBenefits?: boolean;
  }): Promise<{
    alertCardDue: boolean;
    alertBudgetLimit: boolean;
    alertFixedExpenses: boolean;
    alertLegalBenefits: boolean;
  }> {
    const current = await this.getUserPreferences(userId);
    const updated = {
      alertCardDue: prefs.alertCardDue !== undefined ? !!prefs.alertCardDue : current.alertCardDue,
      alertBudgetLimit: prefs.alertBudgetLimit !== undefined ? !!prefs.alertBudgetLimit : current.alertBudgetLimit,
      alertFixedExpenses: prefs.alertFixedExpenses !== undefined ? !!prefs.alertFixedExpenses : current.alertFixedExpenses,
      alertLegalBenefits: prefs.alertLegalBenefits !== undefined ? !!prefs.alertLegalBenefits : current.alertLegalBenefits
    };

    const query = `
      UPDATE users 
      SET 
        alert_card_due = $1,
        alert_budget_limit = $2,
        alert_fixed_expenses = $3,
        alert_legal_benefits = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `;
    await pool.query(query, [
      updated.alertCardDue,
      updated.alertBudgetLimit,
      updated.alertFixedExpenses,
      updated.alertLegalBenefits,
      userId
    ]);

    return updated;
  }

  async getFullUserBackupData(userId: number): Promise<any> {
    const userRes = await pool.query(
      `SELECT id, name, email, avatar_url, monthly_base_salary, created_at,
              alert_card_due, alert_budget_limit, alert_fixed_expenses, alert_legal_benefits
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const user = userRes.rows[0] || null;
    const cards = await this.getCardsByUserId(userId);
    const transactions = await this.getTransactionsByUserId(userId);
    const savingsGoals = await this.getSavingsGoalsByUserId(userId);
    const recurringExpenses = await this.getRecurringExpenses(userId);
    const installmentPlans = await this.getInstallmentPlansByUserId(userId);
    const categories = await this.getCategoriesByUserId(userId);

    return {
      metadata: {
        version: '3.0.0',
        platform: 'control-gastos-v3',
        exportDate: new Date().toISOString(),
        totalTransactions: transactions.length,
        totalCards: cards.length,
        totalSavingsGoals: savingsGoals.length,
        totalRecurringExpenses: recurringExpenses.length,
        totalInstallmentPlans: installmentPlans.length,
        totalCategories: categories.length
      },
      user,
      cards,
      transactions,
      savingsGoals,
      recurringExpenses,
      installmentPlans,
      categories
    };
  }

  async restoreUserBackupData(
    userId: number,
    backupData: any,
    mode: 'REPLACE' | 'MERGE' = 'REPLACE'
  ): Promise<{
    success: boolean;
    message: string;
    stats: {
      restoredCards: number;
      restoredCategories: number;
      restoredTransactions: number;
      restoredGoals: number;
      restoredRecurring: number;
      restoredInstallments: number;
    };
  }> {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('El archivo no contiene un JSON válido.');
    }

    // Schema validation
    const cards = Array.isArray(backupData.cards) ? backupData.cards : [];
    const transactions = Array.isArray(backupData.transactions) ? backupData.transactions : [];
    const savingsGoals = Array.isArray(backupData.savingsGoals) ? backupData.savingsGoals : [];
    const recurringExpenses = Array.isArray(backupData.recurringExpenses) ? backupData.recurringExpenses : [];
    const installmentPlans = Array.isArray(backupData.installmentPlans) ? backupData.installmentPlans : [];
    const categories = Array.isArray(backupData.categories) ? backupData.categories : [];
    const userProfile = backupData.user || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update user salary & alert preferences if present
      if (userProfile) {
        await client.query(
          `UPDATE users
           SET monthly_base_salary = COALESCE($1, monthly_base_salary),
               alert_card_due = COALESCE($2, alert_card_due),
               alert_budget_limit = COALESCE($3, alert_budget_limit),
               alert_fixed_expenses = COALESCE($4, alert_fixed_expenses),
               alert_legal_benefits = COALESCE($5, alert_legal_benefits)
           WHERE id = $6`,
          [
            userProfile.monthly_base_salary ? parseFloat(userProfile.monthly_base_salary) : null,
            typeof userProfile.alert_card_due === 'boolean' ? userProfile.alert_card_due : null,
            typeof userProfile.alert_budget_limit === 'boolean' ? userProfile.alert_budget_limit : null,
            typeof userProfile.alert_fixed_expenses === 'boolean' ? userProfile.alert_fixed_expenses : null,
            typeof userProfile.alert_legal_benefits === 'boolean' ? userProfile.alert_legal_benefits : null,
            userId
          ]
        );
      }

      // 2. If REPLACE mode, clear current user records in safe dependency order
      if (mode === 'REPLACE') {
        await client.query('DELETE FROM installment_plans WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM recurring_expenses WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM savings_goals WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM cards_accounts WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM categories WHERE user_id = $1 AND is_system = false', [userId]);
      }

      // 3. Restore Categories
      let restoredCategories = 0;
      for (const cat of categories) {
        if (!cat.name || !cat.type) continue;
        await client.query(
          `INSERT INTO categories (user_id, name, type, icon, color, is_system)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, name, type) DO UPDATE
           SET icon = EXCLUDED.icon, color = EXCLUDED.color`,
          [
            userId,
            cat.name.trim(),
            cat.type,
            cat.icon || 'tag',
            cat.color || (cat.type === 'INCOME' ? '#10b981' : '#38bdf8'),
            cat.is_system === true
          ]
        );
        restoredCategories++;
      }

      // 4. Restore Cards & map old card IDs to new card IDs
      const cardIdMap = new Map<number, number>();
      let restoredCards = 0;

      for (const card of cards) {
        if (!card.name || !card.type) continue;
        const res = await client.query(
          `INSERT INTO cards_accounts (
             user_id, name, type, card_number_mask, initial_balance,
             expiry_date, color_gradient, billing_cut_day, payment_due_day
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            userId,
            card.name,
            card.type,
            card.card_number_mask || card.cardNumberMask || '**** 0000',
            parseFloat(card.initial_balance ?? card.initialBalance ?? 0),
            card.expiry_date || card.expiryDate || '12/28',
            card.color_gradient || card.colorGradient || 'from-indigo-600 to-blue-700',
            card.billing_cut_day ?? card.billingCutDay ?? null,
            card.payment_due_day ?? card.paymentDueDay ?? null
          ]
        );
        const newCardId = res.rows[0].id;
        if (card.id) {
          cardIdMap.set(Number(card.id), newCardId);
        }
        restoredCards++;
      }

      // 5. Restore Savings Goals
      let restoredGoals = 0;
      for (const goal of savingsGoals) {
        if (!goal.target_amount && !goal.targetAmount) continue;
        await client.query(
          `INSERT INTO savings_goals (
             user_id, name, target_amount, current_amount, category, color_gradient, target_date, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            goal.name || 'Meta de Ahorro',
            parseFloat(goal.target_amount || goal.targetAmount || 0),
            parseFloat(goal.current_amount || goal.currentAmount || 0),
            goal.category || 'Ahorro',
            goal.color_gradient || goal.colorGradient || '#c084fc',
            goal.target_date || goal.targetDate || null,
            goal.status || 'ACTIVE'
          ]
        );
        restoredGoals++;
      }

      // 6. Restore Recurring Expenses
      let restoredRecurring = 0;
      for (const rec of recurringExpenses) {
        if (!rec.title || !rec.amount) continue;
        const oldCardId = rec.source_card_id || rec.sourceCardId;
        const mappedCardId = oldCardId ? (cardIdMap.get(Number(oldCardId)) || null) : null;

        await client.query(
          `INSERT INTO recurring_expenses (
             user_id, title, category, amount, source_card_id, payment_method_name, billing_day, is_active, last_charged_month
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userId,
            rec.title,
            rec.category || 'Servicios Básicos',
            parseFloat(rec.amount || 0),
            mappedCardId,
            rec.payment_method_name || rec.paymentMethodName || 'Efectivo en Mano / Caja',
            parseInt(rec.billing_day || rec.billingDay || 15, 10),
            rec.is_active !== false && rec.isActive !== false,
            rec.last_charged_month || rec.lastChargedMonth || null
          ]
        );
        restoredRecurring++;
      }

      // 7. Restore Transactions & map transaction IDs for installment plans
      const txIdMap = new Map<number, number>();
      let restoredTransactions = 0;

      for (const tx of transactions) {
        if (!tx.title || !tx.amount) continue;
        const oldSourceId = tx.source_card_id || tx.sourceCardId || tx.card_id || tx.cardId;
        const oldDestId = tx.destination_card_id || tx.destinationCardId;
        const mappedSourceId = oldSourceId ? (cardIdMap.get(Number(oldSourceId)) || null) : null;
        const mappedDestId = oldDestId ? (cardIdMap.get(Number(oldDestId)) || null) : null;
        const txDate = tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        const res = await client.query(
          `INSERT INTO transactions (
             user_id, type, amount, category, title, date, merchant, status, source_card_id, destination_card_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            userId,
            tx.type,
            parseFloat(tx.amount || 0),
            tx.category || 'Otros Gastos',
            tx.title,
            txDate,
            tx.merchant || '',
            tx.status || 'COMPLETED',
            mappedSourceId,
            mappedDestId
          ]
        );
        const newTxId = res.rows[0].id;
        if (tx.id) {
          txIdMap.set(Number(tx.id), newTxId);
        }
        restoredTransactions++;
      }

      // 8. Restore Installment Plans
      let restoredInstallments = 0;
      for (const plan of installmentPlans) {
        const oldCardId = plan.card_id || plan.cardId;
        const oldTxId = plan.transaction_id || plan.transactionId;
        const mappedCardId = oldCardId ? cardIdMap.get(Number(oldCardId)) : null;
        const mappedTxId = oldTxId ? txIdMap.get(Number(oldTxId)) : null;

        if (!mappedCardId || !mappedTxId) continue;

        await client.query(
          `INSERT INTO installment_plans (
             user_id, card_id, transaction_id, total_amount, installment_count,
             installment_amount, installments_paid, start_date, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userId,
            mappedCardId,
            mappedTxId,
            parseFloat(plan.total_amount || plan.totalAmount || 0),
            parseInt(plan.installment_count || plan.installmentCount || plan.total_installments || 1, 10),
            parseFloat(plan.installment_amount || plan.installmentAmount || 0),
            parseInt(plan.installments_paid || plan.installmentsPaid || 1, 10),
            plan.start_date || plan.startDate || new Date().toISOString().split('T')[0],
            plan.status || 'ACTIVE'
          ]
        );
        restoredInstallments++;
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Respaldo financiero restaurado exitosamente.',
        stats: {
          restoredCards,
          restoredCategories,
          restoredTransactions,
          restoredGoals,
          restoredRecurring,
          restoredInstallments
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Suite de Categorías Personalizadas ---
  async ensureUserCategories(userId: number): Promise<void> {
    const check = await pool.query('SELECT COUNT(*) FROM categories WHERE user_id = $1', [userId]);
    if (parseInt(check.rows[0].count, 10) === 0) {
      // Seed default expense categories
      const defaultExpenses = [
        { name: 'Alimentación & Restaurantes', icon: 'utensils', color: '#f59e0b', isSystem: true },
        { name: 'Vivienda & Servicios', icon: 'home', color: '#38bdf8', isSystem: true },
        { name: 'Transporte & Combustible', icon: 'car', color: '#10b981', isSystem: true },
        { name: 'Salud & Medicina', icon: 'heart-pulse', color: '#ef4444', isSystem: true },
        { name: 'Entretenimiento & Ocio', icon: 'gamepad', color: '#8b5cf6', isSystem: true },
        { name: 'Tecnología & Software', icon: 'laptop', color: '#6366f1', isSystem: true },
        { name: 'Educación & Cursos', icon: 'graduation-cap', color: '#ec4899', isSystem: true },
        { name: 'Mascotas & Veterinaria', icon: 'paw', color: '#14b8a6', isSystem: false },
        { name: 'Otros Gastos', icon: 'tag', color: '#64748b', isSystem: true }
      ];
      for (const cat of defaultExpenses) {
        await pool.query(
          `INSERT INTO categories (user_id, name, type, icon, color, is_system)
           VALUES ($1, $2, 'EXPENSE', $3, $4, $5)
           ON CONFLICT (user_id, name, type) DO NOTHING`,
          [userId, cat.name, cat.icon, cat.color, cat.isSystem]
        );
      }

      // Seed default income categories
      const defaultIncomes = [
        { name: 'Salario / Nómina', icon: 'wallet', color: '#10b981', isSystem: true },
        { name: 'Bono 14 (Decreto 42-92)', icon: 'award', color: '#34d399', isSystem: true },
        { name: 'Aguinaldo (Decreto 76-78)', icon: 'gift', color: '#06b6d4', isSystem: true },
        { name: 'Ventas / Negocios', icon: 'briefcase', color: '#3b82f6', isSystem: true },
        { name: 'Inversiones & Rendimientos', icon: 'trending-up', color: '#8b5cf6', isSystem: true },
        { name: 'Reembolsos & Viáticos', icon: 'receipt', color: '#f59e0b', isSystem: true },
        { name: 'Otros Ingresos', icon: 'coins', color: '#64748b', isSystem: true }
      ];
      for (const cat of defaultIncomes) {
        await pool.query(
          `INSERT INTO categories (user_id, name, type, icon, color, is_system)
           VALUES ($1, $2, 'INCOME', $3, $4, $5)
           ON CONFLICT (user_id, name, type) DO NOTHING`,
          [userId, cat.name, cat.icon, cat.color, cat.isSystem]
        );
      }
    }

    // Historical import: if transactions contain any categories not yet in categories table, insert them
    const historicalRes = await pool.query(
      `SELECT DISTINCT category, type FROM transactions WHERE user_id = $1 AND category IS NOT NULL AND TRIM(category) != ''`,
      [userId]
    );
    for (const row of historicalRes.rows) {
      const type = row.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const color = type === 'INCOME' ? '#10b981' : '#38bdf8';
      await pool.query(
        `INSERT INTO categories (user_id, name, type, icon, color, is_system)
         VALUES ($1, $2, $3, 'tag', $4, false)
         ON CONFLICT (user_id, name, type) DO NOTHING`,
        [userId, row.category.trim(), type, color]
      );
    }
  }

  async getCategoriesByUserId(userId: number, type?: string): Promise<CategoryRow[]> {
    await this.ensureUserCategories(userId);
    let query = `
      SELECT c.id, c.user_id, c.name, c.type, c.icon, c.color, c.is_system, c.created_at,
             COALESCE(tc.tx_count, 0)::integer as transaction_count,
             COALESCE(tm.month_amount, 0)::numeric as monthly_amount
      FROM categories c
      LEFT JOIN (
        SELECT category, type, COUNT(*) as tx_count
        FROM transactions
        WHERE user_id = $1
        GROUP BY category, type
      ) tc ON tc.category = c.name AND tc.type = c.type
      LEFT JOIN (
        SELECT category, type, SUM(amount) as month_amount
        FROM transactions
        WHERE user_id = $1
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
          AND date <= CURRENT_DATE
        GROUP BY category, type
      ) tm ON tm.category = c.name AND tm.type = c.type
      WHERE c.user_id = $1
    `;
    const values: any[] = [userId];
    if (type && (type === 'EXPENSE' || type === 'INCOME')) {
      query += ` AND c.type = $2`;
      values.push(type);
    }
    query += ` ORDER BY c.type ASC, c.is_system DESC, c.name ASC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  async getCategoryById(id: number, userId: number): Promise<CategoryRow | null> {
    const query = `
      SELECT id, user_id, name, type, icon, color, is_system, created_at
      FROM categories
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  async createCategory(userId: number, data: {
    name: string;
    type: 'EXPENSE' | 'INCOME';
    icon?: string;
    color?: string;
  }): Promise<CategoryRow> {
    await this.ensureUserCategories(userId);
    const query = `
      INSERT INTO categories (user_id, name, type, icon, color, is_system)
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING id, user_id, name, type, icon, color, is_system, created_at
    `;
    const values = [
      userId,
      data.name.trim(),
      data.type,
      data.icon || 'tag',
      data.color || (data.type === 'INCOME' ? '#10b981' : '#38bdf8')
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateCategory(userId: number, id: number, data: {
    name?: string;
    icon?: string;
    color?: string;
  }): Promise<CategoryRow | null> {
    const current = await this.getCategoryById(id, userId);
    if (!current) return null;

    const newName = data.name !== undefined ? data.name.trim() : current.name;
    const newIcon = data.icon !== undefined ? data.icon : current.icon;
    const newColor = data.color !== undefined ? data.color : current.color;

    // If name changed, cascade update transactions with old category name
    if (newName !== current.name) {
      await pool.query(
        `UPDATE transactions
         SET category = $1
         WHERE user_id = $2 AND category = $3 AND type = $4`,
        [newName, userId, current.name, current.type]
      );
    }

    const query = `
      UPDATE categories
      SET name = $1, icon = $2, color = $3
      WHERE id = $4 AND user_id = $5
      RETURNING id, user_id, name, type, icon, color, is_system, created_at
    `;
    const result = await pool.query(query, [newName, newIcon, newColor, id, userId]);
    return result.rows[0];
  }

  async deleteCategory(userId: number, id: number, reassignToName?: string): Promise<{ success: boolean; reassignedCount: number }> {
    const current = await this.getCategoryById(id, userId);
    if (!current) return { success: false, reassignedCount: 0 };

    // Check count of transactions
    const countRes = await pool.query(
      `SELECT COUNT(*) as count FROM transactions WHERE user_id = $1 AND category = $2 AND type = $3`,
      [userId, current.name, current.type]
    );
    const txCount = parseInt(countRes.rows[0].count, 10);

    let reassigned = 0;
    if (txCount > 0) {
      if (!reassignToName || reassignToName.trim() === '') {
        throw new Error(`Esta categoría tiene ${txCount} transacciones asociadas. Debes seleccionar una categoría destino para reasignarlas.`);
      }
      const updateRes = await pool.query(
        `UPDATE transactions SET category = $1 WHERE user_id = $2 AND category = $3 AND type = $4`,
        [reassignToName.trim(), userId, current.name, current.type]
      );
      reassigned = updateRes.rowCount ?? 0;
    }

    await pool.query(`DELETE FROM categories WHERE id = $1 AND user_id = $2`, [id, userId]);
    return { success: true, reassignedCount: reassigned };
  }
}


