export type TaskStatus = "todo" | "in-progress" | "blocked" | "done";

export interface TaskNote {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: Date | null;
  completed: boolean;
  notes: TaskNote[];
  createdAt: Date;
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  "todo": { label: "To Do", color: "bg-muted text-muted-foreground" },
  "in-progress": { label: "In Progress", color: "bg-accent text-accent-foreground" },
  "blocked": { label: "Blocked", color: "bg-destructive/10 text-destructive" },
  "done": { label: "Done", color: "bg-primary/10 text-primary" },
};
