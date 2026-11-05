import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const inProgressGuard: CanActivateFn = () => {
  return inject(Router).createUrlTree(['/dashboard']);
};
