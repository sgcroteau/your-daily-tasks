interface TaskStatsProps {
  total: number;
  completed: number;
}

const TaskStats = ({ total, completed }: TaskStatsProps) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {completed} of {total} completed
      </span>
      {total > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-xs font-medium">{percentage}%</span>
        </div>
      )}
    </div>
  );
};

export default TaskStats;
