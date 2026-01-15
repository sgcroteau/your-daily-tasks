import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderOpen, FolderSync, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SaveLocationDialogProps {
  isOpen: boolean;
  onSelectFolder: () => Promise<void>;
  onLoadFromFolder: () => Promise<void>;
  isConnected: boolean;
  folderName: string | null;
  hasPreviousFolderName: boolean;
}

export function SaveLocationDialog({
  isOpen,
  onSelectFolder,
  onLoadFromFolder,
  isConnected,
  folderName,
  hasPreviousFolderName,
}: SaveLocationDialogProps) {
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const handleSelectNewFolder = async () => {
    setIsSelectingFolder(true);
    try {
      await onSelectFolder();
    } finally {
      setIsSelectingFolder(false);
    }
  };

  const handleReconnectFolder = async () => {
    setIsReconnecting(true);
    try {
      await onSelectFolder();
      // If connected, also load the data
      if (isConnected) {
        await onLoadFromFolder();
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  // Don't render if already connected
  if (isConnected) return null;

  return (
    <Dialog open={isOpen} modal>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FolderSync className="w-5 h-5 text-primary" />
            Set Up Your Save Location
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose where your tasks will be automatically saved. This ensures your data is always backed up and accessible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isInIframe && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center gap-2">
                Folder sync requires opening the app in its own tab.
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
                >
                  Open in new tab
                  <ExternalLink className="w-3 h-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          {hasPreviousFolderName && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground mb-3">
                You previously had a save folder connected. Reconnect to continue where you left off:
              </p>
              <Button
                onClick={handleReconnectFolder}
                disabled={isReconnecting || isInIframe}
                className="w-full"
                variant="default"
              >
                {isReconnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect & Load Previous Save
                  </>
                )}
              </Button>
            </div>
          )}

          <div className={hasPreviousFolderName ? "relative" : ""}>
            {hasPreviousFolderName && (
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
            )}
            {hasPreviousFolderName && (
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={handleSelectNewFolder}
            disabled={isSelectingFolder || isInIframe}
            variant={hasPreviousFolderName ? "outline" : "default"}
            className="w-full"
            size="lg"
          >
            {isSelectingFolder ? (
              <>
                <FolderOpen className="w-4 h-4 mr-2 animate-pulse" />
                Selecting folder...
              </>
            ) : (
              <>
                <FolderOpen className="w-4 h-4 mr-2" />
                {hasPreviousFolderName ? "Choose a Different Folder" : "Select Save Folder"}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your tasks will be saved as a JSON file in the selected folder.
            <br />
            Changes are saved automatically in real-time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
