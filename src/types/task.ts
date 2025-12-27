export type TaskStatus = "todo" | "in-progress" | "blocked" | "done";

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
  dueDate: Date | null;
  completed: boolean;
  notes: TaskNote[];
  attachments: TaskAttachment[];
  subTasks: Task[];
  parentId: string | null;
  depth: number;
  createdAt: Date;
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  "todo": { label: "To Do", color: "bg-muted text-muted-foreground" },
  "in-progress": { label: "In Progress", color: "bg-accent text-accent-foreground" },
  "blocked": { label: "Blocked", color: "bg-destructive/10 text-destructive" },
  "done": { label: "Done", color: "bg-primary/10 text-primary" },
};

export const MAX_DEPTH = 3;

export const createEmptyTask = (parentId: string | null = null, depth: number = 0): Omit<Task, "id" | "createdAt"> => ({
  title: "",
  description: "",
  status: "todo",
  dueDate: null,
  completed: false,
  notes: [],
  attachments: [],
  subTasks: [],
  parentId,
  depth,
});
