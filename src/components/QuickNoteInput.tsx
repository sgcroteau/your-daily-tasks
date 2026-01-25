import { useState, useEffect } from "react";
import { StickyNote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QUICK_NOTE_COLORS } from "@/types/task";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickNoteInputProps {
  onAdd: (content: string, color: string) => void;
  projectId: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const QuickNoteInput = ({ onAdd, projectId, open: controlledOpen, onOpenChange }: QuickNoteInputProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(QUICK_NOTE_COLORS[0]);

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  // Reset content when popover opens
  useEffect(() => {
    if (isOpen) {
      setContent("");
      setSelectedColor(QUICK_NOTE_COLORS[0]);
    }
  }, [isOpen]);

  const handleAdd = () => {
    if (content.trim()) {
      onAdd(content.trim(), selectedColor);
      setContent("");
      setSelectedColor(QUICK_NOTE_COLORS[0]);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-dashed hover:border-solid hover:bg-accent"
            >
              <StickyNote className="h-4 w-4" />
              Quick Note
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Add a quick note <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+N</kbd></p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">New Quick Note</span>
          </div>
          
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a quick note..."
            className="min-h-[80px] resize-none"
            style={{ backgroundColor: `${selectedColor}40` }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">Color</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all hover:scale-110",
                    selectedColor === color && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!content.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
