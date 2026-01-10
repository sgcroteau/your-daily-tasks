import { useState, useEffect } from "react";
import { TaskPriority } from "@/types/task";

const STORAGE_KEY = "tasks-app-preferences";

export interface AppPreferences {
  defaultPriority: TaskPriority;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  defaultPriority: "medium",
};

export const usePreferencesStorage = () => {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to load preferences from localStorage:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Failed to save preferences to localStorage:", error);
        }
      }
    }
  }, [preferences, isLoaded]);

  const updatePreference = <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return {
    preferences,
    updatePreference,
    isLoaded,
  };
};
