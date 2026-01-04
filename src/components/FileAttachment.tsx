import { useRef } from "react";
import { format } from "date-fns";
import { Paperclip, X, Image, FileText } from "lucide-react";
import { TaskAttachment } from "@/types/task";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

interface FileAttachmentProps {
  attachments: TaskAttachment[];
  onAdd: (attachment: TaskAttachment) => void;
  onRemove: (id: string) => void;
  compact?: boolean;
}

const FileAttachment = ({ attachments, onAdd, onRemove, compact = false }: FileAttachmentProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds 5MB limit. Please choose a smaller file.`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const attachment: TaskAttachment = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          url: reader.result as string,
          size: file.size,
          createdAt: new Date(),
        };
        onAdd(attachment);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors",
          compact ? "text-xs p-1" : "text-sm px-3 py-1.5 border border-dashed border-border rounded-md hover:border-primary/50"
        )}
      >
        <Paperclip className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
        <span>Attach files</span>
      </button>

      {attachments.length > 0 && (
        <div className={cn("flex flex-wrap gap-2", compact && "mt-1")}>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative flex items-center gap-2 p-2 bg-secondary/50 border border-border rounded-md"
            >
              {isImage(attachment.type) ? (
                <div className="relative">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <Image className="absolute bottom-0.5 right-0.5 w-3 h-3 text-background bg-foreground/70 rounded-sm p-0.5" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 max-w-32">
                <p className="text-xs font-medium text-foreground truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
              <button
                onClick={() => onRemove(attachment.id)}
                className="absolute -top-1.5 -right-1.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileAttachment;
