import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Task, TaskStatus, STATUS_CONFIG, createEmptyTask } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskInputProps {
  onAddTask: (task: Omit<Task, "id" | "createdAt">) => void;
}

const TaskInput = ({ onAddTask }: TaskInputProps) => {
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setDueDate(null);
    setExpanded(false);
  };

  const handleSubmit = () => {
    if (title.trim()) {
      onAddTask({
        ...createEmptyTask(),
        title: title.trim(),
        description: description.trim(),
        status,
        dueDate,
        completed: status === "done",
      });
      resetForm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !expanded) {
      handleSubmit();
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden transition-all duration-200">
      {/* Title input row */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new task..."
          className="flex-1 px-5 py-4 pr-24 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title={expanded ? "Collapse options" : "Expand options"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="p-2.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-border space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Description */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="resize-none min-h-[80px]"
            />
          </div>

          {/* Status and Due Date row */}
          <div className="flex flex-wrap gap-4">
            {/* Status */}
            <div className="flex-1 min-w-[140px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Status
              </label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", config.color.split(" ")[0])} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="flex-1 min-w-[140px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Due Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate || undefined}
                    onSelect={(date) => setDueDate(date || null)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Submit button for expanded mode */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskInput;
