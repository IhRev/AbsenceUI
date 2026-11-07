import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import {
  CreateOrganizationDTO,
  EditOrganizationDTO,
  MemberDTO,
  Organization,
} from './models/organizations.models';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationFormComponent } from './organization-form/organization-form.component';
import { InviteFormComponent } from './invite-form/invite-form.component';
import { InvitationsService } from './services/invitations.service';
import { PasswordConfirmationComponent } from '../common/password-confirmation/password-confirmation.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { WrappableControlComponent } from '../common/wrappable-control/wrappable-control.component';
import { ConfirmationComponent } from '../common/confirmation/confirmation.component';
import { MemberNameTransformPipe } from '../common/pipes/member-name-transform.pipe';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    OrganizationFormComponent,
    InviteFormComponent,
    PasswordConfirmationComponent,
    NgClass,
    WrappableControlComponent,
    NgTemplateOutlet,
    ConfirmationComponent,
    MemberNameTransformPipe,
  ],
  templateUrl: './organizations.component.html',
  styleUrl: './organizations.component.css',
})
export class OrganizationsComponent implements OnInit {
  readonly #invitationsService = inject(InvitationsService);
  readonly #breakingObserver = inject(BreakpointObserver);

  readonly organizationService = inject(OrganizationsService);
  members = signal<MemberDTO[] | null>(null);
  selectedMember = signal<MemberDTO | null>(null);
  organization = signal<Organization | null>(null);
  message = signal<string | null>(null);
  isFormOpened = signal(false);
  isInviteFormOpened = signal(false);
  confirmationPasswordOpened = signal(false);
  confirmationOpened = signal(false);
  isProcessing = signal(false);
  isSuccess = signal(false);
  isMobile = signal(false);

  constructor() {
    effect(
      () => {
        if (this.organizationService.selectedOrganization()) {
          this.#loadMembers();
        } else {
          this.selectedMember.set(null);
          this.members.set(null);
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit() {
    this.#breakingObserver.observe([Breakpoints.Handset]).subscribe((res) => {
      this.isMobile.set(res.matches);
    });
  }

  selectOrganization(selected: Organization) {
    if (selected === this.organizationService.selectedOrganization()) {
      this.organizationService.unselectOrganization();
    } else {
      this.organizationService.selectOrganization(selected);
    }
  }

  selectMember(selected: MemberDTO) {
    if (selected === this.selectedMember()) {
      this.selectedMember.set(null);
    } else {
      this.selectedMember.set(selected);
    }
  }

  add(organization: CreateOrganizationDTO) {
    this.isFormOpened.set(false);
    this.isProcessing.set(true);
    this.organizationService.add(organization).subscribe({
      next: (res) => {
        this.message.set(res.message);
        this.isSuccess.set(res.isSuccess);
        this.isProcessing.set(false);
      },
    });
  }

  openForm(organization?: Organization) {
    this.isFormOpened.set(true);
    this.organization.set(organization ? organization : null);
  }

  sendInvitation(email: string) {
    this.isInviteFormOpened.set(false);
    this.isProcessing.set(true);
    this.#invitationsService.send(email).subscribe({
      next: (res) => {
        this.message.set(res.message);
        this.isSuccess.set(res.isSuccess);
        this.isProcessing.set(false);
      },
    });
  }

  changeAccess() {
    const member = this.selectedMember()!;
    const isAdmin = !member.isAdmin;
    this.isProcessing.set(true);
    this.organizationService
      .changeAccess(
        this.organizationService.selectedOrganization()!.id,
        member.id,
        isAdmin
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            const updated = new MemberDTO(
              member.id,
              member.fullName,
              isAdmin,
              member.isOwner
            );
            this.members.update((prev) =>
              prev!.map((item) => (item.id === member.id ? updated : item))
            );
            this.selectedMember.set(updated);
          }
          this.isProcessing.set(false);
          this.message.set(res.message);
          this.isSuccess.set(res.isSuccess);
        },
      });
  }

  deleteUser() {
    this.isProcessing.set(true);
    var id = this.selectedMember()!.id;
    this.organizationService
      .deleteMember(this.organizationService.selectedOrganization()!.id, id)
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.selectedMember.set(null);
            this.members.update((prev) => prev!.filter((m) => m.id != id));
          }
          this.isProcessing.set(false);
          this.message.set(res.message);
          this.isSuccess.set(res.isSuccess);
        },
      });
  }

  edit(organization: EditOrganizationDTO) {
    this.isFormOpened.set(false);
    this.isProcessing.set(true);
    this.organizationService.edit(organization).subscribe({
      next: (res) => {
        this.message.set(res.message);
        this.isSuccess.set(res.isSuccess);
        this.isProcessing.set(false);
      },
    });
  }

  passwordConfirmed(password: string) {
    this.confirmationPasswordOpened.set(false);
    this.isProcessing.set(true);
    this.organizationService
      .delete(this.organizationService.selectedOrganization()!.id, password)
      .subscribe({
        next: (res) => {
          this.message.set(res.message);
          this.isSuccess.set(res.isSuccess);
          this.isProcessing.set(false);
        },
      });
  }

  openConfirmation(methodAfterConfirmation: () => void) {
    this.confirmationOpened.set(true);
    this.#methodAfterConfirmation = methodAfterConfirmation.bind(this);
  }

  confirmationSubmitted() {
    this.confirmationOpened.set(false);
    this.#methodAfterConfirmation();
  }

  #methodAfterConfirmation!: () => void;

  #loadMembers() {
    this.isProcessing.set(true);
    this.organizationService.getMembers().subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.selectedMember.set(null);
          this.members.set(res.data!);
          this.selectedMember.set(res.data!.find((m) => m.isOwner)!);
        }
        this.isProcessing.set(false);
      },
    });
  }
}
