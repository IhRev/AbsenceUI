import { Component, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ModalFormComponent } from '../../common/modal-form/modal-form.component';
import { FormErrorComponent } from '../../common/form-error/form-error.component';
import { HolidayFilters } from '../models/holidays.models';
import { DateHelper } from '../../common/helpers/date-helper';

@Component({
  selector: 'app-holiday-filters',
  standalone: true,
  imports: [
    FormsModule,
    ModalFormComponent,
    ReactiveFormsModule,
    FormErrorComponent,
  ],
  templateUrl: './holiday-filters.component.html',
  styleUrls: [
    './holiday-filters.component.css',
    '../../common/styles/modal-dialog-styles.css',
  ],
})
export class HolidayFiltersComponent {
  closeModal = output();
  submitModal = output<HolidayFilters>();
  form = new FormGroup({
    startDate: new FormControl(
      DateHelper.getDateOnlyString(DateHelper.getStartOfTheCurrentYear()),
      [Validators.required]
    ),
    endDate: new FormControl(
      DateHelper.getDateOnlyString(DateHelper.getEndOfTheCurrentYear()),
      [Validators.required]
    ),
  });

  submit() {
    if (this.form.valid) {
      this.submitModal.emit(
        new HolidayFilters(
          DateHelper.parseDateOnly(this.form.value.startDate!),
          DateHelper.parseDateOnly(this.form.value.endDate!)
        )
      );
    }
  }
}
