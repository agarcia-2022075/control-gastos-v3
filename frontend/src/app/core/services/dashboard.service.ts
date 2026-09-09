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
  type: 'EXPENSE' | 'INCOME';
}

export interface PaymentAlert {
  id: number;
  title: string;
  description: string;
  alertType: string;
}

export interface DashboardStats {
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
  transaccionesRecientes: RecentTransaction[];
  gastosPorCategoria: CategoryBreakdown[];
  alertas: PaymentAlert[];
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
  }): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.post<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/incomes`, data);
  }

  createExpense(data: {
    title: string;
    category: string;
    amount: number;
    merchant?: string;
    date?: string;
  }): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.post<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/expenses`, data);
  }

  updateSavingsGoal(data: {
    targetAmount?: number;
    currentAmount?: number;
  }): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.patch<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/savings-goal`, data);
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
}
