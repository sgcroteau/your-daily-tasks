import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TaskItem = ({ task, onToggle, onDelete }: TaskItemProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const handleToggle = () => {
    if (!task.completed) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 400);
    }
    onToggle(task.id);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => onDelete(task.id), 200);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 bg-card border border-border rounded-lg transition-all duration-200 hover:shadow-hover hover:border-primary/20",
        isDeleting && "task-item-exit"
      )}
    >
      <button
        onClick={handleToggle}
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
          task.completed
            ? "bg-primary border-primary"
            : "border-muted-foreground/40 hover:border-primary/60",
          justCompleted && "check-bounce"
        )}
      >
        {task.completed && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
      </button>

      <span
        className={cn(
          "flex-1 text-foreground transition-all duration-200",
          task.completed && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </span>

      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all duration-200"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default TaskItem;
