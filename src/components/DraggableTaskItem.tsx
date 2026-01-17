import { useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Check, Trash2, ChevronRight, AlertCircle, GripVertical, ChevronDown, ArrowDown, Minus, ArrowUp, AlertTriangle, Repeat, StickyNote } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { Task, TaskLabel, STATUS_CONFIG, PRIORITY_CONFIG } from "@/types/task";
import { cn } from "@/lib/utils";
import HighlightText from "./HighlightText";
import { getMatchLocations } from "@/lib/searchUtils";

interface DraggableTaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
  onUpdateSubTasks: (taskId: string, subTasks: Task[]) => void;
  searchQuery?: string;
  labels: TaskLabel[];
  pinnedNotesCount?: number;
  isDropTarget?: boolean;
}

const DraggableTaskItem = ({ task, onToggle, onDelete, onOpen, onUpdateSubTasks, searchQuery = "", labels, pinnedNotesCount = 0, isDropTarget = false }: DraggableTaskItemProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const taskLabels = labels.filter((l) => task.labelIds?.includes(l.id));

  // Droppable for pinning quick notes
  const { isOver: isDropOver, setNodeRef: setDropRef } = useDroppable({ 
    id: `task-drop-${task.id}` 
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.completed) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 400);
    }
    onToggle(task.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => onDelete(task.id), 200);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSubTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = task.subTasks.findIndex((t) => t.id === active.id);
      const newIndex = task.subTasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(task.subTasks, oldIndex, newIndex);
      onUpdateSubTasks(task.id, reordered);
    }
  };

  const isOverdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !task.completed;
  const isDueToday = task.dueDate && isToday(task.dueDate);
  const hasSubTasks = task.subTasks.length > 0;
  const matchLocations = getMatchLocations(task, searchQuery);

  // Calculate indentation based on depth (each level adds more margin)
  const depthIndent = task.depth > 0 ? `ml-${Math.min(task.depth * 6, 18)}` : "";

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      style={style}
      className={cn(
        "transition-all duration-200",
        isDeleting && "task-item-exit",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div
        onClick={() => onOpen(task)}
        className={cn(
          "group flex items-center gap-3 p-4 bg-card border border-border rounded-lg transition-all duration-200 hover:shadow-hover hover:border-primary/20 cursor-pointer",
          task.depth > 0 && "border-l-2 border-l-primary/30",
          isDropOver && "ring-2 ring-primary ring-dashed bg-primary/5"
        )}
        style={{ marginLeft: task.depth > 0 ? `${task.depth * 1.5}rem` : 0 }}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 -ml-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Expand/collapse for subtasks */}
        {hasSubTasks ? (
          <button
            onClick={handleToggleExpand}
            className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", !isExpanded && "-rotate-90")} />
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Checkbox */}
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <HighlightText
              text={task.title}
              query={searchQuery}
              className={cn(
                "text-foreground transition-all duration-200",
                task.completed && "line-through text-muted-foreground"
              )}
            />
            {searchQuery && matchLocations.includes("note") && (
              <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                match in note
              </span>
            )}
            {task.notes.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {task.notes.length} note{task.notes.length !== 1 && "s"}
              </span>
            )}
            {task.attachments.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {task.attachments.length} file{task.attachments.length !== 1 && "s"}
              </span>
            )}
            {pinnedNotesCount > 0 && (
              <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <StickyNote className="w-3 h-3" />
                {pinnedNotesCount}
              </span>
            )}
            {hasSubTasks && (
              <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_CONFIG[task.status].color)}>
              {STATUS_CONFIG[task.status].label}
            </span>
            
            {task.priority && task.priority !== "medium" && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", PRIORITY_CONFIG[task.priority].color)}>
                {task.priority === "low" && <ArrowDown className="w-3 h-3" />}
                {task.priority === "high" && <ArrowUp className="w-3 h-3" />}
                {task.priority === "urgent" && <AlertTriangle className="w-3 h-3" />}
                {PRIORITY_CONFIG[task.priority].label}
              </span>
            )}
            
            {/* Labels */}
            {taskLabels.length > 0 && (
              <span className="flex items-center gap-1 flex-wrap">
                {taskLabels.map((label) => (
                  <span
                    key={label.id}
                    className="text-white px-1.5 py-0.5 rounded text-[10px]"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </span>
            )}
            
            {/* Recurrence indicator */}
            {task.recurrence && task.recurrence.type !== "none" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                {task.recurrence.interval > 1 && task.recurrence.interval}
                {task.recurrence.type === "daily" ? "d" : task.recurrence.type === "weekly" ? "w" : "m"}
              </span>
            )}
            
            {task.dueDate && (
              <span className={cn(
                "text-xs flex items-center gap-1",
                isOverdue && "text-destructive",
                isDueToday && "text-accent-foreground font-medium",
                !isOverdue && !isDueToday && "text-muted-foreground"
              )}>
                {isOverdue && <AlertCircle className="w-3 h-3" />}
                {format(task.dueDate, "MMM d")}
              </span>
            )}
            
            {task.description && (
              <HighlightText
                text={task.description}
                query={searchQuery}
                className="text-xs text-muted-foreground truncate max-w-32"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>

      {/* Nested subtasks with their own DndContext */}
      {hasSubTasks && isExpanded && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSubTaskDragEnd}
        >
          <SortableContext items={task.subTasks.map(st => st.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-2 space-y-2">
              {task.subTasks.map((subTask) => (
                <DraggableTaskItem
                  key={subTask.id}
                  task={subTask}
                  searchQuery={searchQuery}
                  onToggle={(id) => {
                    const updated = task.subTasks.map(st =>
                      st.id === id ? { ...st, completed: !st.completed, status: !st.completed ? "done" as const : "todo" as const } : st
                    );
                    onUpdateSubTasks(task.id, updated);
                  }}
                  onDelete={(id) => {
                    const updated = task.subTasks.filter(st => st.id !== id);
                    onUpdateSubTasks(task.id, updated);
                  }}
                  onOpen={onOpen}
                  onUpdateSubTasks={(parentId, newSubTasks) => {
                    const updated = task.subTasks.map(st =>
                      st.id === parentId ? { ...st, subTasks: newSubTasks } : st
                    );
                    onUpdateSubTasks(task.id, updated);
                  }}
                  labels={labels}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default DraggableTaskItem;
