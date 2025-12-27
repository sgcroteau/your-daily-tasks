import { useState } from "react";
import { Plus } from "lucide-react";
import { Task, createEmptyTask } from "@/types/task";

interface TaskInputProps {
  onAddTask: (task: Omit<Task, "id" | "createdAt">) => void;
}

const TaskInput = ({ onAddTask }: TaskInputProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim()) {
      onAddTask({
        ...createEmptyTask(),
        title: value.trim(),
      });
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="relative group">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a new task..."
        className="w-full px-5 py-4 pr-14 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-soft"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default TaskInput;
