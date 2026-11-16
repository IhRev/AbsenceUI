import { Component, effect, inject, AfterViewInit, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, Subject, switchMap } from 'rxjs';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { AbsenceDTO } from '../../absences/models/absence.models';
import { AbsenceService } from '../../absences/services/absence.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { HolidaysService } from '../../holidays/services/holidays.service';
import { DateHelper } from '../../common/helpers/date-helper';
import { RouterLink } from '@angular/router';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule, RouterLink],
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.css',
})
export class ChartsComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly #absenceService = inject(AbsenceService);
  readonly #holidaysService = inject(HolidaysService);
  readonly organizationService = inject(OrganizationsService);
  #barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
  };
  #monthes: string[] = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  chart: any = [];
  selectedMembersIds = signal<number[]>([]);
  years = signal<number[]>([]);
  selectedYear = signal(0);
  readonly #chartRequests = new Subject<void>();
  #chartReady = false;

  constructor() {
    this.#chartRequests
      .pipe(
        switchMap(() => this.#chartData()),
        takeUntilDestroyed()
      )
      .subscribe((result) => {
        if (!result || !(this.chart instanceof Chart)) {
          return;
        }
        this.#updateChartData(result.absences, result.holidays);
      });

    effect(
      () => {
        const organization = this.organizationService.selectedOrganization();
        const members = this.organizationService.members();
        if (!organization?.isAdmin || !members || !this.#chartReady) {
          return;
        }
        this.selectedMembersIds.set(members.map((member) => member.id));
        this.loadData();
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit() {
    var currentYear = DateHelper.getCurrentYear();
    const years: number[] = [];
    for (let i = currentYear - 10; i <= currentYear; i++) {
      years.push(i);
    }
    this.years.set(years);
    this.selectedYear.set(currentYear);
  }

  ngAfterViewInit() {
    this.#createChart();
    this.#chartReady = true;
    const members = this.organizationService.members();
    if (members) {
      this.selectedMembersIds.set(members.map((member) => member.id));
    }
    this.loadData();
  }

  loadData() {
    if (!this.organizationService.selectedOrganization()) {
      return;
    }
    this.#chartRequests.next();
  }

  ngOnDestroy() {
    if (this.chart instanceof Chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  #chartData() {
    const organization = this.organizationService.selectedOrganization();
    if (!organization) {
      return of(null);
    }
    const start = DateHelper.getStartOfTheYear(this.selectedYear());
    const end = DateHelper.getEndOfTheYear(this.selectedYear());
    return this.#absenceService
      .getAbsencesBySelectedUsers(start, end, this.selectedMembersIds())
      .pipe(
        switchMap((absencesRes) => {
          if (!absencesRes.isSuccess || !absencesRes.data) {
            return of(null);
          }
          return this.#holidaysService.getHolidays(organization.id, start, end).pipe(
            map((holidaysRes) => {
              if (!holidaysRes.isSuccess || !holidaysRes.data) {
                return null;
              }
              return {
                absences: absencesRes.data!,
                holidays: holidaysRes.data.map((holiday) => holiday.date),
              };
            })
          );
        })
      );
  }

  #createChart() {
    if (this.chart instanceof Chart) {
      this.chart.destroy();
    }
    this.chart = new Chart('canvas', {
      type: 'bar',
      data: {
        labels: this.#monthes,
        datasets: [
          {
            label: 'Absence',
            data: [],
            borderWidth: 1,
          },
        ],
      },
      options: this.#barChartOptions,
    });
  }

  #updateChartData(absences: AbsenceDTO[], holidays: Date[]) {
    if (!(this.chart instanceof Chart)) {
      return;
    }
    const yearStart = DateHelper.getStartOfTheYear(this.selectedYear());
    const yearEnd = DateHelper.getEndOfTheYear(this.selectedYear());
    const holidayDays = new Set(
      holidays.map((holiday) =>
        DateHelper.getDateOnlyString(DateHelper.parseDateOnly(holiday))
      )
    );
    const counts = Array(12).fill(0);
    for (const absence of absences) {
      let date = DateHelper.parseDateOnly(absence.startDate);
      const end = DateHelper.parseDateOnly(absence.endDate);
      if (date < yearStart) {
        date = new Date(yearStart);
      }
      const last = end > yearEnd ? yearEnd : end;
      for (; date <= last; date.setDate(date.getDate() + 1)) {
        if (!holidayDays.has(DateHelper.getDateOnlyString(date))) {
          counts[date.getMonth()]++;
        }
      }
    }
    this.chart.data.datasets[0].data = counts;
    this.chart.update();
  }
}
