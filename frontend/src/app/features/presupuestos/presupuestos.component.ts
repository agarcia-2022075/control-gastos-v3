import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import {
  DashboardService,
  DashboardStats,
  SavingsGoal,
  RecurringExpense,
  CardAccount
} from '../../core/services/dashboard.service';
import { GUATEMALA_SERVICE_PRESETS, GuatemalaServicePreset } from '../../core/models/guatemala-services.data';
import { ToastService } from '../../core/services/toast.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-presupuestos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NotificationBellComponent],
  templateUrl: './presupuestos.component.html',
  styleUrl: './presupuestos.component.css'
})
export class PresupuestosComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserResponse | null = null;
  stats: DashboardStats | null = null;
  loading: boolean = true;

  // Sidebar and dropdown state
  isCollapsed: boolean = false;
  isTxOpen: boolean = false;

  // Active view tab: 'ALL' | 'PENDING' | 'CHARGED'
  activeFilter: 'ALL' | 'PENDING' | 'CHARGED' = 'ALL';

  // Hallazgo 8: Metas de Ahorro Modal States
  isNewGoalModalOpen: boolean = false;
  newGoalName: string = '';
  newGoalTargetAmount: number | null = null;
  newGoalInitialAmount: number | null = 0;
  newGoalCategory: string = 'Ahorro';
  newGoalColor: string = '#c084fc';
  newGoalTargetDate: string = '';
  creatingGoal: boolean = false;

  // Goal contribute / withdraw modal
  isGoalActionModalOpen: boolean = false;
  goalActionType: 'CONTRIBUTE' | 'WITHDRAW' = 'CONTRIBUTE';
  targetGoalForAction: SavingsGoal | null = null;
  goalActionAmount: number | null = null;
  submittingGoalAction: boolean = false;

  // Hallazgo 9: Gastos Fijos Recurrentes Modal States
  isRecurringModalOpen: boolean = false;
  guatemalaServicePresets: GuatemalaServicePreset[] = GUATEMALA_SERVICE_PRESETS;
  selectedPresetId: string = 'eegsa';
  newRecurringTitle: string = 'Energía Eléctrica EEGSA';
  newRecurringCategory: string = 'Servicios Básicos';
  newRecurringAmount: number | null = 350.00;
  newRecurringBillingDay: number = 15;
  newRecurringSourceCardId: number | null = null;
  creatingRecurring: boolean = false;
  applyingMonthlyRecurring: boolean = false;

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
      error: () => {
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
        this.toastService.showError('Error', err.error?.message || 'No se pudieron cargar los datos.');
        this.cdr.detectChanges();
      }
    });
  }

  get savingsGoals(): SavingsGoal[] {
    return this.stats?.metasAhorro || [];
  }

  get totalSavingsTarget(): number {
    return this.savingsGoals.reduce((acc, g) => acc + (g.targetAmount || 0), 0);
  }

  get totalSavingsCurrent(): number {
    return this.stats?.saldoAhorrado || 0;
  }

  get overallSavingsPercentage(): number {
    if (this.totalSavingsTarget <= 0) return 0;
    return Math.min(100, Math.round((this.totalSavingsCurrent / this.totalSavingsTarget) * 100));
  }

  get recurringExpenses(): RecurringExpense[] {
    const list = this.stats?.gastosRecurrentes || [];
    if (this.activeFilter === 'PENDING') {
      return list.filter(r => !r.isChargedThisMonth);
    }
    if (this.activeFilter === 'CHARGED') {
      return list.filter(r => r.isChargedThisMonth);
    }
    return list;
  }

  get totalRecurringMonthly(): number {
    return (this.stats?.gastosRecurrentes || []).reduce((acc, r) => acc + (r.amount || 0), 0);
  }

  get pendingRecurringMonthly(): number {
    return (this.stats?.gastosRecurrentes || [])
      .filter(r => !r.isChargedThisMonth)
      .reduce((acc, r) => acc + (r.amount || 0), 0);
  }

  // --- H8: Acciones de Metas de Ahorro ---
  openNewGoalModal(): void {
    this.newGoalName = '';
    this.newGoalTargetAmount = null;
    this.newGoalInitialAmount = 0;
    this.newGoalCategory = 'Ahorro';
    this.newGoalColor = '#c084fc';
    this.newGoalTargetDate = '';
    this.isNewGoalModalOpen = true;
    this.cdr.detectChanges();
  }

  cancelNewGoalModal(): void {
    this.isNewGoalModalOpen = false;
    this.cdr.detectChanges();
  }

  saveNewGoal(): void {
    if (!this.newGoalName.trim()) {
      this.toastService.showError('Nombre Requerido', 'Por favor ingresa un nombre para la meta.');
      return;
    }
    if (!this.newGoalTargetAmount || this.newGoalTargetAmount <= 0) {
      this.toastService.showError('Monto Objetivo Inválido', 'Ingresa un monto objetivo mayor a 0.');
      return;
    }
    const initialAmt = Number(this.newGoalInitialAmount || 0);
    const freeBalance = this.stats?.saldoDisponible ?? 0;
    if (initialAmt > freeBalance) {
      this.toastService.showError(
        'Saldo Insuficiente',
        `Tu saldo libre disponible es de Q ${freeBalance.toFixed(2)}. No puedes apartar Q ${initialAmt.toFixed(2)} como monto inicial.`
      );
      return;
    }

    this.creatingGoal = true;
    this.dashboardService.createSavingsGoal({
      name: this.newGoalName.trim(),
      targetAmount: Number(this.newGoalTargetAmount),
      initialAmount: initialAmt,
      category: this.newGoalCategory,
      colorGradient: this.newGoalColor,
      targetDate: this.newGoalTargetDate || null
    }).subscribe({
      next: (res: any) => {
        this.creatingGoal = false;
        this.isNewGoalModalOpen = false;
        if (res.success) {
          this.toastService.showSuccess(
            '¡Meta Creada!',
            `Se apartaron Q ${initialAmt.toFixed(2)} para "${this.newGoalName.trim()}". Tu saldo disponible fue actualizado.`
          );
          this.fetchStats();
        } else {
          this.toastService.showError('Error al Crear Meta', res.message || 'No se pudo crear la meta.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.creatingGoal = false;
        this.toastService.showError('Error', err.error?.message || 'Error al crear la meta de ahorro.');
        this.cdr.detectChanges();
      }
    });
  }

  openGoalActionModal(goal: SavingsGoal, type: 'CONTRIBUTE' | 'WITHDRAW'): void {
    this.targetGoalForAction = goal;
    this.goalActionType = type;
    this.goalActionAmount = null;
    this.isGoalActionModalOpen = true;
    this.cdr.detectChanges();
  }

  cancelGoalActionModal(): void {
    this.isGoalActionModalOpen = false;
    this.targetGoalForAction = null;
    this.cdr.detectChanges();
  }

  submitGoalAction(): void {
    if (!this.targetGoalForAction) return;
    const amt = Number(this.goalActionAmount);
    if (!amt || amt <= 0) {
      this.toastService.showError('Monto Inválido', 'Ingresa un monto mayor a 0.');
      return;
    }

    const freeBalance = this.stats?.saldoDisponible ?? 0;
    if (this.goalActionType === 'CONTRIBUTE' && amt > freeBalance) {
      this.toastService.showError(
        'Saldo Libre Insuficiente',
        `Solo tienes Q ${freeBalance.toFixed(2)} disponibles para apartar.`
      );
      return;
    }

    if (this.goalActionType === 'WITHDRAW' && amt > this.targetGoalForAction.currentAmount) {
      this.toastService.showError(
        'Fondos Insuficientes en Meta',
        `Esta meta solo tiene Q ${this.targetGoalForAction.currentAmount.toFixed(2)} ahorrados.`
      );
      return;
    }

    this.submittingGoalAction = true;
    const obs = this.goalActionType === 'CONTRIBUTE'
      ? this.dashboardService.contributeToGoal(this.targetGoalForAction.id, amt)
      : this.dashboardService.withdrawFromGoal(this.targetGoalForAction.id, amt);

    obs.subscribe({
      next: (res: any) => {
        this.submittingGoalAction = false;
        this.isGoalActionModalOpen = false;
        if (res.success) {
          const actionMsg = this.goalActionType === 'CONTRIBUTE' ? 'Aporte Realizado' : 'Retiro Completado';
          const actionDesc = this.goalActionType === 'CONTRIBUTE'
            ? `Apartaste Q ${amt.toFixed(2)} en "${this.targetGoalForAction?.name}". Tu saldo libre disponible se ajustó.`
            : `Retiraste Q ${amt.toFixed(2)} de "${this.targetGoalForAction?.name}". Los fondos regresaron a tu saldo libre disponible.`;
          this.toastService.showSuccess(actionMsg, actionDesc);
          this.fetchStats();
        } else {
          this.toastService.showError('Error', res.message || 'Error en la operación.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.submittingGoalAction = false;
        this.toastService.showError('Error', err.error?.message || 'Error procesando la solicitud.');
        this.cdr.detectChanges();
      }
    });
  }

  deleteGoal(goal: SavingsGoal): void {
    if (!confirm(`¿Estás seguro de eliminar la meta "${goal.name}"? Los fondos ahorrados (Q ${goal.currentAmount.toFixed(2)}) se devolverán a tu saldo libre disponible.`)) {
      return;
    }

    this.dashboardService.deleteSavingsGoal(goal.id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastService.showSuccess('Meta Eliminada', `La meta "${goal.name}" fue eliminada y los fondos se liberaron.`);
          this.fetchStats();
        } else {
          this.toastService.showError('Error', res.message || 'No se pudo eliminar la meta.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toastService.showError('Error', err.error?.message || 'Error al eliminar la meta.');
        this.cdr.detectChanges();
      }
    });
  }

  // --- H9: Acciones de Gastos Recurrentes ---
  openAddRecurringModal(): void {
    this.selectedPresetId = 'eegsa';
    this.onServicePresetSelected();
    this.isRecurringModalOpen = true;
    this.cdr.detectChanges();
  }

  cancelAddRecurringModal(): void {
    this.isRecurringModalOpen = false;
    this.cdr.detectChanges();
  }

  onServicePresetSelected(): void {
    const preset = this.guatemalaServicePresets.find(p => p.id === this.selectedPresetId);
    if (preset) {
      this.newRecurringTitle = preset.name;
      this.newRecurringCategory = preset.category;
      this.newRecurringAmount = preset.suggestedAmount;
      this.newRecurringBillingDay = preset.defaultBillingDay;
    }
  }

  saveNewRecurringExpense(): void {
    if (!this.newRecurringTitle.trim()) {
      this.toastService.showError('Título Requerido', 'Por favor ingresa el nombre del servicio.');
      return;
    }
    const amt = Number(this.newRecurringAmount);
    if (!amt || amt <= 0) {
      this.toastService.showError('Monto Inválido', 'Ingresa un monto válido mayor a 0.');
      return;
    }

    this.creatingRecurring = true;
    this.dashboardService.createRecurringExpense({
      title: this.newRecurringTitle.trim(),
      category: this.newRecurringCategory,
      amount: amt,
      billingDay: Number(this.newRecurringBillingDay) || 1,
      sourceCardId: this.newRecurringSourceCardId
    }).subscribe({
      next: (res: any) => {
        this.creatingRecurring = false;
        this.isRecurringModalOpen = false;
        if (res.success) {
          this.toastService.showSuccess('Gasto Programado', `"${this.newRecurringTitle}" (Q ${amt.toFixed(2)}) quedó programado mensualmente.`);
          this.fetchStats();
        } else {
          this.toastService.showError('Error', res.message || 'No se pudo guardar el gasto fijo.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.creatingRecurring = false;
        this.toastService.showError('Error', err.error?.message || 'Error al programar gasto fijo.');
        this.cdr.detectChanges();
      }
    });
  }

  applyMonthlyRecurringExpenses(): void {
    this.applyingMonthlyRecurring = true;
    this.dashboardService.applyRecurringExpenses().subscribe({
      next: (res: any) => {
        this.applyingMonthlyRecurring = false;
        if (res.success) {
          if (res.appliedCount && res.appliedCount > 0) {
            this.toastService.showSuccess(
              '¡Gastos del Mes Aplicados!',
              `Se registraron ${res.appliedCount} gastos fijos por un total de Q ${(res.totalAmount || 0).toFixed(2)}.`
            );
          } else {
            this.toastService.showInfo('Mes al Día', 'Todos tus gastos recurrentes programados ya estaban aplicados en este mes.');
          }
          this.fetchStats();
        } else {
          this.toastService.showError('Error', res.message || 'No se pudieron aplicar los gastos.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.applyingMonthlyRecurring = false;
        this.toastService.showError('Error', err.error?.message || 'Error al aplicar los gastos recurrentes.');
        this.cdr.detectChanges();
      }
    });
  }

  deleteRecurringExpense(r: RecurringExpense): void {
    if (!confirm(`¿Deseas desprogramar "${r.title}"? Ya no se generará automáticamente cada mes.`)) {
      return;
    }

    this.dashboardService.deleteRecurringExpense(r.id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastService.showSuccess('Gasto Eliminado', `"${r.title}" fue retirado de tus gastos fijos.`);
          this.fetchStats();
        } else {
          this.toastService.showError('Error', res.message || 'No se pudo eliminar el gasto.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toastService.showError('Error', err.error?.message || 'Error al eliminar gasto recurrente.');
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
