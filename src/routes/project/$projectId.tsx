"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { ArrowLeft, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { TaskStatus } from "@/components/kanban/status-selector";
import {
  type AgentType,
  TaskDetailModal,
} from "@/components/kanban/task-detail-modal";
import { Button } from "@/components/ui/button";
import { client, orpc } from "@/orpc/client";

export const Route = createFileRoute("/project/$projectId")({
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [taskActionLoading, setTaskActionLoading] = useState(false);

  // Track which tasks have already been auto-progressed to prevent duplicates
  const autoProgressedTasksRef = useRef<Set<string>>(new Set());

  const projectQuery = useQuery(
    orpc.project.getProject.queryOptions({ input: { projectId } }),
  );

  const tasksQuery = useQuery(
    orpc.task.getTasksByProject.queryOptions({ input: { projectId } }),
  );

  const taskMessagesQuery = useQuery({
    ...orpc.task.getTaskMessages.queryOptions({
      input: { taskId: selectedTaskId ?? "" },
    }),
    enabled: !!selectedTaskId,
  });

  const tasks = tasksQuery.data ?? [];
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const taskMessages: UIMessage[] = (taskMessagesQuery.data ?? []).map(
    (m) => m.message as UIMessage,
  );

  const invalidateTasks = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.task.getTasksByProject.queryOptions({
        input: { projectId },
      }).queryKey,
    });
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      client.task.updateTaskStatus({ taskId, status }),
    onSuccess: invalidateTasks,
  });

  const createTaskMutation = useMutation({
    mutationFn: (title: string) => client.task.createTask({ projectId, title }),
    onSuccess: () => {
      invalidateTasks();
      setIsAddingTask(false);
      setNewTaskTitle("");
    },
  });

  const sendTaskMessageMutation = useMutation({
    mutationFn: (content: string) =>
      client.chat.sendTaskMessage({ taskId: selectedTaskId!, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.task.getTaskMessages.queryOptions({
          input: { taskId: selectedTaskId! },
        }).queryKey,
      });
    },
  });

  // New mutations for task workflow
  const assignAgentMutation = useMutation({
    mutationFn: ({
      taskId,
      agentType,
      description,
    }: {
      taskId: string;
      agentType: string;
      description?: string;
    }) => client.task.assignAgentAndStart({ taskId, agentType, description }),
    onSuccess: invalidateTasks,
  });

  const completeProcessingMutation = useMutation({
    mutationFn: (taskId: string) => client.task.completeProcessing({ taskId }),
    onSuccess: invalidateTasks,
  });

  const approveTaskMutation = useMutation({
    mutationFn: (taskId: string) => client.task.approveTask({ taskId }),
    onSuccess: invalidateTasks,
  });

  const rejectTaskMutation = useMutation({
    mutationFn: ({ taskId, comment }: { taskId: string; comment: string }) =>
      client.task.rejectTask({ taskId, comment }),
    onSuccess: invalidateTasks,
  });

  const handleTaskStatusChange = (taskId: string, status: TaskStatus) => {
    updateStatusMutation.mutate({ taskId, status });
  };

  const handleAddTask = () => {
    setIsAddingTask(true);
  };

  const handleCreateTask = () => {
    if (newTaskTitle.trim()) {
      createTaskMutation.mutate(newTaskTitle.trim());
    }
  };

  const handleSendTaskMessage = async (content: string) => {
    setTaskActionLoading(true);
    try {
      await sendTaskMessageMutation.mutateAsync(content);
    } finally {
      setTaskActionLoading(false);
    }
  };

  const handleAssignAndStart = async (
    agentType: AgentType,
    description?: string,
  ) => {
    if (!selectedTaskId) return;
    setTaskActionLoading(true);
    try {
      await assignAgentMutation.mutateAsync({
        taskId: selectedTaskId,
        agentType,
        description,
      });
    } finally {
      setTaskActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTaskId) return;
    setTaskActionLoading(true);
    try {
      await approveTaskMutation.mutateAsync(selectedTaskId);
      setSelectedTaskId(null);
    } finally {
      setTaskActionLoading(false);
    }
  };

  const handleReject = async (comment: string) => {
    if (!selectedTaskId) return;
    setTaskActionLoading(true);
    try {
      await rejectTaskMutation.mutateAsync({
        taskId: selectedTaskId,
        comment,
      });
    } finally {
      setTaskActionLoading(false);
    }
  };

  // Auto-progress logic for tasks in "processing" status ONLY
  // (removed auto-progress for in_review - user must approve/reject)
  const autoProgressTask = useCallback(
    async (taskId: string) => {
      // Check if already being processed
      if (autoProgressedTasksRef.current.has(taskId)) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status !== "processing") return;

      // Mark as being processed
      autoProgressedTasksRef.current.add(taskId);

      setTimeout(() => {
        completeProcessingMutation.mutate(taskId, {
          onSettled: () => {
            // Remove from set after mutation completes
            autoProgressedTasksRef.current.delete(taskId);
          },
        });
      }, 3000);
    },
    [tasks, completeProcessingMutation],
  );

  // Watch for status changes to trigger auto-progress (processing only)
  useEffect(() => {
    tasks.forEach((task) => {
      if (task.status === "processing") {
        autoProgressTask(task.id);
      }
    });
  }, [tasks, autoProgressTask]);

  if (projectQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  const project = projectQuery.data;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-border p-4">
        <Link to="/">
          <Button size="icon-sm" variant="ghost">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-medium">{project?.name}</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          tasks={tasks.map((t) => ({
            ...t,
            status: t.status as TaskStatus,
          }))}
          onTaskClick={setSelectedTaskId}
          onTaskStatusChange={handleTaskStatusChange}
          onAddTask={handleAddTask}
        />
      </div>

      {isAddingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* biome-ignore lint/a11y/useSemanticElements: backdrop overlay */}
          <div
            role="button"
            tabIndex={0}
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsAddingTask(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsAddingTask(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md border border-border bg-background p-4">
            <h3 className="mb-4 text-lg font-medium">Add New Task</h3>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              className="mb-4 w-full border border-border bg-transparent px-3 py-2 text-sm focus:border-ring focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTask();
                if (e.key === "Escape") setIsAddingTask(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAddingTask(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim()}
              >
                <Plus className="size-4" />
                Add Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={{
            ...selectedTask,
            status: selectedTask.status as TaskStatus,
            assignedAgent: selectedTask.assignedAgent as AgentType | null,
            output: selectedTask.output,
            reviewComment: selectedTask.reviewComment,
          }}
          messages={taskMessages}
          isLoading={taskActionLoading}
          onClose={() => setSelectedTaskId(null)}
          onSendMessage={handleSendTaskMessage}
          onAssignAndStart={handleAssignAndStart}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
