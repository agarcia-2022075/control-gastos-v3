import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { SessionService } from './core/services/session.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  authService = inject(AuthService);
  sessionService = inject(SessionService);
  router = inject(Router);
  title = 'control-gastos';

  isFullLayoutRoute(): boolean {
    const url = this.router.url;
    return url.includes('/dashboard') || 
           url.includes('/ingreso') || 
           url.includes('/gasto') || 
           url.includes('/reportes') || 
           url.includes('/admin');
  }
}
