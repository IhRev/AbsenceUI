import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AbsenceTypeDTO } from '../models/absence.models';
import { AbsenceTypeService } from './absence-type.service';

describe('AbsenceTypeService', () => {
  let service: AbsenceTypeService;
  let httpMock: HttpTestingController;
  const router = { navigate: jasmine.createSpy('navigate') };

  beforeEach(() => {
    router.navigate.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AbsenceTypeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns types without storing them', () => {
    const types: AbsenceTypeDTO[] = [{ id: 1, name: 'Vacation' }];
    let received: AbsenceTypeDTO[] | null | undefined;

    service.load(1).subscribe((result) => (received = result));
    httpMock.expectOne(typesUrl(1)).flush(types);

    expect(received).toEqual(types);
    expect(service.types).toBeNull();
  });

  it('returns null when the request fails', () => {
    let received: AbsenceTypeDTO[] | null | undefined;

    service.load(1).subscribe((result) => (received = result));
    httpMock
      .expectOne(typesUrl(1))
      .flush('nope', { status: 500, statusText: 'Server Error' });

    expect(received).toBeNull();
    expect(service.types).toBeNull();
    expect(router.navigate).toHaveBeenCalled();
  });

  function typesUrl(organizationId: number): string {
    return `${environment.apiUrl}/organizations/${organizationId}/absences/types`;
  }
});
