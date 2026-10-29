import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataInitializerService } from '../../bootstrapper/services/data-initializer.service';
import { Result } from '../../common/models/result.models';
import { AuthService } from './auth.service';
import { authInterceptor, authRetry } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let refreshResult: Subject<Result>;
  const auth = {
    refreshToken: jasmine.createSpy('refreshToken'),
    logoutLocally: jasmine.createSpy('logoutLocally'),
  };
  const router = { navigate: jasmine.createSpy('navigate') };
  const initializer = { initialized: true };

  beforeEach(() => {
    refreshResult = new Subject<Result>();
    auth.refreshToken.calls.reset();
    auth.logoutLocally.calls.reset();
    router.navigate.calls.reset();
    initializer.initialized = true;
    auth.refreshToken.and.returnValue(
      refreshResult.pipe(
        tap((result) => {
          if (result.isSuccess) {
            localStorage.setItem('accessToken', 'new-token');
            localStorage.setItem('refreshToken', 'new-refresh');
          }
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: DataInitializerService, useValue: initializer },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.setItem('accessToken', 'old-token');
    localStorage.setItem('refreshToken', 'old-refresh');
  });

  afterEach(() => {
    if (!refreshResult.closed) {
      refreshResult.complete();
    }
    httpMock.verify();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  });

  it('adds the bearer token when one is stored', () => {
    http.get('/api/items').subscribe();

    const request = httpMock.expectOne('/api/items');
    expect(request.request.headers.get('Authorization')).toBe('Bearer old-token');
    request.flush({});
    expect(auth.refreshToken).not.toHaveBeenCalled();
  });

  it('sends the request unchanged when no token is stored', () => {
    localStorage.removeItem('accessToken');
    http.get('/api/items').subscribe();

    const request = httpMock.expectOne('/api/items');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('passes a non-401 error through', () => {
    const outcome = listen(http.get('/api/items'));

    httpMock.expectOne('/api/items').flush(null, { status: 500, statusText: 'Server Error' });

    expect(outcome.error?.status).toBe(500);
    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(auth.logoutLocally).not.toHaveBeenCalled();
  });

  it('passes a 401 from the refresh call through', () => {
    const outcome = listen(http.post('/api/auth/refresh_token', {}));

    httpMock
      .expectOne('/api/auth/refresh_token')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(outcome.error?.status).toBe(401);
    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(auth.logoutLocally).not.toHaveBeenCalled();
  });

  it('refreshes once and retries with the new token', () => {
    const outcome = listen(http.get('/api/items'));
    httpMock.expectOne('/api/items').flush(null, { status: 401, statusText: 'Unauthorized' });

    succeedRefresh();

    const retry = httpMock.expectOne('/api/items');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retry.request.context.get(authRetry)).toBeTrue();
    retry.flush({ ok: true });

    expect(outcome.value).toEqual({ ok: true });
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(auth.logoutLocally).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shares one refresh between concurrent 401s', () => {
    const first = listen(http.get('/api/items'));
    const second = listen(http.get('/api/items'));
    const requests = httpMock.match('/api/items');
    expect(requests.length).toBe(2);
    requests.forEach((request) =>
      request.flush(null, { status: 401, statusText: 'Unauthorized' })
    );
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);

    succeedRefresh();

    const retries = httpMock.match('/api/items');
    expect(retries.length).toBe(2);
    retries.forEach((request) => {
      expect(request.request.headers.get('Authorization')).toBe('Bearer new-token');
      request.flush({ ok: true });
    });

    expect(first.value).toEqual({ ok: true });
    expect(second.value).toEqual({ ok: true });
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the refresh fails', () => {
    const outcome = listen(http.get('/api/items'));
    httpMock.expectOne('/api/items').flush(null, { status: 401, statusText: 'Unauthorized' });

    refreshResult.next(Result.fail('expired'));
    refreshResult.complete();

    expect(outcome.completed).toBeTrue();
    expect(outcome.value).toBeUndefined();
    expect(auth.logoutLocally).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    httpMock.expectNone('/api/items');
  });

  it('logs out without opening login when startup has not finished', () => {
    initializer.initialized = false;
    listen(http.get('/api/items'));
    httpMock.expectOne('/api/items').flush(null, { status: 401, statusText: 'Unauthorized' });

    refreshResult.next(Result.fail());
    refreshResult.complete();

    expect(auth.logoutLocally).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ends the session when the retry is still unauthorized', () => {
    const outcome = listen(http.get('/api/items'));
    httpMock.expectOne('/api/items').flush(null, { status: 401, statusText: 'Unauthorized' });
    succeedRefresh();

    httpMock.expectOne('/api/items').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(outcome.completed).toBeTrue();
    expect(outcome.error).toBeUndefined();
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(auth.logoutLocally).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    httpMock.expectNone('/api/items');
  });

  it('passes a non-401 retry error through', () => {
    const outcome = listen(http.get('/api/items'));
    httpMock.expectOne('/api/items').flush(null, { status: 401, statusText: 'Unauthorized' });
    succeedRefresh();

    httpMock.expectOne('/api/items').flush(null, { status: 500, statusText: 'Server Error' });

    expect(outcome.error?.status).toBe(500);
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(auth.logoutLocally).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ends the session for a 401 that was already retried', () => {
    const outcome = listen(
      http.get('/api/items', { context: new HttpContext().set(authRetry, true) })
    );

    const request = httpMock.expectOne('/api/items');
    expect(request.request.context.get(authRetry)).toBeTrue();
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(outcome.completed).toBeTrue();
    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(auth.logoutLocally).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });

  function succeedRefresh() {
    refreshResult.next(Result.success());
    refreshResult.complete();
  }
});

function listen<T>(request: { subscribe: (observer: object) => void }) {
  const outcome: { value?: T; error?: HttpErrorResponse; completed?: boolean } = {};
  request.subscribe({
    next: (value: T) => (outcome.value = value),
    error: (error: HttpErrorResponse) => (outcome.error = error),
    complete: () => (outcome.completed = true),
  });
  return outcome;
}
