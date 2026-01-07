export type TaskStatus = "todo" | "in-progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly";

export interface RecurrenceConfig {
  type: RecurrenceType;
  interval: number; // Every X days/weeks/months
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  createdAt: Date;
}

export interface TaskNote {
  id: string;
  content: string;
  attachments: TaskAttachment[];
  createdAt: Date;
  updatedAt: Date;
  originTaskId: string;
  originTaskTitle: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  completed: boolean;
  notes: TaskNote[];
  attachments: TaskAttachment[];
  subTasks: Task[];
  parentId: string | null;
  depth: number;
  createdAt: Date;
  projectId: string | null; // null means Inbox
  labelIds: string[]; // Array of label IDs
  recurrence: RecurrenceConfig | null; // Recurring task configuration
}

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  "todo": { label: "To Do", color: "bg-muted text-muted-foreground" },
  "in-progress": { label: "In Progress", color: "bg-accent text-accent-foreground" },
  "blocked": { label: "Blocked", color: "bg-destructive/10 text-destructive" },
  "done": { label: "Done", color: "bg-primary/10 text-primary" },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  "low": { label: "Low", color: "bg-muted text-muted-foreground", icon: "ArrowDown" },
  "medium": { label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "Minus" },
  "high": { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: "ArrowUp" },
  "urgent": { label: "Urgent", color: "bg-destructive/10 text-destructive", icon: "AlertTriangle" },
};

export const MAX_DEPTH = 3;

export const createEmptyTask = (parentId: string | null = null, depth: number = 0, projectId: string | null = null): Omit<Task, "id" | "createdAt"> => ({
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: null,
  completed: false,
  notes: [],
  attachments: [],
  subTasks: [],
  parentId,
  depth,
  projectId,
  labelIds: [],
  recurrence: null,
});

export const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export const getNextDueDate = (currentDueDate: Date | null, recurrence: RecurrenceConfig): Date => {
  const baseDate = currentDueDate || new Date();
  const nextDate = new Date(baseDate);
  
  switch (recurrence.type) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + recurrence.interval);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + (7 * recurrence.interval));
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + recurrence.interval);
      break;
  }
  
  return nextDate;
};

export const LABEL_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6366f1", // indigo
  "#84cc16", // lime
];

export const PROJECT_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];
