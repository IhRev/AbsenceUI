import { Component, inject, output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ChangePasswordRequest } from '../../models/auth.models';
import { Router } from '@angular/router';
import { PasswordConfirmationComponent } from '../../../common/password-confirmation/password-confirmation.component';
import { Message } from '../../models/user-profile.models';
import { FormErrorComponent } from '../../../common/form-error/form-error.component';

@Component({
  selector: 'app-user-security-tab',
  standalone: true,
  imports: [
    PasswordConfirmationComponent,
    FormsModule,
    ReactiveFormsModule,
    FormErrorComponent,
  ],
  templateUrl: './user-security-tab.component.html',
  styleUrl: './user-security-tab.component.css',
})
export class UserSecurityTabComponent {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  form = new FormGroup({
    oldPassword: new FormControl('', {
      validators: [Validators.required, Validators.minLength(6)],
    }),
    newPassword: new FormControl('', {
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });
  isProcessing = signal(false);
  confirmationOpened = signal(false);
  displayMessage = output<Message>();

  submit() {
    if (this.form.invalid) {
      return;
    }

    this.isProcessing.set(true);
    this.#authService
      .changePassword(
        new ChangePasswordRequest(
          this.form.value.oldPassword!,
          this.form.value.newPassword!
        )
      )
      .subscribe({
        next: (res) => {
          this.isProcessing.set(false);
          this.#displayMsg(res.isSuccess, res.message);
          if (res.isSuccess) {
            this.#router.navigate(['/login']);
          }
        },
      });
  }

  confirmationSubmitted(password: string) {
    this.confirmationOpened.set(false);
    this.isProcessing.set(true);
    this.#authService.deleteProfile(password).subscribe({
      next: (res) => {
        this.isProcessing.set(false);
        this.#displayMsg(res.isSuccess, res.message);
        if (res.isSuccess) {
          this.#router.navigate(['/home']);
        }
      },
    });
  }

  logout() {
    this.isProcessing.set(true);
    this.#authService.logout().subscribe({
      next: (res) => {
        this.isProcessing.set(false);
        this.#displayMsg(res.isSuccess, res.message);
        if (res.isSuccess) {
          this.#router.navigate(['/home']);
        }
      },
    });
  }

  #displayMsg(isSuccess: boolean, message: string | null): void {
    this.displayMessage.emit(new Message(isSuccess, message));
  }
}
