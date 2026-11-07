import { Component, inject, OnInit, signal } from '@angular/core';
import {
  Absence,
  AbsenceDTO,
  CreateAbsenceDTO,
  EditAbsenceDTO,
} from './models/absence.models';
import { AbsenceFormComponent } from './absence-form/absence-form.component';
import { DatePipe } from '@angular/common';
import { AbsenceService } from './services/absence.service';
import { AbsenceTypeService } from './services/absence-type.service';
import { AbsenceFiltersComponent } from './absence-filters/absence-filters.component';
import { AbsenceFilters } from './models/filters.models';
import { NgClass } from '@angular/common';
import { DateHelper } from '../common/helpers/date-helper';
import { OrganizationsService } from '../organizations/services/organizations.service';
import { MemberDTO } from '../organizations/models/organizations.models';
import { AuthService } from '../auth/services/auth.service';
import { MemberNameTransformPipe } from '../common/pipes/member-name-transform.pipe';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'absence-list',
  standalone: true,
  imports: [
    DatePipe,
    AbsenceFormComponent,
    AbsenceFiltersComponent,
    NgClass,
    MemberNameTransformPipe,
    RouterLink,
  ],
  templateUrl: './absences.component.html',
  styleUrls: [
    './absences.component.css',
    '../common/styles/grid-list-styles.css',
  ],
})
export class AbsenceListComponent implements OnInit {
  #num = 0;
  readonly #absenceService = inject(AbsenceService);
  readonly #absenceTypeService = inject(AbsenceTypeService);
  readonly organizationService = inject(OrganizationsService);
  readonly #authService = inject(AuthService);

  members = signal<MemberDTO[]>([]);
  message = signal<string | null>(null);
  isFormOpened = signal(false);
  filtersOpened = signal(false);
  isSuccess = signal(false);
  isProcessing = signal(false);
  absences = signal<Absence[]>([]);
  selectedAbsence = signal<Absence | null>(null);

  ngOnInit() {
    const organization = this.organizationService.selectedOrganization();
    if (!organization) {
      return;
    }
    if (organization.isAdmin) {
      this.isProcessing.set(true);
      this.organizationService.getMembers().subscribe((res) => {
        if (res.isSuccess) {
          this.members.set(res.data!);
          this.isProcessing.set(false);
          this.#loadAbsencesBySelectedUsers(
            DateHelper.getStartOfTheCurrentYear(),
            DateHelper.getEndOfTheCurrentYear(),
            res.data!.map((member) => member.id)
          );
        } else {
          this.isProcessing.set(false);
          this.isSuccess.set(false);
          this.message.set(res.message);
        }
      });
    } else {
      this.members.set([
        new MemberDTO(
          this.#authService.userDetails()!.id,
          this.#authService.userDetails()!.firstName +
            this.#authService.userDetails()!.lastName,
          organization.isAdmin,
          organization.isOwner
        ),
      ]);
      this.#loadAbsences(
        DateHelper.getStartOfTheCurrentYear(),
        DateHelper.getEndOfTheCurrentYear()
      );
    }
  }

  create(absence: CreateAbsenceDTO) {
    this.isFormOpened.set(false);
    this.message.set(null);
    this.isProcessing.set(true);
    this.#absenceService.addAbsence(absence).subscribe({
      next: (result) => {
        if (result.isSuccess && result.data) {
          const type = this.#typeById(absence.type);
          const member = this.members().find(
            (m) => m.id === this.#authService.userDetails()!.id
          );
          if (type && member) {
            const newAbsence = new Absence(
              ++this.#num,
              result.data,
              absence.name,
              type,
              member,
              absence.startDate,
              absence.endDate
            );
            this.absences.update((a) => [...a, newAbsence]);
          }
        }
        this.isProcessing.set(false);
        this.isSuccess.set(result.isSuccess);
        this.message.set(result.message);
      },
    });
  }

  edit(absence: EditAbsenceDTO) {
    this.isFormOpened.set(false);
    this.message.set(null);
    this.isProcessing.set(true);
    this.#absenceService.editAbsence(absence).subscribe({
      next: (result) => {
        if (result.isSuccess && !result.queued) {
          const type = this.#typeById(absence.type);
          if (type) {
            this.selectedAbsence.update((a) => {
              a!.name = absence.name;
              a!.type = type;
              a!.startDate = absence.startDate;
              a!.endDate = absence.endDate;
              return a;
            });
          }
        }
        this.isProcessing.set(false);
        this.isSuccess.set(result.isSuccess);
        this.message.set(result.message);
      },
    });
  }

  delete(id: number) {
    this.message.set(null);
    this.isProcessing.set(true);
    this.#absenceService.deleteAbsence(id).subscribe({
      next: (result) => {
        if (result.isSuccess && !result.queued) {
          this.absences.update((prev) => {
            this.#num = 0;
            return prev
              .filter((a) => a.id !== id)
              .map((a) => {
                a.num = ++this.#num;
                return a;
              });
          });
        }
        this.isProcessing.set(false);
        this.isSuccess.set(result.isSuccess);
        this.message.set(result.message);
      },
    });
  }

  applyFilters(filters: AbsenceFilters) {
    this.filtersOpened.set(false);
    this.message.set(null);
    const organization = this.organizationService.selectedOrganization();
    if (!organization) {
      return;
    }
    if (organization.isAdmin) {
      const selected = filters.membersIds ?? [];
      const userIds =
        selected.length > 0
          ? selected
          : this.members().map((member) => member.id);
      this.#loadAbsencesBySelectedUsers(
        filters.startDate,
        filters.endDate,
        userIds
      );
    } else {
      this.#loadAbsences(filters.startDate, filters.endDate);
    }
  }

  openForm(absence?: Absence) {
    this.selectedAbsence.set(absence ? absence : null);
    this.isFormOpened.set(true);
  }

  #loadAbsencesBySelectedUsers(
    startDate: Date,
    endDate: Date,
    usersIds: number[]
  ) {
    this.isProcessing.set(true);
    this.#absenceService
      .getAbsencesBySelectedUsers(startDate, endDate, usersIds)
      .subscribe({
        next: (result) => {
          if (result.isSuccess) {
            this.#setAbsences(result.data!);
          } else {
            this.#showLoadFailure(result.message);
          }
          this.isProcessing.set(false);
        },
      });
  }

  #loadAbsences(startDate: Date, endDate: Date) {
    this.isProcessing.set(true);
    this.#absenceService.getAbsences(startDate, endDate).subscribe({
      next: (result) => {
        if (result.isSuccess) {
          this.#setAbsences(result.data!);
        } else {
          this.#showLoadFailure(result.message);
        }
        this.isProcessing.set(false);
      },
    });
  }

  #setAbsences(absences: AbsenceDTO[]) {
    const types = this.#absenceTypeService.types;
    if (!types) {
      this.#showLoadFailure('Absence types are not available.');
      return;
    }

    this.#num = 0;
    const rows: Absence[] = [];
    let skipped = 0;
    for (const absence of absences) {
      const type = types.find((item) => item.id === absence.type);
      const member = this.members().find((item) => item.id === absence.userId);
      if (!type || !member) {
        skipped++;
        continue;
      }
      rows.push(
        new Absence(
          ++this.#num,
          absence.id,
          absence.name,
          type,
          member,
          absence.startDate,
          absence.endDate
        )
      );
    }
    this.absences.set(rows);
    if (skipped > 0) {
      this.isSuccess.set(false);
      this.message.set(
        skipped === 1
          ? '1 absence could not be shown.'
          : `${skipped} absences could not be shown.`
      );
    }
  }

  #typeById(typeId: number) {
    return this.#absenceTypeService.types?.find((type) => type.id === typeId);
  }

  #showLoadFailure(message: string) {
    this.absences.set([]);
    this.isSuccess.set(false);
    this.message.set(message);
  }
}
