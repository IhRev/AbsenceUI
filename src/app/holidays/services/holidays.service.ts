import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CreateHolidayDTO,
  EditHolidayDTO,
  HolidayDTO,
} from '../models/holidays.models';
import { catchError, map, Observable, of } from 'rxjs';
import { DataResult, Result } from '../../common/models/result.models';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { toApiFailure } from '../../common/services/error-utilities';
import { DateHelper } from '../../common/helpers/date-helper';

@Injectable({
  providedIn: 'root',
})
export class HolidaysService {
  readonly #client = inject(HttpClient);
  readonly #router = inject(Router);

  getHolidays(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ): Observable<DataResult<HolidayDTO[]>> {
    const range = DateHelper.holidayQueryRange(startDate, endDate);
    return this.#client
      .get<HolidayDTO[]>(
        `${environment.apiUrl}/organizations/${organizationId}/holidays`,
        {
          params: new HttpParams()
            .set('startDate', range.start)
            .set('endDate', range.end),
        }
      )
      .pipe(
        map((res: HolidayDTO[]) => DataResult.success<HolidayDTO[]>(res)),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(
              this.#router,
              error,
              (message) => DataResult.fail<HolidayDTO[]>(message),
              { notFound: 'Organization was not found.' }
            )
          )
        )
      );
  }

  addHoliday(holiday: CreateHolidayDTO): Observable<DataResult<number>> {
    return this.#client
      .post<number>(`${environment.apiUrl}/holidays`, holiday)
      .pipe(
        map((res: number) => DataResult.success<number>(res)),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(
              this.#router,
              error,
              (message) => DataResult.fail<number>(message),
              {
                forbidden: 'Only an admin can add a holiday.',
                notFound: 'Organization was not found.',
              }
            )
          )
        )
      );
  }

  editHoliday(holiday: EditHolidayDTO): Observable<Result> {
    return this.#client.put(`${environment.apiUrl}/holidays`, holiday).pipe(
      map(() => Result.success()),
      catchError((error: HttpErrorResponse) =>
        of(
          toApiFailure(this.#router, error, (message) => Result.fail(message), {
            forbidden: 'Only an admin can edit a holiday.',
            notFound: 'Holiday was not found.',
          })
        )
      )
    );
  }

  deleteHoliday(id: number): Observable<Result> {
    return this.#client.delete(`${environment.apiUrl}/holidays/${id}`).pipe(
      map(() => Result.success()),
      catchError((error: HttpErrorResponse) =>
        of(
          toApiFailure(this.#router, error, (message) => Result.fail(message), {
            forbidden: 'Only an admin can delete a holiday.',
            notFound: 'Holiday was not found.',
          })
        )
      )
    );
  }
}
