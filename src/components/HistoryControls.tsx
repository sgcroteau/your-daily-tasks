import { Undo2, Redo2, FolderSync, FolderOpen, Save, Download, Unplug, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AutoSaveMode } from "@/hooks/useHistoryStorage";

interface HistoryControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSelectFolder: () => void;
  onDisconnectFolder: () => void;
  onManualSave: () => void;
  onLoadFromFolder: () => void;
  folderName: string | null;
  isConnected: boolean;
  isAutoSaving: boolean;
  isSynced: boolean;
  lastSavedTime: Date | null;
  autoSaveMode: AutoSaveMode;
  onAutoSaveModeChange: (mode: AutoSaveMode) => void;
}

export const HistoryControls = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSelectFolder,
  onDisconnectFolder,
  onManualSave,
  onLoadFromFolder,
  folderName,
  isConnected,
  isAutoSaving,
  isSynced,
  lastSavedTime,
  autoSaveMode,
  onAutoSaveModeChange,
}: HistoryControlsProps) => {
  const formatLastSaved = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  const getSyncIcon = () => {
    if (isAutoSaving) {
      return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    }
    if (isConnected && isSynced) {
      return (
        <div className="relative">
          <FolderSync className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-background rounded-full flex items-center justify-center border border-green-600 dark:border-green-400">
            <Check className="h-2.5 w-2.5 text-green-600 dark:text-green-400 stroke-[3]" />
          </div>
        </div>
      );
    }
    if (isConnected && !isSynced) {
      return (
        <div className="relative">
          <FolderSync className="h-4 w-4 text-yellow-500" />
          <div className="h-2 w-2 absolute -bottom-0.5 -right-0.5 bg-yellow-500 rounded-full animate-pulse" />
        </div>
      );
    }
    return <FolderSync className="h-4 w-4" />;
  };

  const getTooltipText = () => {
    if (!isConnected) return "Folder Sync";
    if (isAutoSaving) return "Saving...";
    if (isSynced) return `Synced${lastSavedTime ? ` • ${formatLastSaved(lastSavedTime)}` : ""}`;
    return "Unsaved changes";
  };

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-8 w-8"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-8 w-8"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 relative"
                >
                  {getSyncIcon()}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getTooltipText()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Folder Sync</h4>
                {isConnected && (
                  <span className={`text-xs flex items-center gap-1 ${isSynced ? "text-green-600 dark:text-green-400" : "text-yellow-500"}`}>
                    {isAutoSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    ) : isSynced ? (
                      <>
                        <Check className="h-3 w-3" />
                        Synced
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                        Unsaved
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isConnected
                  ? `Connected to "${folderName}"${lastSavedTime ? ` • Last saved ${formatLastSaved(lastSavedTime)}` : ""}`
                  : "Select a folder to auto-save your tasks"}
              </p>
            </div>

            {!isConnected ? (
              <Button onClick={onSelectFolder} className="w-full" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Select Folder
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Auto-save mode</label>
                  <Select value={autoSaveMode} onValueChange={(v) => onAutoSaveModeChange(v as AutoSaveMode)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="every-change">Save on every change</SelectItem>
                      <SelectItem value="every-5-minutes">Save every 5 minutes</SelectItem>
                      <SelectItem value="manual">Manual save only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={onManualSave}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={isAutoSaving}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save Now
                  </Button>
                  <Button
                    onClick={onLoadFromFolder}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Load
                  </Button>
                </div>

                <Button
                  onClick={onDisconnectFolder}
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Unplug className="h-3 w-3 mr-1" />
                  Disconnect Folder
                </Button>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Tip: Use Ctrl+Z to undo and Ctrl+Y to redo changes.
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
