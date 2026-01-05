import { useState, useEffect, useCallback } from "react";
import { TaskLabel, LABEL_COLORS } from "@/types/task";

const LABELS_STORAGE_KEY = "tasks-app-labels";

export const useLabelStorage = () => {
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load labels from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LABELS_STORAGE_KEY);
      if (stored) {
        setLabels(JSON.parse(stored));
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to load labels from localStorage:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save labels to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(labels));
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Failed to save labels to localStorage:", error);
        }
      }
    }
  }, [labels, isLoaded]);

  const addLabel = useCallback((name: string, color?: string) => {
    const newLabel: TaskLabel = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: color || LABEL_COLORS[labels.length % LABEL_COLORS.length],
    };
    setLabels((prev) => [...prev, newLabel]);
    return newLabel;
  }, [labels.length]);

  const updateLabel = useCallback((id: string, updates: Partial<Pick<TaskLabel, "name" | "color">>) => {
    setLabels((prev) =>
      prev.map((label) =>
        label.id === id ? { ...label, ...updates } : label
      )
    );
  }, []);

  const deleteLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((label) => label.id !== id));
  }, []);

  const getLabelById = useCallback((id: string) => {
    return labels.find((label) => label.id === id) || null;
  }, [labels]);

  return {
    labels,
    isLoaded,
    addLabel,
    updateLabel,
    deleteLabel,
    getLabelById,
  };
};
