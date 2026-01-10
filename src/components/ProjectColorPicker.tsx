import { Check } from "lucide-react";
import { PROJECT_COLORS } from "@/types/task";
import { cn } from "@/lib/utils";

interface ProjectColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export function ProjectColorPicker({ selectedColor, onSelectColor }: ProjectColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROJECT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelectColor(color)}
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center transition-all",
            "hover:scale-110",
            selectedColor === color && "ring-2 ring-offset-2 ring-offset-background"
          )}
          style={{ 
            backgroundColor: color,
            // @ts-expect-error CSS custom property
            "--tw-ring-color": color,
          }}
        >
          {selectedColor === color && (
            <Check className="w-3 h-3 text-white drop-shadow-md" />
          )}
        </button>
      ))}
    </div>
  );
}
