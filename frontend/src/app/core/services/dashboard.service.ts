import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

export interface RecentTransaction {
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
}

export interface PaymentAlert {
  id: number;
  title: string;
  description: string;
  alertType: string;
}

export interface CardAccount {
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

export interface SavingsGoal {
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

export interface RecurringExpense {
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

export interface PrestacionesLey {
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

export interface CategoryItem {
  id: number;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string;
  color: string;
  isSystem: boolean;
  transactionCount: number;
  monthlyAmount: number;
  createdAt?: string;
}

export interface DashboardStats {
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
  metasAhorro: SavingsGoal[];
  gastosRecurrentes: RecurringExpense[];
  prestacionesLey: PrestacionesLey;
  tendencias: {
    semana: TrendPoint[];
    mes: TrendPoint[];
    ano: TrendPoint[];
  };
  transaccionesRecientes: RecentTransaction[];
  gastosPorCategoria: CategoryBreakdown[];
  alertas: PaymentAlert[];
  tarjetas: CardAccount[];
  preferenciasAlertas?: AlertPreferences;
}

export interface AlertPreferences {
  alertCardDue: boolean;
  alertBudgetLimit: boolean;
  alertFixedExpenses: boolean;
  alertLegalBenefits: boolean;
}

export interface DashboardResponse {
  success: boolean;
  data?: DashboardStats;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getStats(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/stats`);
  }

  createIncome(data: {
    title: string;
    category: string;
    amount: number;
    merchant?: string;
    date?: string;
    cardId?: number | null;
  }): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.post<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/incomes`, data);
  }

  createExpense(data: {
    title: string;
    category: string;
    amount: number;
    merchant?: string;
    date?: string;
    installments?: number;
    cardId?: number | null;
  }): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.post<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/expenses`, data);
  }

  createCreditPayment(data: {
    creditCardId: number;
    sourceCardId?: number | null;
    amount: number;
    date?: string;
  }): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.post<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/credit-payments`, data);
  }

  updateSavingsGoal(data: {
    targetAmount?: number;
    currentAmount?: number;
  }): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.patch<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/savings-goal`, data);
  }

  getCards(): Observable<{ success: boolean; data: CardAccount[] }> {
    return this.http.get<{ success: boolean; data: CardAccount[] }>(`${this.apiUrl}/cards`);
  }

  createCard(data: {
    name: string;
    type?: string;
    cardNumberMask?: string;
    initialBalance?: number;
    expiryDate?: string;
    colorGradient?: string;
    billingCutDay?: number | null;
    paymentDueDay?: number | null;
  }): Observable<{ success: boolean; message: string; data?: CardAccount }> {
    return this.http.post<{ success: boolean; message: string; data?: CardAccount }>(`${this.apiUrl}/cards`, data);
  }

  deleteCard(cardId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/cards/${cardId}`);
  }

  dismissAlert(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/alerts/${id}/dismiss`, {});
  }

  updateTransaction(id: number, data: {
    title?: string;
    category?: string;
    amount?: number;
    merchant?: string;
    date?: string;
  }): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.patch<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/transactions/${id}`, data);
  }

  deleteTransaction(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/transactions/${id}`);
  }

  // --- Hallazgo 8: Metas de Ahorro Múltiples y Fondos Reales ---
  getSavingsGoals(): Observable<{ success: boolean; data: SavingsGoal[] }> {
    return this.http.get<{ success: boolean; data: SavingsGoal[] }>(`${this.apiUrl}/savings-goals`);
  }

  createSavingsGoal(data: {
    name: string;
    targetAmount: number;
    initialAmount?: number;
    category?: string;
    colorGradient?: string;
    targetDate?: string | null;
  }): Observable<{ success: boolean; message: string; data?: SavingsGoal }> {
    return this.http.post<{ success: boolean; message: string; data?: SavingsGoal }>(`${this.apiUrl}/savings-goals`, data);
  }

  contributeToGoal(goalId: number, amount: number): Observable<{ success: boolean; message: string; data?: SavingsGoal }> {
    return this.http.post<{ success: boolean; message: string; data?: SavingsGoal }>(`${this.apiUrl}/savings-goals/${goalId}/contribute`, { amount });
  }

  withdrawFromGoal(goalId: number, amount: number): Observable<{ success: boolean; message: string; data?: SavingsGoal }> {
    return this.http.post<{ success: boolean; message: string; data?: SavingsGoal }>(`${this.apiUrl}/savings-goals/${goalId}/withdraw`, { amount });
  }

  deleteSavingsGoal(goalId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/savings-goals/${goalId}`);
  }

  // --- Hallazgo 9: Gastos Fijos Recurrentes ---
  getRecurringExpenses(): Observable<{ success: boolean; data: RecurringExpense[] }> {
    return this.http.get<{ success: boolean; data: RecurringExpense[] }>(`${this.apiUrl}/recurring-expenses`);
  }

  createRecurringExpense(data: {
    title: string;
    category: string;
    amount: number;
    sourceCardId?: number | null;
    paymentMethodName?: string;
    billingDay: number;
  }): Observable<{ success: boolean; message: string; data?: RecurringExpense }> {
    return this.http.post<{ success: boolean; message: string; data?: RecurringExpense }>(`${this.apiUrl}/recurring-expenses`, data);
  }

  applyRecurringExpenses(month?: string): Observable<{ success: boolean; message: string; appliedCount?: number; totalAmount?: number; data?: any }> {
    return this.http.post<{ success: boolean; message: string; appliedCount?: number; totalAmount?: number; data?: any }>(`${this.apiUrl}/recurring-expenses/apply-month`, { month });
  }

  deleteRecurringExpense(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/recurring-expenses/${id}`);
  }

  // --- Hallazgo 10: Perfil Salarial y Prestaciones de Ley ---
  getSalaryProfile(): Observable<{ success: boolean; data: { salarioBase: number; prestaciones: PrestacionesLey } }> {
    return this.http.get<{ success: boolean; data: { salarioBase: number; prestaciones: PrestacionesLey } }>(`${this.apiUrl}/salary-profile`);
  }

  updateSalaryProfile(salary: number): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.put<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/salary-profile`, { salary });
  }

  // --- Preferencias de Notificaciones & Alertas ---
  getUserPreferences(): Observable<{ success: boolean; data: AlertPreferences }> {
    return this.http.get<{ success: boolean; data: AlertPreferences }>(`${this.apiUrl}/preferences`);
  }

  updateUserPreferences(prefs: Partial<AlertPreferences>): Observable<{ success: boolean; message: string; data: AlertPreferences }> {
    return this.http.put<{ success: boolean; message: string; data: AlertPreferences }>(`${this.apiUrl}/preferences`, prefs);
  }

  // --- Respaldo & Copia de Seguridad Completa ---
  getBackupData(): Observable<{ success: boolean; message: string; data: any }> {
    return this.http.get<{ success: boolean; message: string; data: any }>(`${this.apiUrl}/backup`);
  }

  restoreBackupData(backupData: any, mode: 'REPLACE' | 'APPEND' | 'MERGE' = 'REPLACE'): Observable<{ success: boolean; message: string; stats: any }> {
    return this.http.post<{ success: boolean; message: string; stats: any }>(`${this.apiUrl}/restore`, { backupData, mode });
  }

  // --- Gestión de Categorías Personalizadas ---
  getCategories(type?: 'EXPENSE' | 'INCOME'): Observable<{ success: boolean; data: CategoryItem[] }> {
    const params = type ? `?type=${type}` : '';
    return this.http.get<{ success: boolean; data: CategoryItem[] }>(`${this.apiUrl}/categories${params}`);
  }

  createCategory(data: { name: string; type: 'EXPENSE' | 'INCOME'; icon?: string; color?: string }): Observable<{ success: boolean; message: string; data: CategoryItem }> {
    return this.http.post<{ success: boolean; message: string; data: CategoryItem }>(`${this.apiUrl}/categories`, data);
  }

  updateCategory(id: number, data: { name?: string; icon?: string; color?: string }): Observable<{ success: boolean; message: string; data: CategoryItem }> {
    return this.http.put<{ success: boolean; message: string; data: CategoryItem }>(`${this.apiUrl}/categories/${id}`, data);
  }

  deleteCategory(id: number, reassignToName?: string): Observable<{ success: boolean; message: string; data: any }> {
    const options = reassignToName ? { body: { reassignToName } } : {};
    return this.http.delete<{ success: boolean; message: string; data: any }>(`${this.apiUrl}/categories/${id}`, options);
  }
}
