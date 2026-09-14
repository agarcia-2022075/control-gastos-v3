import { Component, inject, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';
import { PaymentAlert, DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notifications-wrapper">
      <button 
        class="icon-btn" 
        (click)="toggleNotifications($event)" 
        [title]="'Notificaciones (' + unreadCount + ' activas)'"
        type="button"
      >
        <svg style="width:20px; height:20px; stroke:#ffffff; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; fill:none;" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        <!-- Dynamic Counter Badge or Dot -->
        <span class="notification-count-badge" *ngIf="unreadCount > 0">
          {{ unreadCount }}
        </span>
      </button>

      <!-- Glassmorphic Notifications Dropdown -->
      <div class="notifications-dropdown" *ngIf="isOpen" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="notif-dropdown-header">
          <div class="notif-header-title">
            <span>🔔 Alertas Financieras</span>
            <span class="notif-count-pill" *ngIf="unreadCount > 0">{{ unreadCount }} activas</span>
          </div>
          <button 
            type="button" 
            class="btn-clear-all-notifs" 
            *ngIf="unreadCount > 0" 
            (click)="clearAll()"
          >
            Descartar Todas
          </button>
        </div>

        <!-- Alert Items List -->
        <div class="notif-dropdown-list" *ngIf="unreadCount > 0">
          <div 
            class="notif-item-card" 
            *ngFor="let alert of alerts"
            [ngClass]="{
              'danger': alert.alertType === 'DANGER',
              'warning': alert.alertType === 'WARNING',
              'info': alert.alertType === 'INFO'
            }"
          >
            <div class="notif-item-icon">
              <span *ngIf="alert.alertType === 'DANGER'">🚨</span>
              <span *ngIf="alert.alertType === 'WARNING'">⚠️</span>
              <span *ngIf="alert.alertType === 'INFO'">ℹ️</span>
            </div>

            <div class="notif-item-body">
              <div class="notif-item-title">{{ alert.title }}</div>
              <div class="notif-item-desc">{{ alert.description }}</div>

              <!-- Contextual Action Buttons -->
              <div style="margin-top: 0.35rem; display: flex; gap: 0.5rem; align-items: center;">
                <a 
                  *ngIf="alert.title.includes('Presupuesto') || alert.title.includes('Gastos Fijos') || alert.title.includes('Gasto Fijo')" 
                  routerLink="/presupuestos" 
                  (click)="close()"
                  class="btn-notif-action"
                >
                  <span>Ir a Presupuestos →</span>
                </a>
                <a 
                  *ngIf="alert.title.includes('Tarjeta') || alert.title.includes('Vencimiento')" 
                  routerLink="/dashboard" 
                  (click)="close()"
                  class="btn-notif-action"
                >
                  <span>Ver en Dashboard →</span>
                </a>
                <a 
                  *ngIf="alert.title.includes('Bono') || alert.title.includes('Aguinaldo')" 
                  routerLink="/configuracion" 
                  (click)="close()"
                  class="btn-notif-action"
                >
                  <span>Ver Prestaciones →</span>
                </a>
              </div>
            </div>

            <button 
              type="button" 
              class="btn-dismiss-notif" 
              (click)="dismiss(alert.id, $event)" 
              title="Descartar notificación"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div class="notif-empty-state" *ngIf="unreadCount === 0">
          <div class="notif-empty-icon">🎉</div>
          <div class="notif-empty-title">¡Todo al Día!</div>
          <div class="notif-empty-subtitle">
            No tienes pagos próximos a vencer, gastos pendientes ni alertas en este momento.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      position: relative;
    }
    .notifications-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .icon-btn {
      position: relative;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      padding: 0;
      box-shadow: none;
      appearance: none;
      -webkit-appearance: none;
    }
    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.14) !important;
      border-color: rgba(255, 255, 255, 0.35) !important;
      transform: translateY(-1px);
    }
    .icon-btn:active {
      transform: translateY(0);
    }
    .icon-btn svg {
      display: block;
    }
    .notification-count-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 9px;
      background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #070918;
      box-shadow: 0 0 10px rgba(244, 63, 94, 0.8);
      animation: pulseBadge 2s infinite;
    }
    @keyframes pulseBadge {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `]
})
export class NotificationBellComponent implements OnInit {
  private notifService = inject(NotificationsService);
  private dashboardService = inject(DashboardService);
  private elementRef = inject(ElementRef);

  ngOnInit(): void {
    this.notifService.refreshAlerts();
  }

  get isOpen(): boolean {
    return this.notifService.isOpen;
  }

  get unreadCount(): number {
    return this.notifService.unreadCount;
  }

  get alerts(): PaymentAlert[] {
    return this.notifService.currentAlerts;
  }

  toggleNotifications(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.notifService.toggle();
  }

  close(): void {
    this.notifService.close();
  }

  dismiss(alertId: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.notifService.dismissAlert(alertId);
    this.dashboardService.dismissAlert(alertId).subscribe();
  }

  clearAll(): void {
    const ids = this.alerts.map(a => a.id);
    this.notifService.clearAll();
    ids.forEach(id => this.dashboardService.dismissAlert(id).subscribe());
  }

  // Click outside detector to close dropdown smoothly
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
