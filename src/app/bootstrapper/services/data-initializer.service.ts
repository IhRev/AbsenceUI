import { effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';
import { AbsenceTypeService } from '../../absences/services/absence-type.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { catchError, lastValueFrom, of, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataInitializerService {
  #authService = inject(AuthService);
  #absenceTypeService = inject(AbsenceTypeService);
  #organizationsService = inject(OrganizationsService);

  isLoading = signal(true);
  initialized = false;

  constructor() {
    effect(
      async () => {
        this.isLoading.set(true);
        if (this.#authService.initialized()) {
          if (this.#authService.loggedIn()) {
            await this.#loadAll();
          } else {
            this.#unloadAll();
          }
        }
        this.initialized = true;
        this.isLoading.set(false);
      },
      { allowSignalWrites: true }
    );
  }

  #loadAll(): Promise<void> {
    return lastValueFrom(
      this.#organizationsService.load().pipe(
        switchMap(() => {
          const organization = this.#organizationsService.selectedOrganization();
          if (!organization) {
            this.#absenceTypeService.unload();
            return of(null);
          }
          return this.#absenceTypeService.load(organization.id);
        }),
        catchError((err) => {
          console.error(err);
          return of(null);
        })
      )
    ).then(() => {});
  }

  #unloadAll() {
    this.#absenceTypeService.unload();
    this.#organizationsService.unload();
  }
}
