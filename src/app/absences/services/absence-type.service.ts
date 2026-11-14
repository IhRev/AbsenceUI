import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AbsenceTypeDTO } from '../models/absence.models';
import { environment } from '../../../environments/environment';
import { catchError, Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { navigateToErrorPage } from '../../common/services/error-utilities';

@Injectable({
  providedIn: 'root',
})
export class AbsenceTypeService {
  readonly #client = inject(HttpClient);
  readonly #router = inject(Router);

  types: AbsenceTypeDTO[] | null = null;

  load(organizationId: number): Observable<AbsenceTypeDTO[] | null> {
    return this.#client
      .get<AbsenceTypeDTO[]>(
        `${environment.apiUrl}/organizations/${organizationId}/absences/types`
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error(error);
          if (
            error.status !== 400 &&
            error.status !== 401 &&
            error.status !== 403 &&
            error.status !== 404
          ) {
            navigateToErrorPage(this.#router, error);
          }
          return of(null);
        })
      );
  }

  replace(types: AbsenceTypeDTO[] | null) {
    this.types = types;
  }
}
