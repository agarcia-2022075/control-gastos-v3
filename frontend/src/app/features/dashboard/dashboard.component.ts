import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, RecentTransaction, TrendPoint, CardAccount, PaymentAlert } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { PdfExportService } from '../../core/services/pdf-export.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';
import { GUATEMALA_BANKS, GuatemalaBank, BankProduct } from '../../core/models/guatemala-banks.data';

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
  imports: [CommonModule, RouterModule, FormsModule, NotificationBellComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private toastService = inject(ToastService);
  private notificationsService = inject(NotificationsService);
  private pdfExportService = inject(PdfExportService);
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
  maxDate: string = new Date().toLocaleDateString('en-CA');
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 5;

  // Guatemala Banks Catalog State
  guatemalaBanks: GuatemalaBank[] = GUATEMALA_BANKS;
  selectedBankId: string = 'bi';
  selectedProductId: string = 'bi-clasica';

  // Tarjetas & Cuentas State
  selectedCardIndex: number = 0;
  isCardModalOpen: boolean = false;
  newCardName: string = '';
  newCardType: 'DEBIT' | 'SAVINGS' | 'CASH' | 'CREDIT' = 'CREDIT';
  newCardInitialBalance: number | null = null;
  newCardNumber: string = '';
  newCardColor: string = 'cyan';
  newCardBillingCutDay: number | null = 15;
  newCardPaymentDueDay: number | null = 5;
  creatingCard: boolean = false;

  // Pay Credit Card Modal State (Hallazgo 4)
  isPayCreditModalOpen: boolean = false;
  cardToPay: CardAccount | null = null;
  paySourceCardId: number | null = null;
  payAmount: number | null = null;
  payDate: string = new Date().toLocaleDateString('en-CA');
  payingCredit: boolean = false;


  get currentSelectedBank(): GuatemalaBank {
    return this.guatemalaBanks.find(b => b.id === this.selectedBankId) || this.guatemalaBanks[0];
  }

  get currentSelectedProduct(): BankProduct {
    const bank = this.currentSelectedBank;
    return bank.products.find(p => p.id === this.selectedProductId) || bank.products[0];
  }

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

  isCreditMerchant(merchant?: string): boolean {
    if (!merchant) return false;
    const m = merchant.toLowerCase();
    return m.includes('crédito') || m.includes('credito') || m.includes('credit') || m.includes('tc') || m.includes('platinum');
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
          this.notificationsService.updateAlertsFromStats(this.stats);
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

  exportToPDF(): void {
    if (!this.stats) {
      this.toastService.showWarning('Sin Datos', 'No hay métricas disponibles para exportar a PDF.');
      return;
    }
    try {
      this.pdfExportService.exportDashboardAccountStatementPDF({
        currentUser: this.currentUser,
        stats: this.stats
      });
      this.toastService.showSuccess('Estado de Cuenta Descargado', 'El PDF de tu posición financiera se generó exitosamente.');
    } catch (err: any) {
      this.toastService.showError('Error al Generar PDF', 'Ocurrió un problema al procesar el archivo PDF.');
    }
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

    const term = (this.searchTerm || '').toLowerCase().trim();
    if (term) {
      list = list.filter(tx =>
        (tx.title || '').toLowerCase().includes(term) ||
        (tx.category || '').toLowerCase().includes(term) ||
        (tx.merchant || '').toLowerCase().includes(term) ||
        (tx.date || '').includes(term) ||
        (tx.amount != null ? tx.amount.toString() : '').includes(term)
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

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.cdr.detectChanges();
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
      this.toastService.showError('Monto Inválido', this.errorMessage);
      return;
    }
    if (!this.editTitle.trim()) {
      this.errorMessage = 'Por favor ingresa una descripción.';
      this.toastService.showError('Descripción Requerida', this.errorMessage);
      return;
    }
    if (this.editDate > this.maxDate) {
      this.errorMessage = 'No es posible actualizar una transacción con fecha posterior al día de hoy.';
      this.toastService.showError('Fecha Inválida', this.errorMessage);
      return;
    }

    const oldAmount = this.transactionToEdit.amount;
    const newAmount = Number(this.editAmount);
    const saldo = this.stats?.saldoDisponible || 0;

    if (this.transactionToEdit.type === 'EXPENSE') {
      const diff = newAmount - oldAmount;
      if (diff > 0 && diff > saldo) {
        this.errorMessage = `Fondos insuficientes: aumentar este gasto en Q ${diff.toFixed(2)} supera tu saldo disponible actual (Q ${saldo.toFixed(2)}). No se permiten saldos negativos.`;
        this.toastService.showError('Fondos Insuficientes', this.errorMessage);
        return;
      }
    } else if (this.transactionToEdit.type === 'INCOME') {
      const decrease = oldAmount - newAmount;
      if (decrease > 0 && decrease > saldo) {
        this.errorMessage = `No es posible reducir este ingreso en Q ${decrease.toFixed(2)} porque tus gastos registrados superan el balance restante y tu saldo disponible (Q ${saldo.toFixed(2)}) quedaría en negativo.`;
        this.toastService.showError('Operación no Permitida', this.errorMessage);
        return;
      }
    }

    this.editing = true;
    const id = this.transactionToEdit.id;
    const updatedTitle = this.editTitle.trim();

    this.dashboardService.updateTransaction(id, {
      title: updatedTitle,
      category: this.editCategory,
      amount: newAmount,
      merchant: this.editMerchant,
      date: this.editDate
    }).subscribe({
      next: (res: any) => {
        this.editing = false;
        this.transactionToEdit = null;
        if (res.success) {
          this.successMessage = 'Transacción actualizada exitosamente.';
          this.toastService.showSuccess('¡Transacción Actualizada!', `La transacción "${updatedTitle}" fue actualizada exitosamente.`);
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al actualizar la transacción.';
          this.toastService.showError('Error al Actualizar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.editing = false;
        this.errorMessage = err.error?.message || 'Error al actualizar la transacción.';
        this.toastService.showError('Error al Actualizar', this.errorMessage);
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

    if (this.transactionToDelete.type === 'INCOME') {
      const amt = this.transactionToDelete.amount;
      const saldo = this.stats?.saldoDisponible || 0;
      if (amt > saldo) {
        this.errorMessage = `No es posible eliminar este ingreso de Q ${amt.toFixed(2)} porque tus gastos registrados dependen de estos fondos y tu saldo disponible actual (Q ${saldo.toFixed(2)}) quedaría en negativo.`;
        this.toastService.showError('No se Puede Eliminar', this.errorMessage);
        this.transactionToDelete = null;
        return;
      }
    }

    this.deleting = true;
    const id = this.transactionToDelete.id;
    const deletedTitle = this.transactionToDelete.title;

    this.dashboardService.deleteTransaction(id).subscribe({
      next: (res) => {
        this.deleting = false;
        this.transactionToDelete = null;
        if (res.success) {
          this.successMessage = 'Transacción eliminada exitosamente. Tu saldo y estadísticas se han actualizado.';
          this.toastService.showSuccess('Transacción Eliminada', `La transacción "${deletedTitle}" fue eliminada correctamente.`);
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al eliminar la transacción.';
          this.toastService.showError('Error al Eliminar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deleting = false;
        this.errorMessage = err.error?.message || 'Error al eliminar la transacción.';
        this.toastService.showError('Error al Eliminar', this.errorMessage);
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

  get dashboardAlerts(): PaymentAlert[] {
    return this.notificationsService.currentAlerts;
  }

  dismissAlert(alertId: number): void {
    this.notificationsService.dismissAlert(alertId);
    if (this.stats && this.stats.alertas) {
      this.stats.alertas = this.stats.alertas.filter(a => a.id !== alertId);
    }
    this.toastService.showSuccess('Alerta Resuelta', 'La alerta ha sido descartada exitosamente.');
    this.dashboardService.dismissAlert(alertId).subscribe({
      next: () => {
        // Alerta descartada en el backend
      },
      error: () => {
        // En caso de error de red, ya fue resuelta visualmente
      }
    });
    this.cdr.detectChanges();
  }

  get currentMonthName(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  get currentCard(): CardAccount | null {
    if (!this.stats?.tarjetas || this.stats.tarjetas.length === 0) return null;
    if (this.selectedCardIndex >= this.stats.tarjetas.length) {
      this.selectedCardIndex = 0;
    }
    return this.stats.tarjetas[this.selectedCardIndex];
  }

  selectCard(idx: number): void {
    this.selectedCardIndex = idx;
    this.cdr.detectChanges();
  }

  nextCard(): void {
    if (this.stats?.tarjetas && this.stats.tarjetas.length > 0) {
      this.selectedCardIndex = (this.selectedCardIndex + 1) % this.stats.tarjetas.length;
      this.cdr.detectChanges();
    }
  }

  prevCard(): void {
    if (this.stats?.tarjetas && this.stats.tarjetas.length > 0) {
      this.selectedCardIndex = (this.selectedCardIndex - 1 + this.stats.tarjetas.length) % this.stats.tarjetas.length;
      this.cdr.detectChanges();
    }
  }

  openAddCardModal(): void {
    this.selectedBankId = 'bi';
    const bank = this.currentSelectedBank;
    const defaultProd = bank.products.find(p => p.type === 'CREDIT') || bank.products[0];
    this.selectedProductId = defaultProd.id;
    this.applyProductToForm(defaultProd);
    this.isCardModalOpen = true;
    this.cdr.detectChanges();
  }

  onBankSelected(): void {
    const bank = this.currentSelectedBank;
    if (bank && bank.products.length > 0) {
      const defaultProd = bank.products.find(p => p.type === 'CREDIT') || bank.products[0];
      this.selectedProductId = defaultProd.id;
      this.applyProductToForm(defaultProd);
    }
    this.cdr.detectChanges();
  }

  onProductSelected(): void {
    const prod = this.currentSelectedProduct;
    if (prod) {
      this.applyProductToForm(prod);
    }
    this.cdr.detectChanges();
  }

  private applyProductToForm(prod: BankProduct): void {
    this.newCardName = `${this.currentSelectedBank.shortName} ${prod.name}`;
    this.newCardType = prod.type;
    this.newCardInitialBalance = prod.type === 'CREDIT' ? prod.suggestedLimit : (prod.suggestedLimit || 0);
    this.newCardColor = prod.colorGradient;
    if (prod.type === 'CREDIT') {
      this.newCardBillingCutDay = 15;
      this.newCardPaymentDueDay = 5;
    } else {
      this.newCardBillingCutDay = null;
      this.newCardPaymentDueDay = null;
    }
    if (!this.newCardNumber) {
      this.newCardNumber = Math.floor(1000 + Math.random() * 9000).toString();
    }
  }

  deleteCurrentCard(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const card = this.currentCard;
    if (!card) return;

    if (confirm(`¿Estás seguro de que deseas eliminar la tarjeta o cuenta "${card.name}"?`)) {
      this.dashboardService.deleteCard(card.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.showSuccess('Tarjeta Eliminada', `Se eliminó "${card.name}" correctamente.`);
            this.selectedCardIndex = 0;
            this.fetchStats();
          } else {
            this.toastService.showError('Error', res.message || 'No se pudo eliminar la tarjeta.');
          }
        },
        error: (err) => {
          this.toastService.showError('Error', err.error?.message || 'Error al eliminar la tarjeta.');
        }
      });
    }
  }

  clearAllCards(): void {
    if (!this.stats?.tarjetas || this.stats.tarjetas.length === 0) return;
    if (confirm('¿Deseas eliminar todas las tarjetas bancarias y operar únicamente en Efectivo (Modo Realista)?')) {
      const total = this.stats.tarjetas.length;
      let completed = 0;
      this.stats.tarjetas.forEach(c => {
        this.dashboardService.deleteCard(c.id).subscribe({
          next: () => {
            completed++;
            if (completed === total) {
              this.toastService.showSuccess('Modo Efectivo Activado', 'Se han eliminado todas las tarjetas. Tu cuenta ahora opera 100% en Efectivo.');
              this.selectedCardIndex = 0;
              this.fetchStats();
            }
          },
          error: () => {
            completed++;
            if (completed === total) {
              this.fetchStats();
            }
          }
        });
      });
    }
  }

  cancelAddCardModal(): void {
    this.isCardModalOpen = false;
    this.cdr.detectChanges();
  }

  saveNewCard(): void {
    if (!this.newCardName.trim()) {
      this.errorMessage = 'Por favor ingresa un nombre para la tarjeta o cuenta.';
      this.toastService.showError('Nombre Requerido', this.errorMessage);
      return;
    }

    this.creatingCard = true;
    let mask = this.newCardNumber.trim();
    if (mask && !mask.startsWith('••••')) {
      const digits = mask.replace(/\D/g, '');
      const last4 = digits.slice(-4) || '1234';
      mask = `•••• •••• •••• ${last4}`;
    }

    const cardName = this.newCardName.trim();
    let initialBal = this.newCardInitialBalance ? Number(this.newCardInitialBalance) : 0;
    if (this.newCardType === 'CREDIT' && initialBal <= 0) {
      initialBal = 8000.00;
    }

    this.dashboardService.createCard({
      name: cardName,
      type: this.newCardType,
      cardNumberMask: mask || undefined,
      initialBalance: initialBal,
      colorGradient: this.newCardColor,
      billingCutDay: this.newCardType === 'CREDIT' ? this.newCardBillingCutDay : undefined,
      paymentDueDay: this.newCardType === 'CREDIT' ? this.newCardPaymentDueDay : undefined
    }).subscribe({
      next: (res) => {
        this.creatingCard = false;
        this.isCardModalOpen = false;
        if (res.success) {
          this.successMessage = '¡Tarjeta o cuenta añadida exitosamente!';
          this.toastService.showSuccess('¡Tarjeta o Cuenta Creada!', `La cuenta "${cardName}" fue añadida exitosamente.`);
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al guardar la tarjeta.';
          this.toastService.showError('Error al Guardar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creatingCard = false;
        this.errorMessage = err.error?.message || 'Error al añadir la tarjeta o cuenta.';
        this.toastService.showError('Error al Crear Tarjeta', this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  // Hallazgo 4: Métodos para Pago de Tarjeta de Crédito
  get paymentSourceAccounts(): CardAccount[] {
    return this.stats?.tarjetas.filter(c => c.type !== 'CREDIT') || [];
  }

  get currentPaySourceBalance(): number {
    if (!this.paySourceCardId) {
      return this.stats?.saldoEfectivo ?? 0;
    }
    const acc = this.paymentSourceAccounts.find(c => c.id === this.paySourceCardId);
    return acc ? acc.balance : 0;
  }

  openPayCreditModal(card?: CardAccount, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const target = card || this.currentCard;
    if (!target || target.type !== 'CREDIT') {
      this.toastService.showError('Operación no disponible', 'Solo es posible realizar pagos a tarjetas de crédito.');
      return;
    }
    if ((target.currentDebt ?? 0) <= 0) {
      this.toastService.showInfo('Sin Deuda', `La tarjeta "${target.name}" no tiene saldo deudor pendiente.`);
      return;
    }
    this.cardToPay = target;
    this.payAmount = target.currentDebt ?? 0;
    this.paySourceCardId = null; // Default: Efectivo en Mano
    this.payDate = new Date().toLocaleDateString('en-CA');
    this.isPayCreditModalOpen = true;
    this.cdr.detectChanges();
  }

  closePayCreditModal(): void {
    this.isPayCreditModalOpen = false;
    this.cardToPay = null;
    this.cdr.detectChanges();
  }

  setPayFullDebt(): void {
    if (this.cardToPay) {
      this.payAmount = this.cardToPay.currentDebt ?? 0;
    }
  }

  submitCreditPayment(): void {
    if (!this.cardToPay) return;
    if (!this.payAmount || this.payAmount <= 0) {
      this.toastService.showError('Monto Inválido', 'Ingresa un monto mayor a 0 para abonar a tu tarjeta.');
      return;
    }
    const debt = this.cardToPay.currentDebt ?? 0;
    if (this.payAmount > debt) {
      this.toastService.showError('Monto Excesivo', `La deuda actual es de Q ${debt.toFixed(2)}. No puedes abonar un monto superior.`);
      return;
    }
    const availableSource = this.currentPaySourceBalance;
    if (this.payAmount > availableSource) {
      const srcName = this.paySourceCardId
        ? (this.paymentSourceAccounts.find(c => c.id === this.paySourceCardId)?.name || 'Cuenta seleccionada')
        : 'Efectivo en Mano';
      this.toastService.showError('Fondos Insuficientes', `Fondos insuficientes en ${srcName}: saldo disponible Q ${availableSource.toFixed(2)}, monto a abonar Q ${this.payAmount.toFixed(2)}.`);
      return;
    }

    this.payingCredit = true;
    this.dashboardService.createCreditPayment({
      creditCardId: this.cardToPay.id,
      sourceCardId: this.paySourceCardId,
      amount: Number(this.payAmount),
      date: this.payDate
    }).subscribe({
      next: (res) => {
        this.payingCredit = false;
        this.isPayCreditModalOpen = false;
        if (res.success) {
          this.toastService.showSuccess('¡Pago Aplicado!', `Se abonaron Q ${this.payAmount!.toFixed(2)} a ${this.cardToPay!.name} exitosamente.`);
          this.fetchStats();
        } else {
          this.toastService.showError('Error', res.message || 'Error al procesar el pago.');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.payingCredit = false;
        this.toastService.showError('Error', err.error?.message || 'Error al procesar el pago de la tarjeta.');
        this.cdr.detectChanges();
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
