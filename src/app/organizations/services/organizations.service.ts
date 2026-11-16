import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  CreateOrganizationDTO,
  DeleteOrganizationRequest,
  EditOrganizationDTO,
  MemberDTO,
  Organization,
  OrganizationDTO,
} from '../models/organizations.models';
import { DataResult, Result } from '../../common/models/result.models';
import {
  ApiFailureMessages,
  toApiFailure,
} from '../../common/services/error-utilities';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  catchError,
  filter,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  share,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { AbsenceTypeService } from '../../absences/services/absence-type.service';

@Injectable({
  providedIn: 'root',
})
export class OrganizationsService {
  readonly #authService = inject(AuthService);
  readonly #client = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #absenceTypes = inject(AbsenceTypeService);

  readonly #requestedOrganizationId = new Subject<number | null>();
  readonly #organizationData: Observable<{ organizationId: number | null }>;

  organizations = signal<Organization[] | null>(null);
  selectedOrganization = signal<Organization | null>(null);
  members = signal<MemberDTO[] | null>(null);
  organizationDataLoading = signal(false);

  constructor() {
    this.#organizationData = this.#requestedOrganizationId.pipe(
      switchMap((organizationId) => this.#loadOrganizationData(organizationId)),
      share(),
    );
    this.#organizationData.subscribe();
  }

  add(organization: CreateOrganizationDTO): Observable<Result> {
    return this.#client
      .post<number>(`${environment.apiUrl}/organizations`, organization)
      .pipe(
        map((res: number) => {
          this.organizations.update((prev) => [
            ...prev!,
            new Organization(res, organization.name, true, true),
          ]);
          return Result.success('New organization added successfully');
        }),
        catchError((error: HttpErrorResponse) =>
          this.#fail(error, (message) => Result.fail(message)),
        ),
      );
  }

  getMembers(): Observable<DataResult<MemberDTO[]>> {
    return this.#fetchMembers(this.selectedOrganization()!.id);
  }

  selectOrganization(organization: Organization) {
    this.#saveOrganizationLocally(organization.id);
    this.selectedOrganization.set(organization);
    this.#requestedOrganizationId.next(organization.id);
  }

  unselectOrganization() {
    this.#removeOrganizationLocally();
    this.selectedOrganization.set(null);
    this.#requestedOrganizationId.next(null);
  }

  edit(organization: EditOrganizationDTO): Observable<Result> {
    return this.#client
      .put(`${environment.apiUrl}/organizations`, organization)
      .pipe(
        map(() => {
          var edited = new Organization(
            organization.id,
            organization.name,
            true,
            true,
          );
          this.organizations.update((prev) =>
            prev!.map((o) => (o.id === edited.id ? edited : o)),
          );
          this.selectedOrganization.set(edited);
          return Result.success('Organization edited successfully');
        }),
        catchError((error: HttpErrorResponse) =>
          this.#fail(error, (message) => Result.fail(message), {
            forbidden: 'Only the owner can rename this organization.',
            notFound: 'Organization was not found.',
          }),
        ),
      );
  }

  delete(id: number, password: string): Observable<Result> {
    return this.#client
      .delete(`${environment.apiUrl}/organizations/${id}`, {
        body: new DeleteOrganizationRequest(password),
      })
      .pipe(
        map(() => {
          this.organizations.update((prev) => prev!.filter((o) => o.id != id));
          this.unselectOrganization();
          return Result.success('Your organization deleted successfully');
        }),
        catchError((error: HttpErrorResponse) =>
          this.#fail(error, (message) => Result.fail(message), {
            forbidden: 'Wrong password, or you are not the owner.',
            notFound: 'Organization was not found.',
          }),
        ),
      );
  }

  deleteMember(organizationId: number, memberId: number): Observable<Result> {
    return this.#client
      .delete(
        `${environment.apiUrl}/organizations/${organizationId}/members/${memberId}`,
      )
      .pipe(
        map(() =>
          Result.success('Member deleted successfully from organization'),
        ),
        catchError((error: HttpErrorResponse) =>
          this.#fail(error, (message) => Result.fail(message), {
            forbidden: 'Only an admin can remove a member.',
            notFound: 'Member was not found.',
          }),
        ),
      );
  }

  changeAccess(
    organizationId: number,
    memberId: number,
    isAdmin: boolean,
  ): Observable<Result> {
    return this.#client
      .put(
        `${environment.apiUrl}/organizations/${organizationId}/members/${memberId}`,
        null,
        { params: new HttpParams().set('isAdmin', isAdmin) },
      )
      .pipe(
        map(() => Result.success('Member access changed successfully')),
        catchError((error: HttpErrorResponse) =>
          this.#fail(error, (message) => Result.fail(message), {
            forbidden: 'Only an admin can change member access.',
            notFound: 'Member was not found.',
          }),
        ),
      );
  }

  load(): Observable<any> {
    return this.#client
      .get<OrganizationDTO[]>(`${environment.apiUrl}/organizations`)
      .pipe(
        switchMap((res: OrganizationDTO[]) => {
          this.organizations.set(
            res.map(
              (dto) =>
                new Organization(dto.id, dto.name, dto.isAdmin, dto.isOwner),
            ),
          );
          const savedId = this.#getSavedOrganization();
          const organization = savedId
            ? this.organizations()!.find((item) => item.id === savedId)
            : undefined;
          if (!organization) {
            if (savedId) {
              this.#removeOrganizationLocally();
            }
            this.selectedOrganization.set(null);
            this.#requestedOrganizationId.next(null);
            return of(undefined);
          }
          this.selectedOrganization.set(organization);
          this.#requestedOrganizationId.next(organization.id);
          return this.#organizationData.pipe(
            filter(
              (result) =>
                result.organizationId === organization.id ||
                this.selectedOrganization()?.id !== organization.id,
            ),
            take(1),
            map(() => undefined),
          );
        }),
        catchError((error: HttpErrorResponse) =>
          this.#fail(error, (message) =>
            DataResult.fail<Organization[]>(message),
          ),
        ),
      );
  }

  unload() {
    this.selectedOrganization.set(null);
    this.organizations.set(null);
    this.#requestedOrganizationId.next(null);
  }

  #loadOrganizationData(
    organizationId: number | null,
  ): Observable<{ organizationId: number | null }> {
    if (organizationId == null) {
      this.members.set(null);
      this.#absenceTypes.replace(null);
      this.organizationDataLoading.set(false);
      return of({ organizationId: null });
    }

    this.organizationDataLoading.set(true);
    this.members.set(null);
    this.#absenceTypes.replace(null);
    return forkJoin({
      types: this.#absenceTypes.load(organizationId),
      members: this.#fetchMembers(organizationId),
    }).pipe(
      tap(({ types, members }) => {
        if (this.selectedOrganization()?.id !== organizationId) {
          return;
        }
        this.#absenceTypes.replace(types);
        this.members.set(members.isSuccess ? (members.data ?? []) : null);
      }),
      map(() => ({ organizationId })),
      finalize(() => {
        if (this.selectedOrganization()?.id === organizationId) {
          this.organizationDataLoading.set(false);
        }
      }),
    );
  }

  #fetchMembers(organizationId: number): Observable<DataResult<MemberDTO[]>> {
    return this.#client
      .get<
        MemberDTO[]
      >(`${environment.apiUrl}/organizations/${organizationId}/members`)
      .pipe(
        map((res: MemberDTO[]) => DataResult.success<MemberDTO[]>(res)),
        catchError((error: HttpErrorResponse) =>
          this.#fail(
            error,
            (message) => DataResult.fail<MemberDTO[]>(message),
            {
              notFound: 'Organization was not found.',
            },
          ),
        ),
      );
  }

  #fail<T>(
    error: HttpErrorResponse,
    fail: (message?: string) => T,
    messages?: ApiFailureMessages,
  ): Observable<T> {
    return of(toApiFailure(this.#router, error, fail, messages));
  }

  #saveOrganizationLocally(organization: number) {
    localStorage.setItem(
      `${this.#authService.userDetails()!.id}:organization`,
      organization.toString(),
    );
  }

  #removeOrganizationLocally() {
    localStorage.removeItem(
      `${this.#authService.userDetails()!.id}:organization`,
    );
  }

  #getSavedOrganization(): number | undefined {
    const organization = localStorage.getItem(
      `${this.#authService.userDetails()!.id}:organization`,
    );
    return organization ? Number(organization) : undefined;
  }
}
