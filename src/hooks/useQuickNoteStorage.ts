import { useState, useEffect, useCallback } from "react";
import { QuickNote, QUICK_NOTE_COLORS } from "@/types/task";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "tasks-app-quick-notes";

const serializeNotes = (notes: QuickNote[]): string => {
  return JSON.stringify(notes, (key, value) => {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    return value;
  });
};

const deserializeNotes = (json: string): QuickNote[] => {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === "object" && value.__type === "Date") {
      return new Date(value.value);
    }
    return value;
  });
};

export const useQuickNoteStorage = () => {
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = deserializeNotes(stored);
        setQuickNotes(parsed);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to load quick notes from localStorage:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, serializeNotes(quickNotes));
      } catch (error) {
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          toast({
            title: "Storage limit reached",
            description: "Please remove some notes to free up space.",
            variant: "destructive",
          });
        } else if (import.meta.env.DEV) {
          console.error("Failed to save quick notes to localStorage:", error);
        }
      }
    }
  }, [quickNotes, isLoaded, toast]);

  const addQuickNote = useCallback((content: string, projectId: string | null = null, color?: string) => {
    const noteColor = color || QUICK_NOTE_COLORS[Math.floor(Math.random() * QUICK_NOTE_COLORS.length)];
    const now = new Date();
    const newNote: QuickNote = {
      id: crypto.randomUUID(),
      content: content.trim(),
      color: noteColor,
      projectId,
      pinnedToTaskId: null,
      createdAt: now,
      updatedAt: now,
    };
    setQuickNotes(prev => [newNote, ...prev]);
    return newNote;
  }, []);

  const updateQuickNote = useCallback((id: string, updates: Partial<Pick<QuickNote, "content" | "color" | "projectId" | "pinnedToTaskId">>) => {
    setQuickNotes(prev =>
      prev.map(note =>
        note.id === id
          ? { ...note, ...updates, updatedAt: new Date() }
          : note
      )
    );
  }, []);

  const deleteQuickNote = useCallback((id: string) => {
    setQuickNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  const pinToTask = useCallback((noteId: string, taskId: string | null) => {
    setQuickNotes(prev =>
      prev.map(note =>
        note.id === noteId
          ? { ...note, pinnedToTaskId: taskId, updatedAt: new Date() }
          : note
      )
    );
  }, []);

  const moveToProject = useCallback((noteId: string, projectId: string | null) => {
    setQuickNotes(prev =>
      prev.map(note =>
        note.id === noteId
          ? { ...note, projectId, updatedAt: new Date() }
          : note
      )
    );
  }, []);

  return {
    quickNotes,
    setQuickNotes,
    isLoaded,
    addQuickNote,
    updateQuickNote,
    deleteQuickNote,
    pinToTask,
    moveToProject,
  };
};
