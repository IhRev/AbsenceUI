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

  ngOnInit() {
    if (!this.organizationService.selectedOrganization()) {
      return;
    }
    this.#load();
  }

  respond(id: number, accepted: boolean) {
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
        }
      },
    });
  }

  #load() {
    this.#eventsService.getEvents().subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.#num = 0;
          this.events.set(
            res.data!.map(
              (e) =>
                new Event(
                  ++this.#num,
                  e.id,
                  e.name,
                  e.startDate,
                  e.endDate,
                  this.#absenceTypeService.types!.find(
                    (t) => t.id === e.absenceType
                  )!.name,
                  e.user,
                  absenceEventTypeNames[e.absenceEventType] ?? 'Unknown'
                )
            )
          );
        }
      },
    });
  }
}
