import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  StickyNote, 
  Trash2, 
  GripVertical, 
  Pin, 
  PinOff, 
  Pencil,
  Check,
  X,
  Palette
} from "lucide-react";
import { format } from "date-fns";
import { QuickNote, Task, QUICK_NOTE_COLORS } from "@/types/task";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DraggableQuickNoteProps {
  note: QuickNote;
  pinnedTask?: Task | null;
  onUpdate: (id: string, updates: Partial<Pick<QuickNote, "content" | "color">>) => void;
  onDelete: (id: string) => void;
  onUnpin: (id: string) => void;
  isDark?: boolean;
}

export const DraggableQuickNote = ({
  note,
  pinnedTask,
  onUpdate,
  onDelete,
  onUnpin,
  isDark = false,
}: DraggableQuickNoteProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `quicknote-${note.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (editContent.trim()) {
      onUpdate(note.id, { content: editContent.trim() });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => onDelete(note.id), 200);
  };

  const handleColorChange = (color: string) => {
    onUpdate(note.id, { color });
    setColorPopoverOpen(false);
  };

  // Get contrasting text color based on background
  const getTextColor = (bgColor: string) => {
    // For light pastel colors, use dark text
    return isDark ? "text-white" : "text-foreground";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200",
        isDeleting && "task-item-exit",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div
        className={cn(
          "group relative rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-primary/20",
          "bg-gradient-to-br from-white/50 to-transparent"
        )}
        style={{ 
          backgroundColor: note.color,
          boxShadow: `0 4px 12px -4px ${note.color}80`
        }}
      >
        {/* Decorative corner fold */}
        <div 
          className="absolute top-0 right-0 w-6 h-6"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${note.color} 50%)`,
            filter: "brightness(0.9)",
            borderTopRightRadius: "0.75rem",
          }}
        />

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity",
            getTextColor(note.color)
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 opacity-50" />
        </button>

        {/* Pin indicator */}
        {pinnedTask && (
          <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
            <Pin className="w-3 h-3" />
          </div>
        )}

        {/* Content */}
        <div className="pl-4">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] resize-none bg-white/50 border-0 focus-visible:ring-1"
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={cn("text-sm whitespace-pre-wrap leading-relaxed", getTextColor(note.color))}>
                {note.content}
              </p>
              
              {/* Pinned task info */}
              {pinnedTask && (
                <div className="mt-3 pt-2 border-t border-black/10">
                  <div className="flex items-center gap-1.5 text-xs opacity-70">
                    <Pin className="w-3 h-3" />
                    <span className="truncate">Pinned to: {pinnedTask.title}</span>
                  </div>
                </div>
              )}

              {/* Footer with date and actions */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/10">
                <span className={cn("text-xs opacity-60", getTextColor(note.color))}>
                  {format(note.updatedAt, "MMM d, h:mm a")}
                </span>
                
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Color picker */}
                  <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Palette className="w-3.5 h-3.5 opacity-70" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end">
                      <div className="flex flex-wrap gap-2 max-w-[160px]">
                        {QUICK_NOTE_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorChange(color)}
                            className={cn(
                              "w-6 h-6 rounded-full transition-all hover:scale-110",
                              note.color === color && "ring-2 ring-offset-2 ring-primary"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Edit button */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {/* Unpin button */}
                  {pinnedTask && (
                    <button
                      onClick={() => onUnpin(note.id)}
                      className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
                    >
                      <PinOff className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky note icon watermark */}
        <StickyNote 
          className={cn(
            "absolute bottom-2 right-2 w-8 h-8 opacity-10",
            getTextColor(note.color)
          )} 
        />
      </div>
    </div>
  );
};
