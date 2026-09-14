import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, RecentTransaction, CardAccount } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-gasto',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NotificationBellComponent],
  templateUrl: './gasto.component.html',
  styleUrl: './gasto.component.css'
})
export class GastoComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private toastService = inject(ToastService);
  private router = inject(Router);
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
  cuotas: number = 1;
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

  expenseCategories = [
    'Vivienda & Servicios',
    'Alimentación & Restaurantes',
    'Transporte & Combustible',
    'Infraestructura & Cloud',
    'Software & Licencias',
    'Entretenimiento & Ocio',
    'Operativo & Oficina',
    'Otros Gastos'
  ];

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
    this.dashboardService.getCategories('EXPENSE').subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.expenseCategories = res.data.map(c => c.name);
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

  get recentExpenses(): RecentTransaction[] {
    if (!this.stats || !this.stats.transaccionesRecientes) return [];
    return this.stats.transaccionesRecientes.filter(tx => tx.type === 'EXPENSE');
  }

  filteredExpenses: RecentTransaction[] = [];
  paginatedExpenses: RecentTransaction[] = [];
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
    const rawList = this.recentExpenses;
    const term = (this.searchTerm || '').toLowerCase().trim();

    if (!term) {
      this.filteredExpenses = rawList;
    } else {
      this.filteredExpenses = rawList.filter(exp => {
        const title = (exp.title || '').toLowerCase();
        const category = (exp.category || '').toLowerCase();
        const merchant = (exp.merchant || '').toLowerCase();
        const date = exp.date || '';
        const amount = exp.amount != null ? exp.amount.toString() : '';
        return title.includes(term) || category.includes(term) || merchant.includes(term) || date.includes(term) || amount.includes(term);
      });
    }

    this.totalPages = Math.ceil(this.filteredExpenses.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedExpenses = this.filteredExpenses.slice(startIndex, startIndex + this.pageSize);
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
    this.paginatedExpenses = this.filteredExpenses.slice(startIndex, startIndex + this.pageSize);
    this.cdr.detectChanges();
  }

  get topExpenseCategory(): { name: string; percentage: number } {
    if (!this.stats || this.recentExpenses.length === 0) {
      return { name: 'Vivienda & Servicios', percentage: 35 };
    }
    const catMap: { [key: string]: number } = {};
    let total = 0;
    this.recentExpenses.forEach(exp => {
      catMap[exp.category] = (catMap[exp.category] || 0) + exp.amount;
      total += exp.amount;
    });
    let topCat = 'Vivienda & Servicios';
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

  onSubmit(): void {
    if (!this.monto || this.monto <= 0) {
      this.errorMessage = 'Por favor ingresa un monto válido mayor a 0.';
      this.toastService.showError('Monto Inválido', this.errorMessage);
      return;
    }
    if (!this.concepto.trim()) {
      this.errorMessage = 'Por favor ingresa un concepto o proveedor del gasto.';
      this.toastService.showError('Concepto Requerido', this.errorMessage);
      return;
    }
    if (!this.categoria) {
      this.errorMessage = 'Por favor selecciona una categoría de gasto.';
      this.toastService.showError('Categoría Requerida', this.errorMessage);
      return;
    }
    if (this.fecha > this.maxDate) {
      this.errorMessage = 'No es posible registrar un gasto con fecha posterior al día de hoy.';
      this.toastService.showError('Fecha Inválida', this.errorMessage);
      return;
    }

    const gastoMonto = Number(this.monto);
    const selectedCard = this.availableCards.find(c => c.name.toLowerCase() === this.cuenta.toLowerCase());

    if (selectedCard && selectedCard.type === 'CREDIT') {
      // CREDIT CARD VALIDATION:
      // Purchases use the authorized credit line, not checking account cash
      const availableLimit = selectedCard.availableCredit !== undefined ? selectedCard.availableCredit : selectedCard.balance;
      if (gastoMonto > availableLimit) {
        this.errorMessage = `Límite de crédito excedido: tu crédito disponible en "${selectedCard.name}" es de Q ${availableLimit.toFixed(2)}. No puedes registrar una compra de Q ${gastoMonto.toFixed(2)} que supere tu línea disponible (Límite total: Q ${(selectedCard.creditLimit || 8000).toFixed(2)}).`;
        this.toastService.showError('Límite de Crédito Excedido', this.errorMessage);
        return;
      }
    } else if (selectedCard) {
      // DEBIT / SAVINGS: Check account-specific balance
      if (gastoMonto > selectedCard.balance) {
        this.errorMessage = `Fondos insuficientes en "${selectedCard.name}": saldo actual Q ${selectedCard.balance.toFixed(2)}, gasto solicitado Q ${gastoMonto.toFixed(2)}.`;
        this.toastService.showError('Saldo Insuficiente en Cuenta', this.errorMessage);
        return;
      }
    } else {
      // CASH VALIDATION (Hallazgo 2): Validate against saldoEfectivo
      const saldoEfectivo = this.stats?.saldoEfectivo ?? 0;
      if (gastoMonto > saldoEfectivo) {
        this.errorMessage = `Efectivo insuficiente: tu saldo disponible en efectivo es de Q ${saldoEfectivo.toFixed(2)}. No puedes registrar un gasto en efectivo de Q ${gastoMonto.toFixed(2)} (no se permiten saldos negativos).`;
        this.toastService.showError('Efectivo Insuficiente', this.errorMessage);
        return;
      }
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const merchantText = this.cuenta || 'Efectivo en Mano / Caja';
    const isCredit = selectedCard?.type === 'CREDIT';
    const numCuotas = this.isSelectedCardCredit && this.cuotas > 1 ? Number(this.cuotas) : undefined;

    this.dashboardService.createExpense({
      title: this.concepto.trim(),
      category: this.categoria,
      amount: gastoMonto,
      merchant: merchantText,
      date: this.fecha,
      installments: numCuotas,
      cardId: selectedCard ? selectedCard.id : null
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          this.successMessage = '¡Gasto registrado exitosamente!';
          let desc = '';
          if (isCredit) {
            if (numCuotas && numCuotas > 1) {
              const cuotaVal = gastoMonto / numCuotas;
              desc = `Compra en ${numCuotas} cuotas en ${merchantText}. Primera cuota: Q ${cuotaVal.toFixed(2)}/mes. Línea comprometida: Q ${gastoMonto.toFixed(2)}.`;
            } else {
              desc = `Se cargaron Q ${gastoMonto.toFixed(2)} a tu crédito en ${merchantText}.`;
            }
          } else {
            desc = `Se descontaron Q ${gastoMonto.toFixed(2)} de ${merchantText}.`;
          }
          this.toastService.showSuccess('¡Gasto Registrado!', desc);
          this.monto = null;
          this.concepto = '';
          this.categoria = '';
          this.notas = '';
          this.cuotas = 1;
          this.currentPage = 1;
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al registrar el gasto.';
          this.toastService.showError('Error al Guardar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Error al registrar el gasto.';
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
      this.errorMessage = 'No es posible actualizar un gasto con fecha posterior al día de hoy.';
      this.toastService.showError('Fecha Inválida', this.errorMessage);
      return;
    }

    const oldAmount = this.transactionToEdit.amount;
    const newAmount = Number(this.editAmount);
    const diff = newAmount - oldAmount;
    const saldoDisponible = this.stats?.saldoDisponible ?? 0;

    if (diff > 0 && diff > saldoDisponible) {
      this.errorMessage = `Fondos insuficientes: aumentar este gasto en Q ${diff.toFixed(2)} supera tu saldo disponible actual (Q ${saldoDisponible.toFixed(2)}). No se permiten saldos negativos.`;
      this.toastService.showError('Fondos Insuficientes', this.errorMessage);
      return;
    }

    this.editing = true;
    const id = this.transactionToEdit.id;

    this.dashboardService.updateTransaction(id, {
      title: this.editTitle.trim(),
      category: this.editCategory,
      amount: newAmount,
      merchant: this.editMerchant,
      date: this.editDate
    }).subscribe({
      next: (res) => {
        this.editing = false;
        this.transactionToEdit = null;
        if (res.success) {
          this.successMessage = '¡Gasto actualizado exitosamente!';
          this.toastService.showSuccess('¡Gasto Actualizado!', `El gasto "${this.editTitle}" por Q ${newAmount.toFixed(2)} fue actualizado correctamente.`);
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al actualizar el gasto.';
          this.toastService.showError('Error al Actualizar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.editing = false;
        this.errorMessage = err.error?.message || 'Error al actualizar el gasto.';
        this.toastService.showError('Error', this.errorMessage);
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
    const deletedTitle = this.transactionToDelete.title;

    this.dashboardService.deleteTransaction(id).subscribe({
      next: (res) => {
        this.deleting = false;
        this.transactionToDelete = null;
        if (res.success) {
          this.successMessage = '¡Gasto eliminado correctamente!';
          this.toastService.showSuccess('Gasto Eliminado', `El gasto "${deletedTitle}" fue eliminado y sus fondos fueron reincorporados.`);
          this.fetchStats();
        } else {
          this.errorMessage = res.message || 'Error al eliminar el gasto.';
          this.toastService.showError('Error al Eliminar', this.errorMessage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deleting = false;
        this.errorMessage = err.error?.message || 'Error al eliminar el gasto.';
        this.toastService.showError('Error', this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleTxSubmenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isTxOpen = !this.isTxOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}
