import { useState } from "react";
import TaskInput from "@/components/TaskInput";
import TaskList from "@/components/TaskList";
import TaskStats from "@/components/TaskStats";
import { CheckCircle2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = (title: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const completedCount = tasks.filter((t) => t.completed).length;

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
          
          {tasks.length > 0 && (
            <TaskStats total={tasks.length} completed={completedCount} />
          )}
          
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
