import { useState, useCallback, useMemo } from "react";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import TaskInput from "@/components/TaskInput";
import TaskList from "@/components/TaskList";
import TaskStats from "@/components/TaskStats";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskBackupControls from "@/components/TaskBackupControls";
import SearchInput from "@/components/SearchInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { useTaskStorage } from "@/hooks/useTaskStorage";
import { useProjectStorage } from "@/hooks/useProjectStorage";
import { useDebounce } from "@/hooks/useDebounce";
import { Task } from "@/types/task";
import { filterTasksBySearch } from "@/lib/searchUtils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Index = () => {
  const { tasks, setTasks, exportTasks, importTasks, clearTasks, isLoaded } = useTaskStorage();
  const { projects, addProject, updateProject, deleteProject } = useProjectStorage();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  // Calculate task counts for sidebar
  const taskCounts = useMemo(() => {
    const counts = { inbox: 0, byProject: {} as Record<string, number> };
    tasks.forEach((task) => {
      if (task.projectId === null) {
        counts.inbox++;
      } else {
        counts.byProject[task.projectId] = (counts.byProject[task.projectId] || 0) + 1;
      }
    });
    return counts;
  }, [tasks]);

  // Filter tasks by selected project and search query
  const filteredTasks = useMemo(() => {
    const projectTasks = tasks.filter((task) => task.projectId === selectedProjectId);
    return filterTasksBySearch(projectTasks, debouncedSearchQuery);
  }, [tasks, selectedProjectId, debouncedSearchQuery]);

  // Handle project deletion - move tasks to inbox
  const handleDeleteProject = (projectId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.projectId === projectId ? { ...task, projectId: null } : task
      )
    );
    deleteProject(projectId);
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
  };

  const addTask = (taskData: Omit<Task, "id" | "createdAt">) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { 
              ...task, 
              completed: !task.completed,
              status: !task.completed ? "done" : "todo"
            }
          : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const updateTask = (updatedTask: Task) => {
    const updateTaskRecursive = (taskList: Task[], updated: Task): Task[] => {
      return taskList.map((task) => {
        if (task.id === updated.id) {
          return updated;
        }
        if (task.subTasks.length > 0) {
          return {
            ...task,
            subTasks: updateTaskRecursive(task.subTasks, updated),
          };
        }
        return task;
      });
    };
    
    setTasks((prev) => updateTaskRecursive(prev, updatedTask));
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const reorderTasks = (newTasks: Task[]) => {
    // Preserve tasks from other projects/inbox when reordering
    const otherTasks = tasks.filter((t) => t.projectId !== selectedProjectId);
    setTasks([...newTasks, ...otherTasks]);
  };

  const moveTaskToProject = useCallback((taskId: string, newProjectId: string | null) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, projectId: newProjectId } : task
      )
    );
  }, [setTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a project or inbox
    if (overId === "sidebar-inbox") {
      moveTaskToProject(taskId, null);
    } else if (overId.startsWith("sidebar-project-")) {
      const projectId = overId.replace("sidebar-project-", "");
      moveTaskToProject(taskId, projectId);
    }
  };

  const updateSubTasks = (taskId: string, subTasks: Task[]) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, subTasks } : task
      )
    );
  };

  const findTaskById = useCallback((taskId: string): Task | null => {
    const searchInTasks = (taskList: Task[]): Task | null => {
      for (const task of taskList) {
        if (task.id === taskId) {
          return task;
        }
        if (task.subTasks.length > 0) {
          const found = searchInTasks(task.subTasks);
          if (found) return found;
        }
      }
      return null;
    };
    return searchInTasks(tasks);
  }, [tasks]);

  const navigateToTask = useCallback((taskId: string) => {
    const task = findTaskById(taskId);
    if (task) {
      setSelectedTask(task);
    }
  }, [findTaskById]);

  const countTasks = (taskList: Task[]): { total: number; completed: number } => {
    let total = 0;
    let completed = 0;
    
    const count = (list: Task[]) => {
      list.forEach((task) => {
        total++;
        if (task.completed) completed++;
        if (task.subTasks.length > 0) {
          count(task.subTasks);
        }
      });
    };
    
    count(taskList);
    return { total, completed };
  };

  const { total, completed: completedCount } = countTasks(filteredTasks);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const pageTitle = selectedProject ? selectedProject.name : "Inbox";

  const activeTask = activeTaskId ? findTaskById(activeTaskId) : null;

  return (
    <SidebarProvider>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onAddProject={addProject}
            onUpdateProject={updateProject}
            onDeleteProject={handleDeleteProject}
            taskCounts={taskCounts}
            isDragging={!!activeTaskId}
          />

        <main className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="flex items-center gap-4 px-4 py-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2 flex-1">
                {selectedProject && (
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedProject.color }}
                  />
                )}
                <h1 className="text-xl font-semibold text-foreground truncate">
                  {pageTitle}
                </h1>
              </div>
              <TaskBackupControls
                onExport={exportTasks}
                onImport={importTasks}
                onClear={clearTasks}
                taskCount={tasks.length}
              />
              <ThemeToggle />
            </div>
          </header>

          {/* Content */}
          <div className="max-w-xl mx-auto px-4 py-8">
            <div className="space-y-6">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search tasks, notes, subtasks..."
              />
              
              <TaskInput onAddTask={addTask} projectId={selectedProjectId} />
              
              {total > 0 && (
                <TaskStats total={total} completed={completedCount} />
              )}
              
              <TaskList
                tasks={filteredTasks}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onOpen={openTask}
                onReorder={reorderTasks}
                onUpdateSubTasks={updateSubTasks}
                searchQuery={debouncedSearchQuery}
              />

              {filteredTasks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {debouncedSearchQuery
                      ? `No results for "${debouncedSearchQuery}"`
                      : `No tasks in ${pageTitle.toLowerCase()}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        <TaskDetailDialog
          task={selectedTask}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onUpdate={updateTask}
          onNavigateToTask={navigateToTask}
          findTaskById={findTaskById}
          projects={projects}
        />

        <DragOverlay>
          {activeTask ? (
            <div className="bg-card border border-primary rounded-lg p-3 shadow-lg opacity-80">
              <span className="text-sm font-medium">{activeTask.title}</span>
            </div>
          ) : null}
        </DragOverlay>
        </div>
      </DndContext>
    </SidebarProvider>
  );
};

export default Index;
