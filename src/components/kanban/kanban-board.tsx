"use client";

import { KanbanColumn } from "./kanban-column";
import type { TaskStatus } from "./status-selector";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onAddTask: () => void;
}

const columns: TaskStatus[] = [
  "todo",
  "processing",
  "in_review",
  "done",
  "cancel",
];

export function KanbanBoard({
  tasks,
  onTaskClick,
  onTaskStatusChange,
  onAddTask,
}: KanbanBoardProps) {
  const tasksByStatus = columns.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );

  return (
    <div className="grid h-full grid-cols-5 gap-4 p-4">
      {columns.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={tasksByStatus[status]}
          onTaskClick={onTaskClick}
          onTaskStatusChange={onTaskStatusChange}
          onAddTask={status === "todo" ? onAddTask : undefined}
        />
      ))}
    </div>
  );
}
