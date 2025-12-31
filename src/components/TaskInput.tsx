import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, Calendar, X, MessageSquare, ListTree } from "lucide-react";
import { Task, TaskStatus, TaskNote, STATUS_CONFIG, createEmptyTask } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

interface SubTaskInput {
  id: string;
  title: string;
}

interface NoteInput {
  id: string;
  content: string;
}

const TaskInput = ({ onAddTask }: TaskInputProps) => {
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [subTasks, setSubTasks] = useState<SubTaskInput[]>([]);
  const [notes, setNotes] = useState<NoteInput[]>([]);
  const [newSubTask, setNewSubTask] = useState("");
  const [newNote, setNewNote] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setDueDate(null);
    setSubTasks([]);
    setNotes([]);
    setNewSubTask("");
    setNewNote("");
    setExpanded(false);
  };

  const handleSubmit = () => {
    if (title.trim()) {
      const now = new Date();
      
      // Convert sub-task inputs to actual Task objects
      const subTaskObjects: Task[] = subTasks
        .filter(st => st.title.trim())
        .map(st => ({
          id: crypto.randomUUID(),
          title: st.title.trim(),
          description: "",
          status: "todo" as TaskStatus,
          dueDate: null,
          completed: false,
          notes: [],
          attachments: [],
          subTasks: [],
          parentId: null, // Will be set by parent
          depth: 1,
          createdAt: now,
        }));

      // Convert note inputs to actual TaskNote objects
      const noteObjects: TaskNote[] = notes
        .filter(n => n.content.trim())
        .map(n => ({
          id: crypto.randomUUID(),
          content: n.content.trim(),
          attachments: [],
          createdAt: now,
          updatedAt: now,
          originTaskId: "", // Will be set after task creation
          originTaskTitle: title.trim(),
        }));

      onAddTask({
        ...createEmptyTask(),
        title: title.trim(),
        description: description.trim(),
        status,
        dueDate,
        completed: status === "done",
        subTasks: subTaskObjects,
        notes: noteObjects,
      });
      resetForm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !expanded) {
      handleSubmit();
    }
  };

  const addSubTask = () => {
    if (newSubTask.trim()) {
      setSubTasks([...subTasks, { id: crypto.randomUUID(), title: newSubTask.trim() }]);
      setNewSubTask("");
    }
  };

  const removeSubTask = (id: string) => {
    setSubTasks(subTasks.filter(st => st.id !== id));
  };

  const addNote = () => {
    if (newNote.trim()) {
      setNotes([...notes, { id: crypto.randomUUID(), content: newNote.trim() }]);
      setNewNote("");
    }
  };

  const removeNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
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

          {/* Sub-tasks */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
              <ListTree className="w-4 h-4" />
              Sub-tasks
            </label>
            
            {/* Existing sub-tasks */}
            {subTasks.length > 0 && (
              <div className="space-y-2 mb-2">
                {subTasks.map((subTask) => (
                  <div
                    key={subTask.id}
                    className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2"
                  >
                    <span className="flex-1 text-sm">{subTask.title}</span>
                    <button
                      type="button"
                      onClick={() => removeSubTask(subTask.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new sub-task */}
            <div className="flex gap-2">
              <Input
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                placeholder="Add a sub-task..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubTask();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addSubTask}
                disabled={!newSubTask.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Notes/Comments */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes
            </label>
            
            {/* Existing notes */}
            {notes.length > 0 && (
              <div className="space-y-2 mb-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2"
                  >
                    <span className="flex-1 text-sm whitespace-pre-wrap">{note.content}</span>
                    <button
                      type="button"
                      onClick={() => removeNote(note.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new note */}
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="resize-none min-h-[60px]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addNote}
                disabled={!newNote.trim()}
                className="shrink-0 self-end"
              >
                <Plus className="w-4 h-4" />
              </Button>
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
