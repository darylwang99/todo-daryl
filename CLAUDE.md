# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`ToDo/` is a single-page to do app in plain HTML, CSS and JavaScript (`index.html`, `style.css`, `app.js`). There is no package.json, build step, linter or test suite. To run it, open `ToDo/index.html` in a browser (works from `file://`). To verify a change, exercise it by hand in the browser; use the DevTools device toolbar (Ctrl+Shift+M) for the mobile layout.

`ToDo/specs.md` is the product spec, but it is behind the code: it doesn't mention the timeline view, drag-and-drop reordering, keyboard shortcuts, the size limits or the checksum, and it still lists drag and drop as "not included".

## Architecture

- **One script, module-level state.** `app.js` keeps `todos`, `filter`, `priorityFilter`, `sortMode`, `query` and `viewMode` in top-level variables. A data change calls `update()` (`save()` then `render()`); a view-only change calls `render()` alone.
- **`render()` rebuilds the whole `<ul>` every time** (via `createTaskElement`, or grouped sections in timeline view). Nothing in the DOM is persistent, so any `render()` call discards in-progress UI such as an open edit row.
- **Edit mode is transient DOM.** The pen click handler swaps the task's text, priority badge, due date and note for inputs in place with `replaceWith`. It commits on Enter, Ctrl+Enter or `focusout` (when focus leaves the `<li>`) and cancels on Escape. All writes go through one `finish()` closure.
- **Filtering, searching and sorting are view-only.** `visibleTodos()` never changes `todos`. Drag-and-drop reorders the underlying `todos` array by index, so under a non-"added" sort or the timeline view the reorder is saved but may not be visible.
- **Undo** works by setting `undoSnapshot = todos.slice()` before a destructive change and then calling `showToast()`. The toast's 6 second timer clears the snapshot. Follow this pattern for any new destructive action.
- **Storage.** `localStorage["todos"]` holds `{todos, checksum}`. `load()` only warns on a checksum mismatch and does not reject the data. A bare array from an older version is not recognised and loads as empty. `localStorage["theme"]` is `"light"` or `"dark"`. Export writes a bare JSON array, and import runs it through `cleanImported()`, which sanitises fields and drops invalid entries.
- **Limits.** `MAX_TASK_TEXT`, `MAX_NOTE_LENGTH` and `MAX_TASKS` are enforced in the add handler, edit `finish()`, `cleanImported()` and `save()`. The 500 and 2000 character limits are duplicated as `maxlength` attributes in `index.html`, so keep them in sync.
- **Priority** is `"high" | "medium" | "low"`. Always read it through `priorityOf()`, which treats a missing value as medium. Tasks saved before priorities existed have none.

## Constraints to keep in mind

- `index.html` has a strict Content-Security-Policy meta tag (`script-src 'self'; style-src 'self'; connect-src 'none'`). Don't add inline `<script>`, inline `<style>`, `style=""` or `onclick=""` attributes, or any external resource. Put JS in `app.js` and CSS in `style.css`.
- Theming is CSS variables in `:root` and `:root[data-theme="dark"]`, switched by the `data-theme` attribute on `<html>`. The browser theme-colour hex values are duplicated in the `theme-color` meta tag in `index.html` and in `applyTheme()` in `app.js`.
- Phone layout (`@media (max-width: 520px)` in `style.css`) reorders each task row using flex `order` plus a `li::after` full-width line break. A new element inside a task `<li>` needs an `order` value there, or it will land in the wrong place on phones. `@media (pointer: coarse)` sets the 44px tap targets and 16px input text, which stops iOS from zooming on focus.
