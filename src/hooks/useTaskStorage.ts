import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { Task, TaskStatus, MAX_DEPTH } from "@/types/task";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "tasks-app-data";
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10MB max import file
const MAX_STRING_LENGTH = 10000; // Max length for text fields

// Zod schema for task validation
const taskAttachmentSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(500),
  type: z.string().max(100),
  url: z.string().max(MAX_STRING_LENGTH),
  size: z.number().nonnegative(),
  createdAt: z.union([z.date(), z.object({ __type: z.literal("Date"), value: z.string() })]),
});

const taskNoteSchema = z.object({
  id: z.string().max(100),
  content: z.string().max(MAX_STRING_LENGTH),
  attachments: z.array(taskAttachmentSchema).max(50),
  createdAt: z.union([z.date(), z.object({ __type: z.literal("Date"), value: z.string() })]),
  updatedAt: z.union([z.date(), z.object({ __type: z.literal("Date"), value: z.string() })]),
  originTaskId: z.string().max(100),
  originTaskTitle: z.string().max(500),
});

const taskStatusSchema = z.enum(["todo", "in-progress", "blocked", "done"]);
const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const recurrenceTypeSchema = z.enum(["none", "daily", "weekly", "monthly"]);

const recurrenceConfigSchema = z.object({
  type: recurrenceTypeSchema,
  interval: z.number().min(1).max(365),
}).nullable();

// Define base task schema without recursion first
const baseTaskSchema = z.object({
  id: z.string().max(100),
  title: z.string().max(500),
  description: z.string().max(MAX_STRING_LENGTH),
  status: taskStatusSchema,
  priority: taskPrioritySchema.optional().default("medium"),
  dueDate: z.union([z.date(), z.object({ __type: z.literal("Date"), value: z.string() }), z.null()]),
  completed: z.boolean(),
  notes: z.array(taskNoteSchema).max(100),
  attachments: z.array(taskAttachmentSchema).max(50),
  parentId: z.string().max(100).nullable(),
  depth: z.number().min(0).max(MAX_DEPTH),
  createdAt: z.union([z.date(), z.object({ __type: z.literal("Date"), value: z.string() })]),
  projectId: z.string().max(100).nullable(),
  labelIds: z.array(z.string().max(100)).max(20).optional().default([]),
  recurrence: recurrenceConfigSchema.optional().default(null),
});

// Recursive schema for tasks with subtasks (limit depth)
const taskSchema: z.ZodType<unknown> = baseTaskSchema.extend({
  subTasks: z.lazy(() => z.array(taskSchema).max(100)),
});

const tasksArraySchema = z.array(taskSchema).max(1000);

// Sanitize string to prevent XSS (removes script tags and event handlers)
const sanitizeString = (str: string): string => {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
};

// Recursively sanitize task strings
const sanitizeTask = (task: Task): Task => ({
  ...task,
  title: sanitizeString(task.title),
  description: sanitizeString(task.description),
  notes: task.notes.map((note) => ({
    ...note,
    content: sanitizeString(note.content),
    originTaskTitle: sanitizeString(note.originTaskTitle),
  })),
  subTasks: task.subTasks.map(sanitizeTask),
});

// Enforce max depth during import and ensure priority, labelIds, and recurrence exist
const enforceMaxDepth = (tasks: Task[], currentDepth = 0): Task[] => {
  return tasks.map((task) => ({
    ...task,
    depth: currentDepth,
    priority: task.priority || "medium",
    labelIds: task.labelIds || [],
    recurrence: task.recurrence || null,
    subTasks: currentDepth < MAX_DEPTH ? enforceMaxDepth(task.subTasks, currentDepth + 1) : [],
  }));
};

// Helper to serialize tasks (convert Date objects to strings)
const serializeTasks = (tasks: Task[]): string => {
  return JSON.stringify(tasks, (key, value) => {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    return value;
  });
};

// Helper to deserialize tasks (convert date strings back to Date objects)
const deserializeTasks = (json: string): Task[] => {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === "object" && value.__type === "Date") {
      return new Date(value.value);
    }
    return value;
  });
};

export const useTaskStorage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  // Load tasks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = deserializeTasks(stored);
        setTasks(parsed);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to load tasks from localStorage:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, serializeTasks(tasks));
      } catch (error) {
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          toast({
            title: "Storage limit reached",
            description: "Please export your tasks and remove large attachments or old completed tasks.",
            variant: "destructive",
          });
        } else if (import.meta.env.DEV) {
          console.error("Failed to save tasks to localStorage:", error);
        }
      }
    }
  }, [tasks, isLoaded, toast]);

  // Export tasks to JSON file
  const exportTasks = useCallback(() => {
    try {
      const data = serializeTasks(tasks);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Export successful",
        description: "Your tasks have been exported to a JSON file.",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Export failed:", error);
      }
      toast({
        title: "Export failed",
        description: "Could not export tasks. Please try again.",
        variant: "destructive",
      });
    }
  }, [tasks, toast]);

  // Import tasks from JSON file with validation
  const importTasks = useCallback(
    (file: File) => {
      // Validate file size
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "Import file must be less than 10MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = deserializeTasks(content);
          
          // Validate structure with zod
          const validationResult = tasksArraySchema.safeParse(parsed);
          if (!validationResult.success) {
            toast({
              title: "Invalid file format",
              description: "The file contains invalid task data. Please use a valid backup file.",
              variant: "destructive",
            });
            return;
          }

          // Enforce max depth and sanitize
          const depthEnforced = enforceMaxDepth(parsed as Task[]);
          const sanitized = depthEnforced.map(sanitizeTask);
          
          setTasks(sanitized);
          toast({
            title: "Import successful",
            description: `Imported ${sanitized.length} tasks.`,
          });
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("Import failed:", error);
          }
          toast({
            title: "Import failed",
            description: "Invalid file format. Please use a valid tasks JSON file.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    },
    [toast]
  );

  // Clear all tasks
  const clearTasks = useCallback(() => {
    setTasks([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Tasks cleared",
      description: "All tasks have been removed.",
    });
  }, [toast]);

  return {
    tasks,
    setTasks,
    isLoaded,
    exportTasks,
    importTasks,
    clearTasks,
  };
};
