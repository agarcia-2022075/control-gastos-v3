import { DashboardRepository } from '../repositories/dashboard.repository.js';
import { AppError } from '../../../middlewares/error.middleware.js';

export interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  colorClass: string;
}

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

export interface DashboardStatsResponse {
  saldoDisponible: number;
  gastosMes: number;
  ingresosTotales: number;
  metaAhorro: {
    target: number;
    current: number;
    percentage: number;
  };
  tendencias: {
    semana: TrendPoint[];
    mes: TrendPoint[];
    ano: TrendPoint[];
  };
  transaccionesRecientes: Array<{
    id: number;
    title: string;
    merchant: string;
    category: string;
    date: string;
    status: string;
    amount: number;
    type: 'EXPENSE' | 'INCOME';
  }>;
  gastosPorCategoria: CategoryBreakdown[];
  alertas: Array<{
    id: number;
    title: string;
    description: string;
    alertType: string;
  }>;
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export class DashboardService {
  private repo = new DashboardRepository();

  async getDashboardStats(userId: number): Promise<DashboardStatsResponse> {
    await this.repo.ensureUserData(userId);

    const transactions = await this.repo.getTransactionsByUserId(userId);
    const savingsGoal = await this.repo.getSavingsGoalByUserId(userId);
    const alerts = await this.repo.getActiveAlertsByUserId(userId);

    // Calculate User's Individual Totals
    let totalIncome = 0;
    let totalExpense = 0;
    let currentMonthExpense = 0;
    let currentMonthIncome = 0;

    const categoryMap: { [key: string]: number } = {};

    // Grouping structure for trends
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthMap: { [key: string]: { income: number; expense: number } } = {};
    monthLabels.forEach(m => monthMap[m] = { income: 0, expense: 0 });

    const weekLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const weekMap: { [key: string]: { income: number; expense: number } } = {};
    weekLabels.forEach(w => weekMap[w] = { income: 0, expense: 0 });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-based

    // Dynamic Year Range: from minYear or (currentYear - 4) to (currentYear + 1)
    const yearsSet = new Set<number>();
    for (let y = currentYear - 4; y <= currentYear + 1; y++) {
      yearsSet.add(y);
    }
    transactions.forEach(tx => {
      const parts = String(tx.date).split('T')[0].split('-');
      const y = parseInt(parts[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    });

    const yearLabels = Array.from(yearsSet).sort((a, b) => a - b).map(String);
    const yearMap: { [key: string]: { income: number; expense: number } } = {};
    yearLabels.forEach(y => yearMap[y] = { income: 0, expense: 0 });

    transactions.forEach((tx) => {
      const amount = round2(parseFloat(tx.amount));

      // Timezone-safe Date parsing from YYYY-MM-DD string
      const dateParts = String(tx.date).split('T')[0].split('-');
      const year = parseInt(dateParts[0], 10);
      const monthIdx = parseInt(dateParts[1], 10) - 1; // 0..11
      const day = parseInt(dateParts[2], 10);
      const txDate = new Date(year, monthIdx, day);

      if (tx.type === 'INCOME') {
        totalIncome = round2(totalIncome + amount);
        if (monthIdx === currentMonthIdx && year === currentYear) {
          currentMonthIncome = round2(currentMonthIncome + amount);
        }
      } else {
        totalExpense = round2(totalExpense + amount);
        if (monthIdx === currentMonthIdx && year === currentYear) {
          currentMonthExpense = round2(currentMonthExpense + amount);
        }
        categoryMap[tx.category] = round2((categoryMap[tx.category] || 0) + amount);
      }

      // Map to Month
      const mName = monthLabels[monthIdx];
      if (mName && monthMap[mName]) {
        if (tx.type === 'INCOME') monthMap[mName].income = round2(monthMap[mName].income + amount);
        else monthMap[mName].expense = round2(monthMap[mName].expense + amount);
      }

      // Map to Day of Week
      let dayIdx = txDate.getDay() - 1; // 0=Sunday -> convert to 0=Monday
      if (dayIdx === -1) dayIdx = 6;
      const wName = weekLabels[dayIdx];
      if (wName && weekMap[wName]) {
        if (tx.type === 'INCOME') weekMap[wName].income = round2(weekMap[wName].income + amount);
        else weekMap[wName].expense = round2(weekMap[wName].expense + amount);
      }

      // Map to Year
      const yName = year.toString();
      if (yearMap[yName]) {
        if (tx.type === 'INCOME') yearMap[yName].income = round2(yearMap[yName].income + amount);
        else yearMap[yName].expense = round2(yearMap[yName].expense + amount);
      }
    });

    const saldoDisponible = round2(totalIncome - totalExpense);

    // Savings Goal
    const targetAmount = savingsGoal ? round2(parseFloat(savingsGoal.target_amount)) : 10000;
    const currentAmount = savingsGoal ? round2(parseFloat(savingsGoal.current_amount)) : 0;
    const goalPercentage = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

    // Category Breakdown
    const colorClasses = ['fill-cyan', 'fill-purple', 'fill-amber', 'fill-rose'];
    const totalCatExpense = Object.values(categoryMap).reduce((a, b) => round2(a + b), 0);

    const gastosPorCategoria: CategoryBreakdown[] = totalCatExpense > 0
      ? Object.keys(categoryMap).map((catName, idx) => {
          const catAmount = categoryMap[catName];
          return {
            name: catName,
            amount: catAmount,
            percentage: Math.round((catAmount / totalCatExpense) * 100),
            colorClass: colorClasses[idx % colorClasses.length]
          };
        })
      : [];

    // Format trends
    const mesPoints: TrendPoint[] = monthLabels.map(m => ({
      label: m,
      income: monthMap[m].income,
      expense: monthMap[m].expense
    }));

    const semanaPoints: TrendPoint[] = weekLabels.map(w => ({
      label: w,
      income: weekMap[w].income,
      expense: weekMap[w].expense
    }));

    const anoPoints: TrendPoint[] = yearLabels.map(y => ({
      label: y,
      income: yearMap[y].income,
      expense: yearMap[y].expense
    }));

    // Recent Transactions
    const transaccionesRecientes = transactions.map((tx) => ({
      id: tx.id,
      title: tx.title,
      merchant: tx.merchant || 'Comercio Registrado',
      category: tx.category,
      date: tx.date,
      status: tx.status,
      amount: round2(parseFloat(tx.amount)),
      type: tx.type
    }));

    return {
      saldoDisponible,
      gastosMes: currentMonthExpense,
      ingresosTotales: currentMonthIncome,
      metaAhorro: {
        target: targetAmount,
        current: currentAmount,
        percentage: goalPercentage
      },
      tendencias: {
        semana: semanaPoints,
        mes: mesPoints,
        ano: anoPoints
      },
      transaccionesRecientes,
      gastosPorCategoria,
      alertas: alerts.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        alertType: a.alert_type
      }))
    };
  }

  async createIncome(userId: number, data: {
    title: string;
    merchant?: string;
    category: string;
    amount: number;
    date?: string;
  }) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new AppError(400, 'El concepto del ingreso es obligatorio.');
    }
    if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
      throw new AppError(400, 'La categoría del ingreso es obligatoria.');
    }
    if (data.amount === undefined || isNaN(data.amount) || data.amount <= 0) {
      throw new AppError(400, 'El monto del ingreso debe ser un número mayor a cero.');
    }
    if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new AppError(400, 'El formato de fecha debe ser YYYY-MM-DD.');
    }

    return await this.repo.createTransaction(userId, {
      type: 'INCOME',
      title: data.title.trim(),
      merchant: data.merchant?.trim() || 'Depósito Registrado',
      category: data.category.trim(),
      amount: round2(data.amount),
      status: 'COMPLETED',
      date: data.date || null
    });
  }

  async createExpense(userId: number, data: {
    title: string;
    merchant?: string;
    category: string;
    amount: number;
    date?: string;
  }) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new AppError(400, 'El concepto del gasto es obligatorio.');
    }
    if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
      throw new AppError(400, 'La categoría del gasto es obligatoria.');
    }
    if (data.amount === undefined || isNaN(data.amount) || data.amount <= 0) {
      throw new AppError(400, 'El monto del gasto debe ser un número mayor a cero.');
    }
    if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new AppError(400, 'El formato de fecha debe ser YYYY-MM-DD.');
    }

    return await this.repo.createTransaction(userId, {
      type: 'EXPENSE',
      title: data.title.trim(),
      merchant: data.merchant?.trim() || 'Comercio Registrado',
      category: data.category.trim(),
      amount: round2(data.amount),
      status: 'COMPLETED',
      date: data.date || null
    });
  }

  async updateTransaction(userId: number, id: number, data: {
    title?: string;
    merchant?: string;
    category?: string;
    amount?: number;
    date?: string;
  }) {
    if (!id || isNaN(id) || !userId) {
      throw new AppError(400, 'ID de transacción o usuario inválido.');
    }
    if (data.amount !== undefined && (isNaN(data.amount) || data.amount <= 0)) {
      throw new AppError(400, 'El monto debe ser un número mayor a cero.');
    }
    if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new AppError(400, 'El formato de fecha debe ser YYYY-MM-DD.');
    }

    const updated = await this.repo.updateTransactionById(id, userId, {
      title: data.title?.trim(),
      merchant: data.merchant !== undefined ? data.merchant?.trim() : undefined,
      category: data.category?.trim(),
      amount: data.amount !== undefined ? round2(data.amount) : undefined,
      date: data.date || null
    });

    if (!updated) {
      throw new AppError(404, 'No se encontró la transacción o no tienes permisos para editarla.');
    }
    return updated;
  }

  async deleteTransaction(id: number, userId: number): Promise<boolean> {
    if (!id || isNaN(id) || !userId) {
      throw new AppError(400, 'ID de transacción o usuario inválido.');
    }
    const success = await this.repo.deleteTransactionById(id, userId);
    if (!success) {
      throw new AppError(404, 'No se encontró la transacción o no tienes permisos para eliminarla.');
    }
    return true;
  }

  async updateSavingsGoal(userId: number, data: {
    targetAmount?: number;
    currentAmount?: number;
  }) {
    if (data.targetAmount !== undefined && (isNaN(data.targetAmount) || data.targetAmount < 0)) {
      throw new AppError(400, 'El monto objetivo de ahorro debe ser un número positivo.');
    }
    if (data.currentAmount !== undefined && (isNaN(data.currentAmount) || data.currentAmount < 0)) {
      throw new AppError(400, 'El monto actual de ahorro debe ser un número positivo.');
    }

    return await this.repo.updateSavingsGoal(userId, {
      targetAmount: data.targetAmount !== undefined ? round2(data.targetAmount) : undefined,
      currentAmount: data.currentAmount !== undefined ? round2(data.currentAmount) : undefined
    });
  }

  async dismissAlert(userId: number, alertId: number): Promise<boolean> {
    if (!alertId || isNaN(alertId)) {
      throw new AppError(400, 'ID de alerta inválido.');
    }
    const success = await this.repo.dismissAlert(userId, alertId);
    if (!success) {
      throw new AppError(404, 'Alerta no encontrada o ya resuelta.');
    }
    return true;
  }
}
