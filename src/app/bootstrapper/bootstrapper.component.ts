import { Component, input } from '@angular/core';

@Component({
  selector: 'app-bootstrapper',
  standalone: true,
  imports: [],
  templateUrl: './bootstrapper.component.html',
  styleUrl: './bootstrapper.component.css',
})
export class BootstrapperComponent {
  message = input('Loading Data');
}
