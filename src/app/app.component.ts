import { Component, inject, signal } from '@angular/core';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FooterComponent } from './footer/footer.component';
import { filter } from 'rxjs';
import { BootstrapperComponent } from './bootstrapper/bootstrapper.component';
import { DataInitializerService } from './bootstrapper/services/data-initializer.service';
import { OrganizationsService } from './organizations/services/organizations.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NavBarComponent,
    RouterOutlet,
    FooterComponent,
    BootstrapperComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly #router = inject(Router);

  initializer = inject(DataInitializerService);
  readonly organizationService = inject(OrganizationsService);
  isErrorPage = signal(false);

  constructor() {
    this.#router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        this.isErrorPage.set(event.urlAfterRedirects.startsWith('/error'));
      });
  }
}
