import { useState, useEffect, useCallback } from "react";
import { Project, PROJECT_COLORS } from "@/types/task";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "tasks-app-projects";

const serializeProjects = (projects: Project[]): string => {
  return JSON.stringify(projects, (key, value) => {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    return value;
  });
};

const deserializeProjects = (json: string): Project[] => {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === "object" && value.__type === "Date") {
      return new Date(value.value);
    }
    return value;
  });
};

export const useProjectStorage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = deserializeProjects(stored);
        setProjects(parsed);
      }
    } catch (error) {
      console.error("Failed to load projects from localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, serializeProjects(projects));
      } catch (error) {
        console.error("Failed to save projects to localStorage:", error);
      }
    }
  }, [projects, isLoaded]);

  const addProject = useCallback((name: string) => {
    const usedColors = projects.map(p => p.color);
    const availableColor = PROJECT_COLORS.find(c => !usedColors.includes(c)) || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: availableColor,
      createdAt: new Date(),
    };
    setProjects(prev => [...prev, newProject]);
    toast({
      title: "Project created",
      description: `"${name}" has been added.`,
    });
    return newProject;
  }, [projects, toast]);

  const updateProject = useCallback((id: string, updates: Partial<Pick<Project, "name" | "color">>) => {
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Project deleted",
      description: "Tasks have been moved to Inbox.",
    });
  }, [toast]);

  return {
    projects,
    setProjects,
    isLoaded,
    addProject,
    updateProject,
    deleteProject,
  };
};
