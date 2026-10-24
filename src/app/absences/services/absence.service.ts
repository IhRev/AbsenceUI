import { inject, Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import {
  AbsenceDTO,
  CreateAbsenceDTO,
  EditAbsenceDTO,
} from '../models/absence.models';
import { catchError, map, Observable, of } from 'rxjs';
import { DataResult, Result } from '../../common/models/result.models';
import { Router } from '@angular/router';
import { toApiFailure } from '../../common/services/error-utilities';
import { environment } from '../../../environments/environment';
import { DateHelper } from '../../common/helpers/date-helper';
import { OrganizationsService } from '../../organizations/services/organizations.service';

@Injectable({
  providedIn: 'root',
})
export class AbsenceService {
  readonly #client = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #organizationsService = inject(OrganizationsService);

  getAbsences(
    startDate: Date,
    endDate: Date
  ): Observable<DataResult<AbsenceDTO[]>> {
    return this.#getAbsences(startDate, endDate);
  }

  getAbsencesBySelectedUsers(
    startDate: Date,
    endDate: Date,
    usersIds: number[]
  ): Observable<DataResult<AbsenceDTO[]>> {
    if (usersIds.length === 0) {
      return of(DataResult.success<AbsenceDTO[]>([]));
    }
    return this.#getAbsences(startDate, endDate, usersIds);
  }

  addAbsence(absence: CreateAbsenceDTO): Observable<DataResult<number | null>> {
    return this.#client
      .post<number>(`${environment.apiUrl}/absences`, absence, {
        observe: 'response',
      })
      .pipe(
        map((res) => {
          if (res.status === 202) {
            return DataResult.success<number | null>(
              null,
              'Absence submitted for approval'
            );
          }
          return DataResult.success<number | null>(
            res.body,
            'Absence added successfully'
          );
        }),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(
              this.#router,
              error,
              (message) => DataResult.fail<number | null>(message),
              { notFound: 'You are not a member of this organization.' }
            )
          )
        )
      );
  }

  editAbsence(absence: EditAbsenceDTO): Observable<Result> {
    return this.#client
      .put(`${environment.apiUrl}/absences`, absence, { observe: 'response' })
      .pipe(
        map((res) =>
          Result.success(
            res.status === 202
              ? 'Change submitted for approval'
              : 'Absence updated successfully',
            res.status === 202
          )
        ),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(this.#router, error, (message) => Result.fail(message), {
              forbidden: 'You can only edit your own absence.',
              notFound: 'Absence was not found.',
            })
          )
        )
      );
  }

  deleteAbsence(id: number): Observable<Result> {
    return this.#client
      .delete(`${environment.apiUrl}/absences/${id}`, { observe: 'response' })
      .pipe(
        map((res) =>
          Result.success(
            res.status === 202
              ? 'Deletion submitted for approval'
              : 'Absence deleted successfully',
            res.status === 202
          )
        ),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(this.#router, error, (message) => Result.fail(message), {
              forbidden: 'You can only delete your own absence.',
              notFound: 'Absence was not found.',
            })
          )
        )
      );
  }

  #getAbsences(
    startDate: Date,
    endDate: Date,
    userIds?: number[]
  ): Observable<DataResult<AbsenceDTO[]>> {
    const range = DateHelper.absenceQueryRange(startDate, endDate);
    let params = new HttpParams()
      .set('startDate', range.start)
      .set('endDate', range.end);
    for (const id of userIds ?? []) {
      params = params.append('userIds', id);
    }

    return this.#client
      .get<AbsenceDTO[]>(
        `${environment.apiUrl}/organizations/${
          this.#organizationsService.selectedOrganization()!.id
        }/absences`,
        { params }
      )
      .pipe(
        map((res: AbsenceDTO[]) => DataResult.success<AbsenceDTO[]>(res)),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(
              this.#router,
              error,
              (message) => DataResult.fail<AbsenceDTO[]>(message),
              {
                forbidden: 'Only an admin can load absences for other members.',
                notFound: 'Organization was not found.',
              }
            )
          )
        )
      );
  }
}
