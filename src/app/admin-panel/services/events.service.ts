import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { DataResult, Result } from '../../common/models/result.models';
import { EventDTO } from '../models/events.models';
import { environment } from '../../../environments/environment';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { Router } from '@angular/router';
import { toApiFailure } from '../../common/services/error-utilities';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  readonly #client = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #organizationsService = inject(OrganizationsService);

  getEvents(): Observable<DataResult<EventDTO[]>> {
    return this.#client
      .get<EventDTO[]>(
        `${environment.apiUrl}/organizations/${
          this.#organizationsService.selectedOrganization()!.id
        }/absences/events`
      )
      .pipe(
        map((res: EventDTO[]) => DataResult.success<EventDTO[]>(res)),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(
              this.#router,
              error,
              (message) => DataResult.fail<EventDTO[]>(message),
              {
                forbidden: 'Only an admin can view absence requests.',
                notFound: 'Organization was not found.',
              }
            )
          )
        )
      );
  }

  respond(eventId: number, accepted: boolean): Observable<Result> {
    return this.#client
      .post(`${environment.apiUrl}/absences/events/${eventId}`, null, {
        params: new HttpParams().set('accepted', accepted),
      })
      .pipe(
        map(() => Result.success()),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(this.#router, error, (message) => Result.fail(message), {
              forbidden: 'Only an admin can respond to a request.',
              notFound: 'Request was not found.',
            })
          )
        )
      );
  }
}
