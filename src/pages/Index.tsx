import { useState } from "react";
import TaskInput from "@/components/TaskInput";
import TaskList from "@/components/TaskList";
import TaskStats from "@/components/TaskStats";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import { Task } from "@/types/task";
import { CheckCircle2 } from "lucide-react";

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
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
    const updateTaskRecursive = (tasks: Task[], updated: Task): Task[] => {
      return tasks.map((task) => {
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

  const countTasks = (tasks: Task[]): { total: number; completed: number } => {
    let total = 0;
    let completed = 0;
    
    const count = (taskList: Task[]) => {
      taskList.forEach((task) => {
        total++;
        if (task.completed) completed++;
        if (task.subTasks.length > 0) {
          count(task.subTasks);
        }
      });
    };
    
    count(tasks);
    return { total, completed };
  };

  const { total, completed: completedCount } = countTasks(tasks);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
            <CheckCircle2 className="w-7 h-7 text-primary" />
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
        />
      </div>
    </div>
  );
};

export default Index;
