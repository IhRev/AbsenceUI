import { Component, inject, OnInit, signal } from '@angular/core';
import { Chart, ChartConfiguration, ChartType } from 'chart.js/auto';
import { AbsenceDTO } from '../../absences/models/absence.models';
import { AbsenceService } from '../../absences/services/absence.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { MemberDTO } from '../../organizations/models/organizations.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { HolidaysService } from '../../holidays/services/holidays.service';
import { DateHelper } from '../../common/helpers/date-helper';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule, RouterLink],
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.css',
})
export class ChartsComponent implements OnInit {
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
  allMembers = signal<MemberDTO[] | null>(null);
  selectedMembersIds = signal<number[]>([]);
  years = signal<number[]>([]);
  selectedYear = signal(0);

  ngOnInit() {
    var currentYear = DateHelper.getCurrentYear();
    const years: number[] = [];
    for (let i = currentYear - 10; i <= currentYear; i++) {
      years.push(i);
    }
    this.years.set(years);
    this.selectedYear.set(currentYear);

    const organization = this.organizationService.selectedOrganization();
    if (organization && organization.isAdmin) {
      this.organizationService.getMembers().subscribe((res) => {
        if (res.isSuccess) {
          this.allMembers.set(res.data!);
          this.selectedMembersIds.set(this.allMembers()!.map((m) => m.id));
          this.#createChart();
          this.loadData();
        }
      });
    }
  }

  loadData() {
    const organization = this.organizationService.selectedOrganization();
    if (!organization) {
      return;
    }
    const start = DateHelper.getStartOfTheYear(this.selectedYear());
    const end = DateHelper.getEndOfTheYear(this.selectedYear());
    this.#absenceService
      .getAbsencesBySelectedUsers(start, end, this.selectedMembersIds())
      .subscribe({
        next: (absencesRes) => {
          if (absencesRes.isSuccess) {
            this.#holidaysService
              .getHolidays(
                organization.id,
                start,
                end
              )
              .subscribe({
                next: (holidaysRes) => {
                  if (holidaysRes.isSuccess) {
                    this.#updateChartData(
                      absencesRes.data!,
                      holidaysRes.data!.map((h) => h.date)
                    );
                  }
                },
              });
          }
        },
      });
  }

  #createChart() {
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
    const counts = Array(12).fill(0);
    for (const absence of absences) {
      for (
        let date = new Date(absence.startDate);
        date <= new Date(absence.endDate);
        date.setDate(date.getDate() + 1)
      ) {
        if (!holidays.includes(date)) {
          counts[date.getMonth()]++;
        }
      }
    }
    this.chart.data.datasets[0].data = counts;
    this.chart.update();
  }
}
