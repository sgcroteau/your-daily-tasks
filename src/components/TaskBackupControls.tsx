import { useRef, useState } from "react";
import { Download, Upload, Trash2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TaskBackupControlsProps {
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  taskCount: number;
}

const TaskBackupControls = ({
  onExport,
  onImport,
  onClear,
  taskCount,
}: TaskBackupControlsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = "";
      setPopoverOpen(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExport = () => {
    onExport();
    setPopoverOpen(false);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-border/50 hover:border-primary/50"
          title="Backup & Sync"
        >
          <HardDrive className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2 py-1.5 font-medium">
            Backup & Restore
          </p>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9"
            onClick={handleExport}
            disabled={taskCount === 0}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Export to JSON</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9"
            onClick={handleImportClick}
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">Import from JSON</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="h-px bg-border my-1" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={taskCount === 0}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Clear all tasks</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all tasks?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {taskCount} tasks. This action
                  cannot be undone. Consider exporting your tasks first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onClear();
                    setPopoverOpen(false);
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TaskBackupControls;
