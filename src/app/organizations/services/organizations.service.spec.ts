import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AbsenceTypeService } from '../../absences/services/absence-type.service';
import { AuthService } from '../../auth/services/auth.service';
import { Organization } from '../models/organizations.models';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let types: AbsenceTypeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: AuthService, useValue: { userDetails: () => ({ id: 1 }) } },
      ],
    });

    service = TestBed.inject(OrganizationsService);
    types = TestBed.inject(AbsenceTypeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('1:organization');
  });

  it('keeps the types and members from the latest selected organization', () => {
    service.selectOrganization(organization(1, 'Alpha'));
    const firstTypes = httpMock.expectOne(typesUrl(1));
    const firstMembers = httpMock.expectOne(membersUrl(1));

    service.selectOrganization(organization(2, 'Beta'));

    expect(firstTypes.cancelled).toBeTrue();
    expect(firstMembers.cancelled).toBeTrue();
    expect(service.members()).toBeNull();
    expect(types.types).toBeNull();

    httpMock.expectOne(typesUrl(2)).flush([{ id: 2, name: 'Sick leave' }]);
    httpMock
      .expectOne(membersUrl(2))
      .flush([{ id: 8, fullName: 'Ada', isAdmin: true, isOwner: true }]);

    expect(service.selectedOrganization()?.id).toBe(2);
    expect(types.types).toEqual([{ id: 2, name: 'Sick leave' }]);
    expect(service.members()).toEqual([
      { id: 8, fullName: 'Ada', isAdmin: true, isOwner: true },
    ]);
    expect(service.organizationDataLoading()).toBeFalse();
  });

  function organization(id: number, name: string): Organization {
    return new Organization(id, name, true, true);
  }

  function typesUrl(organizationId: number): string {
    return `${environment.apiUrl}/organizations/${organizationId}/absences/types`;
  }

  function membersUrl(organizationId: number): string {
    return `${environment.apiUrl}/organizations/${organizationId}/members`;
  }
});
