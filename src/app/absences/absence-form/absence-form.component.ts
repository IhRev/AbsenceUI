import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  Absence,
  CreateAbsenceDTO,
  EditAbsenceDTO,
} from '../models/absence.models';
import { AbsenceTypeService } from '../services/absence-type.service';
import { ModalFormComponent } from '../../common/modal-form/modal-form.component';
import { FormErrorComponent } from '../../common/form-error/form-error.component';
import { DateHelper } from '../../common/helpers/date-helper';
import { OrganizationsService } from '../../organizations/services/organizations.service';

@Component({
  selector: 'app-absence-form',
  standalone: true,
  imports: [
    FormsModule,
    ModalFormComponent,
    ReactiveFormsModule,
    FormErrorComponent,
  ],
  templateUrl: './absence-form.component.html',
  styleUrls: [
    './absence-form.component.css',
    '../../common/styles/modal-dialog-styles.css',
  ],
})
export class AbsenceFormComponent {
  readonly #organizationsService = inject(OrganizationsService);

  absence = input<Absence | null>(null);
  closeModal = output();
  submitCreate = output<CreateAbsenceDTO>();
  submitEdit = output<EditAbsenceDTO>();
  title = signal('');
  form = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(30),
    ]),
    selectedType: new FormControl<number>(1, [Validators.required]),
    startDate: new FormControl('', [Validators.required]),
    endDate: new FormControl('', [Validators.required]),
  });
  readonly absenceTypeService = inject(AbsenceTypeService);

  constructor() {
    effect(() => {
      const absence = this.absence()!;
      if (absence) {
        this.form.setValue({
          name: absence.name,
          selectedType: absence.type.id,
          startDate: DateHelper.getDateOnlyString(new Date(absence.startDate)),
          endDate: DateHelper.getDateOnlyString(new Date(absence.endDate)),
        });
        queueMicrotask(() => this.title.set('Edit'));
      } else {
        this.form.setValue({
          name: 'Absence',
          selectedType: this.absenceTypeService.types![0].id,
          startDate: DateHelper.getDateOnlyString(new Date()),
          endDate: DateHelper.getDateOnlyString(new Date()),
        });
        queueMicrotask(() => this.title.set('Add'));
      }
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const absence = this.absence();
    if (absence) {
      this.submitEdit.emit(
        new EditAbsenceDTO(
          absence.id,
          this.form.controls.name.value!,
          this.form.controls.selectedType.value!,
          new Date(this.form.controls.startDate.value!),
          new Date(this.form.controls.endDate.value!)
        )
      );
    } else {
      this.submitCreate.emit(
        new CreateAbsenceDTO(
          this.form.controls.name.value!,
          this.form.controls.selectedType.value!,
          new Date(this.form.controls.startDate.value!),
          new Date(this.form.controls.endDate.value!),
          this.#organizationsService.selectedOrganization()!.id
        )
      );
    }
  }
}
