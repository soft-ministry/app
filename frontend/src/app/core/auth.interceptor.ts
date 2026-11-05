import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const authRequest = token ? request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }) : request;

  return next(authRequest).pipe(catchError((error) => {
    if (error instanceof HttpErrorResponse && error.status === 401 && !isLoginRequest(request.url)) {
      auth.expireSession();
    }
    return throwError(() => error);
  }));
};

function isLoginRequest(url: string): boolean {
  return url.includes('/auth/login');
}
