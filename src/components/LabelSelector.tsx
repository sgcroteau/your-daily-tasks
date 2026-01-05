import { useState } from "react";
import { Plus, X, Tag, Check } from "lucide-react";
import { TaskLabel, LABEL_COLORS } from "@/types/task";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LabelSelectorProps {
  labels: TaskLabel[];
  selectedLabelIds: string[];
  onToggleLabel: (labelId: string) => void;
  onCreateLabel: (name: string, color: string) => TaskLabel;
  compact?: boolean;
}

const LabelSelector = ({
  labels,
  selectedLabelIds,
  onToggleLabel,
  onCreateLabel,
  compact = false,
}: LabelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState(LABEL_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      const newLabel = onCreateLabel(newLabelName.trim(), selectedColor);
      onToggleLabel(newLabel.id);
      setNewLabelName("");
      setIsCreating(false);
      setSelectedColor(LABEL_COLORS[0]);
    }
  };

  const selectedLabels = labels.filter((l) => selectedLabelIds.includes(l.id));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Show selected labels */}
      {selectedLabels.map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: label.color }}
        >
          {label.name}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLabel(label.id);
            }}
            className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}

      {/* Add label button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors",
              compact ? "text-xs" : "text-sm"
            )}
          >
            <Tag className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
            {!compact && selectedLabels.length === 0 && "Add label"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2">
            {/* Existing labels */}
            {labels.length > 0 && !isCreating && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => onToggleLabel(label.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-sm truncate">{label.name}</span>
                    {selectedLabelIds.includes(label.id) && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Create new label form */}
            {isCreating ? (
              <div className="space-y-2 pt-2 border-t border-border">
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name..."
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateLabel();
                    } else if (e.key === "Escape") {
                      setIsCreating(false);
                      setNewLabelName("");
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-5 h-5 rounded-full transition-all",
                        selectedColor === color && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => {
                      setIsCreating(false);
                      setNewLabelName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={handleCreateLabel}
                    disabled={!newLabelName.trim()}
                  >
                    Create
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create new label
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LabelSelector;
