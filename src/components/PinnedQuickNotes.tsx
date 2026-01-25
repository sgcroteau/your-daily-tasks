import { StickyNote, Pin, Trash2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { QuickNote, QUICK_NOTE_COLORS, QUICK_NOTE_COLORS_DARK } from "@/types/task";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface PinnedQuickNotesProps {
  notes: QuickNote[];
  onUpdate: (id: string, updates: Partial<Pick<QuickNote, "content" | "color">>) => void;
  onDelete: (id: string) => void;
  onUnpin: (id: string) => void;
}

const useIsDarkMode = () => {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
};

export const PinnedQuickNotes = ({
  notes,
  onUpdate,
  onDelete,
  onUnpin,
}: PinnedQuickNotesProps) => {
  const isDark = useIsDarkMode();

  if (notes.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Pin className="w-4 h-4" />
        Pinned Quick Notes ({notes.length})
      </label>
      <div className="space-y-2">
        {notes.map((note) => (
          <PinnedNoteCard
            key={note.id}
            note={note}
            isDark={isDark}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onUnpin={onUnpin}
          />
        ))}
      </div>
    </div>
  );
};

interface PinnedNoteCardProps {
  note: QuickNote;
  isDark: boolean;
  onUpdate: (id: string, updates: Partial<Pick<QuickNote, "content" | "color">>) => void;
  onDelete: (id: string) => void;
  onUnpin: (id: string) => void;
}

const PinnedNoteCard = ({
  note,
  isDark,
  onUpdate,
  onDelete,
  onUnpin,
}: PinnedNoteCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

  // Get the appropriate display color based on theme
  const currentColorIndex = QUICK_NOTE_COLORS.indexOf(note.color);
  const displayColor = isDark && currentColorIndex >= 0 
    ? QUICK_NOTE_COLORS_DARK[currentColorIndex] 
    : note.color;

  const textColorClass = isDark ? "text-white" : "text-foreground";

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

  return (
    <div
      className={cn(
        "group relative rounded-lg p-3 shadow-sm transition-all duration-200 border border-transparent hover:border-primary/20",
        isDark ? "bg-gradient-to-br from-white/10 to-transparent" : "bg-gradient-to-br from-white/50 to-transparent"
      )}
      style={{ 
        backgroundColor: displayColor,
        boxShadow: `0 2px 8px -2px ${displayColor}60`
      }}
    >
      {/* Pin indicator */}
      <div className="absolute -top-1.5 -left-1.5 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
        <Pin className="w-2.5 h-2.5" />
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[50px] resize-none bg-white/50 border-0 focus-visible:ring-1 text-sm"
            autoFocus
          />
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleCancel}
              className="p-1 rounded-md hover:bg-black/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSave}
              className="p-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={cn("text-sm whitespace-pre-wrap leading-relaxed pr-6", textColorClass)}>
            {note.content}
          </p>
          
          <div className={cn(
            "flex items-center justify-between mt-2 pt-2",
            isDark ? "border-t border-white/20" : "border-t border-black/10"
          )}>
            <span className={cn("text-xs opacity-60", textColorClass)}>
              {format(note.updatedAt, "MMM d, h:mm a")}
            </span>
            
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className={cn("p-1 rounded-md transition-colors", isDark ? "hover:bg-white/20" : "hover:bg-black/10")}
                title="Edit note"
              >
                <Pencil className="w-3 h-3 opacity-70" />
              </button>
              <button
                onClick={() => onUnpin(note.id)}
                className={cn("p-1 rounded-md transition-colors", isDark ? "hover:bg-white/20" : "hover:bg-black/10")}
                title="Unpin from task"
              >
                <Pin className="w-3 h-3 opacity-70" />
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="p-1 rounded-md hover:bg-destructive/20 text-destructive transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Watermark */}
      <StickyNote 
        className={cn(
          "absolute bottom-1.5 right-1.5 w-5 h-5 opacity-10",
          textColorClass
        )} 
      />
    </div>
  );
};
