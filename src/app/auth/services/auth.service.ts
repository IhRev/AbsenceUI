import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  EMPTY,
  finalize,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  AuthResponse,
  ChangePasswordRequest,
  DeleteUserRequest,
  RegisterDTO,
  UserCredentials,
  UserDetails,
} from '../models/auth.models';
import { Result } from '../../common/models/result.models';
import { Router } from '@angular/router';
import { navigateToErrorPage } from '../../common/services/error-utilities';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly #client = inject(HttpClient);
  readonly #router = inject(Router);

  loggedIn = signal<boolean>(!!localStorage.getItem('accessToken'));
  userDetails = signal<UserDetails | null>(null);
  initialized = signal(false);

  constructor() {}

  load(): Observable<any> {
    if (!this.loggedIn()) {
      this.initialized.set(true);
      return EMPTY;
    }

    return this.#loadUserDetails().pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(error);
        this.logoutLocally();
        navigateToErrorPage(this.#router, error);
        return EMPTY;
      }),
      finalize(() => this.initialized.set(true))
    );
  }

  updateUserDetails(userDetails: UserDetails): Observable<Result> {
    return this.#client
      .put(`${environment.apiUrl}/users/details`, userDetails)
      .pipe(
        map(() => {
          this.userDetails.set(userDetails);
          return Result.success();
        }),
        catchError((error: HttpErrorResponse) => {
          console.error(error);
          navigateToErrorPage(this.#router, error);
          return of(Result.fail());
        })
      );
  }

  changePassword(request: ChangePasswordRequest): Observable<Result> {
    return this.#client
      .put(`${environment.apiUrl}/users/change_password`, request)
      .pipe(
        map(() => {
          this.logoutLocally();
          return Result.success();
        }),
        catchError((error: HttpErrorResponse) => {
          console.error(error);
          if (error.status === 400) {
            return of(Result.fail(error.error));
          }
          navigateToErrorPage(this.#router, error);
          return of(Result.fail());
        })
      );
  }

  deleteProfile(password: string): Observable<Result> {
    return this.#client
      .delete(`${environment.apiUrl}/users`, {
        body: new DeleteUserRequest(password),
      })
      .pipe(
        map(() => {
          localStorage.clear();
          this.loggedIn.set(false);
          this.userDetails.set(null);
          return Result.success();
        }),
        catchError((error: HttpErrorResponse) => {
          console.error(error);
          if (error.status === 400) {
            return of(Result.fail(error.error));
          }
          navigateToErrorPage(this.#router, error);
          return of(Result.fail());
        })
      );
  }

  login(credentials: UserCredentials): Observable<Result> {
    return this.#client
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        map((res) => {
          if (res.isSuccess) {
            localStorage.setItem('accessToken', res.accessToken!);
            localStorage.setItem('refreshToken', res.refreshToken!);
            this.loggedIn.set(true);
            return Result.success();
          }
          return Result.fail(res.message!);
        }),
        switchMap((res) => {
          if (res.isSuccess) {
            return this.#loadUserDetails().pipe(map(() => Result.success()));
          }
          return of(Result.fail(res.message!));
        }),
        catchError((error: HttpErrorResponse) => {
          console.error(error);
          if (error.status === 400) {
            return of(Result.fail('Incorrect password or email'));
          }
          navigateToErrorPage(this.#router, error);
          return of(Result.fail());
        })
      );
  }

  refreshToken(): Observable<Result> {
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');
    return this.#client
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh_token`, {
        refreshToken: refreshToken,
        accessToken: accessToken,
      })
      .pipe(
        map((res) => {
          if (res.isSuccess) {
            localStorage.setItem('accessToken', res.accessToken!);
            localStorage.setItem('refreshToken', res.refreshToken!);
            return Result.success();
          }
          return Result.fail(res.message!);
        }),
        catchError((error: HttpErrorResponse) => {
          console.error(error);
          return of(Result.fail());
        })
      );
  }

  register(registerDTO: RegisterDTO): Observable<Result> {
    return this.#client
      .post<any>(`${environment.apiUrl}/auth/register`, registerDTO)
      .pipe(
        map(() => Result.success()),
        catchError((error: HttpErrorResponse) => {
          console.error(error);
          navigateToErrorPage(this.#router, error);
          return of(Result.fail());
        })
      );
  }

  logout(): Observable<Result> {
    return this.#client.post(`${environment.apiUrl}/auth/logout`, null).pipe(
      map(() => {
        this.logoutLocally();
        return Result.success();
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(error);
        navigateToErrorPage(this.#router, error);
        return of(Result.fail());
      })
    );
  }

  logoutLocally() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.loggedIn.set(false);
    this.userDetails.set(null);
  }

  #loadUserDetails(): Observable<any> {
    return this.#client
      .get<UserDetails>(`${environment.apiUrl}/users/details`)
      .pipe(
        tap((res) => {
          this.userDetails.set(res);
        })
      );
  }
}
