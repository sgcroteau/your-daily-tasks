# Task Manager App - Architecture Guide

> **Last Updated:** January 2025  
> **Purpose:** Reference document for understanding the codebase structure and patterns

---

## 📋 Overview

A feature-rich task management application built with React, TypeScript, and Tailwind CSS. Supports nested subtasks (up to 3 levels), projects, labels, notes with attachments, recurring tasks, drag-and-drop reordering, and a Notebook for archiving/referencing completed work.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | React hooks + localStorage |
| Routing | react-router-dom v6 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Icons | lucide-react |
| Date Handling | date-fns |
| Validation | Zod |

---

## 📁 File Structure

```
src/
├── components/          # UI Components
│   ├── ui/              # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── AppSidebar.tsx   # Main navigation sidebar with projects
│   ├── TaskInput.tsx    # New task creation form
│   ├── TaskList.tsx     # Renders list of tasks with SortableContext
│   ├── TaskItem.tsx     # Individual task display (non-draggable)
│   ├── DraggableTaskItem.tsx  # Task with drag-and-drop + subtasks
│   ├── TaskDetailDialog.tsx   # Full task editor modal
│   ├── TaskNotes.tsx    # Notes section within task detail
│   ├── TaskStats.tsx    # Progress bar showing completion
│   ├── NotebookGraph.tsx      # Force-directed graph visualization
│   ├── SettingsDialog.tsx     # Unified settings (theme, preferences, data management)
│   ├── HistoryControls.tsx    # Undo/redo + folder sync controls
│   ├── SaveLocationDialog.tsx # Onboarding prompt to select save folder
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useTaskStorage.ts      # Task CRUD + localStorage persistence
│   ├── useProjectStorage.ts   # Project management
│   ├── useLabelStorage.ts     # Label/tag management
│   ├── usePreferencesStorage.ts # User settings (default priority, etc.)
│   ├── useHistoryStorage.ts   # Undo/redo + file system sync
│   └── useDebounce.ts         # Debounce utility hook
├── pages/               # Route pages
│   ├── Index.tsx        # Main task management view
│   ├── Notebook.tsx     # Archive/reference view for all tasks
│   └── NotFound.tsx     # 404 page
├── types/
│   └── task.ts          # TypeScript interfaces and constants
├── lib/
│   ├── utils.ts         # cn() utility for classNames
│   └── searchUtils.ts   # Task filtering/search logic
└── index.css            # Global styles + CSS variables
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      localStorage                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │  tasks   │ │ projects │ │  labels  │ │  preferences  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘   │
└───────┼────────────┼────────────┼───────────────┼───────────┘
        │            │            │               │
        ▼            ▼            ▼               ▼
┌───────────────────────────────────────────────────────────┐
│                    Custom Hooks Layer                      │
│  useTaskStorage  useProjectStorage  useLabelStorage  ...   │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│                   Index.tsx (Main Page)                    │
│  - Combines all hooks                                      │
│  - Filters/sorts tasks                                     │
│  - Manages DndContext for drag-and-drop                    │
│  - Passes data to child components                         │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│                    UI Components                           │
│  TaskList → DraggableTaskItem → TaskItem (recursive)       │
│  TaskDetailDialog, AppSidebar, TaskInput, etc.             │
└───────────────────────────────────────────────────────────┘
```

---

## 📊 Core Types (`src/types/task.ts`)

### Task Interface
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: Date | null;
  completed: boolean;
  notes: TaskNote[];
  attachments: TaskAttachment[];
  subTasks: Task[];           // Nested tasks (max depth: 3)
  parentId: string | null;
  depth: number;              // 0 = root, 1-3 = subtask levels
  createdAt: Date;
  projectId: string | null;   // null = Inbox
  labelIds: string[];
  recurrence: RecurrenceConfig | null;
}
```

### Supporting Types
- **Project**: `{ id, name, color, createdAt }`
- **TaskLabel**: `{ id, name, color }`
- **TaskNote**: `{ id, content, attachments[], createdAt, updatedAt, originTaskId, originTaskTitle }`
- **TaskAttachment**: `{ id, name, type, url, size, createdAt }`
- **RecurrenceConfig**: `{ type: "none"|"daily"|"weekly"|"monthly", interval: number }`

---

## 🪝 Key Hooks

### `useTaskStorage`
**Purpose:** Task CRUD operations + localStorage persistence  
**Returns:** `{ tasks, setTasks, exportTasks, importTasks, clearTasks, isLoaded }`  
**Features:**
- Zod validation on load/import
- XSS sanitization
- Max depth enforcement
- Date serialization/deserialization

### `useProjectStorage`
**Purpose:** Project management  
**Returns:** `{ projects, addProject, updateProject, deleteProject }`

### `useLabelStorage`
**Purpose:** Label/tag management  
**Returns:** `{ labels, addLabel, updateLabel, deleteLabel }`

### `usePreferencesStorage`
**Purpose:** User settings persistence  
**Returns:** `{ preferences, updatePreference }`  
**Settings:** `defaultPriority`

### `useHistoryStorage`
**Purpose:** Undo/redo + mandatory File System Access API sync  
**Returns:** Undo/redo controls, folder connection status, manual save/load, `hasPreviousFolderName`  
**Note:** App shows onboarding dialog until a save folder is connected

---

## 🎯 Key Features & Implementation

### 1. Nested Subtasks (3 levels deep)
- **Location:** `DraggableTaskItem.tsx`
- **Logic:** Recursive rendering of `DraggableTaskItem` for `task.subTasks`
- **Constraint:** `MAX_DEPTH = 3` in `task.ts`
- **Add subtask:** Only shown if `depth < MAX_DEPTH`

### 2. Auto-Archive Completed Trees
- **Location:** `Index.tsx` → `filteredTasks` memo
- **Logic:** `isFullyCompleted()` checks if task + all subtasks are completed
- **Behavior:** Fully completed trees disappear from main view, remain in Notebook

### 3. Drag & Drop Reordering
- **Location:** `Index.tsx` wraps content in `<DndContext>`
- **Components:** `TaskList` uses `<SortableContext>`, `DraggableTaskItem` uses `useSortable`
- **Cross-project:** Dropping on sidebar moves task to that project

### 4. Notebook Archive
- **Location:** `pages/Notebook.tsx`
- **Purpose:** Searchable archive of ALL tasks (including completed)
- **Views:** Timeline, By Project, Graph visualization
- **Tree visualization:** Subtasks show depth indicators and indentation

### 5. Recurring Tasks
- **Location:** `Index.tsx` → `toggleTask()`
- **Logic:** On completion, if `recurrence` is set, spawns new task with next due date
- **Types:** Daily, Weekly, Monthly with configurable interval

### 6. Search
- **Location:** `lib/searchUtils.ts` → `filterTasksBySearch()`
- **Searches:** Task title, description, notes, subtasks (recursive)
- **Debounced:** 300ms via `useDebounce` hook

---

## 🎨 Styling Patterns

### Design Tokens
All colors use HSL CSS variables defined in `index.css`:
```css
--background, --foreground, --primary, --secondary, --muted, --accent, --destructive
```

### Component Styling
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Never hardcode colors - always use semantic tokens
- Dark mode: Uses `next-themes` with `class` strategy

### shadcn/ui Components
Located in `src/components/ui/`. Pre-styled primitives:
- Button, Card, Dialog, Popover, Select, Tabs, Badge, etc.
- Customize via variants in component files

---

## 📝 Common Patterns

### Adding a New Feature
1. Define types in `src/types/task.ts` if needed
2. Create hook in `src/hooks/` if state persistence required
3. Build component in `src/components/`
4. Integrate in `Index.tsx` or relevant page
5. **Update this document!**

### Modifying Task Structure
1. Update `Task` interface in `task.ts`
2. Update Zod schema in `useTaskStorage.ts`
3. Handle migration for existing localStorage data
4. Update `flattenTasks` in Notebook if hierarchy affected

### Adding a New Page
1. Create page in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `AppSidebar.tsx`

---

## ⚠️ Important Constraints

| Constraint | Details |
|------------|---------|
| Max subtask depth | 3 levels (`MAX_DEPTH` constant) |
| Storage | localStorage only (no backend) |
| Attachments | Stored as base64 data URLs |
| Task IDs | UUID v4 via `crypto.randomUUID()` |
| Dates | Serialized as ISO strings in localStorage |

---

## 🔮 Future Considerations

When extending the app, consider:
- **Backend migration:** Replace localStorage hooks with API calls
- **Collaboration:** Would need real-time sync (WebSockets/Supabase)
- **Mobile:** PWA setup or Capacitor for native
- **Performance:** Large task lists may need virtualization

---

*Keep this document updated when making architectural changes!*
