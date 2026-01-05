import { useState, useEffect, useCallback, useMemo } from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, X, Plus, ChevronRight, ExternalLink, Inbox, ArrowDown, Minus, ArrowUp, AlertTriangle } from "lucide-react";
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
import FileAttachment from "./FileAttachment";
import LabelSelector from "./LabelSelector";
import { Task, TaskStatus, TaskPriority, TaskLabel, STATUS_CONFIG, PRIORITY_CONFIG, TaskNote, TaskAttachment, MAX_DEPTH, createEmptyTask, Project } from "@/types/task";
import { cn } from "@/lib/utils";

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (task: Task) => void;
  onNavigateToTask?: (taskId: string) => void;
  findTaskById?: (taskId: string) => Task | null;
  projects?: Project[];
  labels: TaskLabel[];
  onCreateLabel: (name: string, color: string) => TaskLabel;
}

// Helper to collect all notes from a task and its subtasks recursively
const collectAllNotes = (task: Task, taskTitleMap: Map<string, string>): TaskNote[] => {
  let allNotes: TaskNote[] = [...task.notes];
  
  const collectFromSubTasks = (subTasks: Task[]) => {
    subTasks.forEach((st) => {
      // Update the title map dynamically
      taskTitleMap.set(st.id, st.title);
      allNotes = [...allNotes, ...st.notes];
      if (st.subTasks.length > 0) {
        collectFromSubTasks(st.subTasks);
      }
    });
  };
  
  collectFromSubTasks(task.subTasks);
  return allNotes;
};

// Helper to get dynamic task titles
const buildTaskTitleMap = (task: Task): Map<string, string> => {
  const map = new Map<string, string>();
  map.set(task.id, task.title);
  
  const traverse = (subTasks: Task[]) => {
    subTasks.forEach((st) => {
      map.set(st.id, st.title);
      if (st.subTasks.length > 0) {
        traverse(st.subTasks);
      }
    });
  };
  
  traverse(task.subTasks);
  return map;
};

const TaskDetailDialog = ({
  task,
  open,
  onOpenChange,
  onUpdate,
  onNavigateToTask,
  findTaskById,
  projects = [],
  labels,
  onCreateLabel,
}: TaskDetailDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueDateInput, setDueDateInput] = useState("");
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [subTasks, setSubTasks] = useState<Task[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  // Build parent chain for breadcrumb navigation
  const parentChain = useMemo(() => {
    if (!task || !task.parentId || !findTaskById) return [];
    
    const chain: Task[] = [];
    let currentParentId: string | null = task.parentId;
    
    while (currentParentId) {
      const parent = findTaskById(currentParentId);
      if (parent) {
        chain.unshift(parent); // Add to beginning for correct order
        currentParentId = parent.parentId;
      } else {
        break;
      }
    }
    
    return chain;
  }, [task, findTaskById]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority || "medium");
      setSelectedLabelIds(task.labelIds || []);
      setDueDate(task.dueDate);
      setDueDateInput(task.dueDate ? format(task.dueDate, "MM/dd/yyyy") : "");
      setNotes(task.notes);
      setAttachments(task.attachments);
      setSubTasks(task.subTasks);
      setProjectId(task.projectId);
    }
  }, [task]);

  const handleSave = () => {
    if (task) {
      onUpdate({
        ...task,
        title,
        description,
        status,
        priority,
        labelIds: selectedLabelIds,
        dueDate,
        notes,
        attachments,
        subTasks,
        projectId,
        completed: status === "done",
      });
      onOpenChange(false);
    }
  };

  const handleDateInputChange = (value: string) => {
    setDueDateInput(value);
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

  const handleAddNote = (content: string, noteAttachments: TaskAttachment[]) => {
    if (!task) return;
    const newNote: TaskNote = {
      id: crypto.randomUUID(),
      content,
      attachments: noteAttachments,
      createdAt: new Date(),
      updatedAt: new Date(),
      originTaskId: task.id,
      originTaskTitle: title, // Use current title
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleUpdateNote = (noteId: string, content: string, noteAttachments: TaskAttachment[]) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, content, attachments: noteAttachments, updatedAt: new Date() }
          : note
      )
    );
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  const handleAddSubTask = () => {
    if (newSubTaskTitle.trim() && task && task.depth < MAX_DEPTH) {
      const newSubTask: Task = {
        ...createEmptyTask(task.id, task.depth + 1, task.projectId),
        id: crypto.randomUUID(),
        title: newSubTaskTitle.trim(),
        createdAt: new Date(),
      };
      setSubTasks((prev) => [...prev, newSubTask]);
      setNewSubTaskTitle("");
    }
  };

  const handleUpdateSubTask = (updatedSubTask: Task) => {
    setSubTasks((prev) =>
      prev.map((st) => (st.id === updatedSubTask.id ? updatedSubTask : st))
    );
  };

  const handleDeleteSubTask = (subTaskId: string) => {
    setSubTasks((prev) => prev.filter((st) => st.id !== subTaskId));
  };

  const handleNavigateToSubTask = (taskId: string) => {
    // Save current changes first
    if (task) {
      onUpdate({
        ...task,
        title,
        description,
        status,
        priority,
        labelIds: selectedLabelIds,
        dueDate,
        notes,
        attachments,
        subTasks,
        completed: status === "done",
      });
    }
    // Navigate to the sub-task
    onNavigateToTask?.(taskId);
  };

  const handleToggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  if (!task) return null;

  const canAddSubTasks = task.depth < MAX_DEPTH;

  // Build current task state for note collection
  const currentTaskState: Task = {
    ...task,
    title,
    notes,
    subTasks,
  };

  // Build title map from current state (dynamic titles)
  const taskTitleMap = buildTaskTitleMap(currentTaskState);

  // Collect all notes including from subtasks, with updated titles
  const allNotesWithTitles = collectAllNotes(currentTaskState, taskTitleMap).map((note) => ({
    ...note,
    originTaskTitle: taskTitleMap.get(note.originTaskId) || note.originTaskTitle,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          {/* Parent task breadcrumb */}
          {parentChain.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
              {parentChain.map((parent, index) => (
                <div key={parent.id} className="flex items-center gap-1">
                  <button
                    onClick={() => handleNavigateToSubTask(parent.id)}
                    className="hover:text-primary hover:underline transition-colors max-w-32 truncate"
                    title={parent.title}
                  >
                    {parent.title}
                  </button>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </div>
              ))}
              <span className="text-foreground font-medium truncate max-w-40" title={task.title}>
                {task.title || "Current task"}
              </span>
            </div>
          )}
          <DialogTitle className="text-lg font-semibold text-foreground">
            Edit Task
            {task.depth > 0 && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (Level {task.depth + 1})
              </span>
            )}
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

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger className="w-full bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {key === "low" && <ArrowDown className="w-3 h-3" />}
                      {key === "medium" && <Minus className="w-3 h-3" />}
                      {key === "high" && <ArrowUp className="w-3 h-3" />}
                      {key === "urgent" && <AlertTriangle className="w-3 h-3" />}
                      <span className={cn("px-2 py-0.5 rounded-full text-xs", config.color)}>
                        {config.label}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Labels</label>
            <LabelSelector
              labels={labels}
              selectedLabelIds={selectedLabelIds}
              onToggleLabel={handleToggleLabel}
              onCreateLabel={onCreateLabel}
            />
          </div>

          {/* Project */}
          {task.parentId === null && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Project</label>
              <Select 
                value={projectId ?? "inbox"} 
                onValueChange={(v) => setProjectId(v === "inbox" ? null : v)}
              >
                <SelectTrigger className="w-full bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">
                    <div className="flex items-center gap-2">
                      <Inbox className="h-4 w-4" />
                      <span>Inbox</span>
                    </div>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <span>{project.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Task Attachments */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Attachments</label>
            <FileAttachment
              attachments={attachments}
              onAdd={(a) => setAttachments((prev) => [...prev, a])}
              onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
            />
          </div>

          {/* Sub-tasks */}
          {canAddSubTasks && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Sub-tasks {subTasks.length > 0 && `(${subTasks.length})`}
              </label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubTaskTitle}
                  onChange={(e) => setNewSubTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubTask()}
                  placeholder="Add a sub-task..."
                  className="flex-1 px-3 py-2 bg-secondary/50 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  onClick={handleAddSubTask}
                  disabled={!newSubTaskTitle.trim()}
                  className="p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

          {subTasks.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {subTasks.map((st) => (
                    <HierarchicalSubTaskItem
                      key={st.id}
                      subTask={st}
                      onUpdate={handleUpdateSubTask}
                      onDelete={handleDeleteSubTask}
                      onNavigateToTask={handleNavigateToSubTask}
                      depth={st.depth}
                      rootTaskDepth={task.depth}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <TaskNotes
            notes={notes}
            currentTaskId={task.id}
            currentTaskTitle={title}
            allNotes={allNotesWithTitles}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onNavigateToTask={handleNavigateToSubTask}
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

interface HierarchicalSubTaskItemProps {
  subTask: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
  onNavigateToTask: (taskId: string) => void;
  depth: number;
  rootTaskDepth: number;
}

const HierarchicalSubTaskItem = ({ 
  subTask, 
  onUpdate, 
  onDelete, 
  onNavigateToTask,
  depth,
  rootTaskDepth,
}: HierarchicalSubTaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(subTask.title);
  const [isExpanded, setIsExpanded] = useState(true);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");

  const canAddSubTasks = subTask.depth < MAX_DEPTH;
  const relativeDepth = depth - rootTaskDepth;

  const handleSave = () => {
    if (title.trim()) {
      onUpdate({ ...subTask, title: title.trim() });
      setIsEditing(false);
    }
  };

  const toggleComplete = () => {
    onUpdate({
      ...subTask,
      completed: !subTask.completed,
      status: !subTask.completed ? "done" : "todo",
    });
  };

  const handleAddNestedSubTask = () => {
    if (newSubTaskTitle.trim() && canAddSubTasks) {
      const newSubTask: Task = {
        ...createEmptyTask(subTask.id, subTask.depth + 1, subTask.projectId),
        id: crypto.randomUUID(),
        title: newSubTaskTitle.trim(),
        createdAt: new Date(),
      };
      onUpdate({
        ...subTask,
        subTasks: [...subTask.subTasks, newSubTask],
      });
      setNewSubTaskTitle("");
    }
  };

  const handleUpdateNestedSubTask = (updatedNestedSubTask: Task) => {
    onUpdate({
      ...subTask,
      subTasks: subTask.subTasks.map((st) =>
        st.id === updatedNestedSubTask.id ? updatedNestedSubTask : st
      ),
    });
  };

  const handleDeleteNestedSubTask = (nestedSubTaskId: string) => {
    onUpdate({
      ...subTask,
      subTasks: subTask.subTasks.filter((st) => st.id !== nestedSubTaskId),
    });
  };

  return (
    <div 
      className="space-y-1"
      style={{ marginLeft: relativeDepth > 0 ? `${relativeDepth * 1}rem` : 0 }}
    >
      <div className="flex items-center gap-2 p-2 bg-secondary/30 border border-border/50 rounded-md group">
        {/* Expand/Collapse button for nested sub-tasks */}
        {subTask.subTasks.length > 0 ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}

        <button
          onClick={toggleComplete}
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            subTask.completed
              ? "bg-primary border-primary"
              : "border-muted-foreground/40 hover:border-primary/60"
          )}
        >
          {subTask.completed && (
            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none"
            autoFocus
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={cn(
              "flex-1 text-sm cursor-pointer",
              subTask.completed && "line-through text-muted-foreground"
            )}
          >
            {subTask.title}
            {subTask.subTasks.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({subTask.subTasks.length})
              </span>
            )}
          </span>
        )}

        {/* Navigate to sub-task button */}
        <button
          onClick={() => onNavigateToTask(subTask.id)}
          className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
          title="Open sub-task details"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        {/* Add sub-sub-task button */}
        {canAddSubTasks && (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
            title="Add nested sub-task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => onDelete(subTask.id)}
          className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Nested sub-tasks and add input */}
      {isExpanded && (
        <div className="space-y-1">
          {/* Nested sub-tasks */}
          {subTask.subTasks.map((nestedSubTask) => (
            <HierarchicalSubTaskItem
              key={nestedSubTask.id}
              subTask={nestedSubTask}
              onUpdate={handleUpdateNestedSubTask}
              onDelete={handleDeleteNestedSubTask}
              onNavigateToTask={onNavigateToTask}
              depth={nestedSubTask.depth}
              rootTaskDepth={rootTaskDepth}
            />
          ))}

          {/* Add nested sub-task input */}
          {canAddSubTasks && (
            <div 
              className="flex gap-2 mt-1"
              style={{ marginLeft: `${(relativeDepth + 1) * 1}rem` }}
            >
              <input
                type="text"
                value={newSubTaskTitle}
                onChange={(e) => setNewSubTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNestedSubTask()}
                placeholder={`Add sub-task to "${subTask.title.slice(0, 15)}${subTask.title.length > 15 ? '...' : ''}"...`}
                className="flex-1 px-2 py-1.5 bg-secondary/30 border border-border/50 rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                onClick={handleAddNestedSubTask}
                disabled={!newSubTaskTitle.trim()}
                className="p-1.5 bg-primary/80 text-primary-foreground rounded hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDetailDialog;
