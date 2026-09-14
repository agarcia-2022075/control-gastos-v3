import { Injectable, inject, signal, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private router = inject(Router);
  private ngZone = inject(NgZone);

  isSessionExpired = signal<boolean>(false);

  // Plazo de inactividad: 3 minutos (180,000 ms) para pruebas y verificación automática en tiempo real
  private readonly INACTIVITY_LIMIT_MS = 3 * 60 * 1000;

  private idleTimer: any = null;
  private intervalCheckHandle: any = null;
  private lastActivityTime: number = Date.now();
  private eventListeners: Array<() => void> = [];

  constructor() {
    this.startInactivityMonitor();
  }

  notifySessionExpired(): void {
    this.stopInactivityMonitor();
    this.ngZone.run(() => {
      this.isSessionExpired.set(true);
    });
  }

  redirectToLogin(): void {
    this.ngZone.run(() => {
      this.isSessionExpired.set(false);
      this.stopInactivityMonitor();
      sessionStorage.removeItem('auth_token');
      this.router.navigate(['/login']);
    });
  }

  public startInactivityMonitor(): void {
    this.stopInactivityMonitor();
    const token = sessionStorage.getItem('auth_token');
    if (!token) return;

    this.lastActivityTime = Date.now();
    this.attachActivityListeners();
    this.startIntervalCheck();
  }

  public stopInactivityMonitor(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.intervalCheckHandle) {
      clearInterval(this.intervalCheckHandle);
      this.intervalCheckHandle = null;
    }
    this.detachActivityListeners();
  }

  public resetInactivityTimer(): void {
    this.lastActivityTime = Date.now();
  }

  private startIntervalCheck(): void {
    this.ngZone.runOutsideAngular(() => {
      this.intervalCheckHandle = setInterval(() => {
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
          this.stopInactivityMonitor();
          return;
        }

        const elapsed = Date.now() - this.lastActivityTime;
        if (elapsed >= this.INACTIVITY_LIMIT_MS) {
          this.notifySessionExpired();
        }
      }, 1000);
    });
  }

  private attachActivityListeners(): void {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    let lastReset = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Debounce de 500ms para actualizar el tiempo de última actividad durante navegación continua
      if (now - lastReset > 500) {
        lastReset = now;
        this.lastActivityTime = now;
      }
    };

    this.ngZone.runOutsideAngular(() => {
      events.forEach(eventName => {
        window.addEventListener(eventName, handleUserActivity, { passive: true });
        this.eventListeners.push(() => window.removeEventListener(eventName, handleUserActivity));
      });
    });
  }

  private detachActivityListeners(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }
}
