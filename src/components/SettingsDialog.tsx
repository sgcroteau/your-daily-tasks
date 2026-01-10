import { Settings, ArrowDown, Minus, ArrowUp, AlertTriangle } from "lucide-react";
import { TaskPriority, PRIORITY_CONFIG } from "@/types/task";
import { AppPreferences } from "@/hooks/usePreferencesStorage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  preferences: AppPreferences;
  onUpdatePreference: <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ) => void;
}

const PRIORITY_ICONS = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: AlertTriangle,
};

export function SettingsDialog({ preferences, onUpdatePreference }: SettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>
            Customize your task management experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Default Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Priority for New Tasks</label>
            <p className="text-xs text-muted-foreground">
              This priority will be automatically selected when creating new tasks.
            </p>
            <Select
              value={preferences.defaultPriority}
              onValueChange={(v) => onUpdatePreference("defaultPriority", v as TaskPriority)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((key) => {
                  const config = PRIORITY_CONFIG[key];
                  const Icon = PRIORITY_ICONS[key];
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={cn("flex items-center gap-1 text-xs px-1.5 py-0.5 rounded", config.color)}>
                          <Icon className="w-3 h-3" />
                        </span>
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
