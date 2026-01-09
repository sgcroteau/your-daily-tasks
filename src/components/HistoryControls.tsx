import { Undo2, Redo2, FolderSync, FolderOpen, Save, Download, Unplug } from "lucide-react";
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
  autoSaveMode,
  onAutoSaveModeChange,
}: HistoryControlsProps) => {
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
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${isConnected ? "text-green-600 dark:text-green-400" : ""}`}
          >
            <FolderSync className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Folder Sync</h4>
              <p className="text-xs text-muted-foreground">
                {isConnected
                  ? `Connected to "${folderName}"`
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
