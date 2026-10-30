import { AfterViewInit, Component, inject } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { RouterLink } from '@angular/router';
import { OrganizationsService } from '../organizations/services/organizations.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements AfterViewInit {
  readonly authService = inject(AuthService);
  readonly organizationService = inject(OrganizationsService);

  ngAfterViewInit() {
    const animationObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
        }
      });
    });

    const hiddenElements = document.querySelectorAll('.hidden');
    hiddenElements.forEach((el) => animationObserver.observe(el));
  }
}
