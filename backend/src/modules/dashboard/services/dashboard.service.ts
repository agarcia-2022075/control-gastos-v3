import { DashboardRepository, TransactionRow, CardAccountRow, InstallmentPlanRow, SavingsGoalRow, RecurringExpenseRow } from '../repositories/dashboard.repository.js';
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

export interface CardAccountResponse {
  id: number;
  name: string;
  type: 'DEBIT' | 'SAVINGS' | 'CASH' | 'CREDIT';
  cardNumberMask: string;
  balance: number;
  initialBalance: number;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  utilizationPercentage: number;
  expiryDate: string;
  colorGradient: string;
  billingCutDay?: number | null;
  paymentDueDay?: number | null;
}

export interface SavingsGoalResponse {
  id: number;
  name: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  colorGradient: string;
  targetDate?: string | null;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface RecurringExpenseResponse {
  id: number;
  title: string;
  category: string;
  amount: number;
  sourceCardId?: number | null;
  paymentMethodName: string;
  billingDay: number;
  isActive: boolean;
  lastChargedMonth?: string | null;
  isChargedThisMonth: boolean;
}

export interface PrestacionesLeyResponse {
  salarioBase: number;
  bono14: {
    fechaPago: string;
    montoEstimado: number;
    diasRestantes: number;
    esMesActual: boolean;
  };
  aguinaldo: {
    fechaPago: string;
    montoEstimado: number;
    diasRestantes: number;
    esMesActual: boolean;
  };
  alertaEstacional?: {
    tipo: 'BONO14' | 'AGUINALDO';
    titulo: string;
    mensaje: string;
  } | null;
}

export interface DashboardStatsResponse {
  saldoDisponible: number;
  saldoEfectivo: number;
  saldoAhorrado: number;
  saldoTotalLiquido: number;
  gastosMes: number;
  gastosTotales: number;
  ingresosMes: number;
  ingresosTotales: number;
  metaAhorro: {
    target: number;
    current: number;
    percentage: number;
  };
  metasAhorro: SavingsGoalResponse[];
  gastosRecurrentes: RecurringExpenseResponse[];
  prestacionesLey: PrestacionesLeyResponse;
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
    type: 'EXPENSE' | 'INCOME' | 'CREDIT_PAYMENT';
    sourceCardId?: number | null;
    destinationCardId?: number | null;
  }>;
  gastosPorCategoria: CategoryBreakdown[];
  alertas: Array<{
    id: number;
    title: string;
    description: string;
    alertType: string;
  }>;
  tarjetas: CardAccountResponse[];
  preferenciasAlertas?: {
    alertCardDue: boolean;
    alertBudgetLimit: boolean;
    alertFixedExpenses: boolean;
    alertLegalBenefits: boolean;
  };
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export class DashboardService {
  private repo = new DashboardRepository();

  private findMatchedCard(cards: CardAccountRow[], merchant?: string | null): CardAccountRow | undefined {
    if (!merchant || !merchant.trim() || !cards || cards.length === 0) return undefined;
    const mLower = merchant.toLowerCase().trim();

    // If explicit cash/efectivo, match only if user created an explicit CASH account
    if (mLower.includes('efectivo') || mLower.includes('cash')) {
      return cards.find(c => c.type === 'CASH' || c.name.toLowerCase().includes('efectivo'));
    }

    // 1. Exact name match
    let matched = cards.find(c => c.name.toLowerCase() === mLower);
    if (matched) return matched;

    // 2. Substring match
    matched = cards.find(c => {
      const cLower = c.name.toLowerCase();
      return mLower.includes(cLower) || cLower.includes(mLower);
    });
    if (matched) return matched;

    // 3. Keyword / type match
    return cards.find(c => {
      if (c.type === 'CREDIT') {
        return mLower.includes('crédito') || mLower.includes('credito') || mLower.includes('credit') ||
               mLower.includes('tc') || mLower.includes('platinum') || mLower.includes('oro') ||
               mLower.includes('black') || mLower.includes('infinite') ||
               mLower.includes('bac') || mLower.includes('industrial') || mLower.includes('banrural');
      }
      if (c.type === 'DEBIT') {
        return mLower.includes('débito') || mLower.includes('debito') || mLower.includes('debit');
      }
      if (c.type === 'SAVINGS') {
        return mLower.includes('ahorros') || mLower.includes('ahorro') || mLower.includes('savings');
      }
      if (c.type === 'CASH') {
        return mLower.includes('efectivo') || mLower.includes('caja') || mLower.includes('cash');
      }
      return false;
    });
  }

  async getDashboardStats(userId: number): Promise<DashboardStatsResponse> {
    await this.repo.ensureUserData(userId);

    const transactions = await this.repo.getTransactionsByUserId(userId);
    const savingsGoals = await this.repo.getSavingsGoalsByUserId(userId);
    const rawRecurring = await this.repo.getRecurringExpenses(userId);
    const alerts = await this.repo.getActiveAlertsByUserId(userId);
    const rawCards = await this.repo.getCardsByUserId(userId);
    const installmentPlans = await this.repo.getInstallmentPlansByUserId(userId);
    const userSalary = await this.repo.getUserSalary(userId);
    const userPrefs = await this.repo.getUserPreferences(userId);

    // Calculate User's Individual Totals (excluyendo CREDIT_PAYMENT de ingresos/gastos operativos)
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
    const currentDay = now.getDate();
    const currentYearMonth = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

    // Dynamic Year Range
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

      // Timezone-safe Date parsing
      const dateParts = String(tx.date).split('T')[0].split('-');
      const year = parseInt(dateParts[0], 10);
      const monthIdx = parseInt(dateParts[1], 10) - 1; // 0..11
      const day = parseInt(dateParts[2], 10);
      const txDate = new Date(year, monthIdx, day);

      // Hallazgo 4: CREDIT_PAYMENT no infla ingresos ni gastos operativos
      if (tx.type === 'INCOME') {
        totalIncome = round2(totalIncome + amount);
        if (monthIdx === currentMonthIdx && year === currentYear) {
          currentMonthIncome = round2(currentMonthIncome + amount);
        }
        if (monthLabels[monthIdx]) monthMap[monthLabels[monthIdx]].income = round2(monthMap[monthLabels[monthIdx]].income + amount);
        let dayIdx = txDate.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6;
        if (weekLabels[dayIdx]) weekMap[weekLabels[dayIdx]].income = round2(weekMap[weekLabels[dayIdx]].income + amount);
        const yName = year.toString();
        if (yearMap[yName]) yearMap[yName].income = round2(yearMap[yName].income + amount);
      } else if (tx.type === 'EXPENSE') {
        totalExpense = round2(totalExpense + amount);
        if (monthIdx === currentMonthIdx && year === currentYear) {
          currentMonthExpense = round2(currentMonthExpense + amount);
        }
        categoryMap[tx.category] = round2((categoryMap[tx.category] || 0) + amount);
        if (monthLabels[monthIdx]) monthMap[monthLabels[monthIdx]].expense = round2(monthMap[monthLabels[monthIdx]].expense + amount);
        let dayIdx = txDate.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6;
        if (weekLabels[dayIdx]) weekMap[weekLabels[dayIdx]].expense = round2(weekMap[weekLabels[dayIdx]].expense + amount);
        const yName = year.toString();
        if (yearMap[yName]) yearMap[yName].expense = round2(yearMap[yName].expense + amount);
      }
    });

    // Per-Card and Cash Tracking
    const cardExpenses: { [cardId: number]: number } = {};
    const cardIncomes: { [cardId: number]: number } = {};
    const cardCreditPaymentsReceived: { [cardId: number]: number } = {};
    const cardCreditPaymentsSent: { [cardId: number]: number } = {};

    rawCards.forEach(c => {
      cardExpenses[c.id] = 0;
      cardIncomes[c.id] = 0;
      cardCreditPaymentsReceived[c.id] = 0;
      cardCreditPaymentsSent[c.id] = 0;
    });

    // Cash trackers (Efectivo en Mano / Caja)
    let cashIncomes = 0;
    let cashExpenses = 0;
    let cashCreditPaymentsSent = 0;

    transactions.forEach(tx => {
      const amount = round2(parseFloat(tx.amount));
      const mLower = (tx.merchant || '').toLowerCase().trim();
      const isExplicitCash = mLower.includes('efectivo') || mLower.includes('cash');

      if (tx.type === 'CREDIT_PAYMENT') {
        // Destination is the credit card being paid
        let destCard = tx.destination_card_id
          ? rawCards.find(c => c.id === tx.destination_card_id)
          : rawCards.find(c => c.type === 'CREDIT' && (tx.title.toLowerCase().includes(c.name.toLowerCase()) || mLower.includes(c.name.toLowerCase())));

        if (destCard) {
          cardCreditPaymentsReceived[destCard.id] = round2(cardCreditPaymentsReceived[destCard.id] + amount);
        }

        // Source is the debit card or cash paying the debt
        let srcCard = tx.source_card_id
          ? rawCards.find(c => c.id === tx.source_card_id)
          : (!isExplicitCash ? this.findMatchedCard(rawCards, tx.merchant) : undefined);

        if (srcCard && srcCard.type !== 'CREDIT') {
          cardCreditPaymentsSent[srcCard.id] = round2(cardCreditPaymentsSent[srcCard.id] + amount);
        } else {
          // Paid with cash
          cashCreditPaymentsSent = round2(cashCreditPaymentsSent + amount);
        }
        return;
      }

      // Normal EXPENSE or INCOME
      let matchedCard: CardAccountRow | undefined;
      if (tx.source_card_id) {
        matchedCard = rawCards.find(c => c.id === tx.source_card_id);
      } else if (!isExplicitCash) {
        matchedCard = this.findMatchedCard(rawCards, tx.merchant);
      }

      if (matchedCard) {
        if (tx.type === 'INCOME') {
          cardIncomes[matchedCard.id] = round2(cardIncomes[matchedCard.id] + amount);
        } else {
          cardExpenses[matchedCard.id] = round2(cardExpenses[matchedCard.id] + amount);
        }
      } else {
        // Falls into pure Cash
        if (tx.type === 'INCOME') {
          cashIncomes = round2(cashIncomes + amount);
        } else {
          cashExpenses = round2(cashExpenses + amount);
        }
      }
    });

    // Calculate initial cash from any CASH cards (if user added one)
    const initialCashAccounts = rawCards
      .filter(c => c.type === 'CASH')
      .reduce((acc, c) => round2(acc + (parseFloat(c.initial_balance) || 0)), 0);

    // Saldo Efectivo Real (Hallazgo 2)
    const saldoEfectivo = round2(initialCashAccounts + cashIncomes - cashExpenses - cashCreditPaymentsSent);

    const activeAlerts = alerts.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      alertType: a.alert_type
    }));

    // Build Cards Array with accurate debt, available limit, and installment plans (Hallazgos 4, 5, 6)
    const tarjetas: CardAccountResponse[] = rawCards.map(c => {
      const initial = round2(parseFloat(c.initial_balance) || 0);

      if (c.type === 'CREDIT') {
        const creditLimit = initial > 0 ? initial : 8000.00;
        const spent = cardExpenses[c.id] || 0;
        const paid = cardCreditPaymentsReceived[c.id] || 0;

        // Hallazgo 6: Añadir la deuda de cuotas futuras activas para esta tarjeta
        const pendingInstallmentsDebt = installmentPlans
          .filter(p => p.card_id === c.id)
          .reduce((sum, p) => {
            const remainingCount = Math.max(0, p.installment_count - p.installments_paid);
            return round2(sum + (remainingCount * parseFloat(p.installment_amount)));
          }, 0);

        const currentDebt = round2(Math.max(0, spent + pendingInstallmentsDebt - paid));
        const availableCredit = round2(Math.max(0, creditLimit - currentDebt));
        const utilizationPercentage = creditLimit > 0 ? Math.min(100, Math.round((currentDebt / creditLimit) * 100)) : 0;

        // High utilization alert
        if (utilizationPercentage >= 80) {
          activeAlerts.push({
            id: 9000 + c.id,
            title: `⚠️ Límite de Crédito Alto (${c.name})`,
            description: `Has alcanzado el ${utilizationPercentage}% de tu límite en ${c.name}. Deuda: Q ${currentDebt.toFixed(2)} de Q ${creditLimit.toFixed(2)}.`,
            alertType: 'WARNING'
          });
        }

        // Hallazgo 5: Alertas automáticas de fecha de corte y pago (Si la preferencia de alerta de tarjetas está activa)
        if (userPrefs.alertCardDue && c.payment_due_day && currentDebt > 0) {
          const dueDay = c.payment_due_day;
          const diffDays = dueDay - currentDay;

          if (diffDays >= 0 && diffDays <= 5) {
            activeAlerts.push({
              id: 9500 + c.id,
              title: `⏰ Próximo Vencimiento: ${c.name}`,
              description: `El pago de tu tarjeta vence ${diffDays === 0 ? 'HOY' : 'en ' + diffDays + ' días'} (Día ${dueDay}). Saldo a pagar: Q ${currentDebt.toFixed(2)}.`,
              alertType: diffDays <= 1 ? 'DANGER' : 'WARNING'
            });
          } else if (diffDays < 0 && Math.abs(diffDays) <= 5) {
            activeAlerts.push({
              id: 9500 + c.id,
              title: `🚨 Pago Vencido: ${c.name}`,
              description: `La fecha límite de pago fue el día ${dueDay}. Tienes un saldo pendiente de Q ${currentDebt.toFixed(2)}.`,
              alertType: 'DANGER'
            });
          }
        }

        return {
          id: c.id,
          name: c.name,
          type: c.type,
          cardNumberMask: c.card_number_mask,
          balance: availableCredit,
          initialBalance: creditLimit,
          creditLimit,
          currentDebt,
          availableCredit,
          utilizationPercentage,
          expiryDate: c.expiry_date,
          colorGradient: c.color_gradient || 'rose',
          billingCutDay: c.billing_cut_day,
          paymentDueDay: c.payment_due_day
        };
      } else {
        // DEBIT, SAVINGS, CASH
        const spent = round2((cardExpenses[c.id] || 0) + (cardCreditPaymentsSent[c.id] || 0));
        const paid = cardIncomes[c.id] || 0;
        const balance = round2(initial + paid - spent);

        return {
          id: c.id,
          name: c.name,
          type: c.type,
          cardNumberMask: c.card_number_mask,
          balance,
          initialBalance: initial,
          creditLimit: 0,
          currentDebt: 0,
          availableCredit: Math.max(0, balance),
          utilizationPercentage: 0,
          expiryDate: c.expiry_date,
          colorGradient: c.color_gradient || 'cyan',
          billingCutDay: null,
          paymentDueDay: null
        };
      }
    });

    // Hallazgos 1 y 2: Saldo total líquido (efectivo + cuentas bancarias de débito/ahorro)
    const totalBankBalances = tarjetas
      .filter(t => t.type !== 'CREDIT')
      .reduce((sum, t) => round2(sum + t.balance), 0);

    const saldoTotalLiquido = round2(saldoEfectivo + totalBankBalances);

    // Hallazgo 8: Múltiples Metas de Ahorro y Aislamiento de Fondos
    const metasAhorro: SavingsGoalResponse[] = savingsGoals.map(g => {
      const target = round2(parseFloat(g.target_amount));
      const current = round2(parseFloat(g.current_amount));
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return {
        id: g.id,
        name: g.name || 'Meta de Ahorro',
        category: g.category || 'Ahorro',
        targetAmount: target,
        currentAmount: current,
        percentage: pct,
        colorGradient: g.color_gradient || 'purple',
        targetDate: g.target_date || null,
        status: g.status
      };
    });

    const saldoAhorrado = metasAhorro.reduce((acc, g) => round2(acc + g.currentAmount), 0);
    // El saldo libre para gastos comunes excluye el dinero apartado en metas de ahorro
    const saldoDisponible = round2(saldoTotalLiquido - saldoAhorrado);

    if (saldoAhorrado > saldoTotalLiquido) {
      activeAlerts.push({
        id: 7900,
        title: '⚠️ Fondos de Ahorro Comprometidos',
        description: `Tienes Q ${saldoAhorrado.toFixed(2)} apartados en metas, lo cual supera tu saldo líquido total (Q ${saldoTotalLiquido.toFixed(2)}).`,
        alertType: 'DANGER'
      });
    }

    const totalTarget = metasAhorro.reduce((acc, g) => round2(acc + g.targetAmount), 0);
    const metaAhorro = {
      target: totalTarget > 0 ? totalTarget : 10000,
      current: saldoAhorrado,
      percentage: totalTarget > 0 ? Math.min(100, Math.round((saldoAhorrado / totalTarget) * 100)) : 0
    };

    // Hallazgo 9: Gastos Fijos Recurrentes y Alertas de Vencimiento
    const gastosRecurrentes: RecurringExpenseResponse[] = rawRecurring.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      amount: round2(parseFloat(r.amount)),
      sourceCardId: r.source_card_id,
      paymentMethodName: r.payment_method_name || 'Efectivo en Mano / Caja',
      billingDay: r.billing_day,
      isActive: r.is_active,
      lastChargedMonth: r.last_charged_month,
      isChargedThisMonth: r.last_charged_month === currentYearMonth
    }));

    gastosRecurrentes.forEach(r => {
      if (!r.isChargedThisMonth) {
        const diff = r.billingDay - currentDay;
        if (diff >= 0 && diff <= 4) {
          activeAlerts.push({
            id: 8500 + r.id,
            title: `⏰ Gasto Fijo Próximo: ${r.title}`,
            description: `Q ${r.amount.toFixed(2)} programado para el día ${r.billingDay} (${diff === 0 ? 'HOY' : 'en ' + diff + ' días'}).`,
            alertType: diff <= 1 ? 'DANGER' : 'WARNING'
          });
        } else if (diff < 0) {
          activeAlerts.push({
            id: 8500 + r.id,
            title: `⚠️ Gasto Fijo Pendiente: ${r.title}`,
            description: `Q ${r.amount.toFixed(2)} correspondía al día ${r.billingDay} y aún no ha sido aplicado en ${monthLabels[currentMonthIdx]}.`,
            alertType: 'WARNING'
          });
        }
      }
    });

    // Hallazgo 10: Realidad Salarial Guatemalteca (Bono 14 Decreto 42-92 y Aguinaldo Decreto 76-78)
    let salaryBase = userSalary && userSalary > 0 ? round2(userSalary) : 0;
    if (salaryBase === 0) {
      const salaryTx = transactions.find(t =>
        t.type === 'INCOME' && (
          t.category.toLowerCase().includes('salario') ||
          t.category.toLowerCase().includes('nómina') ||
          t.category.toLowerCase().includes('nomina') ||
          t.title.toLowerCase().includes('salario') ||
          t.title.toLowerCase().includes('sueldo') ||
          t.title.toLowerCase().includes('quincena') ||
          t.title.toLowerCase().includes('planilla')
        )
      );
      if (salaryTx) {
        const amt = round2(parseFloat(salaryTx.amount));
        if (salaryTx.title.toLowerCase().includes('quincen') || salaryTx.title.toLowerCase().includes('15')) {
          salaryBase = round2(amt * 2);
        } else {
          salaryBase = amt;
        }
      } else {
        salaryBase = 4500.00; // Salario promedio estimado
      }
    }

    // Bono 14: 15 de Julio
    let bonoDate = new Date(currentYear, 6, 15);
    if (now > bonoDate && (now.getMonth() > 6 || (now.getMonth() === 6 && now.getDate() > 15))) {
      bonoDate = new Date(currentYear + 1, 6, 15);
    }
    const diasBono14 = Math.max(0, Math.ceil((bonoDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const esMesBono14 = now.getMonth() === 6;

    // Aguinaldo: 15 de Diciembre
    let aguinaldoDate = new Date(currentYear, 11, 15);
    if (now > aguinaldoDate && (now.getMonth() > 11 || (now.getMonth() === 11 && now.getDate() > 15))) {
      aguinaldoDate = new Date(currentYear + 1, 11, 15);
    }
    const diasAguinaldo = Math.max(0, Math.ceil((aguinaldoDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const esMesAguinaldo = now.getMonth() === 11;

    let alertaEstacional: { tipo: 'BONO14' | 'AGUINALDO'; titulo: string; mensaje: string } | null = null;
    if (esMesBono14 || (now.getMonth() === 5 && now.getDate() >= 15)) {
      alertaEstacional = {
        tipo: 'BONO14',
        titulo: '🇬🇹 ¡Temporada de Bono 14 (Decreto 42-92)!',
        mensaje: `De acuerdo a la ley guatemalteca, te corresponde el 100% de tu salario ordinario (estimado Q ${salaryBase.toFixed(2)}) a más tardar el 15 de julio.`
      };
      if (userPrefs.alertLegalBenefits) {
        activeAlerts.push({
          id: 7001,
          title: alertaEstacional.titulo,
          description: alertaEstacional.mensaje,
          alertType: 'INFO'
        });
      }
    } else if (esMesAguinaldo || (now.getMonth() === 10 && now.getDate() >= 15)) {
      alertaEstacional = {
        tipo: 'AGUINALDO',
        titulo: '🎄 ¡Temporada de Aguinaldo (Decreto 76-78)!',
        mensaje: `De acuerdo a la ley guatemalteca, te corresponde el pago de tu aguinaldo (estimado Q ${salaryBase.toFixed(2)}) en la primera quincena de diciembre.`
      };
      if (userPrefs.alertLegalBenefits) {
        activeAlerts.push({
          id: 7002,
          title: alertaEstacional.titulo,
          description: alertaEstacional.mensaje,
          alertType: 'INFO'
        });
      }
    }

    // Alerta de Límite de Presupuesto (Regla del 80%) si está activa
    if (userPrefs.alertBudgetLimit && salaryBase > 0 && currentMonthExpense >= salaryBase * 0.8) {
      const pct = Math.round((currentMonthExpense / salaryBase) * 100);
      activeAlerts.push({
        id: 8500,
        title: `⚠️ Alerta de Presupuesto (${pct}%)`,
        description: `Tus gastos del mes (Q ${currentMonthExpense.toFixed(2)}) alcanzaron el ${pct}% de tu salario base configurado (Q ${salaryBase.toFixed(2)}).`,
        alertType: pct >= 100 ? 'DANGER' : 'WARNING'
      });
    }

    // Alerta de Gastos Fijos Recurrentes si está activa
    if (userPrefs.alertFixedExpenses) {
      const pendingFixed = rawRecurring.filter(r => r.is_active && r.last_charged_month !== currentYearMonth);
      if (pendingFixed.length > 0 && currentDay <= 10) {
        const pendingTotal = pendingFixed.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        activeAlerts.push({
          id: 8600,
          title: `⏰ Recordatorio: ${pendingFixed.length} Gastos Fijos Pendientes`,
          description: `Tienes ${pendingFixed.length} compromisos fijos del mes por pagar (Q ${pendingTotal.toFixed(2)}). Puedes aplicarlos en 1 clic desde Presupuestos.`,
          alertType: 'INFO'
        });
      }
    }

    const prestacionesLey: PrestacionesLeyResponse = {
      salarioBase: salaryBase,
      bono14: {
        fechaPago: '15 de julio',
        montoEstimado: salaryBase,
        diasRestantes: diasBono14,
        esMesActual: esMesBono14
      },
      aguinaldo: {
        fechaPago: '15 de diciembre',
        montoEstimado: salaryBase,
        diasRestantes: diasAguinaldo,
        esMesActual: esMesAguinaldo
      },
      alertaEstacional
    };

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

    const transaccionesRecientes = transactions.map((tx) => ({
      id: tx.id,
      title: tx.title,
      merchant: tx.merchant || (tx.type === 'CREDIT_PAYMENT' ? 'Pago de Tarjeta' : 'Comercio Registrado'),
      category: tx.category,
      date: tx.date,
      status: tx.status,
      amount: round2(parseFloat(tx.amount)),
      type: tx.type,
      sourceCardId: tx.source_card_id,
      destinationCardId: tx.destination_card_id
    }));

    const dismissedIds = new Set(await this.repo.getDismissedAlertIds(userId));
    const filteredAlerts = activeAlerts.filter(a => !dismissedIds.has(a.id));

    return {
      saldoDisponible,
      saldoEfectivo,
      saldoAhorrado,
      saldoTotalLiquido,
      gastosMes: currentMonthExpense,
      gastosTotales: totalExpense,
      ingresosMes: currentMonthIncome,
      ingresosTotales: totalIncome,
      metaAhorro,
      metasAhorro,
      gastosRecurrentes,
      prestacionesLey,
      tendencias: {
        semana: semanaPoints,
        mes: mesPoints,
        ano: anoPoints
      },
      transaccionesRecientes,
      gastosPorCategoria,
      alertas: filteredAlerts,
      tarjetas,
      preferenciasAlertas: userPrefs
    };
  }

  async createIncome(userId: number, data: {
    title: string;
    merchant?: string;
    category: string;
    amount: number;
    date?: string;
    cardId?: number | null;
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
    if (data.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        throw new AppError(400, 'El formato de fecha debe ser YYYY-MM-DD.');
      }
      const todayStr = new Date().toLocaleDateString('en-CA');
      if (data.date > todayStr) {
        throw new AppError(400, 'No es posible registrar un ingreso con fecha posterior al día de hoy.');
      }
    }

    const cards = await this.repo.getCardsByUserId(userId);
    let destinationCardId: number | null = null;

    if (data.cardId) {
      const found = cards.find(c => c.id === data.cardId);
      if (found) destinationCardId = found.id;
    } else if (data.merchant) {
      const matched = this.findMatchedCard(cards, data.merchant);
      if (matched) destinationCardId = matched.id;
    }

    return await this.repo.createTransaction(userId, {
      type: 'INCOME',
      title: data.title.trim(),
      merchant: data.merchant?.trim() || (destinationCardId ? 'Cuenta Bancaria' : 'Efectivo en Mano / Caja'),
      category: data.category.trim(),
      amount: round2(data.amount),
      status: 'COMPLETED',
      date: data.date || null,
      destinationCardId
    });
  }

  async createExpense(userId: number, data: {
    title: string;
    merchant?: string;
    category: string;
    amount: number;
    date?: string;
    installments?: number;
    cardId?: number | null;
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
    if (data.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        throw new AppError(400, 'El formato de fecha debe ser YYYY-MM-DD.');
      }
      const todayStr = new Date().toLocaleDateString('en-CA');
      if (data.date > todayStr) {
        throw new AppError(400, 'No es posible registrar un gasto con fecha posterior al día de hoy.');
      }
    }

    const expenseAmount = round2(data.amount);
    const merchantText = data.merchant?.trim() || 'Comercio Registrado';
    const cards = await this.repo.getCardsByUserId(userId);

    let matchedCard: CardAccountRow | undefined;
    if (data.cardId) {
      matchedCard = cards.find(c => c.id === data.cardId);
    } else {
      matchedCard = this.findMatchedCard(cards, merchantText);
    }

    const isCredit = matchedCard?.type === 'CREDIT';

    // Get current stats for precise account and savings validation
    const stats = await this.getDashboardStats(userId);

    const installmentCount = data.installments && data.installments > 1 ? Math.round(data.installments) : 1;

    if (installmentCount > 1 && !isCredit) {
      throw new AppError(400, 'Las compras en cuotas (Visacuotas / Cuotas BAC) solo están disponibles para Tarjetas de Crédito.');
    }

    if (isCredit && matchedCard) {
      // CREDIT CARD VALIDATION (Hallazgo 6 & límite)
      const targetCard = stats.tarjetas.find(t => t.id === matchedCard.id);
      const availableCredit = targetCard?.availableCredit ?? 0;
      const creditLimit = targetCard?.creditLimit ?? 8000;

      if (expenseAmount > availableCredit) {
        throw new AppError(
          400,
          `Límite de crédito excedido: tu crédito disponible en "${matchedCard.name}" es de Q ${availableCredit.toFixed(2)}. No puedes registrar una compra de Q ${expenseAmount.toFixed(2)} (Límite total: Q ${creditLimit.toFixed(2)}).`
        );
      }

      if (installmentCount > 1) {
        const monthlyInstallment = round2(expenseAmount / installmentCount);
        const titleWithInstallment = `${data.title.trim()} (Cuota 1/${installmentCount} - Total: Q ${expenseAmount.toFixed(2)})`;

        const tx = await this.repo.createTransaction(userId, {
          type: 'EXPENSE',
          title: titleWithInstallment,
          merchant: matchedCard.name,
          category: data.category.trim(),
          amount: monthlyInstallment,
          status: 'COMPLETED',
          date: data.date || null,
          sourceCardId: matchedCard.id
        });

        await this.repo.createInstallmentPlan(userId, {
          transactionId: tx.id,
          cardId: matchedCard.id,
          totalAmount: expenseAmount,
          installmentCount: installmentCount,
          installmentAmount: monthlyInstallment,
          installmentsPaid: 1,
          startDate: data.date || null
        });

        return tx;
      }

      return await this.repo.createTransaction(userId, {
        type: 'EXPENSE',
        title: data.title.trim(),
        merchant: matchedCard.name,
        category: data.category.trim(),
        amount: expenseAmount,
        status: 'COMPLETED',
        date: data.date || null,
        sourceCardId: matchedCard.id
      });
    }

    // Hallazgo 8: Protección de fondos de ahorro para gastos con débito o efectivo
    if (expenseAmount > stats.saldoDisponible) {
      throw new AppError(
        400,
        `Fondos protegidos: este gasto de Q ${expenseAmount.toFixed(2)} comprometería tus metas de ahorro (tienes Q ${stats.saldoAhorrado.toFixed(2)} apartados y tu saldo libre para gastos es de Q ${stats.saldoDisponible.toFixed(2)}). Puedes ajustar tus aportes si deseas usar esos fondos.`
      );
    }

    // CASH / DEBIT / SAVINGS VALIDATION (Hallazgos 1 y 2)
    if (matchedCard) {
      const targetCard = stats.tarjetas.find(t => t.id === matchedCard.id);
      const accountBalance = targetCard?.balance ?? 0;

      if (expenseAmount > accountBalance) {
        throw new AppError(
          400,
          `Fondos insuficientes en "${matchedCard.name}": el saldo actual de esta cuenta es de Q ${accountBalance.toFixed(2)} y no cubre el gasto de Q ${expenseAmount.toFixed(2)}.`
        );
      }

      return await this.repo.createTransaction(userId, {
        type: 'EXPENSE',
        title: data.title.trim(),
        merchant: matchedCard.name,
        category: data.category.trim(),
        amount: expenseAmount,
        status: 'COMPLETED',
        date: data.date || null,
        sourceCardId: matchedCard.id
      });
    }

    // Efectivo en Mano / Caja (Hallazgo 2)
    const saldoEfectivo = stats.saldoEfectivo;
    if (expenseAmount > saldoEfectivo) {
      throw new AppError(
        400,
        `Efectivo insuficiente: tu saldo disponible en efectivo es de Q ${saldoEfectivo.toFixed(2)}. No puedes registrar un gasto en efectivo de Q ${expenseAmount.toFixed(2)} (no se permiten saldos negativos).`
      );
    }

    return await this.repo.createTransaction(userId, {
      type: 'EXPENSE',
      title: data.title.trim(),
      merchant: 'Efectivo en Mano / Caja',
      category: data.category.trim(),
      amount: expenseAmount,
      status: 'COMPLETED',
      date: data.date || null,
      sourceCardId: null
    });
  }

  // Hallazgo 4: Pago de Tarjeta de Crédito
  async createCreditPayment(userId: number, data: {
    creditCardId: number;
    amount: number;
    sourceCardId?: number | null;
    date?: string;
  }) {
    if (!data.creditCardId || isNaN(data.creditCardId)) {
      throw new AppError(400, 'Debe especificar la tarjeta de crédito a pagar.');
    }
    if (data.amount === undefined || isNaN(data.amount) || data.amount <= 0) {
      throw new AppError(400, 'El monto del pago debe ser mayor a cero.');
    }

    const cards = await this.repo.getCardsByUserId(userId);
    const targetCreditCard = cards.find(c => c.id === data.creditCardId && c.type === 'CREDIT');
    if (!targetCreditCard) {
      throw new AppError(404, 'La tarjeta de crédito especificada no existe o no pertenece al usuario.');
    }

    const stats = await this.getDashboardStats(userId);
    const creditCardStats = stats.tarjetas.find(t => t.id === targetCreditCard.id);
    const currentDebt = creditCardStats?.currentDebt ?? 0;
    const paymentAmount = round2(data.amount);

    if (currentDebt <= 0) {
      throw new AppError(400, `La tarjeta "${targetCreditCard.name}" no tiene saldo deudor pendiente.`);
    }
    if (paymentAmount > currentDebt) {
      throw new AppError(400, `El monto ingresado (Q ${paymentAmount.toFixed(2)}) supera la deuda total de la tarjeta (Q ${currentDebt.toFixed(2)}).`);
    }

    let sourceCardId: number | null = null;
    let paymentMethodName = 'Efectivo en Mano / Caja';

    if (data.sourceCardId) {
      const sourceDebitCard = cards.find(c => c.id === data.sourceCardId && c.type !== 'CREDIT');
      if (!sourceDebitCard) {
        throw new AppError(404, 'La cuenta bancaria de origen no existe o es inválida.');
      }
      const debitStats = stats.tarjetas.find(t => t.id === sourceDebitCard.id);
      const debitBalance = debitStats?.balance ?? 0;

      if (paymentAmount > debitBalance) {
        throw new AppError(
          400,
          `Fondos insuficientes en "${sourceDebitCard.name}": el saldo actual es de Q ${debitBalance.toFixed(2)} y no cubre el pago de Q ${paymentAmount.toFixed(2)}.`
        );
      }

      sourceCardId = sourceDebitCard.id;
      paymentMethodName = sourceDebitCard.name;
    } else {
      if (paymentAmount > stats.saldoEfectivo) {
        throw new AppError(
          400,
          `Efectivo insuficiente: dispones de Q ${stats.saldoEfectivo.toFixed(2)} en efectivo y no cubre el pago de Q ${paymentAmount.toFixed(2)}.`
        );
      }
    }

    return await this.repo.createTransaction(userId, {
      type: 'CREDIT_PAYMENT',
      title: `Pago Tarjeta de Crédito: ${targetCreditCard.name}`,
      merchant: paymentMethodName,
      category: 'Pago de Tarjeta',
      amount: paymentAmount,
      status: 'COMPLETED',
      date: data.date || null,
      sourceCardId,
      destinationCardId: targetCreditCard.id
    });
  }

  async updateTransaction(id: number, userId: number, data: {
    title?: string;
    merchant?: string;
    category?: string;
    amount?: number;
    date?: string;
  }) {
    if (!id || isNaN(id) || !userId) {
      throw new AppError(400, 'ID de transacción o usuario inválido.');
    }

    const existingTx = await this.repo.getTransactionById(id, userId);
    if (!existingTx) {
      throw new AppError(404, 'No se encontró la transacción o no tienes permisos para editarla.');
    }

    if (data.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        throw new AppError(400, 'El formato de fecha debe ser YYYY-MM-DD.');
      }
      const todayStr = new Date().toLocaleDateString('en-CA');
      if (data.date > todayStr) {
        throw new AppError(400, 'No es posible registrar una transacción con fecha posterior al día de hoy.');
      }
    }

    if (data.amount !== undefined) {
      if (isNaN(data.amount) || data.amount <= 0) {
        throw new AppError(400, 'El monto debe ser un número mayor a cero.');
      }

      const oldAmount = round2(parseFloat(existingTx.amount));
      const newAmount = round2(data.amount);
      const stats = await this.getDashboardStats(userId);
      const cards = await this.repo.getCardsByUserId(userId);

      if (existingTx.type === 'EXPENSE') {
        const diff = round2(newAmount - oldAmount);
        if (diff > 0) {
          let matchedCard: CardAccountRow | undefined;
          if (existingTx.source_card_id) {
            matchedCard = cards.find(c => c.id === existingTx.source_card_id);
          } else {
            matchedCard = this.findMatchedCard(cards, existingTx.merchant);
          }

          if (matchedCard?.type === 'CREDIT') {
            const tc = stats.tarjetas.find(t => t.id === matchedCard.id);
            const available = tc?.availableCredit ?? 0;
            if (diff > available) {
              throw new AppError(400, `Límite de crédito excedido: aumentar este gasto superaría el límite de "${matchedCard.name}".`);
            }
          } else if (matchedCard) {
            const cardStats = stats.tarjetas.find(t => t.id === matchedCard.id);
            const bal = cardStats?.balance ?? 0;
            if (diff > bal) {
              throw new AppError(400, `Fondos insuficientes en "${matchedCard.name}": saldo actual Q ${bal.toFixed(2)}.`);
            }
          } else {
            if (diff > stats.saldoEfectivo) {
              throw new AppError(400, `Efectivo insuficiente: aumentar este gasto supera tu efectivo disponible (Q ${stats.saldoEfectivo.toFixed(2)}).`);
            }
          }
        }
      } else if (existingTx.type === 'INCOME') {
        const decrease = round2(oldAmount - newAmount);
        if (decrease > 0 && decrease > stats.saldoDisponible) {
          throw new AppError(
            400,
            `No es posible reducir este ingreso en Q ${decrease.toFixed(2)} porque tus gastos y ahorros dependen de estos fondos.`
          );
        }
      }
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

    const existingTx = await this.repo.getTransactionById(id, userId);
    if (existingTx && existingTx.type === 'INCOME') {
      const incomeAmt = round2(parseFloat(existingTx.amount));
      const stats = await this.getDashboardStats(userId);
      if (incomeAmt > stats.saldoDisponible) {
        throw new AppError(
          400,
          `No es posible eliminar este ingreso de Q ${incomeAmt.toFixed(2)} porque tus gastos y ahorros dependen de estos fondos.`
        );
      }
    }

    const success = await this.repo.deleteTransactionById(id, userId);
    if (!success) {
      throw new AppError(404, 'No se encontró la transacción o no tienes permisos para eliminarla.');
    }
    return true;
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
  }) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new AppError(400, 'El nombre de la tarjeta o cuenta es obligatorio.');
    }
    if (data.initialBalance !== undefined && (isNaN(data.initialBalance) || data.initialBalance < 0)) {
      throw new AppError(400, 'El monto asignado debe ser un número positivo.');
    }
    if (data.billingCutDay !== undefined && data.billingCutDay !== null && (data.billingCutDay < 1 || data.billingCutDay > 31)) {
      throw new AppError(400, 'El día de corte debe ser un número entre 1 y 31.');
    }
    if (data.paymentDueDay !== undefined && data.paymentDueDay !== null && (data.paymentDueDay < 1 || data.paymentDueDay > 31)) {
      throw new AppError(400, 'El día de pago debe ser un número entre 1 y 31.');
    }

    const cardType = data.type || 'DEBIT';
    const initialBal = data.initialBalance !== undefined && !isNaN(data.initialBalance)
      ? round2(data.initialBalance)
      : (cardType === 'CREDIT' ? 8000.00 : 0);

    return await this.repo.createCard(userId, {
      name: data.name.trim(),
      type: cardType,
      cardNumberMask: data.cardNumberMask?.trim(),
      initialBalance: initialBal,
      expiryDate: data.expiryDate?.trim() || '12/29',
      colorGradient: data.colorGradient || (cardType === 'CREDIT' ? 'rose' : 'cyan'),
      billingCutDay: data.billingCutDay || null,
      paymentDueDay: data.paymentDueDay || null
    });
  }

  async deleteCard(userId: number, cardId: number): Promise<boolean> {
    if (!cardId || isNaN(cardId)) {
      throw new AppError(400, 'ID de tarjeta o cuenta inválido.');
    }
    const success = await this.repo.deleteCard(userId, cardId);
    if (!success) {
      throw new AppError(404, 'Tarjeta o cuenta no encontrada o no pertenece al usuario.');
    }
    return true;
  }

  async getCards(userId: number): Promise<CardAccountResponse[]> {
    const stats = await this.getDashboardStats(userId);
    return stats.tarjetas;
  }

  // --- Hallazgo 8: Métodos de Metas de Ahorro ---
  async getSavingsGoals(userId: number): Promise<SavingsGoalResponse[]> {
    const stats = await this.getDashboardStats(userId);
    return stats.metasAhorro;
  }

  async createSavingsGoal(userId: number, data: {
    name: string;
    targetAmount: number;
    initialAmount?: number;
    category?: string;
    colorGradient?: string;
    targetDate?: string | null;
  }) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new AppError(400, 'El nombre de la meta de ahorro es obligatorio.');
    }
    if (data.targetAmount === undefined || isNaN(data.targetAmount) || data.targetAmount <= 0) {
      throw new AppError(400, 'El monto objetivo de la meta debe ser mayor a cero.');
    }

    const initialAmount = data.initialAmount !== undefined ? round2(data.initialAmount) : 0;
    if (initialAmount < 0) {
      throw new AppError(400, 'El monto inicial no puede ser negativo.');
    }

    if (initialAmount > 0) {
      const stats = await this.getDashboardStats(userId);
      if (initialAmount > stats.saldoDisponible) {
        throw new AppError(
          400,
          `Saldo libre insuficiente: tu saldo disponible para apartar es de Q ${stats.saldoDisponible.toFixed(2)}. No puedes apartar Q ${initialAmount.toFixed(2)}.`
        );
      }
    }

    return await this.repo.createSavingsGoal(userId, {
      name: data.name.trim(),
      targetAmount: round2(data.targetAmount),
      currentAmount: initialAmount,
      category: data.category?.trim() || 'Ahorro',
      colorGradient: data.colorGradient || 'purple',
      targetDate: data.targetDate || null
    });
  }

  async contributeToSavingsGoal(userId: number, goalId: number, data: { amount: number }) {
    if (!goalId || isNaN(goalId)) {
      throw new AppError(400, 'ID de meta de ahorro inválido.');
    }
    if (data.amount === undefined || isNaN(data.amount) || data.amount <= 0) {
      throw new AppError(400, 'El monto a aportar debe ser un número mayor a cero.');
    }

    const goal = await this.repo.getSavingsGoalById(goalId, userId);
    if (!goal) {
      throw new AppError(404, 'Meta de ahorro no encontrada o no pertenece al usuario.');
    }

    const stats = await this.getDashboardStats(userId);
    const amount = round2(data.amount);
    if (amount > stats.saldoDisponible) {
      throw new AppError(
        400,
        `Saldo libre insuficiente: tu saldo disponible para apartar es de Q ${stats.saldoDisponible.toFixed(2)}. No puedes apartar Q ${amount.toFixed(2)}.`
      );
    }

    const newAmount = round2(parseFloat(goal.current_amount) + amount);
    return await this.repo.updateSavingsGoalAmount(goalId, userId, newAmount);
  }

  async withdrawFromSavingsGoal(userId: number, goalId: number, data: { amount: number }) {
    if (!goalId || isNaN(goalId)) {
      throw new AppError(400, 'ID de meta de ahorro inválido.');
    }
    if (data.amount === undefined || isNaN(data.amount) || data.amount <= 0) {
      throw new AppError(400, 'El monto a retirar debe ser un número mayor a cero.');
    }

    const goal = await this.repo.getSavingsGoalById(goalId, userId);
    if (!goal) {
      throw new AppError(404, 'Meta de ahorro no encontrada o no pertenece al usuario.');
    }

    const currentAmount = round2(parseFloat(goal.current_amount));
    const withdrawAmount = round2(data.amount);
    if (withdrawAmount > currentAmount) {
      throw new AppError(
        400,
        `Fondos insuficientes en la meta: tienes Q ${currentAmount.toFixed(2)} ahorrados en "${goal.name}". No puedes retirar Q ${withdrawAmount.toFixed(2)}.`
      );
    }

    const newAmount = round2(currentAmount - withdrawAmount);
    return await this.repo.updateSavingsGoalAmount(goalId, userId, newAmount);
  }

  async deleteSavingsGoal(userId: number, goalId: number): Promise<boolean> {
    if (!goalId || isNaN(goalId)) {
      throw new AppError(400, 'ID de meta de ahorro inválido.');
    }
    const goal = await this.repo.getSavingsGoalById(goalId, userId);
    if (!goal) {
      throw new AppError(404, 'Meta de ahorro no encontrada o no pertenece al usuario.');
    }
    return await this.repo.deleteSavingsGoal(goalId, userId);
  }

  // Compatibilidad con endpoint legacy de meta simple
  async updateSavingsGoal(userId: number, data: {
    targetAmount?: number;
    currentAmount?: number;
  }) {
    const goals = await this.repo.getSavingsGoalsByUserId(userId);
    if (goals.length === 0) {
      await this.repo.createSavingsGoal(userId, {
        name: 'Fondo de Emergencia',
        category: 'Emergencia',
        targetAmount: data.targetAmount || 10000,
        currentAmount: data.currentAmount || 0
      });
      return { success: true };
    }
    const primaryGoal = goals[0];
    if (data.currentAmount !== undefined) {
      await this.repo.updateSavingsGoalAmount(primaryGoal.id, userId, round2(data.currentAmount));
    }
    return { success: true };
  }

  // --- Hallazgo 9: Métodos de Gastos Fijos Recurrentes ---
  async getRecurringExpenses(userId: number): Promise<RecurringExpenseResponse[]> {
    const stats = await this.getDashboardStats(userId);
    return stats.gastosRecurrentes;
  }

  async createRecurringExpense(userId: number, data: {
    title: string;
    category: string;
    amount: number;
    sourceCardId?: number | null;
    paymentMethodName?: string;
    billingDay: number;
  }) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new AppError(400, 'El nombre del servicio o gasto fijo es obligatorio.');
    }
    if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
      throw new AppError(400, 'La categoría del gasto fijo es obligatoria.');
    }
    if (data.amount === undefined || isNaN(data.amount) || data.amount <= 0) {
      throw new AppError(400, 'El monto del gasto fijo debe ser un número mayor a cero.');
    }
    if (data.billingDay === undefined || isNaN(data.billingDay) || data.billingDay < 1 || data.billingDay > 31) {
      throw new AppError(400, 'El día de pago programado debe estar entre 1 y 31.');
    }

    let paymentMethod = data.paymentMethodName || 'Efectivo en Mano / Caja';
    if (data.sourceCardId) {
      const cards = await this.repo.getCardsByUserId(userId);
      const found = cards.find(c => c.id === data.sourceCardId);
      if (found) {
        paymentMethod = found.name;
      }
    }

    return await this.repo.createRecurringExpense(userId, {
      title: data.title.trim(),
      category: data.category.trim(),
      amount: round2(data.amount),
      sourceCardId: data.sourceCardId || null,
      paymentMethodName: paymentMethod,
      billingDay: Math.round(data.billingDay)
    });
  }

  async applyRecurringExpenses(userId: number, yearMonth?: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const targetMonth = yearMonth && /^\d{4}-\d{2}$/.test(yearMonth) ? yearMonth : `${currentYear}-${currentMonth}`;

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [tYearStr, tMonthStr] = targetMonth.split('-');
    const tYear = parseInt(tYearStr, 10);
    const tMonthIdx = parseInt(tMonthStr, 10) - 1;
    const monthLabel = monthNames[tMonthIdx] || targetMonth;

    const rawExpenses = await this.repo.getRecurringExpenses(userId);
    const pending = rawExpenses.filter(r => r.last_charged_month !== targetMonth);

    if (pending.length === 0) {
      return {
        appliedCount: 0,
        totalAmount: 0,
        message: `Todos los gastos fijos de ${monthLabel} ${tYear} ya se encuentran aplicados.`,
        transactions: []
      };
    }

    const cards = await this.repo.getCardsByUserId(userId);
    const createdTransactions = [];
    let totalApplied = 0;

    for (const exp of pending) {
      const amt = round2(parseFloat(exp.amount));
      const day = Math.min(exp.billing_day, 28);
      const txDate = `${targetMonth}-${String(day).padStart(2, '0')}`;
      const todayStr = now.toLocaleDateString('en-CA');
      const finalDate = txDate > todayStr ? todayStr : txDate;

      let matchedCard = exp.source_card_id ? cards.find(c => c.id === exp.source_card_id) : undefined;
      const tx = await this.repo.createTransaction(userId, {
        type: 'EXPENSE',
        title: `${exp.title} (${monthLabel} ${tYear})`,
        merchant: exp.payment_method_name || (matchedCard ? matchedCard.name : 'Efectivo en Mano / Caja'),
        category: exp.category,
        amount: amt,
        status: 'COMPLETED',
        date: finalDate,
        sourceCardId: matchedCard ? matchedCard.id : null
      });

      await this.repo.updateRecurringExpenseLastChargedMonth(exp.id, userId, targetMonth);
      createdTransactions.push(tx);
      totalApplied = round2(totalApplied + amt);
    }

    return {
      appliedCount: createdTransactions.length,
      totalAmount: totalApplied,
      message: `Se aplicaron exitosamente ${createdTransactions.length} gastos fijos de ${monthLabel} ${tYear} por un total de Q ${totalApplied.toFixed(2)}.`,
      transactions: createdTransactions
    };
  }

  async deleteRecurringExpense(userId: number, id: number): Promise<boolean> {
    if (!id || isNaN(id)) {
      throw new AppError(400, 'ID de gasto fijo inválido.');
    }
    const success = await this.repo.deleteRecurringExpense(id, userId);
    if (!success) {
      throw new AppError(404, 'Gasto fijo no encontrado o no pertenece al usuario.');
    }
    return true;
  }

  // --- Hallazgo 10: Métodos de Salario Base y Prestaciones ---
  async getUserSalaryProfile(userId: number) {
    const stats = await this.getDashboardStats(userId);
    return {
      salarioBase: stats.prestacionesLey.salarioBase,
      prestaciones: stats.prestacionesLey
    };
  }

  async updateUserSalaryProfile(userId: number, salary: number) {
    if (salary === undefined || isNaN(salary) || salary <= 0) {
      throw new AppError(400, 'El salario base mensual debe ser un número mayor a cero.');
    }
    await this.repo.updateUserSalary(userId, round2(salary));
    return await this.getUserSalaryProfile(userId);
  }

  async dismissAlert(userId: number, alertId: number): Promise<boolean> {
    if (!alertId || isNaN(alertId)) {
      throw new AppError(400, 'ID de alerta inválido.');
    }
    await this.repo.dismissAlert(userId, alertId);
    return true;
  }

  async getUserPreferences(userId: number) {
    return await this.repo.getUserPreferences(userId);
  }

  async updateUserPreferences(userId: number, prefs: {
    alertCardDue?: boolean;
    alertBudgetLimit?: boolean;
    alertFixedExpenses?: boolean;
    alertLegalBenefits?: boolean;
  }) {
    return await this.repo.updateUserPreferences(userId, prefs);
  }

  async getCompleteUserDataBackup(userId: number) {
    return await this.repo.getFullUserBackupData(userId);
  }

  async restoreBackup(userId: number, backupData: any, mode: 'REPLACE' | 'MERGE' = 'REPLACE') {
    return await this.repo.restoreUserBackupData(userId, backupData, mode);
  }

  // --- Métodos de Categorías ---
  async getCategories(userId: number, type?: string) {
    const categories = await this.repo.getCategoriesByUserId(userId, type);
    return categories.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isSystem: c.is_system,
      transactionCount: c.transaction_count || 0,
      monthlyAmount: parseFloat(c.monthly_amount?.toString() || '0'),
      createdAt: c.created_at
    }));
  }

  async createCategory(userId: number, data: { name: string; type: 'EXPENSE' | 'INCOME'; icon?: string; color?: string; }) {
    if (!data.name || !data.name.trim()) {
      throw new AppError(400, 'El nombre de la categoría es obligatorio.');
    }
    if (!data.type || (data.type !== 'EXPENSE' && data.type !== 'INCOME')) {
      throw new AppError(400, 'El tipo de categoría debe ser EXPENSE o INCOME.');
    }
    try {
      const created = await this.repo.createCategory(userId, data);
      return {
        id: created.id,
        name: created.name,
        type: created.type,
        icon: created.icon,
        color: created.color,
        isSystem: created.is_system,
        createdAt: created.created_at
      };
    } catch (err: any) {
      if (err.code === '23505') {
        throw new AppError(409, `Ya existe una categoría de ${data.type === 'INCOME' ? 'ingreso' : 'gasto'} con el nombre "${data.name.trim()}".`);
      }
      throw err;
    }
  }

  async updateCategory(userId: number, id: number, data: { name?: string; icon?: string; color?: string; }) {
    if (data.name !== undefined && !data.name.trim()) {
      throw new AppError(400, 'El nombre de la categoría no puede estar vacío.');
    }
    try {
      const updated = await this.repo.updateCategory(userId, id, data);
      if (!updated) {
        throw new AppError(404, 'Categoría no encontrada.');
      }
      return {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        icon: updated.icon,
        color: updated.color,
        isSystem: updated.is_system,
        createdAt: updated.created_at
      };
    } catch (err: any) {
      if (err.code === '23505') {
        throw new AppError(409, `Ya existe una categoría con ese nombre.`);
      }
      throw err;
    }
  }

  async deleteCategory(userId: number, id: number, reassignToName?: string) {
    return await this.repo.deleteCategory(userId, id, reassignToName);
  }
}
