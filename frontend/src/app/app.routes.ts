import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ingreso',
    loadComponent: () => import('./features/ingreso/ingreso.component').then(m => m.IngresoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'gasto',
    loadComponent: () => import('./features/gasto/gasto.component').then(m => m.GastoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    redirectTo: 'dashboard'
  },
  {
    path: 'reportes',
    loadComponent: () => import('./features/reportes/reportes.component').then(m => m.ReportesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'presupuestos',
    loadComponent: () => import('./features/presupuestos/presupuestos.component').then(m => m.PresupuestosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'categorias',
    loadComponent: () => import('./features/categorias/categorias.component').then(m => m.CategoriasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./features/configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
