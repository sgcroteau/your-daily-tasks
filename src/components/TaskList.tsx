import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Task, TaskLabel, QuickNote } from "@/types/task";
import DraggableTaskItem from "./DraggableTaskItem";

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
  onReorder: (tasks: Task[]) => void;
  onUpdateSubTasks: (taskId: string, subTasks: Task[]) => void;
  searchQuery?: string;
  labels: TaskLabel[];
  quickNotes?: QuickNote[];
}

const TaskList = ({ tasks, onToggle, onDelete, onOpen, onReorder, onUpdateSubTasks, searchQuery = "", labels, quickNotes = [] }: TaskListProps) => {
  // Count pinned notes per task
  const pinnedNotesMap = quickNotes.reduce((acc, note) => {
    if (note.pinnedToTaskId) {
      acc[note.pinnedToTaskId] = (acc[note.pinnedToTaskId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-lg font-medium">No tasks yet</p>
        <p className="text-sm mt-1">Add your first task above to get started</p>
      </div>
    );
  }

  return (
    <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className="task-item-enter"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <DraggableTaskItem
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onOpen={onOpen}
              onUpdateSubTasks={onUpdateSubTasks}
              searchQuery={searchQuery}
              labels={labels}
              pinnedNotesCount={pinnedNotesMap[task.id] || 0}
            />
          </div>
        ))}
      </div>
    </SortableContext>
  );
};

export default TaskList;
