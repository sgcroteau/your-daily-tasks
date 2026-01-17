import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { StickyNote } from "lucide-react";
import { QuickNote, Task } from "@/types/task";
import { DraggableQuickNote } from "./DraggableQuickNote";
import { cn } from "@/lib/utils";

interface QuickNotesListProps {
  notes: QuickNote[];
  tasks: Task[];
  onUpdate: (id: string, updates: Partial<Pick<QuickNote, "content" | "color">>) => void;
  onDelete: (id: string) => void;
  onUnpin: (id: string) => void;
}

// Find task by ID recursively
const findTaskById = (tasks: Task[], id: string): Task | null => {
  for (const task of tasks) {
    if (task.id === id) return task;
    if (task.subTasks.length > 0) {
      const found = findTaskById(task.subTasks, id);
      if (found) return found;
    }
  }
  return null;
};

export const QuickNotesList = ({
  notes,
  tasks,
  onUpdate,
  onDelete,
  onUnpin,
}: QuickNotesListProps) => {
  // Separate pinned and unpinned notes
  const { pinnedNotes, unpinnedNotes } = useMemo(() => {
    const pinned: QuickNote[] = [];
    const unpinned: QuickNote[] = [];
    
    for (const note of notes) {
      if (note.pinnedToTaskId) {
        pinned.push(note);
      } else {
        unpinned.push(note);
      }
    }
    
    return { pinnedNotes: pinned, unpinnedNotes: unpinned };
  }, [notes]);

  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Unpinned notes in a grid */}
      {unpinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Quick Notes</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {unpinnedNotes.length}
            </span>
          </div>
          <SortableContext 
            items={unpinnedNotes.map(n => `quicknote-${n.id}`)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unpinnedNotes.map((note) => (
                <DraggableQuickNote
                  key={note.id}
                  note={note}
                  pinnedTask={null}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onUnpin={onUnpin}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      )}

      {/* Pinned notes grouped by task */}
      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Pinned Notes</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {pinnedNotes.length}
            </span>
          </div>
          <SortableContext 
            items={pinnedNotes.map(n => `quicknote-${n.id}`)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pinnedNotes.map((note) => {
                const task = note.pinnedToTaskId ? findTaskById(tasks, note.pinnedToTaskId) : null;
                return (
                  <DraggableQuickNote
                    key={note.id}
                    note={note}
                    pinnedTask={task}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onUnpin={onUnpin}
                  />
                );
              })}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
};

// Droppable zone for pinning notes to tasks
export const TaskDropZone = ({
  taskId,
  isActive,
  children,
}: {
  taskId: string;
  isActive: boolean;
  children: React.ReactNode;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: `task-drop-${taskId}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200 rounded-lg",
        isActive && "ring-2 ring-dashed ring-primary/30",
        isOver && "ring-primary bg-primary/5"
      )}
    >
      {children}
    </div>
  );
};
