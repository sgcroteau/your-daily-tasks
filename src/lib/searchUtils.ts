import { Task } from "@/types/task";

/**
 * Check if a string contains a search query (case-insensitive, partial match)
 */
const matchesQuery = (text: string, query: string): boolean => {
  return text.toLowerCase().includes(query.toLowerCase());
};

/**
 * Check if a task directly matches the query (not including children)
 */
const taskDirectlyMatches = (task: Task, query: string): boolean => {
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

  return false;
};

/**
 * Recursively collect all tasks that directly match the query
 * Returns a flat array of matching tasks (without their subtasks)
 */
const collectMatchingTasks = (tasks: Task[], query: string): Task[] => {
  const results: Task[] = [];

  for (const task of tasks) {
    // If this task directly matches, add it (without subtasks to keep results clean)
    if (taskDirectlyMatches(task, query)) {
      results.push({ ...task, subTasks: [] });
    }

    // Always recurse into subtasks to find nested matches
    if (task.subTasks.length > 0) {
      const nestedMatches = collectMatchingTasks(task.subTasks, query);
      results.push(...nestedMatches);
    }
  }

  return results;
};

/**
 * Filter tasks based on search query
 * Returns only tasks that directly match (flattened, no nesting)
 */
export const filterTasksBySearch = (tasks: Task[], query: string): Task[] => {
  if (!query.trim()) {
    return tasks;
  }

  return collectMatchingTasks(tasks, query);
};

/**
 * Get detailed match locations for a task (for highlighting purposes)
 */
export const getMatchLocations = (
  task: Task,
  query: string
): ("title" | "description" | "note")[] => {
  if (!query.trim()) return [];
  
  const locations: ("title" | "description" | "note")[] = [];

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

  return locations;
};
