import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, RecentTransaction, TrendPoint } from '../../core/services/dashboard.service';

export interface TrendDataPoint {
  label: string;
  income: number;
  expense: number;
  x: number;
  incomeY: number;
  expenseY: number;
  percentX: number;
  incomePercentY: number;
  expensePercentY: number;
}

export interface TrendDataSet {
  labels: string[];
  points: TrendDataPoint[];
  incomePath: string;
  incomeLine: string;
  expensePath: string;
  expenseLine: string;
  avgIncome: number;
  avgExpense: number;
  netMargin: number;
  yAxisLabels: string[];
  hasData: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserResponse | null = null;
  stats: DashboardStats | null = null;
  
  loading: boolean = true;
  editing: boolean = false;
  deleting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // UI Navigation & Accordion States
  isCollapsed: boolean = false;
  isTxOpen: boolean = false;

  // Filter States
  activeFilterTrend: 'Semana' | 'Mes' | 'Año' = 'Mes';
  activeFilterTx: 'Todas' | 'Gastos' | 'Ingresos' = 'Todas';

  // Table Search and Pagination States
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 5;

  // Active Tooltip Point on Chart Hover
  hoveredPoint: TrendDataPoint | null = null;

  // Edit Transaction Modal State
  transactionToEdit: RecentTransaction | null = null;
  editTitle: string = '';
  editCategory: string = '';
  editAmount: number | null = null;
  editMerchant: string = '';
  editDate: string = '';

  // Delete Transaction Modal State
  transactionToDelete: RecentTransaction | null = null;

  private mapValueToY(val: number, maxVal: number): number {
    const minY = 160;
    const maxY = 20;
    const effectiveMax = maxVal > 0 ? maxVal : 1;
    const clamped = Math.min(Math.max(val, 0), effectiveMax);
    return minY - (clamped / effectiveMax) * (minY - maxY);
  }

  private generateDataSet(rawPoints: TrendPoint[]): TrendDataSet {
    const viewBoxWidth = 600;
    const startX = 50;
    const endX = 550;
    const availableWidth = endX - startX;
    const step = rawPoints.length > 1 ? availableWidth / (rawPoints.length - 1) : availableWidth;

    let maxVal = 0;
    let hasData = false;
    rawPoints.forEach(p => {
      if (p.income > maxVal) maxVal = p.income;
      if (p.expense > maxVal) maxVal = p.expense;
      if (p.income > 0 || p.expense > 0) hasData = true;
    });

    if (maxVal === 0) maxVal = 1000;
    const roundedMax = Math.ceil(maxVal / 500) * 500;

    const yAxisLabels = [
      `Q ${this.formatK(roundedMax)}`,
      `Q ${this.formatK(roundedMax * 0.75)}`,
      `Q ${this.formatK(roundedMax * 0.5)}`,
      `Q ${this.formatK(roundedMax * 0.25)}`,
      'Q 0'
    ];

    const points: TrendDataPoint[] = rawPoints.map((pt, i) => {
      const x = startX + i * step;
      const percentX = (x / viewBoxWidth) * 100;
      const incomePercentY = (pt.income / roundedMax) * 80 + 10;
      const expensePercentY = (pt.expense / roundedMax) * 80 + 10;

      return {
        label: pt.label,
        income: pt.income,
        expense: pt.expense,
        x,
        incomeY: this.mapValueToY(pt.income, roundedMax),
        expenseY: this.mapValueToY(pt.expense, roundedMax),
        percentX,
        incomePercentY,
        expensePercentY
      };
    });

    const incomePoints = points.map(p => ({ x: p.x, y: p.incomeY }));
    const expensePoints = points.map(p => ({ x: p.x, y: p.expenseY }));

    const incomeLine = this.buildCatmullRomPath(incomePoints);
    const expenseLine = this.buildCatmullRomPath(expensePoints);

    const incomePath = points.length > 0 ? `${incomeLine} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z` : '';
    const expensePath = points.length > 0 ? `${expenseLine} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z` : '';

    const totalInc = rawPoints.reduce((acc, p) => acc + p.income, 0);
    const totalExp = rawPoints.reduce((acc, p) => acc + p.expense, 0);

    const avgIncome = rawPoints.length > 0 ? totalInc / rawPoints.length : 0;
    const avgExpense = rawPoints.length > 0 ? totalExp / rawPoints.length : 0;

    return {
      labels: rawPoints.map(p => p.label),
      points,
      incomePath,
      incomeLine,
      expensePath,
      expenseLine,
      avgIncome,
      avgExpense,
      netMargin: totalInc - totalExp,
      yAxisLabels,
      hasData
    };
  }

  private formatK(val: number): string {
    if (val >= 1000) {
      return (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + 'k';
    }
    return val.toString();
  }

  private buildCatmullRomPath(pts: Array<{ x: number; y: number }>): string {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }

  get currentTrendDataSet(): TrendDataSet {
    if (!this.stats || !this.stats.tendencias) {
      return this.generateDataSet([]);
    }

    let raw: TrendPoint[] = [];
    if (this.activeFilterTrend === 'Semana') {
      raw = this.stats.tendencias.semana || [];
    } else if (this.activeFilterTrend === 'Mes') {
      raw = this.stats.tendencias.mes || [];
    } else {
      raw = this.stats.tendencias.ano || [];
    }

    return this.generateDataSet(raw);
  }

  ngOnInit(): void {
    this.loadUserDataAndStats();
  }

  loadUserDataAndStats(): void {
    this.loading = true;
    this.authService.getCurrentUser().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.currentUser = res.data;
        }
        this.fetchStats();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error cargando datos del usuario.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  fetchStats(): void {
    this.dashboardService.getStats().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.stats = res.data;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Error cargando métricas del dashboard.';
        this.cdr.detectChanges();
      }
    });
  }

  get filteredTransactions() {
    if (!this.stats || !this.stats.transaccionesRecientes) return [];
    let list = this.stats.transaccionesRecientes;
    const filter = this.activeFilterTx;

    if (filter === 'Gastos') {
      list = list.filter(tx => tx.type === 'EXPENSE' || (tx as any).type === 'GASTO' || tx.amount < 0);
    } else if (filter === 'Ingresos') {
      list = list.filter(tx => tx.type === 'INCOME' || (tx as any).type === 'INGRESO' || tx.amount > 0);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      list = list.filter(tx =>
        tx.title.toLowerCase().includes(term) ||
        tx.category.toLowerCase().includes(term) ||
        tx.merchant.toLowerCase().includes(term) ||
        tx.date.includes(term) ||
        tx.amount.toString().includes(term)
      );
    }

    return list;
  }

  get paginatedTransactions(): RecentTransaction[] {
    const list = this.filteredTransactions;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return list.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  // Edit Modal Actions
  openEditModal(tx: RecentTransaction, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.transactionToEdit = tx;
    this.editTitle = tx.title;
    this.editCategory = tx.category;
    this.editAmount = tx.amount;
    this.editMerchant = tx.merchant;
    this.editDate = tx.date;
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.transactionToEdit = null;
    this.editing = false;
    this.cdr.detectChanges();
  }

  confirmEdit(): void {
    if (!this.transactionToEdit) return;
    if (!this.editAmount || this.editAmount <= 0) {
      this.errorMessage = 'Por favor ingresa un monto válido mayor a 0.';
      return;
    }
    if (!this.editTitle.trim()) {
      this.errorMessage = 'Por favor ingresa una descripción.';
      return;
    }

    this.editing = true;
    const id = this.transactionToEdit.id;

    this.dashboardService.updateTransaction(id, {
      title: this.editTitle.trim(),
      category: this.editCategory,
      amount: Number(this.editAmount),
      merchant: this.editMerchant,
      date: this.editDate
    }).subscribe({
      next: (res: any) => {
        this.editing = false;
        if (res.success) {
          this.successMessage = 'Transacción actualizada exitosamente.';
          this.transactionToEdit = null;
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al actualizar la transacción.';
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.editing = false;
        this.errorMessage = err.error?.message || 'Error al actualizar la transacción.';
        this.transactionToEdit = null;
        this.cdr.detectChanges();
      }
    });
  }

  // Delete Modal Actions
  openDeleteModal(tx: RecentTransaction, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.transactionToDelete = tx;
    this.cdr.detectChanges();
  }

  cancelDelete(): void {
    this.transactionToDelete = null;
    this.deleting = false;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.transactionToDelete) return;

    this.deleting = true;
    const id = this.transactionToDelete.id;

    this.dashboardService.deleteTransaction(id).subscribe({
      next: (res) => {
        this.deleting = false;
        if (res.success) {
          this.successMessage = 'Transacción eliminada exitosamente. Tu saldo y estadísticas se han actualizado.';
          this.transactionToDelete = null;
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al eliminar la transacción.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deleting = false;
        this.errorMessage = err.error?.message || 'Error al eliminar la transacción.';
        this.transactionToDelete = null;
        this.cdr.detectChanges();
      }
    });
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleTxSubmenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isTxOpen = !this.isTxOpen;
    this.cdr.detectChanges();
  }

  setTrendFilter(filter: 'Semana' | 'Mes' | 'Año'): void {
    this.activeFilterTrend = filter;
    this.hoveredPoint = null;
    this.cdr.detectChanges();
  }

  setTxFilter(filter: 'Todas' | 'Gastos' | 'Ingresos'): void {
    this.activeFilterTx = filter;
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  onPointHover(pt: TrendDataPoint | null): void {
    this.hoveredPoint = pt;
    this.cdr.detectChanges();
  }

  // Savings Goal Modal State
  isGoalModalOpen: boolean = false;
  editTargetGoal: number = 10000;
  editCurrentGoal: number = 0;
  updatingGoal: boolean = false;

  openEditGoalModal(): void {
    if (this.stats?.metaAhorro) {
      this.editTargetGoal = this.stats.metaAhorro.target;
      this.editCurrentGoal = this.stats.metaAhorro.current;
    }
    this.isGoalModalOpen = true;
    this.cdr.detectChanges();
  }

  cancelEditGoal(): void {
    this.isGoalModalOpen = false;
    this.cdr.detectChanges();
  }

  saveSavingsGoal(): void {
    if (this.editTargetGoal <= 0) {
      this.errorMessage = 'El objetivo de ahorro debe ser mayor a 0.';
      return;
    }
    if (this.editCurrentGoal < 0) {
      this.errorMessage = 'El monto actual no puede ser negativo.';
      return;
    }

    this.updatingGoal = true;
    this.dashboardService.updateSavingsGoal({
      targetAmount: Number(this.editTargetGoal),
      currentAmount: Number(this.editCurrentGoal)
    }).subscribe({
      next: (res) => {
        this.updatingGoal = false;
        this.isGoalModalOpen = false;
        if (res.success) {
          this.successMessage = '¡Meta de ahorro actualizada exitosamente!';
          this.fetchStats();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.updatingGoal = false;
        this.errorMessage = err.error?.message || 'Error al actualizar la meta de ahorro.';
        this.cdr.detectChanges();
      }
    });
  }

  dismissAlert(alertId: number): void {
    this.dashboardService.dismissAlert(alertId).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = 'Alerta marcada como resuelta.';
          this.fetchStats();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al descartar la alerta.';
        this.cdr.detectChanges();
      }
    });
  }

  exportToPDF(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
  }
}
