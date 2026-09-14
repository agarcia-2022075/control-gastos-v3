import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const token = sessionStorage.getItem('auth_token');

  let request = req;
  if (token) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(request).pipe(
    tap(() => {
      // Reiniciar temporizador de inactividad con cada petición HTTP exitosa
      sessionService.resetInactivityTimer();
    }),
    catchError((error: HttpErrorResponse) => {
      // Ignorar 401 en endpoints de autenticación (login / register) para mostrar el mensaje de error en el formulario en lugar del modal de sesión caducada
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      if (error.status === 401 && !isAuthEndpoint) {
        sessionService.notifySessionExpired();
      }
      return throwError(() => error);
    })
  );
};
