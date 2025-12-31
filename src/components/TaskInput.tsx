import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, Calendar, X, MessageSquare, ListTree, ChevronRight } from "lucide-react";
import { Task, TaskStatus, TaskNote, TaskAttachment, STATUS_CONFIG, createEmptyTask, MAX_DEPTH } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import FileAttachment from "@/components/FileAttachment";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskInputProps {
  onAddTask: (task: Omit<Task, "id" | "createdAt">) => void;
}

interface SubTaskInput {
  id: string;
  title: string;
  subTasks: SubTaskInput[];
  expanded: boolean;
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
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [newSubTask, setNewSubTask] = useState("");
  const [newNote, setNewNote] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setDueDate(null);
    setSubTasks([]);
    setNotes([]);
    setAttachments([]);
    setNewSubTask("");
    setNewNote("");
    setExpanded(false);
  };

  // Convert SubTaskInput tree to Task tree
  const convertSubTasksToTasks = (inputs: SubTaskInput[], depth: number): Task[] => {
    const now = new Date();
    return inputs
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
        subTasks: convertSubTasksToTasks(st.subTasks, depth + 1),
        parentId: null,
        depth,
        createdAt: now,
      }));
  };

  const handleSubmit = () => {
    if (title.trim()) {
      const now = new Date();
      
      const subTaskObjects = convertSubTasksToTasks(subTasks, 1);

      const noteObjects: TaskNote[] = notes
        .filter(n => n.content.trim())
        .map(n => ({
          id: crypto.randomUUID(),
          content: n.content.trim(),
          attachments: [],
          createdAt: now,
          updatedAt: now,
          originTaskId: "",
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
        attachments,
      });
      resetForm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !expanded) {
      handleSubmit();
    }
  };

  const addSubTask = (parentPath: number[] = []) => {
    if (parentPath.length === 0) {
      if (newSubTask.trim()) {
        setSubTasks([...subTasks, { id: crypto.randomUUID(), title: newSubTask.trim(), subTasks: [], expanded: false }]);
        setNewSubTask("");
      }
    }
  };

  const addNestedSubTask = (path: number[], title: string) => {
    if (!title.trim()) return;
    
    const updateNested = (items: SubTaskInput[], currentPath: number[]): SubTaskInput[] => {
      if (currentPath.length === 0) {
        return [...items, { id: crypto.randomUUID(), title: title.trim(), subTasks: [], expanded: false }];
      }
      
      const [index, ...rest] = currentPath;
      return items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            subTasks: updateNested(item.subTasks, rest),
          };
        }
        return item;
      });
    };
    
    setSubTasks(updateNested(subTasks, path));
  };

  const removeSubTask = (path: number[]) => {
    const removeNested = (items: SubTaskInput[], currentPath: number[]): SubTaskInput[] => {
      if (currentPath.length === 1) {
        return items.filter((_, i) => i !== currentPath[0]);
      }
      
      const [index, ...rest] = currentPath;
      return items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            subTasks: removeNested(item.subTasks, rest),
          };
        }
        return item;
      });
    };
    
    setSubTasks(removeNested(subTasks, path));
  };

  const toggleSubTaskExpanded = (path: number[]) => {
    const toggleNested = (items: SubTaskInput[], currentPath: number[]): SubTaskInput[] => {
      const [index, ...rest] = currentPath;
      return items.map((item, i) => {
        if (i === index) {
          if (rest.length === 0) {
            return { ...item, expanded: !item.expanded };
          }
          return { ...item, subTasks: toggleNested(item.subTasks, rest) };
        }
        return item;
      });
    };
    
    setSubTasks(toggleNested(subTasks, path));
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

  const addAttachment = (attachment: TaskAttachment) => {
    setAttachments([...attachments, attachment]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  // Recursive sub-task renderer
  const renderSubTask = (subTask: SubTaskInput, path: number[], depth: number) => {
    const canAddChildren = depth < MAX_DEPTH - 1;
    
    return (
      <div key={subTask.id} className="space-y-1">
        <div
          className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2"
          style={{ marginLeft: `${(depth) * 16}px` }}
        >
          {canAddChildren && (
            <button
              type="button"
              onClick={() => toggleSubTaskExpanded(path)}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", subTask.expanded && "rotate-90")} />
            </button>
          )}
          <span className="flex-1 text-sm">{subTask.title}</span>
          <button
            type="button"
            onClick={() => removeSubTask(path)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        
        {/* Nested sub-tasks and add input */}
        {canAddChildren && subTask.expanded && (
          <div className="space-y-1">
            {subTask.subTasks.map((child, childIndex) => 
              renderSubTask(child, [...path, childIndex], depth + 1)
            )}
            <NestedSubTaskInput
              depth={depth + 1}
              onAdd={(title) => addNestedSubTask(path, title)}
            />
          </div>
        )}
      </div>
    );
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

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Attachments
            </label>
            <FileAttachment
              attachments={attachments}
              onAdd={addAttachment}
              onRemove={removeAttachment}
            />
          </div>

          {/* Sub-tasks */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
              <ListTree className="w-4 h-4" />
              Sub-tasks
            </label>
            
            {/* Existing sub-tasks */}
            {subTasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {subTasks.map((subTask, index) => 
                  renderSubTask(subTask, [index], 0)
                )}
              </div>
            )}
            
            {/* Add new top-level sub-task */}
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
                onClick={() => addSubTask()}
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

// Small component for adding nested sub-tasks
const NestedSubTaskInput = ({ depth, onAdd }: { depth: number; onAdd: (title: string) => void }) => {
  const [value, setValue] = useState("");
  
  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
    }
  };
  
  return (
    <div 
      className="flex gap-2 items-center"
      style={{ marginLeft: `${depth * 16}px` }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add nested sub-task..."
        className="h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleAdd}
        disabled={!value.trim()}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default TaskInput;
