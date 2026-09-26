# To Do App Specification

## Product scope

Build a browser-based, single-user to do app. All requirements in this document are required unless explicitly marked optional. Anything not listed is out of scope.

The app must run by opening `index.html` directly in a supported browser. It must not require a build step, backend, account, or network connection.

### Out of scope

- Accounts or authentication
- Cloud storage or device synchronisation
- Categories or tags
- Drag-and-drop reordering

## Supported browsers

Support the current stable versions of Chrome, Edge, Firefox, and Safari. The app should fail gracefully when a browser feature such as local storage or file downloading is unavailable.

## Functional requirements

### Tasks

- A user can add, edit, delete, complete, and reopen a task.
- Task text is required, is trimmed before saving, and cannot be empty.
- Each task can have an optional due date, priority, and multi-line note.
- Priority is `High`, `Medium`, or `Low`, and defaults to `Medium`.
- A task's priority is shown with both a coloured border and a text label. Colour must not be the only indication of priority.
- A task's note is displayed below its text when the note is not empty.
- Completed tasks remain visible until individually deleted or removed with **Clear completed**.

### Editing

- Selecting the pen icon opens one task in edit mode with controls for its text, priority, due date, and note.
- The pen icon has an accessible label such as `Edit task`.
- All edited fields are committed together as one operation.
- A user can save with a visible **Save** button, by pressing Enter in the text or due-date field, by pressing Ctrl+Enter (or Command+Enter on macOS) in the note field, or by moving focus or clicking outside the task.
- A user can cancel with a visible **Cancel** button or by pressing Escape. Cancelling restores every field to its value before editing.
- Moving directly between controls within the same task does not save or close edit mode.
- Opening another task for editing saves the currently edited task first, provided it is valid.
- Invalid or empty task text is not saved. The task remains in edit mode and an inline validation message is shown.

### Due dates

- Due dates are optional and are stored as local calendar dates in `YYYY-MM-DD` format.
- A task is overdue only when it is unfinished and its due date is earlier than the user's current local date.
- A task due today is not overdue.
- An overdue date is displayed in red and also has a non-colour indication, such as an `Overdue` label.
- Completed tasks do not receive overdue styling.
- A due date can be cleared while editing.

### Search, filters, and sorting

- Search matches task text and notes case-insensitively.
- Leading and trailing whitespace in the search query is ignored. An empty query matches every task.
- Search combines with both the status and priority filters.
- Status filters are `All`, `Active`, and `Done`.
- Priority filters are `All priorities`, `High`, `Medium`, and `Low`.
- Sort choices are:
  - `Added order`: newest task first.
  - `High priority first`: High, Medium, then Low.
  - `Low priority first`: Low, Medium, then High.
  - `Earliest due date first`: dated tasks in ascending date order, followed by tasks without a due date.
- Sorting is stable. Tasks that are equal under the selected sort retain newest-first added order.
- Search, filter, and sort selections are view-only and do not modify task data.
- Search, filter, and sort selections reset to their defaults after a reload.

### Deleting and clearing

- Deleting an individual task does not require confirmation but offers Undo.
- **Clear completed** removes every completed task after the user confirms the action.
- If there are no completed tasks, **Clear completed** is disabled and no confirmation is shown.

### Undo

- Deleting a task, clearing completed tasks, or successfully importing a backup displays a toast containing an **Undo** button for six seconds.
- Only the most recent destructive action can be undone. Starting another destructive action dismisses and replaces any existing Undo opportunity.
- Undo restores the exact previous task data and added order.
- Undoing an import restores the complete task list that existed immediately before the import.
- The Undo opportunity expires after six seconds and does not survive a page reload.

### Import and export

- Export downloads every task, regardless of the current search, filters, or sort, as a UTF-8 JSON backup file.
- The exported file uses this top-level structure:

```json
{
  "version": 1,
  "exportedAt": "2026-09-26T12:00:00.000Z",
  "tasks": []
}
```

- `version` is the integer `1`, `exportedAt` is an ISO 8601 timestamp, and `tasks` is an array of task objects.
- Before importing, the app asks the user to confirm that the import will replace all current tasks.
- Invalid JSON, an unsupported version, or an incorrect top-level structure rejects the entire file without changing current tasks.
- Within an otherwise valid file, invalid task entries are skipped. The app reports the number imported and the number skipped.
- A valid backup containing an empty task array is accepted.
- Imported IDs that are missing, invalid, or duplicated are replaced with new unique IDs.
- Unknown properties are ignored. Missing optional fields receive the defaults defined in the data model.
- Imported text and notes are always treated as plain text, never as HTML.

### Theme

- A button with a moon or sun icon toggles light and dark mode and has an accessible text label.
- When there is no saved theme choice, the app follows the operating system preference, including preference changes made while the app is open.
- Once the user selects a theme, that choice is stored and used on future visits.
- The browser theme colour follows the active light or dark theme where the browser supports it.

### Persistence and recovery

- Tasks are saved after every successful data change and persist across reloads.
- If stored task data is missing or corrupt, the app starts with an empty task list and shows a non-destructive warning instead of crashing.
- If storage is unavailable or full, the current in-memory session remains usable and the app informs the user that changes may not persist.
- Stored and imported task text and notes must be rendered using safe text APIs, not `innerHTML`.

### Responsive design and accessibility

- The layout is usable on phone and desktop widths. On narrow screens, task details and controls wrap below the main task row without horizontal scrolling.
- Interactive controls have at least 44 by 44 CSS-pixel touch targets on touch-oriented devices.
- Form controls use at least 16px text on touch-oriented devices to prevent iOS focus zoom.
- The layout respects safe-area insets on devices with notches or rounded display cut-outs.
- Every feature is keyboard operable.
- Icon-only buttons have accessible names, controls have visible focus indicators, and validation/status messages are announced to assistive technology.
- Empty states distinguish between `No tasks yet` and `No tasks match the current search or filters`.

## Data model

Tasks are stored under the local-storage key `todos`. The saved value is a JSON array of task objects:

```js
{
  id: string,
  text: string,
  done: boolean,
  due: string,
  priority: "high" | "medium" | "low",
  note: string,
  createdAt: number
}
```

- `id` is unique and stable for the lifetime of a task.
- `due` is either an empty string or a valid `YYYY-MM-DD` date.
- `createdAt` is a Unix timestamp in milliseconds and determines added order.
- Legacy tasks missing `priority` use `medium`; missing `due` or `note` use an empty string; missing `done` uses `false`; and missing or invalid `id` or `createdAt` receives a valid replacement when loaded.
- The user's explicit theme choice is stored under the local-storage key `theme` as `light` or `dark`.

## Technology and files

- Use plain HTML, CSS, and JavaScript with no dependencies, build step, or backend.
- Required application files are `index.html`, `style.css`, and `app.js`.
- Opening `index.html` directly in a browser starts the app.

## Acceptance criteria

The implementation is ready for approval when all of the following have been verified:

1. A task can be added, edited, completed, reopened, and deleted.
2. Whitespace-only task text cannot be added or saved.
3. Save and cancel work with both visible controls and the documented keyboard actions.
4. Search, status filtering, priority filtering, and sorting work correctly in combination.
5. Due-today and overdue behavior uses the local calendar date and remains correct across a local-midnight change.
6. Tasks and an explicit theme choice survive a reload.
7. A valid exported backup can be re-imported without losing task data or added order.
8. A malformed or unsupported backup does not replace current data, while invalid entries in a valid backup are skipped and reported.
9. Each destructive action can be undone during its six-second window and cannot be undone after expiry or reload.
10. Imported text containing HTML or script markup is displayed literally and never executes.
11. The interface is usable by keyboard and at a 320px viewport width without horizontal page scrolling.
12. Missing, corrupt, unavailable, or full local storage is handled without an uncaught error.
