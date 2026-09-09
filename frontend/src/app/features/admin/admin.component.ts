import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, UserResponse } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
  changeDetection: ChangeDetectionStrategy.Default
})
export class AdminComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  users: UserResponse[] = [];
  currentUser: UserResponse | null = null;
  loading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  private timeoutHandles: any[] = [];

  ngOnInit(): void {
    // Set current user immediately from service state (already populated from login)
    this.currentUser = this.authService.currentUserData;
    // Load the users list
    this.fetchUsers();
  }

  ngOnDestroy(): void {
    this.timeoutHandles.forEach(h => clearTimeout(h));
    this.timeoutHandles = [];
  }

  fetchUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.getUsers()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          // Handle both { success, data: [] } and direct array formats
          if (Array.isArray(res)) {
            this.users = res;
          } else if (res?.data && Array.isArray(res.data)) {
            this.users = res.data;
          } else {
            this.users = [];
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'Error al obtener la lista de usuarios.';
          this.cdr.detectChanges();
        }
      });
  }

  onRoleChange(user: UserResponse, newRole: 'USER' | 'ADMIN'): void {
    if (user.role === newRole) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.authService.updateUserRole(user.id, newRole)
      .subscribe({
        next: (res: any) => {
          if (res?.success) {
            this.successMessage = `Rol de ${user.email} actualizado a ${newRole}.`;
            this.cdr.detectChanges();
            this.fetchUsers();
            const handle = setTimeout(() => {
              this.successMessage = '';
              this.cdr.detectChanges();
            }, 4000);
            this.timeoutHandles.push(handle);
          }
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'No se pudo cambiar el rol del usuario.';
          this.cdr.detectChanges();
          this.fetchUsers();
          const handle = setTimeout(() => {
            this.errorMessage = '';
            this.cdr.detectChanges();
          }, 4000);
          this.timeoutHandles.push(handle);
        }
      });
  }
}

