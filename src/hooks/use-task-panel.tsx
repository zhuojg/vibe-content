"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { TaskStatus } from "@/components/kanban/status-selector";
import { useChatStream } from "@/hooks/use-chat-stream";
import { generateUUID } from "@/lib/utils";
import { orpc } from "@/orpc/client";

export type AgentType = string;

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  assignedAgent?: AgentType | null;
  output?: string | null;
  reviewComment?: string | null;
}

interface TaskPanelContextValue {
  // State
  selectedTaskId: string | null;
  selectedTask: Task | undefined;
  messages: UIMessage[];
  streamingMessages: UIMessage[];
  isLoading: boolean;
  isStreaming: boolean;

  // Actions
  selectTask: (taskId: string | null) => void;
  closePanel: () => void;
  startTask: (agentType: AgentType, description?: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  abortStream: () => Promise<void>;
}

const TaskPanelContext = createContext<TaskPanelContextValue | null>(null);

interface TaskPanelProviderProps {
  projectId: string;
  children: ReactNode;
  onTaskSelected?: (taskId: string | null) => void;
}

export function TaskPanelProvider({
  projectId,
  children,
  onTaskSelected,
}: TaskPanelProviderProps) {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Query tasks for this project
  const tasksQuery = useQuery(
    orpc.task.getTasksByProject.queryOptions({ input: { projectId } }),
  );

  const tasks = tasksQuery.data ?? [];
  const selectedTask = useMemo(() => {
    const rawTask = tasks.find((t) => t.id === selectedTaskId);
    if (!rawTask) return undefined;
    return {
      ...rawTask,
      status: rawTask.status as TaskStatus,
      assignedAgent: rawTask.assignedAgent as AgentType | null,
    };
  }, [tasks, selectedTaskId]);

  // Query task messages
  const taskMessagesQuery = useQuery({
    ...orpc.chat.getTaskMessages.queryOptions({
      input: { taskId: selectedTaskId ?? "" },
    }),
    enabled: !!selectedTaskId,
  });

  // Query task chat to get chatId for streaming
  const taskChatQuery = useQuery({
    ...orpc.chat.getTaskChat.queryOptions({
      input: { taskId: selectedTaskId ?? "" },
    }),
    enabled: !!selectedTaskId,
    // Poll while looking for active stream
    refetchInterval: (query) => {
      // Stop polling once we have an activeStreamId or task is not in processing state
      if (query.state.data?.activeStreamId) return false;
      if (
        selectedTask?.status !== "processing" &&
        selectedTask?.status !== "todo"
      )
        return false;
      return 1000; // Poll every second
    },
  });

  const messages: UIMessage[] = taskMessagesQuery.data ?? [];

  // Invalidate tasks helper
  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: orpc.task.getTasksByProject.queryOptions({
        input: { projectId },
      }).queryKey,
    });
  }, [queryClient, projectId]);

  // Handle stream complete
  const handleStreamComplete = useCallback(() => {
    invalidateTasks();
    if (selectedTaskId) {
      queryClient.invalidateQueries({
        queryKey: orpc.chat.getTaskMessages.queryOptions({
          input: { taskId: selectedTaskId },
        }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.chat.getTaskChat.queryOptions({
          input: { taskId: selectedTaskId },
        }).queryKey,
      });
    }
  }, [queryClient, selectedTaskId, invalidateTasks]);

  // Chat stream hook for real-time streaming during processing
  const {
    messages: streamingMessages,
    isStreaming,
    abort: abortTaskStream,
  } = useChatStream({
    chatId: taskChatQuery.data?.id ?? null,
    enabled:
      !!selectedTaskId &&
      !!taskChatQuery.data?.id &&
      !!taskChatQuery.data?.activeStreamId &&
      (selectedTask?.status === "processing" ||
        selectedTask?.status === "todo"),
    onComplete: handleStreamComplete,
  });

  // Select task action
  const selectTask = useCallback(
    (taskId: string | null) => {
      setSelectedTaskId(taskId);
      onTaskSelected?.(taskId);
    },
    [onTaskSelected],
  );

  // Close panel action
  const closePanel = useCallback(() => {
    setSelectedTaskId(null);
    onTaskSelected?.(null);
  }, [onTaskSelected]);

  // Start task action - calls POST /api/agent with type: "startTask"
  const startTask = useCallback(
    async (agentType: AgentType, description?: string) => {
      if (!selectedTaskId) return;

      setIsLoading(true);

      try {
        // Call /api/agent with startTask type
        // This handles: status → processing, creates chat, returns stream, sets activeStreamId
        // On stream finish: status → in_review, clears activeStreamId
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "startTask",
            taskId: selectedTaskId,
            agentType,
            description,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Invalidate task query to show "processing" status immediately
        invalidateTasks();

        // Invalidate task chat query so it refetches with new activeStreamId
        queryClient.invalidateQueries({
          queryKey: orpc.chat.getTaskChat.queryOptions({
            input: { taskId: selectedTaskId },
          }).queryKey,
        });

        // We don't need to consume the stream here - useChatStream will pick it up
        // via the taskChatQuery polling for activeStreamId
      } catch (error) {
        console.error("Failed to start task:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedTaskId, invalidateTasks, queryClient],
  );

  // Send message action
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedTaskId) {
        throw new Error("No task selected");
      }

      const userMessage: UIMessage = {
        id: generateUUID(),
        role: "user",
        parts: [{ type: "text", text: content }],
      };
      // Get existing messages and add user message
      const existingMessages = taskMessagesQuery.data ?? [];
      const allMessages = [...existingMessages, userMessage];

      // Send request and consume the stream to completion
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task",
          taskId: selectedTaskId,
          messages: allMessages,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Consume the stream to completion
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    },
    onSuccess: () => {
      if (selectedTaskId) {
        queryClient.invalidateQueries({
          queryKey: orpc.chat.getTaskMessages.queryOptions({
            input: { taskId: selectedTaskId },
          }).queryKey,
        });
      }
    },
  });

  const sendMessage = useCallback(
    async (content: string) => {
      setIsLoading(true);
      try {
        await sendMessageMutation.mutateAsync(content);
      } finally {
        setIsLoading(false);
      }
    },
    [sendMessageMutation],
  );

  // Abort stream action
  const abortStream = useCallback(async () => {
    await abortTaskStream();
  }, [abortTaskStream]);

  const value: TaskPanelContextValue = {
    selectedTaskId,
    selectedTask,
    messages,
    streamingMessages,
    isLoading,
    isStreaming,
    selectTask,
    closePanel,
    startTask,
    sendMessage,
    abortStream,
  };

  return (
    <TaskPanelContext.Provider value={value}>
      {children}
    </TaskPanelContext.Provider>
  );
}

export function useTaskPanel(): TaskPanelContextValue {
  const context = useContext(TaskPanelContext);
  if (!context) {
    throw new Error("useTaskPanel must be used within a TaskPanelProvider");
  }
  return context;
}
