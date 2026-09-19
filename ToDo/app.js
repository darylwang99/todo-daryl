const KEY = "todos";
const RANK = { high: 0, medium: 1, low: 2 };
const MAX_TASK_TEXT = 500;
const MAX_NOTE_LENGTH = 2000;
const MAX_TASKS = 1000;
const MIN_SUBMIT_INTERVAL = 500;

let todos = load();
let filter = "all";
let priorityFilter = "all";
let sortMode = "added";
let query = "";
let undoSnapshot = null;
let toastTimer = null;
let lastSubmitTime = 0;
let viewMode = "list";
let draggedId = null;

const form = document.getElementById("add-form");
const textInput = document.getElementById("text-input");
const dueInput = document.getElementById("due-input");
const priorityInput = document.getElementById("priority-input");
const noteInput = document.getElementById("note-input");
const themeToggle = document.getElementById("theme-toggle");
const list = document.getElementById("list");
const count = document.getElementById("count");
const filters = document.getElementById("filters");
const priorityFilterSelect = document.getElementById("priority-filter");
const sortSelect = document.getElementById("sort");
const searchInput = document.getElementById("search");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const importFile = document.getElementById("import-file");
const viewToggle = document.getElementById("view-toggle");

function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

function generateChecksum(data) {
  const str = JSON.stringify(data);
  return simpleHash(str);
}

function load() {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return [];
    if (!Array.isArray(parsed.todos)) return [];
    if (parsed.checksum && parsed.checksum !== generateChecksum(parsed.todos)) {
      console.warn("Data integrity check failed; loaded anyway");
    }
    return parsed.todos;
  } catch {
    return [];
  }
}

function save() {
  try {
    if (todos.length > MAX_TASKS) {
      showToast(`Cannot save: Exceeded ${MAX_TASKS} task limit`);
      return;
    }
    const checksum = generateChecksum(todos);
    const data = { todos, checksum };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    if (e.name === "QuotaExceededError") {
      showToast("Storage full: Cannot save more tasks");
    }
  }
}

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function priorityOf(t) {
  return t.priority in RANK ? t.priority : "medium";
}

function visibleTodos() {
  const q = query.trim().toLowerCase();
  const visible = todos.filter(
    (t) =>
      (filter === "all" ? true : filter === "done" ? t.done : !t.done) &&
      (priorityFilter === "all" || priorityOf(t) === priorityFilter) &&
      (!q || t.text.toLowerCase().includes(q) || (t.note || "").toLowerCase().includes(q))
  );
  if (sortMode === "high") visible.sort((a, b) => RANK[priorityOf(a)] - RANK[priorityOf(b)]);
  else if (sortMode === "low") visible.sort((a, b) => RANK[priorityOf(b)] - RANK[priorityOf(a)]);
  else if (sortMode === "due")
    visible.sort((a, b) => (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99"));
  return visible;
}

function getDueDateCategory(dueDate) {
  if (!dueDate) return "no-due";
  const d = new Date(dueDate + "T00:00:00Z");
  const todayDate = today();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = `${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}`;

  if (dueDate < todayDate) return "overdue";
  if (dueDate === todayDate) return "today";
  if (dueDate <= nextWeekStr) return "this-week";
  return "later";
}

function createTaskElement(t) {
  const li = document.createElement("li");
  li.dataset.id = t.id;
  li.draggable = true;
  if (t.done) li.classList.add("done");
  const priority = priorityOf(t);
  li.classList.add("p-" + priority);

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = t.done;
  check.className = "toggle";

  const text = document.createElement("span");
  text.className = "text";
  text.textContent = t.text;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = priority;

  li.append(check, text, badge);

  if (t.due) {
    const due = document.createElement("span");
    due.className = "due";
    if (!t.done && t.due < today()) due.classList.add("overdue");
    due.textContent = t.due;
    li.append(due);
  }

  const pen = document.createElement("button");
  pen.className = "pen";
  pen.type = "button";
  pen.title = "Edit";
  pen.setAttribute("aria-label", "Edit task");
  pen.textContent = "✏️";
  li.append(pen);

  const del = document.createElement("button");
  del.className = "delete";
  del.type = "button";
  del.title = "Delete";
  del.setAttribute("aria-label", "Delete task");
  del.textContent = "×";
  li.append(del);

  if (t.note) {
    const note = document.createElement("div");
    note.className = "note";
    note.textContent = t.note;
    li.append(note);
  }

  return li;
}

function render() {
  list.textContent = "";
  const visible = visibleTodos();

  if (viewMode === "timeline") {
    const grouped = {
      overdue: [],
      today: [],
      "this-week": [],
      later: [],
      "no-due": []
    };

    for (const t of visible) {
      const cat = getDueDateCategory(t.due);
      grouped[cat].push(t);
    }

    const labels = {
      overdue: "🔴 Overdue",
      today: "📌 Today",
      "this-week": "📅 This Week",
      later: "⏳ Later",
      "no-due": "❓ No Due Date"
    };

    for (const [cat, tasks] of Object.entries(grouped)) {
      if (tasks.length === 0) continue;

      const section = document.createElement("li");
      section.className = "timeline-section";
      const label = document.createElement("div");
      label.className = "timeline-label";
      label.textContent = labels[cat];
      section.append(label);
      list.append(section);

      for (const t of tasks) {
        list.append(createTaskElement(t));
      }
    }

    if (!visible.length && todos.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No tasks match the current search or filters.";
      list.append(empty);
    }
  } else {
    for (const t of visible) {
      list.append(createTaskElement(t));
    }

    if (!visible.length && todos.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No tasks match the current search or filters.";
      list.append(empty);
    }
  }

  const left = todos.filter((t) => !t.done).length;
  count.textContent = `${left} item${left === 1 ? "" : "s"} left`;
  for (const b of filters.children) b.classList.toggle("active", b.dataset.filter === filter);
}

function update() {
  save();
  render();
}

function showToast(message) {
  toastMsg.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  toast.hidden = true;
  undoSnapshot = null;
  clearTimeout(toastTimer);
}

document.getElementById("undo").addEventListener("click", () => {
  if (!undoSnapshot) return;
  todos = undoSnapshot;
  hideToast();
  update();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const now = Date.now();
  if (now - lastSubmitTime < MIN_SUBMIT_INTERVAL) {
    showToast("Please wait before adding another task");
    return;
  }
  lastSubmitTime = now;

  const text = textInput.value.trim();
  if (!text) return;
  if (text.length > MAX_TASK_TEXT) {
    showToast(`Task text limited to ${MAX_TASK_TEXT} characters`);
    return;
  }

  const note = noteInput.value.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    showToast(`Note limited to ${MAX_NOTE_LENGTH} characters`);
    return;
  }

  if (todos.length >= MAX_TASKS) {
    showToast(`Maximum ${MAX_TASKS} tasks reached`);
    return;
  }

  todos.push({
    id: Date.now() + crypto.getRandomValues(new Uint32Array(1))[0],
    text,
    done: false,
    due: dueInput.value,
    priority: priorityInput.value,
    note,
  });
  textInput.value = "";
  dueInput.value = "";
  noteInput.value = "";
  priorityInput.value = "medium";
  update();
});

list.addEventListener("dragstart", (e) => {
  const li = e.target.closest("li:not(.timeline-section)");
  if (!li || !li.dataset.id) return;
  draggedId = Number(li.dataset.id);
  e.dataTransfer.effectAllowed = "move";
  li.classList.add("dragging");
});

list.addEventListener("dragend", (e) => {
  const li = e.target.closest("li");
  if (li) li.classList.remove("dragging");
  draggedId = null;
});

list.addEventListener("dragover", (e) => {
  const li = e.target.closest("li:not(.timeline-section)");
  if (!li || !draggedId || !li.dataset.id) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  li.classList.add("drag-over");
});

list.addEventListener("dragleave", (e) => {
  const li = e.target.closest("li");
  if (li) li.classList.remove("drag-over");
});

list.addEventListener("drop", (e) => {
  const li = e.target.closest("li:not(.timeline-section)");
  if (!li || !draggedId) return;
  e.preventDefault();
  const targetId = Number(li.dataset.id);
  if (draggedId === targetId) return;

  const draggedIdx = todos.findIndex((t) => t.id === draggedId);
  const targetIdx = todos.findIndex((t) => t.id === targetId);
  if (draggedIdx === -1 || targetIdx === -1) return;

  const [moved] = todos.splice(draggedIdx, 1);
  todos.splice(targetIdx, 0, moved);
  update();
  li.classList.remove("drag-over");
});

list.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const id = Number(li.dataset.id);
  if (e.target.classList.contains("delete")) {
    undoSnapshot = todos.slice();
    todos = todos.filter((t) => t.id !== id);
    update();
    showToast("Task deleted.");
  }
});

list.addEventListener("change", (e) => {
  if (!e.target.classList.contains("toggle")) return;
  const id = Number(e.target.closest("li").dataset.id);
  const t = todos.find((t) => t.id === id);
  if (t) t.done = e.target.checked;
  update();
});

list.addEventListener("click", (e) => {
  if (!e.target.classList.contains("pen")) return;
  const li = e.target.closest("li");
  if (li.querySelector(".edit")) return;
  const id = Number(li.dataset.id);
  const t = todos.find((t) => t.id === id);
  if (!t) return;

  const input = document.createElement("input");
  input.className = "edit";
  input.value = t.text;
  li.querySelector(".text").replaceWith(input);

  const prioritySelect = document.createElement("select");
  prioritySelect.className = "priority-edit";
  prioritySelect.title = "Priority";
  for (const p of ["high", "medium", "low"]) {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p[0].toUpperCase() + p.slice(1);
    prioritySelect.append(opt);
  }
  prioritySelect.value = priorityOf(t);
  li.querySelector(".badge").replaceWith(prioritySelect);

  const dueBox = document.createElement("input");
  dueBox.type = "date";
  dueBox.className = "due-edit";
  dueBox.title = "Due date (optional)";
  dueBox.value = t.due || "";
  const oldDue = li.querySelector(".due");
  if (oldDue) oldDue.replaceWith(dueBox);
  else li.querySelector(".pen").before(dueBox);

  const noteBox = document.createElement("textarea");
  noteBox.className = "note-edit";
  noteBox.rows = 2;
  noteBox.placeholder = "Note (optional)";
  noteBox.value = t.note || "";
  const oldNote = li.querySelector(".note");
  if (oldNote) oldNote.replaceWith(noteBox);
  else li.append(noteBox);

  input.focus();

  let finished = false;
  const finish = (commit) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    const noteValue = noteBox.value.trim();
    if (commit && value) {
      if (value.length > MAX_TASK_TEXT) {
        showToast(`Task text limited to ${MAX_TASK_TEXT} characters`);
        update();
        return;
      }
      if (noteValue.length > MAX_NOTE_LENGTH) {
        showToast(`Note limited to ${MAX_NOTE_LENGTH} characters`);
        update();
        return;
      }
      t.text = value;
      t.priority = prioritySelect.value;
      t.due = dueBox.value;
      t.note = noteValue;
    }
    update();
  };
  for (const field of [input, dueBox]) {
    field.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") finish(true);
      else if (ev.key === "Escape") finish(false);
    });
  }
  prioritySelect.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") finish(false);
  });
  noteBox.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) finish(true);
    else if (ev.key === "Escape") finish(false);
  });
  li.addEventListener("focusout", (ev) => {
    if (!li.contains(ev.relatedTarget)) finish(true);
  });
});

filters.addEventListener("click", (e) => {
  if (!e.target.dataset.filter) return;
  filter = e.target.dataset.filter;
  render();
});

priorityFilterSelect.addEventListener("change", () => {
  priorityFilter = priorityFilterSelect.value;
  render();
});

sortSelect.addEventListener("change", () => {
  sortMode = sortSelect.value;
  render();
});

viewToggle.addEventListener("click", () => {
  viewMode = viewMode === "list" ? "timeline" : "list";
  viewToggle.textContent = viewMode === "timeline" ? "📅" : "📋";
  render();
});

searchInput.addEventListener("input", () => {
  query = searchInput.value;
  render();
});

document.getElementById("clear").addEventListener("click", () => {
  const doneCount = todos.filter((t) => t.done).length;
  if (!doneCount) return;
  if (!confirm(`Remove ${doneCount} completed task${doneCount === 1 ? "" : "s"}?`)) return;
  undoSnapshot = todos.slice();
  todos = todos.filter((t) => !t.done);
  update();
  showToast(`${doneCount} completed task${doneCount === 1 ? "" : "s"} removed.`);
});

document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(todos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `todos-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import").addEventListener("click", () => importFile.click());

function isValidDate(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + "T00:00:00Z");
  return !isNaN(d.getTime());
}

function cleanImported(data) {
  if (!Array.isArray(data)) return null;
  const seen = new Set();
  const result = [];
  for (const item of data) {
    if (!item || typeof item.text !== "string" || !item.text.trim()) continue;
    const text = item.text.trim();
    const note = typeof item.note === "string" ? item.note.trim() : "";

    if (text.length > MAX_TASK_TEXT || note.length > MAX_NOTE_LENGTH) {
      continue;
    }
    if (result.length >= MAX_TASKS) {
      break;
    }

    let id = typeof item.id === "number" && isFinite(item.id) ? item.id : Date.now() + crypto.getRandomValues(new Uint32Array(1))[0];
    while (seen.has(id)) id = Date.now() + crypto.getRandomValues(new Uint32Array(1))[0];
    seen.add(id);
    result.push({
      id,
      text,
      done: item.done === true,
      due: isValidDate(item.due) ? item.due : "",
      priority: item.priority in RANK ? item.priority : "medium",
      note,
    });
  }
  return result.length > 0 ? result : null;
}

importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  importFile.value = "";
  if (!file) return;
  let imported;
  try {
    imported = cleanImported(JSON.parse(await file.text()));
  } catch {
    imported = null;
  }
  if (!imported) {
    alert("That file is not a valid to do backup.");
    return;
  }
  if (!confirm(`Replace your ${todos.length} current task(s) with ${imported.length} imported task(s)?`)) return;
  undoSnapshot = todos.slice();
  todos = imported;
  update();
  showToast(`Imported ${imported.length} task(s).`);
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  themeToggle.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#16171a" : "#f4f4f6";
}

function initialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem("theme", next);
  } catch {}
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      textInput.focus();
    } else if (e.key === "k" || e.key === "K") {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === "Enter") {
      if (document.activeElement === searchInput) e.preventDefault();
    }
  } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
    if (e.key === "1") {
      e.preventDefault();
      filter = "all";
      render();
    } else if (e.key === "2") {
      e.preventDefault();
      filter = "active";
      render();
    } else if (e.key === "3") {
      e.preventDefault();
      filter = "done";
      render();
    } else if (e.key === "v" || e.key === "V") {
      e.preventDefault();
      viewMode = viewMode === "list" ? "timeline" : "list";
      render();
    }
  }
});

applyTheme(initialTheme());
render();
