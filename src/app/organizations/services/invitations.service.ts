import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  InvitationDTO,
  InviteUserToOrganizationDTO,
} from '../models/invitations.models';
import { DataResult, Result } from '../../common/models/result.models';
import { catchError, map, Observable, of } from 'rxjs';
import { toApiFailure } from '../../common/services/error-utilities';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { OrganizationsService } from './organizations.service';

@Injectable({
  providedIn: 'root',
})
export class InvitationsService {
  readonly #client = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #organizationsService = inject(OrganizationsService);

  get(): Observable<DataResult<InvitationDTO[]>> {
    return this.#client
      .get<InvitationDTO[]>(`${environment.apiUrl}/invitations`)
      .pipe(
        map((res: InvitationDTO[]) => DataResult.success<InvitationDTO[]>(res)),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(
              this.#router,
              error,
              (message) => DataResult.fail<InvitationDTO[]>(message)
            )
          )
        )
      );
  }

  send(userEmail: string): Observable<Result> {
    var dto = new InviteUserToOrganizationDTO(
      userEmail,
      this.#organizationsService.selectedOrganization()!.id
    );
    return this.#client.post(`${environment.apiUrl}/invitations`, dto).pipe(
      map(() => Result.success('User invited successfully')),
      catchError((error: HttpErrorResponse) =>
        of(
          toApiFailure(this.#router, error, (message) => Result.fail(message), {
            forbidden: 'Only an admin can invite a member.',
            notFound: 'Organization was not found.',
          })
        )
      )
    );
  }

  accept(initationId: number, accepted: boolean): Observable<Result> {
    return this.#client
      .post(`${environment.apiUrl}/invitations/${initationId}`, null, {
        params: new HttpParams().set('accepted', accepted),
      })
      .pipe(
        map(() => Result.success()),
        catchError((error: HttpErrorResponse) =>
          of(
            toApiFailure(this.#router, error, (message) => Result.fail(message), {
              forbidden: 'This invitation belongs to someone else.',
              notFound: 'Invitation was not found.',
            })
          )
        )
      );
  }
}
