import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'error',
    loadComponent: () =>
      import('./common/error-page/error-page.component').then(
        (m) => m.ErrorPageComponent
      ),
  },
  {
    path: 'absences',
    loadComponent: () =>
      import('./absences/absences.component').then(
        (m) => m.AbsenceListComponent
      ),
  },
  { path: 'home', component: HomeComponent },
  {
    path: 'about',
    loadComponent: () =>
      import('./about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./auth/user-profile/user-profile.component').then(
        (m) => m.UserProfileComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'holidays',
    loadComponent: () =>
      import('./holidays/holidays.component').then((m) => m.HolidaysComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin-panel/admin-panel.component').then(
        (m) => m.AdminPanelComponent
      ),
    children: [
      {
        path: 'events',
        loadComponent: () =>
          import('./admin-panel/events/events.component').then(
            (m) => m.EventsComponent
          ),
      },
      {
        path: 'charts',
        loadComponent: () =>
          import('./admin-panel/charts/charts.component').then(
            (m) => m.ChartsComponent
          ),
      },
    ],
  },
  {
    path: 'organizations',
    loadComponent: () =>
      import('./organizations/organizations.component').then(
        (m) => m.OrganizationsComponent
      ),
  },
];
