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
  AuthTokens,
  ChangePasswordRequest,
  DeleteUserRequest,
  RegisterDTO,
  UserCredentials,
  UserDetails,
} from '../models/auth.models';
import { Result } from '../../common/models/result.models';
import { Router } from '@angular/router';
import {
  navigateToErrorPage,
  toApiFailure,
} from '../../common/services/error-utilities';
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
        this.logoutLocally();
        if (error.status !== 401) {
          navigateToErrorPage(this.#router, error);
        }
        console.error(error);
        return EMPTY;
      }),
      finalize(() => this.initialized.set(true))
    );
  }

  updateUserDetails(firstName: string, lastName: string): Observable<Result> {
    return this.#client
      .put(`${environment.apiUrl}/users/details`, { firstName, lastName })
      .pipe(
        map(() => {
          const current = this.userDetails();
          if (current) {
            this.userDetails.set(
              new UserDetails(current.id, firstName, lastName, current.email)
            );
          }
          return Result.success();
        }),
        catchError((error: HttpErrorResponse) =>
          of(toApiFailure(this.#router, error, (message) => Result.fail(message)))
        )
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
        catchError((error: HttpErrorResponse) =>
          of(toApiFailure(this.#router, error, (message) => Result.fail(message)))
        )
      );
  }

  deleteProfile(password: string): Observable<Result> {
    return this.#client
      .delete(`${environment.apiUrl}/users`, {
        body: new DeleteUserRequest(password),
      })
      .pipe(
        map(() => {
          const userId = this.userDetails()?.id;
          if (userId != null) {
            localStorage.removeItem(`${userId}:organization`);
          }
          this.logoutLocally();
          return Result.success();
        }),
        catchError((error: HttpErrorResponse) =>
          of(toApiFailure(this.#router, error, (message) => Result.fail(message)))
        )
      );
  }

  login(credentials: UserCredentials): Observable<Result> {
    return this.#client
      .post<AuthTokens>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((tokens) => {
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          this.loggedIn.set(true);
        }),
        switchMap(() =>
          this.#loadUserDetails().pipe(map(() => Result.success()))
        ),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(this.#router, error, (message) => Result.fail(message))
          )
        )
      );
  }

  refreshToken(): Observable<Result> {
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');
    return this.#client
      .post<AuthTokens>(`${environment.apiUrl}/auth/refresh_token`, {
        refreshToken: refreshToken,
        accessToken: accessToken,
      })
      .pipe(
        map((tokens) => {
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          return Result.success();
        }),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(this.#router, error, (message) => Result.fail(message))
          )
        )
      );
  }

  register(registerDTO: RegisterDTO): Observable<Result> {
    return this.#client
      .post(`${environment.apiUrl}/auth/register`, registerDTO)
      .pipe(
        map(() => Result.success()),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(this.#router, error, (message) => Result.fail(message))
          )
        )
      );
  }

  logout(): Observable<Result> {
    return this.#client.post(`${environment.apiUrl}/auth/logout`, null).pipe(
      map(() => {
        this.logoutLocally();
        return Result.success();
      }),
      catchError((error: HttpErrorResponse) =>
        of(toApiFailure(this.#router, error, (message) => Result.fail(message)))
      )
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
