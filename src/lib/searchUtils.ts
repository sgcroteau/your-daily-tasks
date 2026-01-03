import { Task } from "@/types/task";

export interface SearchMatch {
  taskId: string;
  matchLocations: ("title" | "description" | "note" | "subtask")[];
}

/**
 * Check if a string contains a search query (case-insensitive, partial match)
 */
const matchesQuery = (text: string, query: string): boolean => {
  return text.toLowerCase().includes(query.toLowerCase());
};

/**
 * Recursively search through a task and all its subtasks
 * Returns true if any match is found
 */
const searchTaskRecursive = (task: Task, query: string): boolean => {
  // Check title
  if (matchesQuery(task.title, query)) {
    return true;
  }

  // Check description
  if (task.description && matchesQuery(task.description, query)) {
    return true;
  }

  // Check all notes
  for (const note of task.notes) {
    if (matchesQuery(note.content, query)) {
      return true;
    }
  }

  // Check subtasks recursively
  for (const subTask of task.subTasks) {
    if (searchTaskRecursive(subTask, query)) {
      return true;
    }
  }

  return false;
};

/**
 * Filter tasks based on search query
 * Returns top-level tasks that match or have matching children
 */
export const filterTasksBySearch = (tasks: Task[], query: string): Task[] => {
  if (!query.trim()) {
    return tasks;
  }

  return tasks.filter((task) => searchTaskRecursive(task, query));
};

/**
 * Get detailed match locations for a task (for highlighting purposes)
 */
export const getMatchLocations = (
  task: Task,
  query: string
): ("title" | "description" | "note" | "subtask")[] => {
  if (!query.trim()) return [];
  
  const locations: ("title" | "description" | "note" | "subtask")[] = [];

  if (matchesQuery(task.title, query)) {
    locations.push("title");
  }

  if (task.description && matchesQuery(task.description, query)) {
    locations.push("description");
  }

  for (const note of task.notes) {
    if (matchesQuery(note.content, query)) {
      locations.push("note");
      break; // Only add once
    }
  }

  // Check if any subtask matches
  const checkSubTasks = (subTasks: Task[]): boolean => {
    for (const subTask of subTasks) {
      if (
        matchesQuery(subTask.title, query) ||
        (subTask.description && matchesQuery(subTask.description, query))
      ) {
        return true;
      }
      for (const note of subTask.notes) {
        if (matchesQuery(note.content, query)) {
          return true;
        }
      }
      if (checkSubTasks(subTask.subTasks)) {
        return true;
      }
    }
    return false;
  };

  if (checkSubTasks(task.subTasks)) {
    locations.push("subtask");
  }

  return locations;
};
