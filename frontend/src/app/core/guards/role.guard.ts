import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, of } from 'rxjs';

export const roleGuard: CanActivateFn = () => {
  const router = inject(Router);
  return router.createUrlTree(['/dashboard']);
};
