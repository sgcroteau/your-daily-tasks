import { useState, useEffect } from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import TaskNotes from "./TaskNotes";
import { Task, TaskStatus, STATUS_CONFIG, TaskNote } from "@/types/task";
import { cn } from "@/lib/utils";

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (task: Task) => void;
}

const TaskDetailDialog = ({
  task,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueDateInput, setDueDateInput] = useState("");
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setDueDate(task.dueDate);
      setDueDateInput(task.dueDate ? format(task.dueDate, "MM/dd/yyyy") : "");
      setNotes(task.notes);
    }
  }, [task]);

  const handleSave = () => {
    if (task) {
      onUpdate({
        ...task,
        title,
        description,
        status,
        dueDate,
        notes,
        completed: status === "done",
      });
      onOpenChange(false);
    }
  };

  const handleDateInputChange = (value: string) => {
    setDueDateInput(value);
    // Try to parse as MM/dd/yyyy
    const parsed = parse(value, "MM/dd/yyyy", new Date());
    if (isValid(parsed)) {
      setDueDate(parsed);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDueDate(date);
      setDueDateInput(format(date, "MM/dd/yyyy"));
    }
    setCalendarOpen(false);
  };

  const clearDate = () => {
    setDueDate(null);
    setDueDateInput("");
  };

  const handleAddNote = (content: string) => {
    const newNote: TaskNote = {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleUpdateNote = (noteId: string, content: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, content, updatedAt: new Date() }
          : note
      )
    );
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Edit Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="w-full bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs", config.color)}>
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Due Date</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={dueDateInput}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-8"
                />
                {dueDate && (
                  <button
                    onClick={clearDate}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-3 bg-secondary/50 border-border"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dueDate || undefined}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notes */}
          <TaskNotes
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
