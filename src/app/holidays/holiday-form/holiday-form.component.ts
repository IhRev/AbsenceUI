import {
  Component,
  output,
  input,
  signal,
  inject,
  effect,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CreateHolidayDTO,
  EditHolidayDTO,
  Holiday,
} from '../models/holidays.models';
import { ModalFormComponent } from '../../common/modal-form/modal-form.component';
import { FormErrorComponent } from '../../common/form-error/form-error.component';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { DateHelper } from '../../common/helpers/date-helper';

@Component({
  selector: 'app-holiday-form',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ModalFormComponent,
    FormErrorComponent,
  ],
  templateUrl: './holiday-form.component.html',
  styleUrls: [
    './holiday-form.component.css',
    '../../common/styles/modal-dialog-styles.css',
  ],
})
export class HolidayFormComponent {
  readonly #organizationsService = inject(OrganizationsService);

  holiday = input<Holiday | null>(null);
  closeModal = output();
  submitCreate = output<CreateHolidayDTO>();
  submitEdit = output<EditHolidayDTO>();
  message = signal<string | undefined>(undefined);
  title = signal<string>('');
  form = new FormGroup({
    name: new FormControl('Holiday', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(30),
    ]),
    date: new FormControl('', [Validators.required]),
  });

  constructor() {
    effect(() => {
      const holiday = this.holiday();
      if (holiday) {
        this.form.setValue({
          name: holiday!.name,
          date: DateHelper.getDateOnlyString(
            DateHelper.parseDateOnly(holiday!.date)
          ),
        });
        queueMicrotask(() => this.title.set('Update Holiday'));
      } else {
        this.form.setValue({
          name: 'Holiday',
          date: DateHelper.getDateOnlyString(new Date()),
        });
        queueMicrotask(() => this.title.set('Add Holiday'));
      }
    });
  }

  submit() {
    if (this.form.valid) {
      if (this.holiday()) {
        this.submitEdit.emit(
          new EditHolidayDTO(
            this.holiday()!.id,
            this.form.value.name!,
            DateHelper.parseDateOnly(this.form.value.date!)
          )
        );
      } else {
        this.submitCreate.emit(
          new CreateHolidayDTO(
            this.form.value.name!,
            DateHelper.parseDateOnly(this.form.value.date!),
            this.#organizationsService.selectedOrganization()!.id
          )
        );
      }
    }
  }
}
