import { Component, input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-form-error',
  standalone: true,
  imports: [],
  templateUrl: './form-error.component.html',
  styleUrl: './form-error.component.css',
})
export class FormErrorComponent {
  form = input<FormGroup>();
  name = input<string>();

  get isInvalid(): boolean {
    const control = this.form()!.get(this.name()!);
    return !!control && control.invalid && control.touched;
  }

  getErrorMessage(errorKey: string, errorValue: any): string {
    switch (errorKey) {
      case 'required':
        return 'This field is required.';
      case 'email':
        return 'Please enter a valid email address.';
      case 'minlength':
        return `Minimum length is ${errorValue.requiredLength}.`;
      case 'maxlength':
        return `Maximum length is ${errorValue.requiredLength}.`;
      default:
        return 'Invalid field.';
    }
  }

  getErrors(): { key: string; value: any }[] {
    const control = this.form()!.get(this.name()!);
    const errors = control?.errors;
    return errors
      ? Object.entries(errors).map(([key, value]) => ({ key, value }))
      : [];
  }
}
