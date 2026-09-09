import { Component, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  errorMessage: string = '';
  loading: boolean = false;
  googleLoading: boolean = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  loginWithGoogle(): void {
    this.errorMessage = '';
    const clientId = environment.googleClientId || '';

    if (!clientId || clientId.includes('placeholder')) {
      this.errorMessage = 'Para abrir el selector de cuentas de Google se requiere configurar un GOOGLE_CLIENT_ID válido en environment.ts o .env.';
      this.cdr.detectChanges();
      return;
    }

    if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
      this.errorMessage = 'El servicio de Google aún se está cargando en el navegador. Intenta de nuevo en unos segundos.';
      this.cdr.detectChanges();
      return;
    }

    this.googleLoading = true;
    this.cdr.detectChanges();

    // Listener para detectar si el usuario cierra el popup de Google y vuelve a la ventana
    const resetLoadingOnFocus = () => {
      setTimeout(() => {
        window.removeEventListener('focus', resetLoadingOnFocus);
        if (this.googleLoading) {
          this.ngZone.run(() => {
            this.googleLoading = false;
            this.cdr.detectChanges();
          });
        }
      }, 600);
    };
    window.addEventListener('focus', resetLoadingOnFocus);

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        prompt: 'select_account',
        error_callback: (nonOAuthError: any) => {
          window.removeEventListener('focus', resetLoadingOnFocus);
          this.ngZone.run(() => {
            this.googleLoading = false;
            if (nonOAuthError?.type === 'popup_blocked') {
              this.errorMessage = 'El navegador bloqueó la ventana emergente de Google. Por favor, habilítalas para continuar.';
            }
            this.cdr.detectChanges();
          });
        },
        callback: async (tokenResponse: any) => {
          window.removeEventListener('focus', resetLoadingOnFocus);
          if (tokenResponse.error) {
            this.ngZone.run(() => {
              this.googleLoading = false;
              if (tokenResponse.error !== 'access_denied') {
                this.errorMessage = 'Error de Google: ' + tokenResponse.error;
              }
              this.cdr.detectChanges();
            });
            return;
          }

          try {
            // Obtenemos los datos de la cuenta elegida directamente desde la API oficial de Google
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const profile = await userInfoRes.json();

            this.ngZone.run(() => {
              if (!profile || !profile.email) {
                this.googleLoading = false;
                this.errorMessage = 'No se pudo obtener el correo de la cuenta de Google seleccionada.';
                this.cdr.detectChanges();
                return;
              }

              // Verificar en BD: si no existe lo crea, si existe lo deja pasar
              this.authService.googleLogin({
                email: profile.email,
                name: profile.name || profile.email.split('@')[0]
              }).subscribe({
                next: (res) => {
                  this.googleLoading = false;
                  this.cdr.detectChanges();
                  if (res.success) {
                    this.router.navigate(['/dashboard']);
                  }
                },
                error: (err) => {
                  this.googleLoading = false;
                  this.errorMessage = err.error?.message || 'Error al procesar la cuenta en el sistema.';
                  this.cdr.detectChanges();
                }
              });
            });
          } catch (fetchErr) {
            this.ngZone.run(() => {
              this.googleLoading = false;
              this.errorMessage = 'Error al comunicarse con la API de Google para obtener los datos.';
              this.cdr.detectChanges();
            });
          }
        }
      });

      tokenClient.requestAccessToken();
    } catch (err: any) {
      window.removeEventListener('focus', resetLoadingOnFocus);
      this.googleLoading = false;
      this.errorMessage = err?.message || 'Error al abrir el selector de cuentas de Google.';
      this.cdr.detectChanges();
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const credentials = {
      email: this.loginForm.value.email!,
      password: this.loginForm.value.password!
    };

    this.authService.login(credentials).subscribe({
      next: (res) => {
        this.loading = false;
        this.cdr.detectChanges();
        if (res.success) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.errorMessage = 'Correo o contraseña incorrectos.';
        } else {
          this.errorMessage = err.error?.message || 'Error al iniciar sesión. Inténtelo de nuevo.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
