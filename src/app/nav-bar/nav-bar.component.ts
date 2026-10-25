import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { OrganizationsService } from '../organizations/services/organizations.service';

@Component({
  selector: 'nav-bar',
  standalone: true,
  imports: [RouterLink, RouterModule],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css',
})
export class NavBarComponent {
  readonly organizationService = inject(OrganizationsService);
  readonly authService = inject(AuthService);
  isMenuOpen = signal(false);
  isSubmenuOpen = signal(false);

  linkClicked(tabName?: string) {
    if (this.isMenuOpen()) {
      if (tabName === 'profile') {
        this.isSubmenuOpen.update((open) => !open);
      } else {
        this.isMenuOpen.set(false);
        this.isSubmenuOpen.set(false);
      }
    }
  }

  toggleMenu() {
    this.isMenuOpen.update((prev) => !prev);
  }
}
