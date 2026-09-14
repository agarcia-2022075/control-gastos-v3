import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { DashboardService, DashboardStats, PrestacionesLey, AlertPreferences } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NotificationBellComponent],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent implements OnInit {
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

  // Hallazgo 10: Perfil Salarial & Prestaciones de Ley
  editSalaryBase: number | null = null;
  updatingSalary: boolean = false;

  // Preferencias de Alertas y Notificaciones
  alertPrefs: AlertPreferences = {
    alertCardDue: true,
    alertBudgetLimit: true,
    alertFixedExpenses: true,
    alertLegalBenefits: true
  };
  updatingPref: string | null = null;

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
          this.editSalaryBase = res.data.prestacionesLey?.salarioBase || 8500.00;
          if (res.data.preferenciasAlertas) {
            this.alertPrefs = { ...res.data.preferenciasAlertas };
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.toastService.showError('Error', err.error?.message || 'Error al cargar perfil.');
        this.cdr.detectChanges();
      }
    });
  }

  toggleAlert(key: keyof AlertPreferences): void {
    const newVal = !this.alertPrefs[key];
    this.alertPrefs[key] = newVal;
    this.updatingPref = key;

    const payload: Partial<AlertPreferences> = {
      [key]: newVal
    };

    this.dashboardService.updateUserPreferences(payload).subscribe({
      next: (res) => {
        this.updatingPref = null;
        if (res.success && res.data) {
          this.alertPrefs = { ...res.data };
          const statusText = newVal ? 'activada' : 'desactivada';
          this.toastService.showSuccess('Alerta Actualizada', `La preferencia de alerta fue ${statusText} correctamente.`);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.updatingPref = null;
        this.alertPrefs[key] = !newVal;
        this.toastService.showError('Error', err.error?.message || 'No se pudo actualizar la preferencia.');
        this.cdr.detectChanges();
      }
    });
  }

  get prestaciones(): PrestacionesLey | undefined {
    return this.stats?.prestacionesLey;
  }

  saveSalaryProfile(): void {
    const salary = Number(this.editSalaryBase);
    if (!salary || salary <= 0) {
      this.toastService.showError('Salario Inválido', 'Por favor ingresa un salario base mensual válido.');
      return;
    }

    this.updatingSalary = true;
    this.dashboardService.updateSalaryProfile(salary).subscribe({
      next: (res: any) => {
        this.updatingSalary = false;
        if (res.success) {
          this.toastService.showSuccess(
            '¡Salario Base Guardado!',
            `Tu salario mensual se fijó en Q ${salary.toFixed(2)}. Tus prestaciones de ley (Bono 14 y Aguinaldo) fueron recalculadas.`
          );
          this.fetchStats();
        } else {
          this.toastService.showError('Error al Guardar', res.message || 'No se pudo guardar el salario.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.updatingSalary = false;
        this.toastService.showError('Error', err.error?.message || 'Error al actualizar el salario base.');
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
