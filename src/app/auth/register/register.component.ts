import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { RegisterDTO, UserCredentials } from '../models/auth.models';
import { Router } from '@angular/router';
import { FormErrorComponent } from '../../common/form-error/form-error.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, FormErrorComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  errorMsg = signal<string | null>(null);
  form = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      validators: [Validators.required, Validators.minLength(8)],
    }),
    firstName: new FormControl('', { validators: [Validators.required] }),
    lastName: new FormControl('', { validators: [Validators.required] }),
  });

  submit() {
    if (this.form.invalid) {
      return;
    }

    this.errorMsg.set(null);
    this.#authService
      .register(
        new RegisterDTO(
          this.form.value.firstName!,
          this.form.value.lastName!,
          new UserCredentials(this.form.value.email!, this.form.value.password!)
        )
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.#router.navigate(['/login']);
          } else {
            this.errorMsg.set(res.message);
          }
        },
      });
  }
}
