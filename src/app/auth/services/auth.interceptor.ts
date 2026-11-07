import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import {
  catchError,
  EMPTY,
  finalize,
  Observable,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { DataInitializerService } from '../../bootstrapper/services/data-initializer.service';
import { Result } from '../../common/models/result.models';

export const authRetry = new HttpContextToken<boolean>(() => false);
let refreshInFlight: Observable<Result> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const accessToken = localStorage.getItem('accessToken');
  const router = inject(Router);
  const authService = inject(AuthService);
  const initializer = inject(DataInitializerService);

  const cloned = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/refresh')) {
        return throwError(() => err);
      }
      if (req.context.get(authRetry)) {
        return endSession(authService, router, initializer);
      }
      return refreshOnce(authService).pipe(
        switchMap((result) => {
          if (!result.isSuccess) {
            return endSession(authService, router, initializer);
          }
          const newToken = localStorage.getItem('accessToken');
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` },
            context: req.context.set(authRetry, true),
          });
          return next(retryReq).pipe(
            catchError((retryError: HttpErrorResponse) => {
              if (retryError.status === 401) {
                return endSession(authService, router, initializer);
              }
              return throwError(() => retryError);
            })
          );
        })
      );
    })
  );
};

function refreshOnce(authService: AuthService): Observable<Result> {
  if (!refreshInFlight) {
    refreshInFlight = authService.refreshToken().pipe(
      finalize(() => {
        refreshInFlight = null;
      }),
      shareReplay(1)
    );
  }
  return refreshInFlight;
}

function endSession(
  authService: AuthService,
  router: Router,
  initializer: DataInitializerService
) {
  authService.logoutLocally();
  if (initializer.initialized) {
    router.navigate(['/login']);
  }
  return EMPTY;
}
