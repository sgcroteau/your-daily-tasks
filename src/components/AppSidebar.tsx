import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDroppable } from "@dnd-kit/core";
import { Inbox, FolderKanban, Plus, Trash2, Pencil, Check, X, BookOpen } from "lucide-react";
import { Project, PROJECT_COLORS } from "@/types/task";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProjectColorPicker } from "@/components/ProjectColorPicker";

interface AppSidebarProps {
  projects: Project[];
  selectedProjectId: string | null; // null = Inbox
  onSelectProject: (projectId: string | null) => void;
  onAddProject: (name: string, color: string) => Project;
  onUpdateProject: (id: string, updates: Partial<Pick<Project, "name" | "color">>) => void;
  onDeleteProject: (id: string) => void;
  taskCounts: { inbox: number; byProject: Record<string, number> };
  isDragging?: boolean;
}

// Droppable wrapper for sidebar items
const DroppableSidebarItem = ({
  id,
  children,
  isDragging,
}: {
  id: string;
  children: React.ReactNode;
  isDragging: boolean;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200 rounded-md",
        isDragging && "ring-2 ring-dashed ring-primary/30",
        isOver && "ring-primary bg-primary/10"
      )}
    >
      {children}
    </div>
  );
};

export function AppSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  taskCounts,
  isDragging = false,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim(), newProjectColor);
      setNewProjectName("");
      setNewProjectColor(PROJECT_COLORS[0]);
      setAddPopoverOpen(false);
    }
  };

  const startEdit = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditColor(project.color);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onUpdateProject(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
      setEditName("");
      setEditColor("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <h1 className={cn("font-bold text-foreground transition-all", collapsed ? "text-center text-sm" : "text-xl")}>
          {collapsed ? "T" : "Tasks"}
        </h1>
      </SidebarHeader>

      <SidebarContent>
        {/* Inbox */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <DroppableSidebarItem id="sidebar-inbox" isDragging={isDragging}>
                <SidebarMenuButton
                  onClick={() => onSelectProject(null)}
                  isActive={selectedProjectId === null}
                  tooltip="Inbox"
                >
                  <Inbox className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">Inbox</span>
                      {taskCounts.inbox > 0 && (
                        <span className="text-xs text-muted-foreground">{taskCounts.inbox}</span>
                      )}
                    </>
                  )}
                </SidebarMenuButton>
              </DroppableSidebarItem>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Notebook */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/notebook")}
                isActive={location.pathname === "/notebook"}
                tooltip="Notebook"
              >
                <BookOpen className="h-4 w-4" />
                {!collapsed && <span className="flex-1">Notebook</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Projects */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Projects</span>
            {!collapsed && (
              <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Plus className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <div className="space-y-3">
                    <Input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Project name..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                    />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Color</label>
                      <ProjectColorPicker
                        selectedColor={newProjectColor}
                        onSelectColor={setNewProjectColor}
                      />
                    </div>
                    <Button size="sm" onClick={handleAddProject} disabled={!newProjectName.trim()} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Add Project
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => (
                <SidebarMenuItem key={project.id} className="group">
                  {editingId === project.id ? (
                    <div className="space-y-2 px-2 py-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <ProjectColorPicker
                        selectedColor={editColor}
                        onSelectColor={setEditColor}
                      />
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="flex-1" onClick={saveEdit}>
                          <Check className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <DroppableSidebarItem id={`sidebar-project-${project.id}`} isDragging={isDragging}>
                      <SidebarMenuButton
                        onClick={() => onSelectProject(project.id)}
                        isActive={selectedProjectId === project.id}
                        tooltip={project.name}
                      >
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{project.name}</span>
                            {(taskCounts.byProject[project.id] || 0) > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {taskCounts.byProject[project.id]}
                              </span>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(project);
                                }}
                                className="p-1 hover:bg-muted rounded"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteProject(project.id);
                                }}
                                className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </SidebarMenuButton>
                    </DroppableSidebarItem>
                  )}
                </SidebarMenuItem>
              ))}

              {projects.length === 0 && !collapsed && (
                <p className="px-3 py-2 text-xs text-muted-foreground italic">
                  No projects yet
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {collapsed && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="w-full">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="right">
              <div className="space-y-2">
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                />
                <Button size="sm" onClick={handleAddProject} disabled={!newProjectName.trim()} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Add Project
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
