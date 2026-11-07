import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [],
  templateUrl: './error-page.component.html',
  styleUrl: './error-page.component.css',
})
export class ErrorPageComponent {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  statusCode = signal(404);

  constructor() {
    this.#route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const raw = params.get('status');
      const parsed = raw ? Number(raw) : NaN;
      this.statusCode.set(Number.isFinite(parsed) ? parsed : 404);
    });
  }

  goHome() {
    this.#router.navigate(['/home']);
  }
}
