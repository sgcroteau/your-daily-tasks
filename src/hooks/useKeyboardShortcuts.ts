import { useEffect, useCallback } from "react";

interface KeyboardShortcuts {
  onQuickNote?: () => void;
}

export const useKeyboardShortcuts = ({ onQuickNote }: KeyboardShortcuts) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in an input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // Ctrl+N or Cmd+N for quick note
    if ((event.ctrlKey || event.metaKey) && event.key === "n") {
      event.preventDefault();
      onQuickNote?.();
    }
  }, [onQuickNote]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};
