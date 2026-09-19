# Plan for a To Do app

Specifications
1. Simple to do app. No frills. basic.
2. It should run in a browser
3. Features:
   - Add, delete, and mark tasks done or not done.
   - Edit a task via the pen icon: text, priority, due date and note. Enter in the text or date field saves, Ctrl+Enter in the note box saves, Escape cancels, and clicking outside the task saves.
   - Optional due date per task. Overdue, unfinished tasks show the date in red.
   - Priority per task (High, Medium, Low; default Medium), shown as a colored border and label. Tasks saved before priorities existed display as Medium.
   - Optional note per task (multi-line), shown under the task text.
   - Search box matches task text and notes (case-insensitive) and combines with the filters.
   - Filters: All, Active, Done, combined with a priority filter (All priorities, High, Medium, Low).
   - Sort: added order, high priority first, low priority first, or earliest due date first (tasks without a due date last).
   - "Clear completed" button removes all done tasks, after a confirmation prompt.
   - Undo: deleting a task, clearing completed tasks, or importing shows a toast with an Undo button for 6 seconds.
   - Export downloads all tasks as a JSON backup file. Import restores from such a file (after confirmation, replacing current tasks; invalid entries are skipped and invalid files are rejected).
   - Dark mode toggle button with a moon/sun icon. Defaults to the system setting on first visit, then remembers the user's choice.
   - Mobile-friendly: responsive layout for phones (task details wrap beneath the task), 44px touch targets and 16px inputs on touch devices (no iOS zoom on focus), safe-area padding for notched phones, and a browser theme colour that follows light/dark mode.
   - Tasks and the theme choice persist across page reloads.
4. Not included: accounts, sync, categories, drag and drop.

Technology
- Plain HTML, CSS and JavaScript. No build step, backend or dependencies.
- Tasks are stored in the browser's localStorage (key `todos`); the theme is stored under `theme`.
- Each task is `{id, text, done, due, priority, note}`.
- Files: index.html, style.css, app.js. Open index.html in a browser to run.
