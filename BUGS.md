# Open bugs

Found by reading the UI on 2026-10-14. These are not part of the API contract work.
Recheck them after that work, because a few share the same lines.

Two items below were closed by the contract update. The rest are still open.

## Closed by the contract update

- **Date filters asked for zero members.** An empty member selection is no longer sent as `userIds`. Admins with nobody selected load every member. Other members load only their own absences.
- **Register and profile validation opened the error page.** A 400 stays on the form. The message is the JSON string, or the validation problem's `errors`.

## Still open

1. **Mobile profile menu never opens.** `nav-bar.component.ts` `linkClicked` uses `this.isMenuOpen` and `!this.isSubmenuOpen`. Those are the signal functions, so the submenu is always set to false.

2. **Member delete and access change never run.** `organizations.component.ts` passes `changeAccess` and `deleteUser` into the confirm dialog. The later call has no component `this`, so `this.isProcessing` throws and the dialog has already closed.

3. **Login loads organizations before the user exists.** `login()` sets `loggedIn` before user details return. Startup then reads `userDetails()!.id` while saving the selected organization. If that read wins the race, login ends on the error page.

4. **Screens crash when no organization is selected.** Home always links to `/absences`. `selectedOrganization()!` throws for a new account or a saved organization that was removed.

5. **One bad absence row leaves the spinner up.** `#setAbsences` throws on a missing type or member before `isProcessing` is cleared. A failed type load still lets the app open with `types` null, which hits the same throw.

6. **The chart never skips holidays.** `charts.component.ts` uses `holidays.includes(date)`. That compares object identity, and holiday values from HTTP are strings, so a holiday never matches.

7. **Access change can only grant admin.** `changeAccess()` always sends `isAdmin: true`, then replaces the selected member with a copy. The list badge stays stale. This runs only after bug 2 is fixed.

8. **Several 401s refresh the token at once.** `auth.interceptor.ts` has no single in-flight refresh and does not mark a retry. A rotated refresh token makes the second call fail and log the user out. A retry that is still 401 refreshes again.

9. **Event failures look like an empty list.** The events screen ignores a failed load and a failed accept. One unknown absence type still throws while building a row, so the list stays empty.

10. **Logout needs the API to succeed.** `logoutLocally()` runs only after a successful logout call. A failed logout leaves the tokens and opens the error page.

11. **Chart bars count days outside the selected year.** The loop walks each absence's full start and end. An absence that crosses 1 January still adds those days. The Chart instance is also never destroyed.

12. **Date inputs are parsed as UTC.** `new Date('2026-06-15')` is UTC midnight. In a timezone west of UTC, the saved calendar day can shift back one day. Query windows now use local midnights; create and edit bodies still use this parse.

13. **The absence form submits while invalid.** Holiday submit checks `form.valid`. Absence submit does not. Field errors show only when a control is both touched and dirty. The member filter's error component is bound to `endDate`.

14. **Deleting a profile clears all local storage.** `deleteProfile` calls `localStorage.clear()`, which removes every key for this origin, including another account's saved organization.
