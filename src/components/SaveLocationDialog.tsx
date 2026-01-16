import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderOpen, FolderSync, AlertCircle, ExternalLink, RefreshCw, Smartphone, HardDrive } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SaveLocationDialogProps {
  isOpen: boolean;
  onSelectFolder: () => Promise<void>;
  onLoadFromFolder: () => Promise<void>;
  onSkip: () => void;
  isConnected: boolean;
  folderName: string | null;
  hasPreviousFolderName: boolean;
}

export function SaveLocationDialog({
  isOpen,
  onSelectFolder,
  onLoadFromFolder,
  onSkip,
  isConnected,
  folderName,
  hasPreviousFolderName,
}: SaveLocationDialogProps) {
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasFileSystemAccess, setHasFileSystemAccess] = useState(true);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
    
    // Check if File System Access API is available
    setHasFileSystemAccess('showDirectoryPicker' in window);
    
    // Detect mobile devices
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  const showFolderOptions = hasFileSystemAccess && !isMobile && !isInIframe;

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
            {isMobile || !hasFileSystemAccess
              ? "Your tasks will be saved locally on this device."
              : "Choose where your tasks will be automatically saved. This ensures your data is always backed up and accessible."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Mobile / No File System Access message */}
          {(isMobile || !hasFileSystemAccess) && (
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                {isMobile
                  ? "Folder sync is not available on mobile devices. Your tasks will be saved to this browser's local storage."
                  : "Your browser doesn't support folder sync. Tasks will be saved to local storage."}
              </AlertDescription>
            </Alert>
          )}

          {/* Iframe warning */}
          {isInIframe && hasFileSystemAccess && !isMobile && (
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

          {/* Reconnect option */}
          {hasPreviousFolderName && showFolderOptions && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground mb-3">
                You previously had a save folder connected. Reconnect to continue where you left off:
              </p>
              <Button
                onClick={handleReconnectFolder}
                disabled={isReconnecting}
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

          {/* Divider */}
          {hasPreviousFolderName && showFolderOptions && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
          )}

          {/* Select folder button (only for desktop with File System Access) */}
          {showFolderOptions && (
            <Button
              onClick={handleSelectNewFolder}
              disabled={isSelectingFolder}
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
          )}

          {/* Divider for skip option */}
          {showFolderOptions && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
          )}

          {/* Skip / Continue with localStorage */}
          <Button
            onClick={onSkip}
            variant={showFolderOptions ? "ghost" : "default"}
            className="w-full"
            size={showFolderOptions ? "default" : "lg"}
          >
            <HardDrive className="w-4 h-4 mr-2" />
            {isMobile || !hasFileSystemAccess
              ? "Continue with Local Storage"
              : "Skip for Now (Use Local Storage)"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {isMobile || !hasFileSystemAccess ? (
              <>
                Tasks are saved in your browser.
                <br />
                Clear browser data will remove your tasks.
              </>
            ) : (
              <>
                You can set up folder sync anytime in Settings.
                <br />
                Local storage saves tasks in this browser only.
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
