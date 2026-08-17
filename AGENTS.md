# AGENTS.md

Angular 18 single-page app (`Absence.UI`) for tracking employee absences, holidays and
organization events. It is a pure frontend: all data comes from a separate REST API that is
reverse-proxied under `/api/` in production.

## Commands

```bash
npm install          # install dependencies
npm start            # ng serve, development configuration, http://localhost:4200
npm run build        # ng build, production configuration by default
npm run watch        # incremental development build
npm test             # ng test (Karma + Jasmine)
```

There is no linter or formatter configured. Formatting follows Prettier defaults enforced by
`.editorconfig`: 2-space indent, single quotes in TypeScript, final newline, no trailing
whitespace.

There are currently **no spec files in the repo**, so `npm test` runs an empty suite. Verify
changes with `npm run build` (production config, and note the strict bundle budgets below).

## Architecture

Standalone-component app, no NgModules. Bootstrapped from `src/main.ts` via `appConfig` in
`src/app/app.config.ts`, which provides the router, async animations, `HttpClient` with
`authInterceptor`, and an `APP_INITIALIZER` calling `AuthService.load()`.

Code is organized by feature folder under `src/app/`, each with its own `models/` and
`services/` subfolder:

- `auth/` — login, register, user profile tabs, `AuthService`, `authInterceptor`
- `absences/` — absence list, form, filters
- `holidays/` — holiday list, form, filters
- `organizations/` — organization CRUD, members, invitations
- `admin-panel/` — events and charts, rendered into a child `<router-outlet>`
- `bootstrapper/` — startup loading screen and `DataInitializerService`
- `common/` — shared components (`modal-form`, `confirmation`, `form-error`,
  `password-confirmation`, `wrappable-control`, `error-page`), `Result` models, `DateHelper`,
  shared CSS in `common/styles/`

Routes live in `src/app/app.routes.ts`. Only `organizations` is lazy loaded via
`loadComponent`; everything else is eagerly imported. There are no route guards — access is
enforced by the API plus conditional rendering in templates.

### Startup sequence

1. `APP_INITIALIZER` runs `AuthService.load()`. If no `accessToken` is in `localStorage` it
   returns `EMPTY` immediately; otherwise it fetches user details.
2. `DataInitializerService` has a constructor `effect` (with `allowSignalWrites: true`) that
   watches `AuthService.initialized()` / `loggedIn()` and `forkJoin`s the loads of absence
   types, event types and organizations, or unloads them on logout.
3. `AppComponent` shows `BootstrapperComponent` while `initializer.isLoading()` is true.

Anything that depends on absence types, event types or the selected organization can assume
they are loaded, which is why components freely use non-null assertions such as
`this.#organizationsService.selectedOrganization()!`.

### Selected organization

`OrganizationsService.selectedOrganization` is a signal that most feature services read to
build their URLs. It is persisted per user in `localStorage` under the key
`` `${userId}:organization` ``. Any new feature scoped to an organization should follow the
same pattern rather than passing the id through the router.

### Auth

JWT access and refresh tokens are stored in `localStorage` as `accessToken` / `refreshToken`.
`authInterceptor` attaches the bearer header, and on a `401` (for any URL not containing
`/refresh`) calls `AuthService.refreshToken()` and retries the original request once; on
failure it clears tokens locally and redirects to `/login`.

## Conventions

Follow these closely — the codebase is very consistent about them.

**State is signals, not RxJS subjects.** Component and service state uses
`signal(...)`/`.set(...)`/`.update(...)`. RxJS is used only for HTTP pipelines.

**Injection is `inject()` into private `#` fields**, not constructor parameters:

```ts
readonly #client = inject(HttpClient);
readonly #router = inject(Router);
```

Native private `#` naming is also used for private methods (`#loadAbsences()`). Signals meant
for the template stay public.

**Services never throw and never return raw errors.** Every HTTP call maps to
`Result` / `DataResult<T>` from `src/app/common/models/result.models.ts` and swallows the
error, so subscribers only branch on `isSuccess`. The standard shape is:

```ts
return this.#client.get<AbsenceDTO[]>(url).pipe(
  map((res) => DataResult.success(res)),
  catchError((error: HttpErrorResponse) => {
    console.error(error);
    if (error.status === 400) {
      return of(DataResult.fail<AbsenceDTO[]>(error.error));
    }
    navigateToErrorPage(this.#router, error);
    return of(DataResult.fail<AbsenceDTO[]>());
  })
);
```

`400` means a user-facing validation message from the API and is surfaced inline; every other
status navigates to `/error?status=<code>` via `navigateToErrorPage`.

**Components use a common async/message pattern:** `isProcessing`, `message` and `isSuccess`
signals, plus `isFormOpened` / `filtersOpened` for modals. Forms are rendered inside
`ModalFormComponent` and use `input()` / `output()`, not the `@Input`/`@Output` decorators.

**Models are hand-written classes and DTO interfaces** in each feature's `models/` folder,
with a `SomethingDTO` for the wire shape and a plain class for the view model. Dates are sent
to the API as date-only strings via `DateHelper.getDateOnlyString`.

**Styling is plain CSS**, one file per component, Angular Material + FontAwesome. Components
that show list grids pull in shared styles through multiple entries in `styleUrls`, e.g.
`['./absences.component.css', '../common/styles/grid-list-styles.css']`.

## Gotchas

- **Bundle budgets are tight and enforced.** Production build fails at 2 MB initial, and
  **any single component stylesheet over 4 kB fails the build** (warning at 2 kB). Keep
  component CSS small and move shared rules into `common/styles/`. See
  `BUNDLE_SIZE_ANALYSIS.md` for the open optimization backlog (lazy loading, `chart.js/auto`,
  duplicated FontAwesome).
- **`environment.development.ts` contains a hardcoded LAN IP** (`http://192.168.0.179:5081`)
  and is swapped in by the `development` file replacement. Change it to your own API host
  locally, and avoid committing that change.
- **`apiUrl` is inconsistent between environments.** Production is `/api/` with a trailing
  slash while call sites add their own leading slash (`${environment.apiUrl}/absences`),
  producing `/api//absences`. nginx tolerates it, but do not "fix" one side in isolation.
- `tsconfig.json` enables `strict`, `strictTemplates`, `noImplicitReturns` and
  `noPropertyAccessFromIndexSignature`; template type errors will fail the build.
- `README.md` is a stub containing only `TODO`.

## Deployment

`Dockerfile` builds the app with Node and serves `dist/*/browser` from nginx on port 8080.
`nginx.conf` proxies `/api/` to `http://api:8080/` (so it expects a service named `api` on the
same Docker network) and falls back to `index.html` for client-side routes.
