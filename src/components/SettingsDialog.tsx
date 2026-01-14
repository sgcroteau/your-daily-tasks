import { useState, useRef } from "react";
import { Settings, ArrowDown, Minus, ArrowUp, AlertTriangle, Moon, Sun, Download, Upload, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  preferences: AppPreferences;
  onUpdatePreference: <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  taskCount: number;
}

const PRIORITY_ICONS = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: AlertTriangle,
};

export function SettingsDialog({ 
  preferences, 
  onUpdatePreference,
  onExport,
  onImport,
  onClear,
  taskCount,
}: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your task management experience.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Appearance Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Appearance</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm text-muted-foreground">Theme</label>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={theme === "light" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="h-8 px-3 gap-1.5"
                >
                  <Sun className="h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="h-8 px-3 gap-1.5"
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Preferences Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Preferences</h3>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Default Priority for New Tasks</label>
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

          <Separator />

          {/* Data Management Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Data Management</h3>
            <p className="text-xs text-muted-foreground">
              {taskCount} task{taskCount !== 1 ? "s" : ""} stored locally
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={taskCount === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all tasks?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {taskCount} tasks. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onClear();
                        setOpen(false);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear All Tasks
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
