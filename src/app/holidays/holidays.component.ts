import { Component, inject, OnInit, signal } from '@angular/core';
import { HolidayFormComponent } from './holiday-form/holiday-form.component';
import { DatePipe, NgClass } from '@angular/common';
import { HolidaysService } from './services/holidays.service';
import {
  CreateHolidayDTO,
  EditHolidayDTO,
  Holiday,
  HolidayDTO,
  HolidayFilters,
} from './models/holidays.models';
import { OrganizationsService } from '../organizations/services/organizations.service';
import { HolidayFiltersComponent } from './holiday-filters/holiday-filters.component';
import { DateHelper } from '../common/helpers/date-helper';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-holidays',
  standalone: true,
  imports: [
    DatePipe,
    HolidayFormComponent,
    NgClass,
    HolidayFiltersComponent,
    RouterLink,
  ],
  templateUrl: './holidays.component.html',
  styleUrls: [
    './holidays.component.css',
    '../common/styles/grid-list-styles.css',
  ],
})
export class HolidaysComponent implements OnInit {
  #num = 0;
  readonly #holidaysService = inject(HolidaysService);

  isProcessing = signal(false);
  isSuccess = signal(false);
  message = signal<string | null>(null);
  filtersOpened = signal(false);
  isFormOpened = signal(false);
  holidays = signal<Holiday[]>([]);
  selectedHoliday = signal<Holiday | null>(null);
  readonly organizationService = inject(OrganizationsService);

  ngOnInit() {
    if (!this.organizationService.selectedOrganization()) {
      return;
    }
    this.#loadHolidays(
      DateHelper.getStartOfTheCurrentYear(),
      DateHelper.getEndOfTheCurrentYear()
    );
  }

  create(holiday: CreateHolidayDTO) {
    this.isFormOpened.set(false);
    this.#startProcess();
    this.#holidaysService.addHoliday(holiday).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          const newHoliday = new Holiday(
            ++this.#num,
            res.data!,
            holiday.name,
            holiday.date
          );
          this.holidays.update((prev) => [...prev, newHoliday]);
          this.message.set('Holiday created successfully!');
        } else {
          this.message.set(res.message);
        }
        this.isSuccess.set(res.isSuccess);
        this.isProcessing.set(false);
      },
    });
  }

  edit(holiday: EditHolidayDTO) {
    this.isFormOpened.set(false);
    this.#startProcess();
    this.#holidaysService.editHoliday(holiday).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.selectedHoliday.update((h) => {
            h!.name = holiday.name;
            h!.date = holiday.date;
            return h;
          });
          this.message.set('Holiday edited successfully!');
        } else {
          this.message.set(res.message);
        }
        this.isSuccess.set(res.isSuccess);
        this.isProcessing.set(false);
      },
    });
  }

  delete(id: number) {
    this.#startProcess();
    this.#holidaysService.deleteHoliday(id).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.holidays.update((holidays) => {
            this.#num = 0;
            return holidays
              .filter((a) => a.id !== id)
              .map((h) => {
                h.num = ++this.#num;
                return h;
              });
          });
          this.message.set('Holiday deleted successfully!');
        } else {
          this.message.set(res.message);
        }
        this.isSuccess.set(res.isSuccess);
        this.isProcessing.set(false);
      },
    });
  }

  applyFilters(filters: HolidayFilters) {
    this.filtersOpened.set(false);
    if (!this.organizationService.selectedOrganization()) {
      return;
    }
    this.#loadHolidays(filters.startDate, filters.endDate);
  }

  openForm(holiday?: Holiday) {
    this.selectedHoliday.set(holiday ? holiday : null);
    this.isFormOpened.set(true);
  }

  #startProcess() {
    this.isProcessing.set(true);
    this.message.set(null);
  }

  #loadHolidays(startDate: Date, endDate: Date): void {
    this.#startProcess();
    this.#holidaysService
      .getHolidays(
        this.organizationService.selectedOrganization()!.id,
        startDate,
        endDate
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.#setHolidays(res.data!);
          } else {
            this.isSuccess.set(false);
            this.message.set(res.message);
          }
          this.isProcessing.set(false);
        },
      });
  }

  #setHolidays(holidays: HolidayDTO[]) {
    this.#num = 0;
    this.holidays.set(
      holidays.map((h) => new Holiday(++this.#num, h.id, h.name, h.date))
    );
  }
}
