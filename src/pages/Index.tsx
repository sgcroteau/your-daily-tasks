import { useState, useCallback } from "react";
import TaskInput from "@/components/TaskInput";
import TaskList from "@/components/TaskList";
import TaskStats from "@/components/TaskStats";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskBackupControls from "@/components/TaskBackupControls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTaskStorage } from "@/hooks/useTaskStorage";
import { Task } from "@/types/task";
import { CheckCircle2 } from "lucide-react";

const Index = () => {
  const { tasks, setTasks, exportTasks, importTasks, clearTasks, isLoaded } = useTaskStorage();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    // Update selectedTask if it's the same task
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const reorderTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
  };

  const updateSubTasks = (taskId: string, subTasks: Task[]) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, subTasks } : task
      )
    );
  };

  // Find a task by ID recursively through all tasks and subtasks
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

  // Navigate to a specific task (used for clicking on sub-task note links)
  const navigateToTask = useCallback((taskId: string) => {
    const task = findTaskById(taskId);
    if (task) {
      setSelectedTask(task);
      // Dialog stays open, just switches to the new task
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

  const { total, completed: completedCount } = countTasks(tasks);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <TaskBackupControls
              onExport={exportTasks}
              onImport={importTasks}
              onClear={clearTasks}
              taskCount={total}
            />
            <ThemeToggle />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Tasks
          </h1>
          <p className="text-muted-foreground mt-2">
            Stay organized, get things done
          </p>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          <TaskInput onAddTask={addTask} />
          
          {total > 0 && (
            <TaskStats total={total} completed={completedCount} />
          )}
          
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onOpen={openTask}
            onReorder={reorderTasks}
            onUpdateSubTasks={updateSubTasks}
          />
        </main>

        {/* Task Detail Dialog */}
        <TaskDetailDialog
          task={selectedTask}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onUpdate={updateTask}
          onNavigateToTask={navigateToTask}
          findTaskById={findTaskById}
        />
      </div>
    </div>
  );
};

export default Index;
