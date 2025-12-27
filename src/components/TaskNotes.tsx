import { useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Check, X, Paperclip, ExternalLink } from "lucide-react";
import { TaskNote, TaskAttachment, Task } from "@/types/task";
import FileAttachment from "./FileAttachment";
import { cn } from "@/lib/utils";

interface TaskNotesProps {
  notes: TaskNote[];
  currentTaskId: string;
  currentTaskTitle: string;
  allNotes: TaskNote[]; // includes notes from sub-tasks
  onAddNote: (content: string, attachments: TaskAttachment[]) => void;
  onUpdateNote: (noteId: string, content: string, attachments: TaskAttachment[]) => void;
  onDeleteNote: (noteId: string) => void;
  onNavigateToTask?: (taskId: string) => void;
}

const TaskNotes = ({ 
  notes, 
  currentTaskId,
  currentTaskTitle,
  allNotes,
  onAddNote, 
  onUpdateNote, 
  onDeleteNote,
  onNavigateToTask 
}: TaskNotesProps) => {
  const [newNote, setNewNote] = useState("");
  const [newNoteAttachments, setNewNoteAttachments] = useState<TaskAttachment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editAttachments, setEditAttachments] = useState<TaskAttachment[]>([]);

  const handleAdd = () => {
    if (newNote.trim() || newNoteAttachments.length > 0) {
      onAddNote(newNote.trim(), newNoteAttachments);
      setNewNote("");
      setNewNoteAttachments([]);
    }
  };

  const startEdit = (note: TaskNote) => {
    // Only allow editing notes that belong to current task
    if (note.originTaskId !== currentTaskId) return;
    setEditingId(note.id);
    setEditContent(note.content);
    setEditAttachments(note.attachments);
  };

  const saveEdit = () => {
    if (editingId && (editContent.trim() || editAttachments.length > 0)) {
      onUpdateNote(editingId, editContent.trim(), editAttachments);
      setEditingId(null);
      setEditContent("");
      setEditAttachments([]);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
    setEditAttachments([]);
  };

  // Sort all notes by date (newest first)
  const sortedNotes = [...allNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-foreground">
        Task Notes
        {allNotes.length > notes.length && (
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            (including {allNotes.length - notes.length} from sub-tasks)
          </span>
        )}
      </h4>
      
      {/* Add new note */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAdd()}
            placeholder="Add a note..."
            className="flex-1 px-3 py-2 bg-secondary/50 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!newNote.trim() && newNoteAttachments.length === 0}
            className="p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <FileAttachment
          attachments={newNoteAttachments}
          onAdd={(a) => setNewNoteAttachments((prev) => [...prev, a])}
          onRemove={(id) => setNewNoteAttachments((prev) => prev.filter((a) => a.id !== id))}
          compact
        />
      </div>

      {/* Notes list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">No notes yet</p>
        ) : (
          sortedNotes.map((note) => {
            const isFromSubTask = note.originTaskId !== currentTaskId;
            const canEdit = !isFromSubTask;

            return (
              <div
                key={note.id}
                className={cn(
                  "p-3 border border-border/50 rounded-md group",
                  editingId === note.id && "ring-2 ring-primary/20",
                  isFromSubTask 
                    ? "bg-accent/30 border-l-2 border-l-primary/40" 
                    : "bg-secondary/30"
                )}
              >
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      rows={2}
                      autoFocus
                    />
                    <FileAttachment
                      attachments={editAttachments}
                      onAdd={(a) => setEditAttachments((prev) => [...prev, a])}
                      onRemove={(id) => setEditAttachments((prev) => prev.filter((a) => a.id !== id))}
                      compact
                    />
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={saveEdit}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Sub-task origin indicator */}
                    {isFromSubTask && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs text-muted-foreground">From:</span>
                        <button
                          onClick={() => onNavigateToTask?.(note.originTaskId)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          {note.originTaskTitle}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <p className="text-sm text-foreground">{note.content}</p>
                    
                    {note.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {note.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {att.type.startsWith("image/") ? (
                              <img src={att.url} alt={att.name} className="w-8 h-8 object-cover rounded" />
                            ) : (
                              <>
                                <Paperclip className="w-3 h-3" />
                                {att.name}
                              </>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-muted-foreground">
                        <span>{format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                        {new Date(note.updatedAt) > new Date(note.createdAt) && (
                          <span className="ml-2 italic">(edited)</span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(note)}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskNotes;
