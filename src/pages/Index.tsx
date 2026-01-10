import { useState, useCallback, useMemo } from "react";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import TaskInput from "@/components/TaskInput";
import TaskList from "@/components/TaskList";
import TaskStats from "@/components/TaskStats";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskBackupControls from "@/components/TaskBackupControls";
import SearchInput from "@/components/SearchInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { HistoryControls } from "@/components/HistoryControls";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useTaskStorage } from "@/hooks/useTaskStorage";
import { useProjectStorage } from "@/hooks/useProjectStorage";
import { useLabelStorage } from "@/hooks/useLabelStorage";
import { useHistoryStorage } from "@/hooks/useHistoryStorage";
import { usePreferencesStorage } from "@/hooks/usePreferencesStorage";
import { useDebounce } from "@/hooks/useDebounce";
import { Task, TaskPriority, TaskLabel, PRIORITY_CONFIG, getNextDueDate } from "@/types/task";
import { filterTasksBySearch } from "@/lib/searchUtils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, Minus, ArrowUp, AlertTriangle, ArrowUpDown, Filter, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption = "none" | "priority-high" | "priority-low" | "date-asc" | "date-desc";
type PriorityFilter = "all" | TaskPriority;

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const Index = () => {
  const { tasks, setTasks, exportTasks, importTasks, clearTasks, isLoaded } = useTaskStorage();
  const { projects, addProject, updateProject, deleteProject } = useProjectStorage();
  const { labels, addLabel } = useLabelStorage();
  const { preferences, updatePreference } = usePreferencesStorage();
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    selectFolder,
    disconnectFolder,
    manualSave,
    loadFromFolder,
    folderName,
    isConnected,
    isAutoSaving,
    isSynced,
    lastSavedTime,
    autoSaveMode,
    setAutoSaveMode,
  } = useHistoryStorage(tasks, setTasks, isLoaded);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("none");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
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

  // Filter tasks by selected project, search query, priority, and labels
  const filteredTasks = useMemo(() => {
    let projectTasks = tasks.filter((task) => task.projectId === selectedProjectId);
    
    // Apply priority filter
    if (priorityFilter !== "all") {
      projectTasks = projectTasks.filter((task) => task.priority === priorityFilter);
    }
    
    // Apply label filter
    if (labelFilter !== "all") {
      projectTasks = projectTasks.filter((task) => task.labelIds?.includes(labelFilter));
    }
    
    // Apply search filter
    let result = filterTasksBySearch(projectTasks, debouncedSearchQuery);
    
    // Apply sorting
    if (sortOption !== "none") {
      result = [...result].sort((a, b) => {
        switch (sortOption) {
          case "priority-high":
            return PRIORITY_ORDER[b.priority || "medium"] - PRIORITY_ORDER[a.priority || "medium"];
          case "priority-low":
            return PRIORITY_ORDER[a.priority || "medium"] - PRIORITY_ORDER[b.priority || "medium"];
          case "date-asc":
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          case "date-desc":
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          default:
            return 0;
        }
      });
    }
    
    return result;
  }, [tasks, selectedProjectId, debouncedSearchQuery, priorityFilter, labelFilter, sortOption]);

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
    setTasks((prev) => {
      const taskToToggle = prev.find((t) => t.id === id);
      if (!taskToToggle) return prev;
      
      const isCompleting = !taskToToggle.completed;
      
      // If completing a recurring task, create the next occurrence
      if (isCompleting && taskToToggle.recurrence && taskToToggle.recurrence.type !== "none") {
        const nextDueDate = getNextDueDate(taskToToggle.dueDate, taskToToggle.recurrence);
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: taskToToggle.title,
          description: taskToToggle.description,
          status: "todo" as const,
          priority: taskToToggle.priority,
          dueDate: nextDueDate,
          completed: false,
          notes: [],
          attachments: taskToToggle.attachments,
          subTasks: taskToToggle.subTasks.map((st) => ({
            ...st,
            id: crypto.randomUUID(),
            completed: false,
            status: "todo" as const,
          })),
          parentId: taskToToggle.parentId,
          depth: taskToToggle.depth,
          createdAt: new Date(),
          projectId: taskToToggle.projectId,
          labelIds: taskToToggle.labelIds,
          recurrence: taskToToggle.recurrence,
        };
        
        const updatedTasks = prev.map((task) =>
          task.id === id
            ? { 
                ...task, 
                completed: true,
                status: "done" as const,
                recurrence: null,
              }
            : task
        );
        
        return [newTask, ...updatedTasks];
      }
      
      return prev.map((task) =>
        task.id === id
          ? { 
              ...task, 
              completed: !task.completed,
              status: !task.completed ? "done" as const : "todo" as const
            }
          : task
      );
    });
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

    // Check if dropped on a project or inbox in sidebar
    if (overId === "sidebar-inbox") {
      moveTaskToProject(taskId, null);
      return;
    }
    if (overId.startsWith("sidebar-project-")) {
      const projectId = overId.replace("sidebar-project-", "");
      moveTaskToProject(taskId, projectId);
      return;
    }

    // Otherwise, handle reordering within the task list
    if (active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex((t) => t.id === active.id);
      const newIndex = filteredTasks.findIndex((t) => t.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTasks(arrayMove(filteredTasks, oldIndex, newIndex));
      }
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
              <HistoryControls
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onSelectFolder={selectFolder}
                onDisconnectFolder={disconnectFolder}
                onManualSave={manualSave}
                onLoadFromFolder={loadFromFolder}
                folderName={folderName}
                isConnected={isConnected}
                isAutoSaving={isAutoSaving}
                isSynced={isSynced}
                lastSavedTime={lastSavedTime}
                autoSaveMode={autoSaveMode}
                onAutoSaveModeChange={setAutoSaveMode}
              />
              <TaskBackupControls
                onExport={exportTasks}
                onImport={importTasks}
                onClear={clearTasks}
                taskCount={tasks.length}
              />
              <SettingsDialog
                preferences={preferences}
                onUpdatePreference={updatePreference}
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
              
              <TaskInput 
                onAddTask={addTask} 
                projectId={selectedProjectId} 
                labels={labels}
                onCreateLabel={addLabel}
                defaultPriority={preferences.defaultPriority}
              />
              
              {/* Filter and Sort Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Filter priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {key === "low" && <ArrowDown className="w-3 h-3" />}
                            {key === "medium" && <Minus className="w-3 h-3" />}
                            {key === "high" && <ArrowUp className="w-3 h-3" />}
                            {key === "urgent" && <AlertTriangle className="w-3 h-3" />}
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Label filter */}
                {labels.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <Select value={labelFilter} onValueChange={setLabelFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue placeholder="Filter label" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Labels</SelectItem>
                        {labels.map((label) => (
                          <SelectItem key={label.id} value={label.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: label.color }}
                              />
                              <span className="truncate">{label.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default Order</SelectItem>
                      <SelectItem value="priority-high">Priority: High → Low</SelectItem>
                      <SelectItem value="priority-low">Priority: Low → High</SelectItem>
                      <SelectItem value="date-asc">Due Date: Earliest</SelectItem>
                      <SelectItem value="date-desc">Due Date: Latest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(priorityFilter !== "all" || sortOption !== "none" || labelFilter !== "all") && (
                  <button
                    onClick={() => {
                      setPriorityFilter("all");
                      setSortOption("none");
                      setLabelFilter("all");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              
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
                labels={labels}
              />

              {filteredTasks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {debouncedSearchQuery
                      ? `No results for "${debouncedSearchQuery}"`
                      : priorityFilter !== "all"
                      ? `No ${priorityFilter} priority tasks`
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
          labels={labels}
          onCreateLabel={addLabel}
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
