import { useState, useCallback, useEffect, useRef } from "react";
import { Task } from "@/types/task";
import { useToast } from "@/hooks/use-toast";

const SETTINGS_KEY = "tasks-app-history-settings";
const MAX_HISTORY_SIZE = 20;

export type AutoSaveMode = "every-change" | "every-5-minutes" | "manual";

interface HistorySettings {
  autoSaveMode: AutoSaveMode;
  folderHandle: FileSystemDirectoryHandle | null;
  folderName: string | null;
}

interface HistoryState {
  tasks: Task[];
  timestamp: number;
}

// Helper to serialize tasks (convert Date objects to strings)
const serializeTasks = (tasks: Task[]): string => {
  return JSON.stringify(tasks, (key, value) => {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    return value;
  });
};

export const useHistoryStorage = (
  tasks: Task[],
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  isLoaded: boolean
) => {
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [settings, setSettings] = useState<HistorySettings>({
    autoSaveMode: "every-change",
    folderHandle: null,
    folderName: null,
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const isUndoRedoAction = useRef(false);
  const lastSavedRef = useRef<number>(0);
  const autoSaveIntervalRef = useRef<number | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({
          ...prev,
          autoSaveMode: parsed.autoSaveMode || "every-change",
          folderName: parsed.folderName || null,
          // folderHandle cannot be stored, user needs to re-select folder
        }));
      }
    } catch (error) {
      console.error("Failed to load history settings:", error);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          autoSaveMode: settings.autoSaveMode,
          folderName: settings.folderName,
        })
      );
    } catch (error) {
      console.error("Failed to save history settings:", error);
    }
  }, [settings.autoSaveMode, settings.folderName]);

  // Initialize history with first state when tasks load
  useEffect(() => {
    if (isLoaded && history.length === 0 && tasks.length > 0) {
      setHistory([{ tasks: JSON.parse(JSON.stringify(tasks)), timestamp: Date.now() }]);
      setHistoryIndex(0);
    }
  }, [isLoaded, tasks, history.length]);

  // Track task changes for history (skip if it's an undo/redo action)
  useEffect(() => {
    if (!isLoaded || isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    // Don't add to history if tasks haven't actually changed from current history state
    if (historyIndex >= 0 && history[historyIndex]) {
      const currentHistoryTasks = serializeTasks(history[historyIndex].tasks);
      const newTasks = serializeTasks(tasks);
      if (currentHistoryTasks === newTasks) return;
    }

    const newState: HistoryState = {
      tasks: JSON.parse(JSON.stringify(tasks)),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(-MAX_HISTORY_SIZE);
      }
      return newHistory;
    });

    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [tasks, isLoaded]);

  // Auto-save to folder function
  const saveToFolder = useCallback(async () => {
    if (!settings.folderHandle) return false;

    try {
      const fileHandle = await settings.folderHandle.getFileHandle("tasks-backup.json", {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(serializeTasks(tasks));
      await writable.close();
      lastSavedRef.current = Date.now();
      return true;
    } catch (error) {
      console.error("Failed to save to folder:", error);
      // Handle permission errors - folder access may have been revoked
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setSettings((prev) => ({ ...prev, folderHandle: null, folderName: null }));
        toast({
          title: "Folder access lost",
          description: "Please re-select your backup folder.",
          variant: "destructive",
        });
      }
      return false;
    }
  }, [settings.folderHandle, tasks, toast]);

  // Auto-save on every change
  useEffect(() => {
    if (
      settings.autoSaveMode === "every-change" &&
      settings.folderHandle &&
      isLoaded &&
      !isUndoRedoAction.current
    ) {
      saveToFolder();
    }
  }, [tasks, settings.autoSaveMode, settings.folderHandle, isLoaded, saveToFolder]);

  // Auto-save every 5 minutes
  useEffect(() => {
    if (settings.autoSaveMode === "every-5-minutes" && settings.folderHandle) {
      autoSaveIntervalRef.current = window.setInterval(() => {
        saveToFolder();
      }, 5 * 60 * 1000);

      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
        }
      };
    } else {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    }
  }, [settings.autoSaveMode, settings.folderHandle, saveToFolder]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const prevState = history[historyIndex - 1];
      setTasks(JSON.parse(JSON.stringify(prevState.tasks)));
      setHistoryIndex((prev) => prev - 1);
      toast({
        title: "Undo",
        description: "Reverted to previous state",
      });
    }
  }, [historyIndex, history, setTasks, toast]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextState = history[historyIndex + 1];
      setTasks(JSON.parse(JSON.stringify(nextState.tasks)));
      setHistoryIndex((prev) => prev + 1);
      toast({
        title: "Redo",
        description: "Restored next state",
      });
    }
  }, [historyIndex, history, setTasks, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (undo) or Ctrl+Shift+Z / Ctrl+Y (redo)
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Check if running in iframe
  const isInIframe = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  // Select folder using File System Access API
  const selectFolder = useCallback(async () => {
    if (!("showDirectoryPicker" in window)) {
      toast({
        title: "Not supported",
        description: "Your browser doesn't support folder selection. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    // Check if in iframe - File System Access API doesn't work in iframes
    if (isInIframe()) {
      toast({
        title: "Open in new tab required",
        description: "Folder sync requires opening the app in its own tab. Click the link below the preview to open it.",
      });
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: "readwrite",
      });
      setSettings((prev) => ({
        ...prev,
        folderHandle: handle,
        folderName: handle.name,
      }));
      toast({
        title: "Folder selected",
        description: `Backups will be saved to "${handle.name}"`,
      });
      
      // Immediately save current state
      const fileHandle = await handle.getFileHandle("tasks-backup.json", { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(serializeTasks(tasks));
      await writable.close();
      lastSavedRef.current = Date.now();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User cancelled
        return;
      }
      if (error instanceof DOMException && error.name === "SecurityError") {
        toast({
          title: "Open in new tab required",
          description: "Folder sync requires opening the app in its own tab. Click 'Open in new tab' below the preview.",
        });
        return;
      }
      console.error("Failed to select folder:", error);
      toast({
        title: "Failed to select folder",
        description: "Could not access the selected folder.",
        variant: "destructive",
      });
    }
  }, [tasks, toast, isInIframe]);

  // Manual save
  const manualSave = useCallback(async () => {
    if (!settings.folderHandle) {
      toast({
        title: "No folder selected",
        description: "Please select a backup folder first.",
        variant: "destructive",
      });
      return;
    }

    setIsAutoSaving(true);
    const success = await saveToFolder();
    setIsAutoSaving(false);

    if (success) {
      toast({
        title: "Saved",
        description: "Tasks saved to backup folder.",
      });
    }
  }, [settings.folderHandle, saveToFolder, toast]);

  // Load from folder
  const loadFromFolder = useCallback(async () => {
    if (!settings.folderHandle) {
      toast({
        title: "No folder selected",
        description: "Please select a backup folder first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileHandle = await settings.folderHandle.getFileHandle("tasks-backup.json");
      const file = await fileHandle.getFile();
      const content = await file.text();
      const parsed = JSON.parse(content, (key, value) => {
        if (value && typeof value === "object" && value.__type === "Date") {
          return new Date(value.value);
        }
        return value;
      });
      setTasks(parsed);
      toast({
        title: "Loaded",
        description: "Tasks loaded from backup folder.",
      });
    } catch (error) {
      console.error("Failed to load from folder:", error);
      toast({
        title: "Failed to load",
        description: "Could not load tasks from backup folder.",
        variant: "destructive",
      });
    }
  }, [settings.folderHandle, setTasks, toast]);

  // Disconnect folder
  const disconnectFolder = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      folderHandle: null,
      folderName: null,
    }));
    toast({
      title: "Folder disconnected",
      description: "Auto-save to folder has been disabled.",
    });
  }, [toast]);

  // Update auto-save mode
  const setAutoSaveMode = useCallback((mode: AutoSaveMode) => {
    setSettings((prev) => ({ ...prev, autoSaveMode: mode }));
  }, []);

  return {
    // Undo/Redo
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    historyLength: history.length,
    historyIndex,
    
    // Folder sync
    selectFolder,
    disconnectFolder,
    manualSave,
    loadFromFolder,
    folderName: settings.folderName,
    isConnected: !!settings.folderHandle,
    isAutoSaving,
    
    // Settings
    autoSaveMode: settings.autoSaveMode,
    setAutoSaveMode,
  };
};

// Type augmentation for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: "read" | "readwrite" }): Promise<FileSystemDirectoryHandle>;
  }
}
