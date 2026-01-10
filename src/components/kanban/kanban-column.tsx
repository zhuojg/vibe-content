"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusConfig, type TaskStatus } from "./status-selector";
import { TaskCard } from "./task-card";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onAddTask?: () => void;
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onTaskStatusChange,
  onAddTask,
}: KanbanColumnProps) {
  const config = statusConfig[status];

  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col border border-border">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <div className={cn("size-2 rounded-full", config.color)} />
          <span className="text-sm font-medium">{config.label}</span>
          <span className="text-xs text-muted-foreground">
            ({tasks.length})
          </span>
        </div>
        {status === "todo" && onAddTask && (
          <Button size="icon-xs" variant="ghost" onClick={onAddTask}>
            <Plus className="size-3" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            description={task.description}
            status={task.status}
            onStatusChange={(newStatus) =>
              onTaskStatusChange(task.id, newStatus)
            }
            onClick={() => onTaskClick(task.id)}
          />
        ))}
      </div>
    </div>
  );
}
