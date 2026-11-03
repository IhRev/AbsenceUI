import { Component, inject, OnInit, signal } from '@angular/core';
import { absenceEventTypeNames, Event } from '../models/events.models';
import { EventsService } from '../services/events.service';
import { DatePipe } from '@angular/common';
import { AbsenceTypeService } from '../../absences/services/absence-type.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css',
})
export class EventsComponent implements OnInit {
  #num = 0;
  readonly #eventsService = inject(EventsService);
  readonly #absenceTypeService = inject(AbsenceTypeService);
  readonly organizationService = inject(OrganizationsService);

  events = signal<Event[]>([]);
  message = signal<string | null>(null);

  ngOnInit() {
    if (!this.organizationService.selectedOrganization()) {
      return;
    }
    this.#load();
  }

  respond(id: number, accepted: boolean) {
    this.message.set(null);
    this.#eventsService.respond(id, accepted).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.events.update((events) => {
            this.#num = 0;
            return events
              .filter((e) => e.id != id)
              .map((e) => {
                e.num = ++this.#num;
                return e;
              });
          });
        } else {
          this.message.set(res.message);
        }
      },
    });
  }

  #load() {
    this.#eventsService.getEvents().subscribe({
      next: (res) => {
        if (!res.isSuccess) {
          this.events.set([]);
          this.message.set(res.message);
          return;
        }
        const rows = res.data!.map(
          (e) =>
            new Event(
              0,
              e.id,
              e.name,
              e.startDate,
              e.endDate,
              this.#absenceTypeName(e.absenceType),
              e.user,
              absenceEventTypeNames[e.absenceEventType] ?? 'Unknown'
            )
        );
        this.#num = 0;
        for (const row of rows) {
          row.num = ++this.#num;
        }
        this.events.set(rows);
        this.message.set(
          rows.length > 0 && !this.#absenceTypeService.types
            ? 'Absence types are not available.'
            : null
        );
      },
    });
  }

  #absenceTypeName(typeId: number) {
    return (
      this.#absenceTypeService.types?.find((type) => type.id === typeId)?.name ??
      'Unknown'
    );
  }
}
