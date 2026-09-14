import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, RecentTransaction, CardAccount } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { PdfExportService } from '../../core/services/pdf-export.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

export interface ReportCategorySummary {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

export interface SourceBreakdownItem {
  label: string;
  amount: number;
  percentage: number;
  count: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NotificationBellComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private toastService = inject(ToastService);
  private notificationsService = inject(NotificationsService);
  private pdfExportService = inject(PdfExportService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserResponse | null = null;
  stats: DashboardStats | null = null;
  loading: boolean = true;
  errorMessage: string = '';

  // Sidebar states
  isCollapsed: boolean = false;
  isTxOpen: boolean = false;

  // Filter States
  filterType: 'ALL' | 'INCOME' | 'EXPENSE' = 'ALL';
  datePreset: 'month' | 'prev_month' | 'quarter' | 'year' | 'all' | 'custom' = 'month';
  customStartDate: string = '';
  customEndDate: string = '';
  selectedCategory: string = 'ALL';
  selectedSource: 'ALL' | 'CASH' | 'DEBIT' | 'CREDIT' = 'ALL';
  searchTerm: string = '';

  // Available categories list
  availableCategories: string[] = [];

  // Reactive state in memory (fast 60 FPS, avoids repeated getters)
  filteredTransactions: RecentTransaction[] = [];
  paginatedTransactions: RecentTransaction[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  // Computed Financial Metrics
  totalIngresos: number = 0;
  totalGastos: number = 0;
  balanceNeto: number = 0;
  esDeficit: boolean = false;
  tasaAhorro: number = 0;
  countIngresos: number = 0;
  countGastos: number = 0;
  gastoPromedioDiario: number = 0;
  diaPicoGasto: string = 'N/A';
  diaPicoMonto: number = 0;

  // Visual Breakdown
  categoryBreakdown: ReportCategorySummary[] = [];
  sourceBreakdown: SourceBreakdownItem[] = [];
  flowIncomePct: number = 50;
  flowExpensePct: number = 50;

  // Download states
  downloadingBackup: boolean = false;

  // Restore states
  isRestoreModalOpen: boolean = false;
  restoreFile: File | null = null;
  restoreBackupData: any = null;
  restoringBackup: boolean = false;
  restoreMode: 'REPLACE' | 'APPEND' = 'REPLACE';
  restorePreview: {
    exportDate?: string;
    version?: string;
    userEmail?: string;
    cardsCount: number;
    transactionsCount: number;
    goalsCount: number;
    recurringCount: number;
    installmentsCount: number;
    categoriesCount: number;
  } | null = null;

  get emissionDate(): string {
    return new Date().toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get filterAppliedLabel(): string {
    const typeLabel = this.filterType === 'ALL' ? 'Todos los movimientos' : (this.filterType === 'INCOME' ? 'Solo Ingresos' : 'Solo Gastos');
    const catLabel = this.selectedCategory === 'ALL' ? 'Todas las categorías' : `Categoría: ${this.selectedCategory}`;
    const srcLabel = this.selectedSource === 'ALL' ? 'Todos los medios' : (this.selectedSource === 'CASH' ? 'Efectivo' : (this.selectedSource === 'CREDIT' ? 'Tarjeta Crédito' : 'Bancos'));
    const dateLabel = this.datePreset === 'all' ? 'Historial completo' : `${this.customStartDate} al ${this.customEndDate}`;
    return `${dateLabel} | ${typeLabel} | ${catLabel} | ${srcLabel}`;
  }

  ngOnInit(): void {
    this.setDefaultDates();
    this.loadUserDataAndStats();
  }

  setDefaultDates(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.customStartDate = this.formatDate(firstDay);
    this.customEndDate = this.formatDate(lastDay);
  }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadUserDataAndStats(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.getCurrentUser().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.currentUser = res.data;
        }
        this.fetchStats();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al cargar los datos del usuario.';
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
          this.extractAvailableCategories();
          this.applyFilters();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Error al obtener la información financiera.';
        this.cdr.detectChanges();
      }
    });
  }

  extractAvailableCategories(): void {
    const catSet = new Set<string>();
    if (this.stats?.transaccionesRecientes) {
      this.stats.transaccionesRecientes.forEach(tx => {
        if (tx.category && tx.category.trim()) catSet.add(tx.category.trim());
      });
    }
    this.dashboardService.getCategories().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          res.data.forEach(c => catSet.add(c.name));
          this.availableCategories = Array.from(catSet).sort();
          this.cdr.detectChanges();
        }
      }
    });
    this.availableCategories = Array.from(catSet).sort();
  }

  setDatePreset(preset: 'month' | 'prev_month' | 'quarter' | 'year' | 'all' | 'custom'): void {
    this.datePreset = preset;
    const now = new Date();

    if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.customStartDate = this.formatDate(first);
      this.customEndDate = this.formatDate(last);
    } else if (preset === 'prev_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      this.customStartDate = this.formatDate(first);
      this.customEndDate = this.formatDate(last);
    } else if (preset === 'quarter') {
      const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.customStartDate = this.formatDate(first);
      this.customEndDate = this.formatDate(last);
    } else if (preset === 'year') {
      const first = new Date(now.getFullYear(), 0, 1);
      const last = new Date(now.getFullYear(), 11, 31);
      this.customStartDate = this.formatDate(first);
      this.customEndDate = this.formatDate(last);
    } else if (preset === 'all') {
      this.customStartDate = '';
      this.customEndDate = '';
    }

    this.currentPage = 1;
    this.applyFilters();
  }

  onCustomDateChange(): void {
    this.datePreset = 'custom';
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  getPaymentSourceType(tx: RecentTransaction): 'CASH' | 'DEBIT' | 'CREDIT' {
    if (tx.sourceCardId && this.stats?.tarjetas) {
      const card = this.stats.tarjetas.find(c => c.id === tx.sourceCardId);
      if (card) {
        if (card.type === 'CASH') return 'CASH';
        if (card.type === 'CREDIT') return 'CREDIT';
        return 'DEBIT';
      }
    }
    const mLower = ((tx.merchant || '') + ' ' + (tx.title || '')).toLowerCase();
    if (mLower.includes('efectivo') || mLower.includes('cash')) return 'CASH';
    if (mLower.includes('crédito') || mLower.includes('credito') || mLower.includes('tc') || mLower.includes('cuotas')) return 'CREDIT';
    return 'DEBIT';
  }

  getPaymentMethodName(tx: RecentTransaction): string {
    if (tx.type === 'CREDIT_PAYMENT') return 'Pago de Tarjeta';
    if (tx.sourceCardId && this.stats?.tarjetas) {
      const card = this.stats.tarjetas.find(c => c.id === tx.sourceCardId);
      if (card) return card.name;
    }
    const srcType = this.getPaymentSourceType(tx);
    if (srcType === 'CASH') return 'Efectivo en Mano';
    if (srcType === 'CREDIT') return 'Tarjeta de Crédito';
    return tx.merchant || 'Cuenta Bancaria';
  }

  applyFilters(): void {
    const raw = this.stats?.transaccionesRecientes || [];

    let list = raw.filter(tx => {
      // 1. Filter by Type
      if (this.filterType !== 'ALL' && tx.type !== this.filterType) {
        return false;
      }

      // 2. Filter by Category
      if (this.selectedCategory !== 'ALL' && tx.category !== this.selectedCategory) {
        return false;
      }

      // 3. Filter by Source
      if (this.selectedSource !== 'ALL') {
        const src = this.getPaymentSourceType(tx);
        if (src !== this.selectedSource) return false;
      }

      // 4. Filter by Date Range
      if (this.datePreset !== 'all') {
        if (this.customStartDate && tx.date < this.customStartDate) return false;
        if (this.customEndDate && tx.date > this.customEndDate) return false;
      }

      // 5. Search Term (null-safe)
      const term = (this.searchTerm || '').toLowerCase().trim();
      if (term) {
        const matchTitle = (tx.title || '').toLowerCase().includes(term);
        const matchCat = (tx.category || '').toLowerCase().includes(term);
        const matchMerch = (tx.merchant || '').toLowerCase().includes(term);
        const matchAmount = (tx.amount != null ? tx.amount.toString() : '').includes(term);
        const matchDate = (tx.date || '').includes(term);
        if (!matchTitle && !matchCat && !matchMerch && !matchAmount && !matchDate) {
          return false;
        }
      }

      return true;
    });

    this.filteredTransactions = list;

    // --- Recalculate KPIs ---
    let incomeSum = 0;
    let expenseSum = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    const dayExpenseMap: { [date: string]: number } = {};
    const categoryMap: { [cat: string]: number } = {};

    let cashExpense = 0;
    let bankExpense = 0;
    let creditExpense = 0;
    let cashCount = 0;
    let bankCount = 0;
    let creditCount = 0;

    list.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'INCOME') {
        incomeSum += amt;
        incomeCount++;
      } else if (tx.type === 'EXPENSE') {
        expenseSum += amt;
        expenseCount++;

        // Day peak tracking
        dayExpenseMap[tx.date] = (dayExpenseMap[tx.date] || 0) + amt;

        // Category breakdown tracking
        const cat = tx.category || 'General';
        categoryMap[cat] = (categoryMap[cat] || 0) + amt;

        // Source breakdown tracking
        const src = this.getPaymentSourceType(tx);
        if (src === 'CASH') {
          cashExpense += amt;
          cashCount++;
        } else if (src === 'CREDIT') {
          creditExpense += amt;
          creditCount++;
        } else {
          bankExpense += amt;
          bankCount++;
        }
      }
    });

    this.totalIngresos = Math.round(incomeSum * 100) / 100;
    this.totalGastos = Math.round(expenseSum * 100) / 100;
    this.countIngresos = incomeCount;
    this.countGastos = expenseCount;

    // True Net Balance (allows negative numbers)
    this.balanceNeto = Math.round((this.totalIngresos - this.totalGastos) * 100) / 100;
    this.esDeficit = this.balanceNeto < 0;

    // Savings rate
    this.tasaAhorro = this.totalIngresos > 0
      ? Math.max(0, Math.round((this.balanceNeto / this.totalIngresos) * 100))
      : 0;

    // Flow Percentages
    const totalFlow = this.totalIngresos + this.totalGastos;
    if (totalFlow > 0) {
      this.flowIncomePct = Math.round((this.totalIngresos / totalFlow) * 100);
      this.flowExpensePct = 100 - this.flowIncomePct;
    } else {
      this.flowIncomePct = 50;
      this.flowExpensePct = 50;
    }

    // Daily Average Expense
    let daysDiff = 30;
    if (this.customStartDate && this.customEndDate) {
      const d1 = new Date(this.customStartDate);
      const d2 = new Date(this.customEndDate);
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      daysDiff = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }
    this.gastoPromedioDiario = Math.round((this.totalGastos / daysDiff) * 100) / 100;

    // Peak Spending Day
    let peakDay = 'N/A';
    let peakAmount = 0;
    Object.keys(dayExpenseMap).forEach(d => {
      if (dayExpenseMap[d] > peakAmount) {
        peakAmount = dayExpenseMap[d];
        peakDay = d;
      }
    });
    this.diaPicoGasto = peakDay;
    this.diaPicoMonto = Math.round(peakAmount * 100) / 100;

    // Source Breakdown Items
    const totalSources = cashExpense + bankExpense + creditExpense;
    this.sourceBreakdown = [
      {
        label: 'Efectivo en Mano',
        amount: Math.round(cashExpense * 100) / 100,
        percentage: totalSources > 0 ? Math.round((cashExpense / totalSources) * 100) : 0,
        count: cashCount,
        icon: '💵',
        color: '#34d399'
      },
      {
        label: 'Cuentas Bancarias / Débito',
        amount: Math.round(bankExpense * 100) / 100,
        percentage: totalSources > 0 ? Math.round((bankExpense / totalSources) * 100) : 0,
        count: bankCount,
        icon: '🏦',
        color: '#38bdf8'
      },
      {
        label: 'Tarjetas de Crédito',
        amount: Math.round(creditExpense * 100) / 100,
        percentage: totalSources > 0 ? Math.round((creditExpense / totalSources) * 100) : 0,
        count: creditCount,
        icon: '💳',
        color: '#c084fc'
      }
    ];

    // Category Breakdown & SVG Donut Calculations
    const palette = ['#38bdf8', '#34d399', '#c084fc', '#f43f5e', '#fbbf24', '#a855f7', '#06b6d4', '#f97316'];
    let accumulatedOffset = 0;
    const catKeys = Object.keys(categoryMap).sort((a, b) => categoryMap[b] - categoryMap[a]);

    this.categoryBreakdown = catKeys.map((cat, idx) => {
      const amt = Math.round(categoryMap[cat] * 100) / 100;
      const pct = this.totalGastos > 0 ? Math.round((amt / this.totalGastos) * 100) : 0;
      const color = palette[idx % palette.length];

      // SVG circumference is 100
      const dashArray = `${pct} ${100 - pct}`;
      const dashOffset = -accumulatedOffset;
      accumulatedOffset += pct;

      return {
        name: cat,
        amount: amt,
        percentage: pct,
        color,
        dashArray,
        dashOffset
      };
    });

    // Pagination calculations
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    this.paginatedTransactions = this.filteredTransactions.slice(startIdx, startIdx + this.pageSize);

    this.cdr.detectChanges();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginationSlice();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginationSlice();
    }
  }

  updatePaginationSlice(): void {
    const startIdx = (this.currentPage - 1) * this.pageSize;
    this.paginatedTransactions = this.filteredTransactions.slice(startIdx, startIdx + this.pageSize);
    this.cdr.detectChanges();
  }

  // --- Export / Backup Actions ---

  downloadFullBackupJSON(): void {
    this.downloadingBackup = true;
    this.dashboardService.getBackupData().subscribe({
      next: (res) => {
        this.downloadingBackup = false;
        if (res.success && res.data) {
          const jsonStr = JSON.stringify(res.data, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const today = new Date().toISOString().split('T')[0];
          a.href = url;
          a.download = `respaldo_financiero_control_gastos_${today}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.toastService.showSuccess('Respaldo Descargado', 'Copia de seguridad en formato JSON generada con éxito.');
        } else {
          this.toastService.showError('Error al Respaldar', res.message || 'No se pudo generar el respaldo.');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.downloadingBackup = false;
        this.toastService.showError('Error', err.error?.message || 'Error al conectar con el servidor de respaldo.');
        this.cdr.detectChanges();
      }
    });
  }

  // --- Restore Backup Actions ---

  triggerRestoreFileInput(input: HTMLInputElement): void {
    input.click();
  }

  onBackupFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.restoreFile = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('El archivo no tiene un formato JSON válido.');
        }

        const cardsCount = Array.isArray(parsed.cardsAccounts) ? parsed.cardsAccounts.length : (Array.isArray(parsed.cards) ? parsed.cards.length : 0);
        const transactionsCount = Array.isArray(parsed.transactions) ? parsed.transactions.length : 0;
        const goalsCount = Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals.length : 0;
        const recurringCount = Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses.length : 0;
        const installmentsCount = Array.isArray(parsed.installmentPlans) ? parsed.installmentPlans.length : 0;
        const categoriesCount = Array.isArray(parsed.categories) ? parsed.categories.length : 0;

        if (cardsCount === 0 && transactionsCount === 0 && goalsCount === 0 && recurringCount === 0) {
          this.toastService.showWarning('Archivo no Reconocido', 'El archivo no contiene transacciones, tarjetas ni metas identificables de Control de Gastos.');
          return;
        }

        this.restoreBackupData = parsed;
        this.restorePreview = {
          exportDate: parsed.metadata?.exportDate || parsed.metadata?.exportedAt || 'Fecha no especificada',
          version: parsed.metadata?.version || 'v3',
          userEmail: parsed.metadata?.userEmail || parsed.user?.email || 'N/A',
          cardsCount,
          transactionsCount,
          goalsCount,
          recurringCount,
          installmentsCount,
          categoriesCount
        };
        this.isRestoreModalOpen = true;
        this.cdr.detectChanges();
      } catch (err: any) {
        this.toastService.showError('Archivo Inválido', 'No se pudo leer el archivo JSON: ' + (err.message || 'Error de sintaxis'));
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  closeRestoreModal(): void {
    this.isRestoreModalOpen = false;
    this.restoreFile = null;
    this.restoreBackupData = null;
    this.restorePreview = null;
    this.restoringBackup = false;
    this.cdr.detectChanges();
  }

  confirmRestore(): void {
    if (!this.restoreBackupData) return;
    this.restoringBackup = true;
    this.dashboardService.restoreBackupData(this.restoreBackupData, this.restoreMode).subscribe({
      next: (res) => {
        this.restoringBackup = false;
        if (res.success) {
          this.toastService.showSuccess('Copia Restaurada con Éxito', res.message || 'Tus datos financieros fueron restaurados.');
          this.closeRestoreModal();
          this.loadUserDataAndStats();
          this.notificationsService.refreshAlerts();
        } else {
          this.toastService.showError('Error al Restaurar', res.message || 'No se pudo completar la restauración.');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.restoringBackup = false;
        this.toastService.showError('Fallo de Restauración', err.error?.message || 'Error en el servidor al restaurar.');
        this.cdr.detectChanges();
      }
    });
  }

  exportToCSV(): void {
    const list = this.filteredTransactions;
    if (list.length === 0) {
      this.toastService.showWarning('Sin Datos', 'No hay transacciones para exportar con los filtros actuales.');
      return;
    }

    const headers = ['ID', 'Fecha', 'Tipo', 'Concepto', 'Comercio / Entidad', 'Medio de Pago', 'Categoría', 'Monto (Q)', 'Estado'];
    const rows = list.map(tx => [
      tx.id,
      tx.date,
      tx.type === 'INCOME' ? 'INGRESO' : (tx.type === 'CREDIT_PAYMENT' ? 'PAGO_TARJETA' : 'GASTO'),
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      `"${(tx.merchant || '').replace(/"/g, '""')}"`,
      `"${this.getPaymentMethodName(tx).replace(/"/g, '""')}"`,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.status
    ]);

    // Financial Summary Block at end
    rows.push([]);
    rows.push(['ESTADO FINANCIERO CONSOLIDADO']);
    rows.push(['Rango de Fechas', this.filterAppliedLabel]);
    rows.push(['Total Ingresos (Q)', this.totalIngresos.toFixed(2)]);
    rows.push(['Total Gastos (Q)', this.totalGastos.toFixed(2)]);
    rows.push(['Balance Neto (Q)', this.balanceNeto.toFixed(2)]);
    rows.push(['Tasa de Ahorro', `${this.tasaAhorro}%`]);
    rows.push(['Gasto Promedio Diario (Q)', this.gastoPromedioDiario.toFixed(2)]);
    rows.push(['Día de Mayor Gasto', `${this.diaPicoGasto} (Q ${this.diaPicoMonto.toFixed(2)})`]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `reporte_financiero_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toastService.showSuccess('Reporte CSV Generado', 'Archivo estructurado compatible con Microsoft Excel descargado.');
  }

  exportToPDF(): void {
    try {
      this.pdfExportService.exportReportPDF({
        currentUser: this.currentUser,
        filterAppliedLabel: this.filterAppliedLabel,
        totalIngresos: this.totalIngresos,
        totalGastos: this.totalGastos,
        balanceNeto: this.balanceNeto,
        tasaAhorro: this.tasaAhorro,
        gastoPromedioDiario: this.gastoPromedioDiario,
        categoryBreakdown: this.categoryBreakdown,
        transactions: this.filteredTransactions
      });
      this.toastService.showSuccess('Reporte PDF Descargado', 'Documento oficial en PDF generado exitosamente.');
    } catch (err: any) {
      console.error(err);
      this.toastService.showError('Error al Generar PDF', 'Ocurrió un problema al procesar el archivo PDF.');
    }
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

  logout(): void {
    this.authService.logout();
  }
}
