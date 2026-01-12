"use client";

import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TaskStatus } from "@/components/kanban/status-selector";
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
  isLoading: boolean;
  isStreaming: boolean;

  // Actions
  selectTask: (taskId: string | null) => void;
  closePanel: () => void;
  startTask: (agentType: AgentType, description?: string) => Promise<void>;
  sendMessage: (content: string) => void;
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

  // Query task messages to get initial messages for useChat
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
    enabled: !!selectedTaskId && taskMessagesQuery.isSuccess,
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

  const chatId = taskChatQuery.data?.id ?? null;
  const activeStreamId = taskChatQuery.data?.activeStreamId ?? null;
  const initialMessages = taskMessagesQuery.data ?? [];

  // Invalidate tasks helper
  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: orpc.task.getTasksByProject.queryOptions({
        input: { projectId },
      }).queryKey,
    });
  }, [queryClient, projectId]);

  // Invalidate task queries helper
  const invalidateTaskQueries = useCallback(() => {
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

  // Use useChat from ai-sdk for unified message management
  const {
    messages,
    sendMessage: chatSendMessage,
    status,
    resumeStream,
    stop: _stop,
  } = useChat({
    id: chatId ?? undefined,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/agent",
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            type: "task",
            taskId: selectedTaskId,
            messages,
          },
        };
      },
      prepareReconnectToStreamRequest: chatId
        ? ({ id }) => ({
            api: `/api/agent/${id}/stream`,
            credentials: "include",
          })
        : undefined,
    }),
    messages: initialMessages,
    onFinish: () => {
      invalidateTaskQueries();
    },
    onError: (error) => {
      console.error("Chat stream error:", error);
    },
  });

  const isStreaming = status === "streaming";

  // Resume stream when activeStreamId exists
  // biome-ignore lint/correctness/useExhaustiveDependencies: only resume when chat data changes
  useEffect(() => {
    if (activeStreamId && status === "ready") {
      resumeStream();
    }
  }, [taskChatQuery.data]);

  // Custom stop function that calls DELETE endpoint before built-in stop
  const abortStream = useCallback(async () => {
    if (!chatId) return;

    await fetch(`/api/agent/${chatId}/stream`, {
      method: "DELETE",
    }).catch((error) => {
      console.error("Failed to abort stream:", error);
    });

    await _stop();
  }, [chatId, _stop]);

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

        // useChat will pick up the stream via resumeStream when activeStreamId is detected
      } catch (error) {
        console.error("Failed to start task:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedTaskId, invalidateTasks, queryClient],
  );

  // Send message action using useChat's sendMessage
  const sendMessage = useCallback(
    (content: string) => {
      if (!selectedTaskId) return;

      chatSendMessage({
        parts: [{ type: "text", text: content }],
      });
    },
    [selectedTaskId, chatSendMessage],
  );

  const value: TaskPanelContextValue = {
    selectedTaskId,
    selectedTask,
    messages,
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
