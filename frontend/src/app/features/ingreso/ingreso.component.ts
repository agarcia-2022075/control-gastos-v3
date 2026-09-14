import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, RecentTransaction, CardAccount } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-ingreso',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NotificationBellComponent],
  templateUrl: './ingreso.component.html',
  styleUrl: './ingreso.component.css'
})
export class IngresoComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserResponse | null = null;
  stats: DashboardStats | null = null;

  loading: boolean = true;
  submitting: boolean = false;
  editing: boolean = false;
  deleting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Sidebar and Dropdown navigation states
  isCollapsed: boolean = false;
  isTxOpen: boolean = true;

  // Form Fields
  maxDate: string = new Date().toLocaleDateString('en-CA');
  monto: number | null = null;
  concepto: string = '';
  categoria: string = '';
  cuenta: string = 'Efectivo en Mano / Caja';
  fecha: string = new Date().toLocaleDateString('en-CA');
  notas: string = '';

  // Table Search and Pagination States
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 5;

  // Edit Transaction Modal State
  transactionToEdit: RecentTransaction | null = null;
  editTitle: string = '';
  editCategory: string = '';
  editAmount: number | null = null;
  editMerchant: string = '';
  editDate: string = '';

  // Delete Transaction Modal State
  transactionToDelete: RecentTransaction | null = null;

  incomeCategories: string[] = [
    'Salario / Nómina',
    'Bono 14 (Decreto 42-92)',
    'Aguinaldo (Decreto 76-78)',
    'Reembolsos & Viáticos',
    'Ventas / Negocios',
    'Inversiones & Rendimientos',
    'Bonos & Regalos',
    'Otros Ingresos'
  ];

  ngOnInit(): void {
    this.loadUserDataAndStats();
    this.route.queryParams.subscribe(params => {
      if (params['tipo'] === 'BONO14') {
        this.categoria = 'Bono 14 (Decreto 42-92)';
        this.onCategoriaChange();
      } else if (params['tipo'] === 'AGUINALDO') {
        this.categoria = 'Aguinaldo (Decreto 76-78)';
        this.onCategoriaChange();
      }
    });
  }

  loadUserDataAndStats(): void {
    this.loading = true;
    this.authService.getCurrentUser().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.currentUser = res.data;
        }
        this.fetchStats();
        this.loadCategories();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error cargando datos del usuario.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadCategories(): void {
    this.dashboardService.getCategories('INCOME').subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.incomeCategories = res.data.map(c => c.name);
          this.cdr.detectChanges();
        }
      }
    });
  }

  fetchStats(): void {
    this.dashboardService.getStats().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.stats = res.data;
          this.applyFilter();
          if (this.categoria === 'Bono 14 (Decreto 42-92)' || this.categoria === 'Aguinaldo (Decreto 76-78)') {
            this.onCategoriaChange();
          }
          if (this.cuenta !== 'Efectivo en Mano / Caja') {
            if (this.stats.tarjetas && this.stats.tarjetas.length > 0) {
              const hasMatch = this.stats.tarjetas.some(c => c.name === this.cuenta);
              if (!hasMatch) {
                this.cuenta = this.stats.tarjetas[0].name;
              }
            } else {
              this.cuenta = 'Efectivo en Mano / Caja';
            }
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Error al obtener datos financieros.';
        this.cdr.detectChanges();
      }
    });
  }

  get availableCards(): CardAccount[] {
    return this.stats?.tarjetas || [];
  }

  get selectedCardInfo(): CardAccount | undefined {
    return this.availableCards.find(c => c.name.toLowerCase() === this.cuenta.toLowerCase());
  }

  get isSelectedCardCredit(): boolean {
    return this.selectedCardInfo?.type === 'CREDIT';
  }

  get recentIncomes(): RecentTransaction[] {
    if (!this.stats || !this.stats.transaccionesRecientes) return [];
    return this.stats.transaccionesRecientes.filter(tx => tx.type === 'INCOME');
  }

  filteredIncomes: RecentTransaction[] = [];
  paginatedIncomes: RecentTransaction[] = [];
  totalPages: number = 1;

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.applyFilter();
  }

  applyFilter(): void {
    const rawList = this.recentIncomes;
    const term = (this.searchTerm || '').toLowerCase().trim();

    if (!term) {
      this.filteredIncomes = rawList;
    } else {
      this.filteredIncomes = rawList.filter(inc => {
        const title = (inc.title || '').toLowerCase();
        const category = (inc.category || '').toLowerCase();
        const merchant = (inc.merchant || '').toLowerCase();
        const date = inc.date || '';
        const amount = inc.amount != null ? inc.amount.toString() : '';
        return title.includes(term) || category.includes(term) || merchant.includes(term) || date.includes(term) || amount.includes(term);
      });
    }

    this.totalPages = Math.ceil(this.filteredIncomes.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedIncomes = this.filteredIncomes.slice(startIndex, startIndex + this.pageSize);
    this.cdr.detectChanges();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  private updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedIncomes = this.filteredIncomes.slice(startIndex, startIndex + this.pageSize);
    this.cdr.detectChanges();
  }

  get mainIncomeCategory(): { name: string; percentage: number } {
    if (!this.stats || this.recentIncomes.length === 0) {
      return { name: 'Salario / Nómina', percentage: 60 };
    }
    const catMap: { [key: string]: number } = {};
    let total = 0;
    this.recentIncomes.forEach(inc => {
      catMap[inc.category] = (catMap[inc.category] || 0) + inc.amount;
      total += inc.amount;
    });

    let topCat = 'Salario / Nómina';
    let topVal = 0;
    Object.keys(catMap).forEach(cat => {
      if (catMap[cat] > topVal) {
        topVal = catMap[cat];
        topCat = cat;
      }
    });

    const percentage = total > 0 ? Math.round((topVal / total) * 100) : 100;
    return { name: topCat, percentage };
  }

  onCategoriaChange(): void {
    const prest = this.stats?.prestacionesLey;
    const baseSalary = prest?.salarioBase || 0;
    if (this.categoria === 'Bono 14 (Decreto 42-92)') {
      if (!this.concepto || this.concepto.trim() === '' || this.concepto.startsWith('Aguinaldo')) {
        this.concepto = 'Bono 14 (Decreto 42-92)';
      }
      if ((!this.monto || this.monto <= 0) && baseSalary > 0) {
        this.monto = baseSalary;
      }
      if (!this.notas) {
        this.notas = 'Prestación laboral de julio conforme al Decreto 42-92 del Congreso de la República de Guatemala';
      }
    } else if (this.categoria === 'Aguinaldo (Decreto 76-78)') {
      if (!this.concepto || this.concepto.trim() === '' || this.concepto.startsWith('Bono 14')) {
        this.concepto = 'Aguinaldo (Decreto 76-78)';
      }
      if ((!this.monto || this.monto <= 0) && baseSalary > 0) {
        this.monto = baseSalary;
      }
      if (!this.notas) {
        this.notas = 'Prestación laboral de fin de año conforme al Decreto 76-78 del Congreso de la República de Guatemala';
      }
    }
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (!this.monto || this.monto <= 0) {
      this.errorMessage = 'Por favor ingresa un monto válido mayor a 0.';
      this.toastService.showError('Monto Inválido', this.errorMessage);
      return;
    }
    if (!this.concepto.trim()) {
      this.errorMessage = 'Por favor ingresa una descripción o concepto.';
      this.toastService.showError('Concepto Requerido', this.errorMessage);
      return;
    }
    if (!this.categoria) {
      this.errorMessage = 'Por favor selecciona una categoría.';
      this.toastService.showError('Categoría Requerida', this.errorMessage);
      return;
    }
    if (this.fecha > this.maxDate) {
      this.errorMessage = 'No es posible registrar un ingreso con fecha posterior al día de hoy.';
      this.toastService.showError('Fecha Inválida', this.errorMessage);
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const merchantText = this.cuenta || 'Efectivo en Mano / Caja';
    const ingresoMonto = Number(this.monto);
    const selectedCard = this.selectedCardInfo;
    const isCredit = selectedCard?.type === 'CREDIT';

    this.dashboardService.createIncome({
      title: this.concepto.trim(),
      category: this.categoria,
      amount: ingresoMonto,
      merchant: merchantText,
      date: this.fecha,
      cardId: selectedCard ? selectedCard.id : null
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          this.successMessage = isCredit 
            ? '¡Abono a tarjeta de crédito registrado exitosamente!' 
            : '¡Ingreso registrado exitosamente!';
          const desc = isCredit
            ? `Se abonaron Q ${ingresoMonto.toFixed(2)} a ${merchantText}, reduciendo tu saldo deudor.`
            : `Se acreditaron Q ${ingresoMonto.toFixed(2)} a ${merchantText}.`;
          this.toastService.showSuccess(isCredit ? '¡Abono a Tarjeta Procesado!' : '¡Ingreso Registrado!', desc);
          // Reset form fields
          this.monto = null;
          this.concepto = '';
          this.categoria = '';
          this.notas = '';
          this.currentPage = 1;
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al guardar el ingreso.';
          this.toastService.showError('Error al Guardar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Error al registrar el ingreso.';
        this.toastService.showError('Error', this.errorMessage);
        this.cdr.detectChanges();
      }
    });
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
      this.errorMessage = 'No es posible actualizar un ingreso con fecha posterior al día de hoy.';
      this.toastService.showError('Fecha Inválida', this.errorMessage);
      return;
    }

    const oldAmount = this.transactionToEdit.amount;
    const newAmount = Number(this.editAmount);
    const decrease = oldAmount - newAmount;
    const saldoDisponible = this.stats?.saldoDisponible ?? 0;

    // Strict validation: Reducing this income cannot drive available balance below zero
    if (decrease > 0 && decrease > saldoDisponible) {
      this.errorMessage = `No es posible reducir este ingreso en Q ${decrease.toFixed(2)} porque tus gastos registrados superan el balance restante y tu saldo disponible (Q ${saldoDisponible.toFixed(2)}) quedaría en negativo.`;
      this.toastService.showError('Operación no Permitida', this.errorMessage);
      return;
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
          this.successMessage = 'Ingreso actualizado exitosamente.';
          this.toastService.showSuccess('¡Ingreso Actualizado!', `El ingreso "${updatedTitle}" por Q ${newAmount.toFixed(2)} fue actualizado correctamente.`);
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al actualizar el ingreso.';
          this.toastService.showError('Error al Actualizar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.editing = false;
        this.errorMessage = err.error?.message || 'Error al actualizar el ingreso.';
        this.toastService.showError('Error', this.errorMessage);
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

    const incomeAmt = this.transactionToDelete.amount;
    const saldoDisponible = this.stats?.saldoDisponible ?? 0;

    // Strict validation: Deleting this income cannot drive balance negative
    if (incomeAmt > saldoDisponible) {
      this.errorMessage = `No es posible eliminar este ingreso de Q ${incomeAmt.toFixed(2)} porque tus gastos registrados dependen de estos fondos y tu saldo disponible actual (Q ${saldoDisponible.toFixed(2)}) quedaría en negativo.`;
      this.toastService.showError('No se Puede Eliminar', this.errorMessage);
      this.transactionToDelete = null;
      return;
    }

    this.deleting = true;
    const id = this.transactionToDelete.id;
    const deletedTitle = this.transactionToDelete.title;

    this.dashboardService.deleteTransaction(id).subscribe({
      next: (res) => {
        this.deleting = false;
        this.transactionToDelete = null;
        if (res.success) {
          this.successMessage = 'Ingreso eliminado correctamente. Tu saldo disponible ha sido actualizado.';
          this.toastService.showSuccess('Ingreso Eliminado', `El ingreso "${deletedTitle}" fue eliminado y el saldo disponible fue actualizado.`);
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al eliminar el ingreso.';
          this.toastService.showError('Error al Eliminar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deleting = false;
        this.errorMessage = err.error?.message || 'Error al eliminar el ingreso.';
        this.toastService.showError('Error', this.errorMessage);
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

  logout(): void {
    this.authService.logout();
  }
}
