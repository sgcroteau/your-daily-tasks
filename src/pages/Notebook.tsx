import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  BookOpen,
  Calendar,
  FolderKanban,
  FileText,
  Paperclip,
  Link2,
  Network,
  CornerDownRight,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useTaskStorage } from "@/hooks/useTaskStorage";
import { useProjectStorage } from "@/hooks/useProjectStorage";
import { useLabelStorage } from "@/hooks/useLabelStorage";
import { Task, TaskNote, Project, TaskLabel } from "@/types/task";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import HighlightText from "@/components/HighlightText";
import NotebookGraph from "@/components/NotebookGraph";

interface NotebookEntry {
  id: string;
  type: "task" | "note";
  title: string;
  content: string;
  task: Task;
  note?: TaskNote;
  projectId: string | null;
  labelIds: string[];
  createdAt: Date;
  keywords: string[];
  depth: number; // Task tree depth level
  parentId: string | null; // For subtask hierarchy visualization
  hasSubtasks: boolean;
}

// Extract keywords from text for relation mapping
const extractKeywords = (text: string): string[] => {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3);
  return [...new Set(words)];
};

// Flatten all tasks including subtasks, preserving hierarchy info
const flattenTasks = (tasks: Task[], parentId: string | null = null, depth: number = 0): { task: Task; parentId: string | null; depth: number }[] => {
  const result: { task: Task; parentId: string | null; depth: number }[] = [];
  for (const task of tasks) {
    result.push({ task, parentId, depth });
    if (task.subTasks.length > 0) {
      result.push(...flattenTasks(task.subTasks, task.id, depth + 1));
    }
  }
  return result;
};

// Build notebook entries from tasks
const buildNotebookEntries = (tasks: Task[]): NotebookEntry[] => {
  const flatTasks = flattenTasks(tasks);
  const entries: NotebookEntry[] = [];

  for (const { task, parentId, depth } of flatTasks) {
    // Add task as entry
    const taskKeywords = extractKeywords(`${task.title} ${task.description}`);
    entries.push({
      id: `task-${task.id}`,
      type: "task",
      title: task.title,
      content: task.description,
      task,
      projectId: task.projectId,
      labelIds: task.labelIds || [],
      createdAt: task.createdAt,
      keywords: taskKeywords,
      depth,
      parentId,
      hasSubtasks: task.subTasks.length > 0,
    });

    // Add each note as entry
    for (const note of task.notes) {
      const noteKeywords = extractKeywords(note.content);
      entries.push({
        id: `note-${note.id}`,
        type: "note",
        title: task.title,
        content: note.content,
        task,
        note,
        projectId: task.projectId,
        labelIds: task.labelIds || [],
        createdAt: note.createdAt,
        keywords: noteKeywords,
        depth,
        parentId,
        hasSubtasks: false,
      });
    }
  }

  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Find related entries based on shared keywords
const findRelatedEntries = (entry: NotebookEntry, allEntries: NotebookEntry[], maxRelated = 5): NotebookEntry[] => {
  const scored = allEntries
    .filter(e => e.id !== entry.id)
    .map(e => {
      const sharedKeywords = entry.keywords.filter(k => e.keywords.includes(k));
      const sameProject = entry.projectId && entry.projectId === e.projectId;
      const sharedLabels = entry.labelIds.filter(l => e.labelIds.includes(l));
      
      const score = 
        sharedKeywords.length * 2 + 
        (sameProject ? 3 : 0) + 
        sharedLabels.length * 2;
      
      return { entry: e, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRelated);

  return scored.map(s => s.entry);
};

// Group entries by date
const groupByDate = (entries: NotebookEntry[]): Record<string, NotebookEntry[]> => {
  const groups: Record<string, NotebookEntry[]> = {};
  for (const entry of entries) {
    const dateKey = format(new Date(entry.createdAt), "yyyy-MM-dd");
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(entry);
  }
  return groups;
};

// Group entries by project
const groupByProject = (entries: NotebookEntry[], projects: Project[]): Record<string, NotebookEntry[]> => {
  const groups: Record<string, NotebookEntry[]> = { inbox: [] };
  for (const p of projects) {
    groups[p.id] = [];
  }
  for (const entry of entries) {
    if (entry.projectId && groups[entry.projectId]) {
      groups[entry.projectId].push(entry);
    } else {
      groups.inbox.push(entry);
    }
  }
  return groups;
};

const Notebook = () => {
  const navigate = useNavigate();
  const { tasks } = useTaskStorage();
  const { projects, addProject, updateProject, deleteProject } = useProjectStorage();
  const { labels } = useLabelStorage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<NotebookEntry | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "project" | "graph">(
    "timeline"
  );

  const taskCounts = useMemo(() => {
    const counts = { inbox: 0, byProject: {} as Record<string, number> };
    tasks.forEach((task) => {
      if (task.projectId === null) {
        counts.inbox++;
      } else {
        counts.byProject[task.projectId] = (counts.byProject[task.projectId] || 0) + 1;
      }
    });
    return counts;
  }, [tasks]);

  const allEntries = useMemo(() => buildNotebookEntries(tasks), [tasks]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return allEntries;
    const query = searchQuery.toLowerCase();
    return allEntries.filter(entry => 
      entry.title.toLowerCase().includes(query) ||
      entry.content.toLowerCase().includes(query) ||
      entry.keywords.some(k => k.includes(query))
    );
  }, [allEntries, searchQuery]);

  const groupedByDate = useMemo(() => groupByDate(filteredEntries), [filteredEntries]);
  const groupedByProject = useMemo(() => groupByProject(filteredEntries, projects), [filteredEntries, projects]);
  
  const relatedEntries = useMemo(() => {
    if (!selectedEntry) return [];
    return findRelatedEntries(selectedEntry, allEntries);
  }, [selectedEntry, allEntries]);

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "Inbox";
    return projects.find(p => p.id === projectId)?.name || "Unknown";
  };

  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return undefined;
    return projects.find(p => p.id === projectId)?.color;
  };

  const getLabel = (labelId: string): TaskLabel | undefined => {
    return labels.find(l => l.id === labelId);
  };

  const renderEntry = (entry: NotebookEntry, showRelated = false) => (
    <Card 
      key={entry.id}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selectedEntry?.id === entry.id && "ring-2 ring-primary",
        entry.depth > 0 && "border-l-4 border-l-primary/30"
      )}
      style={{
        marginLeft: entry.depth > 0 ? `${entry.depth * 16}px` : undefined,
      }}
      onClick={() => setSelectedEntry(entry)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Tree hierarchy indicator */}
            {entry.depth > 0 && (
              <div className="flex items-center gap-0.5 text-muted-foreground mr-1">
                <CornerDownRight className="h-3 w-3" />
                <span className="text-[10px] font-medium">L{entry.depth}</span>
              </div>
            )}
            {entry.type === "task" ? (
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <CardTitle className="text-sm font-medium line-clamp-1">
              <HighlightText text={entry.title} query={searchQuery} />
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {entry.hasSubtasks && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                <GitBranch className="h-2.5 w-2.5" />
                Tree
              </Badge>
            )}
            {entry.task.completed && (
              <Badge variant="secondary" className="text-xs">Completed</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          <HighlightText text={entry.content || "(No content)"} query={searchQuery} />
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(entry.createdAt), "MMM d, yyyy")}
          </span>
          {entry.projectId && (
            <span className="flex items-center gap-1">
              <span 
                className="h-2 w-2 rounded-full" 
                style={{ backgroundColor: getProjectColor(entry.projectId) }}
              />
              {getProjectName(entry.projectId)}
            </span>
          )}
          {entry.note && entry.note.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {entry.note.attachments.length}
            </span>
          )}
          {entry.labelIds.length > 0 && (
            <div className="flex gap-1">
              {entry.labelIds.slice(0, 2).map(id => {
                const label = getLabel(id);
                return label ? (
                  <span
                    key={id}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                ) : null;
              })}
            </div>
          )}
        </div>
        {showRelated && entry.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.keywords.slice(0, 5).map(k => (
              <Badge key={k} variant="outline" className="text-[10px] px-1.5 py-0">
                {k}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          projects={projects}
          selectedProjectId={null}
          taskCounts={taskCounts}
          onSelectProject={(projectId) => navigate("/", { state: { selectedProjectId: projectId } })}
          onAddProject={addProject}
          onUpdateProject={updateProject}
          onDeleteProject={deleteProject}
        />
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="flex items-center gap-4 px-4 py-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2 flex-1">
                <BookOpen className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Notebook</h1>
              </div>
              <ThemeToggle />
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all tasks, notes, and content..."
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{allEntries.filter(e => e.type === "task").length}</div>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{allEntries.filter(e => e.task.completed).length}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground">Projects</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList className="mb-4">
                <TabsTrigger value="timeline" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Timeline
                </TabsTrigger>
                <TabsTrigger value="project" className="flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" /> By Project
                </TabsTrigger>
                <TabsTrigger value="graph" className="flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5" /> Graph
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="space-y-6 pr-4">
                    {Object.entries(groupedByDate).map(([date, entries]) => (
                      <div key={date}>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                          {format(new Date(date), "EEEE, MMMM d, yyyy")}
                        </h3>
                        <div className="grid gap-3">
                          {entries.map(e => renderEntry(e))}
                        </div>
                      </div>
                    ))}
                    {filteredEntries.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No entries found</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="project">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="space-y-6 pr-4">
                    {/* Inbox first */}
                    {groupedByProject.inbox.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <FolderKanban className="h-4 w-4" /> Inbox
                          <Badge variant="secondary" className="text-xs">{groupedByProject.inbox.length}</Badge>
                        </h3>
                        <div className="grid gap-3">
                          {groupedByProject.inbox.map(e => renderEntry(e))}
                        </div>
                      </div>
                    )}
                    {/* Projects */}
                    {projects.map(project => {
                      const projectEntries = groupedByProject[project.id] || [];
                      if (projectEntries.length === 0) return null;
                      return (
                        <div key={project.id}>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                            {project.name}
                            <Badge variant="secondary" className="text-xs">{projectEntries.length}</Badge>
                          </h3>
                          <div className="grid gap-3">
                            {projectEntries.map(e => renderEntry(e))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="graph">
                <NotebookGraph 
                  entries={filteredEntries}
                  projects={projects}
                  onSelectEntry={(entryId) => {
                    const entry = allEntries.find(e => e.id === entryId);
                    if (entry) setSelectedEntry(entry);
                  }}
                  selectedEntryId={selectedEntry?.id}
                />
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Click on nodes to view details. Connected entries share keywords, projects, or labels.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {selectedEntry ? (
                    <>
                      {selectedEntry.type === "task" ? <FileText className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      Details
                    </>
                  ) : (
                    "Select an entry"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEntry ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">{selectedEntry.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedEntry.content || "(No description)"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant={selectedEntry.task.completed ? "secondary" : "default"}>
                        {selectedEntry.task.completed ? "Completed" : selectedEntry.task.status}
                      </Badge>
                      <Badge variant="outline">{selectedEntry.task.priority}</Badge>
                    </div>

                    {selectedEntry.note && selectedEntry.note.attachments.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">Attachments</h5>
                        <div className="space-y-1">
                          {selectedEntry.note.attachments.map(att => (
                            <a 
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-primary hover:underline"
                            >
                              <Paperclip className="h-3 w-3" />
                              {att.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedEntry.labelIds.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">Labels</h5>
                        <div className="flex flex-wrap gap-1">
                          {selectedEntry.labelIds.map(id => {
                            const label = getLabel(id);
                            return label ? (
                              <Badge 
                                key={id} 
                                variant="secondary" 
                                className="text-xs"
                                style={{ backgroundColor: `${label.color}20`, color: label.color }}
                              >
                                {label.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {relatedEntries.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Link2 className="h-3 w-3" /> Related Entries
                        </h5>
                        <div className="space-y-2">
                          {relatedEntries.map(rel => (
                            <button
                              key={rel.id}
                              onClick={() => setSelectedEntry(rel)}
                              className="w-full text-left p-2 rounded-md border border-border hover:bg-muted/50 transition-colors"
                            >
                              <p className="text-xs font-medium line-clamp-1">{rel.title}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {rel.type === "note" ? "Note" : "Task"} • {format(new Date(rel.createdAt), "MMM d")}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <p className="text-[10px] text-muted-foreground">
                        Created: {format(new Date(selectedEntry.createdAt), "PPpp")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click on any task or note to see its details and related entries.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  </div>
</SidebarProvider>
  );
};

export default Notebook;
