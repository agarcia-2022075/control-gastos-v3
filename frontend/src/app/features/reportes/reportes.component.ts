import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, RecentTransaction } from '../../core/services/dashboard.service';

export interface ReportCategorySummary {
  name: string;
  amount: number;
  percentage: number;
  type: 'INCOME' | 'EXPENSE';
  color: string;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
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
  searchTerm: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  // Available categories list
  availableCategories: string[] = [];

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
    const dateLabel = this.datePreset === 'all' ? 'Historial completo' : `${this.customStartDate} al ${this.customEndDate}`;
    return `${dateLabel} | ${typeLabel} | ${catLabel}`;
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
    if (!this.stats?.transaccionesRecientes) return;
    const catSet = new Set<string>();
    this.stats.transaccionesRecientes.forEach(tx => {
      if (tx.category) catSet.add(tx.category);
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
      const first = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      this.customStartDate = this.formatDate(first);
      this.customEndDate = this.formatDate(now);
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
    this.cdr.detectChanges();
  }

  get allTransactions(): RecentTransaction[] {
    return this.stats?.transaccionesRecientes || [];
  }

  get filteredTransactions(): RecentTransaction[] {
    let list = this.allTransactions;

    // Filter by Type
    if (this.filterType !== 'ALL') {
      list = list.filter(tx => tx.type === this.filterType);
    }

    // Filter by Category
    if (this.selectedCategory !== 'ALL') {
      list = list.filter(tx => tx.category === this.selectedCategory);
    }

    // Filter by Date Range
    if (this.datePreset !== 'all') {
      if (this.customStartDate) {
        list = list.filter(tx => tx.date >= this.customStartDate);
      }
      if (this.customEndDate) {
        list = list.filter(tx => tx.date <= this.customEndDate);
      }
    }

    // Search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      list = list.filter(tx =>
        tx.title.toLowerCase().includes(term) ||
        tx.category.toLowerCase().includes(term) ||
        (tx.merchant && tx.merchant.toLowerCase().includes(term)) ||
        tx.amount.toString().includes(term) ||
        tx.date.includes(term)
      );
    }

    return list;
  }

  get paginatedTransactions(): RecentTransaction[] {
    const list = this.filteredTransactions;
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
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

  onFilterChange(): void {
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  // Financial KPIs based on filtered records
  get totalIngresos(): number {
    return this.filteredTransactions
      .filter(tx => tx.type === 'INCOME')
      .reduce((acc, tx) => acc + tx.amount, 0);
  }

  get totalGastos(): number {
    return this.filteredTransactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((acc, tx) => acc + tx.amount, 0);
  }

  get balanceNeto(): number {
    return this.totalIngresos - this.totalGastos;
  }

  get tasaAhorro(): number {
    if (this.totalIngresos <= 0) return 0;
    const saved = Math.max(0, this.balanceNeto);
    return Math.round((saved / this.totalIngresos) * 100);
  }

  get categoryBreakdown(): ReportCategorySummary[] {
    const map: { [key: string]: { amount: number; type: 'INCOME' | 'EXPENSE' } } = {};
    const total = this.totalGastos + this.totalIngresos;
    if (total === 0) return [];

    this.filteredTransactions.forEach(tx => {
      if (!map[tx.category]) {
        map[tx.category] = { amount: 0, type: tx.type };
      }
      map[tx.category].amount += tx.amount;
    });

    const colors = ['#38bdf8', '#34d399', '#c084fc', '#f43f5e', '#fbbf24', '#a855f7', '#06b6d4', '#f97316'];
    let colorIdx = 0;

    return Object.keys(map)
      .map(name => {
        const item = map[name];
        const relevantTotal = item.type === 'INCOME' ? this.totalIngresos : this.totalGastos;
        const percentage = relevantTotal > 0 ? Math.round((item.amount / relevantTotal) * 100) : 0;
        const color = colors[colorIdx % colors.length];
        colorIdx++;
        return {
          name,
          amount: item.amount,
          percentage,
          type: item.type,
          color
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  // Export to CSV Functionality
  exportToCSV(): void {
    const list = this.filteredTransactions;
    if (list.length === 0) {
      alert('No hay transacciones para exportar con los filtros seleccionados.');
      return;
    }

    const headers = ['ID', 'Fecha', 'Tipo', 'Concepto', 'Comercio / Cuenta', 'Categoría', 'Monto (Q)', 'Estado'];
    const rows = list.map(tx => [
      tx.id,
      tx.date,
      tx.type === 'INCOME' ? 'INGRESO' : 'GASTO',
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      `"${(tx.merchant || '').replace(/"/g, '""')}"`,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.status
    ]);

    // Resumen de balance al final
    rows.push([]);
    rows.push(['RESUMEN FINANCIERO DEL REPORTE']);
    rows.push(['Total Ingresos (Q)', this.totalIngresos.toFixed(2)]);
    rows.push(['Total Gastos (Q)', this.totalGastos.toFixed(2)]);
    rows.push(['Balance Neto (Q)', this.balanceNeto.toFixed(2)]);
    rows.push(['Tasa de Ahorro', `${this.tasaAhorro}%`]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_financiero_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export to PDF / Print Functionality
  exportToPDF(): void {
    window.print();
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
