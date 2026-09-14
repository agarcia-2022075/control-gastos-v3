import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PaymentAlert, DashboardStats, DashboardService } from './dashboard.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private dashboardService = inject(DashboardService);
  private alertsSubject = new BehaviorSubject<PaymentAlert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  private isDropdownOpenSubject = new BehaviorSubject<boolean>(false);
  public isDropdownOpen$ = this.isDropdownOpenSubject.asObservable();

  private dismissedAlertIds: Set<number> = new Set();

  constructor() {
    this.loadDismissedFromStorage();
  }

  private loadDismissedFromStorage(): void {
    try {
      const stored = localStorage.getItem('control_gastos_dismissed_alerts');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          this.dismissedAlertIds = new Set(arr);
        }
      }
    } catch {
      this.dismissedAlertIds = new Set();
    }
  }

  private saveDismissedToStorage(): void {
    try {
      localStorage.setItem('control_gastos_dismissed_alerts', JSON.stringify(Array.from(this.dismissedAlertIds)));
    } catch {
      // Ignorar errores de localStorage
    }
  }

  public updateAlertsFromStats(stats: DashboardStats | null): void {
    if (!stats || !stats.alertas) {
      this.alertsSubject.next([]);
      return;
    }
    // Filter out dismissed alerts
    const visible = stats.alertas.filter((a: PaymentAlert) => !this.dismissedAlertIds.has(a.id));
    this.alertsSubject.next(visible);
  }

  public refreshAlerts(): void {
    this.dashboardService.getStats().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.updateAlertsFromStats(res.data);
        }
      },
      error: () => {}
    });
  }

  public get currentAlerts(): PaymentAlert[] {
    return this.alertsSubject.getValue();
  }

  public get unreadCount(): number {
    return this.alertsSubject.getValue().length;
  }

  public get isOpen(): boolean {
    return this.isDropdownOpenSubject.getValue();
  }

  public toggle(): void {
    this.isDropdownOpenSubject.next(!this.isDropdownOpenSubject.getValue());
  }

  public open(): void {
    this.isDropdownOpenSubject.next(true);
  }

  public close(): void {
    this.isDropdownOpenSubject.next(false);
  }

  public dismissAlert(alertId: number): void {
    this.dismissedAlertIds.add(alertId);
    this.saveDismissedToStorage();
    const updated = this.alertsSubject.getValue().filter(a => a.id !== alertId);
    this.alertsSubject.next(updated);
  }

  public clearAll(): void {
    const current = this.alertsSubject.getValue();
    current.forEach(a => this.dismissedAlertIds.add(a.id));
    this.saveDismissedToStorage();
    this.alertsSubject.next([]);
    this.close();
  }
}
