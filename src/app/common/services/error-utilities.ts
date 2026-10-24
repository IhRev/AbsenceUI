import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

export function navigateToErrorPage(router: Router, error: HttpErrorResponse) {
  router.navigate(['/error'], {
    queryParams: { status: error.status },
  });
}

export function readApiErrorMessage(error: HttpErrorResponse): string | null {
  const body = error.error;
  if (typeof body === 'string' && body.trim().length > 0) {
    return body;
  }

  if (
    body &&
    typeof body === 'object' &&
    'errors' in body &&
    body.errors &&
    typeof body.errors === 'object'
  ) {
    const messages: string[] = [];
    for (const value of Object.values(body.errors as Record<string, unknown>)) {
      if (!Array.isArray(value)) {
        continue;
      }
      for (const item of value) {
        if (typeof item === 'string' && item.trim().length > 0) {
          messages.push(item);
        }
      }
    }
    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  return null;
}

export interface ApiFailureMessages {
  forbidden?: string;
  notFound?: string;
}

export function toApiFailure<T>(
  router: Router,
  error: HttpErrorResponse,
  fail: (message?: string) => T,
  messages: ApiFailureMessages = {}
): T {
  console.error(error);
  if (error.status === 400 || error.status === 401) {
    return fail(readApiErrorMessage(error) ?? undefined);
  }
  if (error.status === 403) {
    return fail(messages.forbidden ?? 'You do not have permission to do that.');
  }
  if (error.status === 404) {
    return fail(messages.notFound ?? 'Not found.');
  }
  navigateToErrorPage(router, error);
  return fail();
}
