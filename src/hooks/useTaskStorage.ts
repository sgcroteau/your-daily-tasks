import { useState, useEffect, useCallback } from "react";
import { Task } from "@/types/task";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "tasks-app-data";

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

  // Import tasks from JSON file
  const importTasks = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const imported = deserializeTasks(content);
          setTasks(imported);
          toast({
            title: "Import successful",
            description: `Imported ${imported.length} tasks.`,
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
