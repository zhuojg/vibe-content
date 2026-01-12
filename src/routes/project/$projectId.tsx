import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatContainer } from "@/components/chat/chat-container";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { TaskStatus } from "@/components/kanban/status-selector";
import { TaskDetailPanel } from "@/components/kanban/task-detail-panel";
import { Button } from "@/components/ui/button";
import { TaskPanelProvider, useTaskPanel } from "@/hooks/use-task-panel";
import {
  useDataStreamHandler,
  useToolUIMessageStore,
} from "@/lib/data-stream-handler";
import { useInitialChatStore } from "@/lib/stores/initial-chat-store";
import { client, orpc } from "@/orpc/client";

export const Route = createFileRoute("/project/$projectId")({
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();

  return (
    <TaskPanelProvider projectId={projectId}>
      <ProjectPageContent />
    </TaskPanelProvider>
  );
}

function ProjectPageContent() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Get task panel context
  const { selectedTaskId, selectTask } = useTaskPanel();

  // Project chat state
  const [projectChatOpen, setProjectChatOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Data stream state for subagent message handling
  // biome-ignore lint/suspicious/noExplicitAny: DataUIPart requires custom type
  const [dataStream, setDataStream] = useState<any[]>([]);
  const { clearMessages } = useToolUIMessageStore();

  // Process data stream for subagent messages
  useDataStreamHandler(dataStream);

  const projectQuery = useQuery(
    orpc.project.getProject.queryOptions({ input: { projectId } }),
  );

  const tasksQuery = useQuery(
    orpc.task.getTasksByProject.queryOptions({ input: { projectId } }),
  );

  const tasks = tasksQuery.data ?? [];

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: orpc.task.getTasksByProject.queryOptions({
        input: { projectId },
      }).queryKey,
    });
  }, [queryClient, projectId]);

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

  // Query chat sessions for project
  const projectChatsQuery = useQuery({
    ...orpc.chat.listProjectChats.queryOptions({ input: { projectId } }),
    enabled: projectChatOpen,
  });
  const projectChats = projectChatsQuery.data ?? [];

  // Query existing messages for selected project chat
  const projectChatMessagesQuery = useQuery({
    ...orpc.chat.getProjectMessages.queryOptions({
      input: {
        projectId,
        chatId: selectedChatId ?? undefined,
      },
    }),
    enabled: projectChatOpen && !!selectedChatId,
  });

  // Query existing messages for clarifying chat (when project is in clarifying state)
  const clarifyingMessagesQuery = useQuery({
    ...orpc.chat.getProjectMessages.queryOptions({
      input: { projectId },
    }),
    enabled: !!projectId,
  });

  const createChatSessionMutation = useMutation(
    orpc.chat.createProjectChatSession.mutationOptions(),
  );

  // Generate initial tasks mutation
  const generateTasksMutation = useMutation(
    orpc.agent.generateInitialTasks.mutationOptions(),
  );

  // Project chat with useChat hook
  const {
    messages: projectChatMessages,
    sendMessage: sendProjectMessage,
    status: projectChatStatus,
    setMessages: setProjectChatMessages,
  } = useChat({
    id: selectedChatId ?? `project-${projectId}`,
    transport: new DefaultChatTransport({
      api: "/api/agent",
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            type: "project",
            projectId,
            chatId: selectedChatId ?? undefined,
            messages,
          },
        };
      },
      prepareReconnectToStreamRequest: selectedChatId
        ? () => ({
            api: `/api/agent/${selectedChatId}/stream`,
          })
        : undefined,
    }),
    onData: (dataPart) => {
      setDataStream((ds) => [...ds, dataPart]);
    },
  });

  // Clarifying chat hook - used for new project intent confirmation
  const {
    messages: clarifyingMessages,
    sendMessage: sendClarifyingMessage,
    status: clarifyingChatStatus,
    setMessages: setClarifyingMessages,
  } = useChat({
    id: `clarify-${projectId}`,
    transport: new DefaultChatTransport({
      api: "/api/agent",
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            type: "project",
            projectId,
            messages,
          },
        };
      },
      // No reconnect for clarifying chat since we don't have a stable chatId
    }),
  });

  const isClarifyingChatLoading =
    clarifyingChatStatus === "streaming" ||
    clarifyingChatStatus === "submitted";

  // Consume initial message from Zustand store (set by homepage on project creation)
  const consumeInitialChat = useInitialChatStore((s) => s.consumeInitialChat);
  const initialMessageSent = useRef(false);

  // Auto-send initial message on mount if present in store
  useEffect(() => {
    if (initialMessageSent.current) return;
    const initialChat = consumeInitialChat();
    if (initialChat && initialChat.projectId === projectId) {
      initialMessageSent.current = true;
      sendClarifyingMessage({ text: initialChat.message });
    }
  }, [projectId, consumeInitialChat, sendClarifyingMessage]);

  // Load existing clarifying messages when returning to a clarifying project
  useEffect(() => {
    if (
      clarifyingMessagesQuery.data &&
      clarifyingMessagesQuery.data.length > 0
    ) {
      setClarifyingMessages(clarifyingMessagesQuery.data);
    }
  }, [clarifyingMessagesQuery.data, setClarifyingMessages]);

  // Load existing project chat messages when selecting a chat
  useEffect(() => {
    if (
      projectChatMessagesQuery.data &&
      projectChatMessagesQuery.data.length > 0
    ) {
      setProjectChatMessages(projectChatMessagesQuery.data);
    }
  }, [projectChatMessagesQuery.data, setProjectChatMessages]);

  // Clear data stream and store when chat session changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally clear when chat changes
  useEffect(() => {
    clearMessages();
    setDataStream([]);
  }, [selectedChatId, clearMessages]);

  // Auto-select first chat session when opening project chat
  useEffect(() => {
    if (projectChatOpen && projectChats.length > 0 && !selectedChatId) {
      setSelectedChatId(projectChats[0].id);
    }
  }, [projectChatOpen, projectChats, selectedChatId]);

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

  const handleCreateNewSession = async () => {
    const newSession = await createChatSessionMutation.mutateAsync({
      projectId,
    });
    setSelectedChatId(newSession.id);
    setProjectChatMessages([]);
    queryClient.invalidateQueries({
      queryKey: orpc.chat.listProjectChats.queryOptions({
        input: { projectId },
      }).queryKey,
    });
  };

  const handleOpenProjectChat = () => {
    // Mutual exclusion: close task panel when opening project chat
    selectTask(null);
    setProjectChatOpen(true);
    // Reset selected chat to trigger auto-select
    setSelectedChatId(null);
    setProjectChatMessages([]);
  };

  const handleCloseProjectChat = () => {
    setProjectChatOpen(false);
  };

  // Handle task click with mutual exclusion
  const handleTaskClick = (taskId: string) => {
    // Close project chat when selecting a task
    setProjectChatOpen(false);
    selectTask(taskId);
  };

  // Determine view mode based on project status
  const project = projectQuery.data;
  const viewMode = useMemo(() => {
    // Still loading project data
    if (projectQuery.isLoading) return "loading";
    // No project found (error case)
    if (!project) return "loading";
    // Project is in clarifying state
    if (project.status === "clarifying") return "clarifying";
    // Tasks are being generated
    if (generateTasksMutation.isPending) return "generating";
    // Normal kanban view
    return "active";
  }, [project, projectQuery.isLoading, generateTasksMutation.isPending]);

  const isProjectChatLoading =
    projectChatStatus === "streaming" || projectChatStatus === "submitted";

  // Show "Go to Kanban" when project is clarifying and has enough conversation
  const showGoToKanban =
    viewMode === "clarifying" && clarifyingMessages.length >= 2;

  // Handler to transition from clarifying to active
  const handleGoToKanban = async () => {
    if (!projectId) return;
    // Generate tasks and update project status
    await generateTasksMutation.mutateAsync({ projectId });
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({
      queryKey: orpc.project.getProject.queryOptions({ input: { projectId } })
        .queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: orpc.task.getTasksByProject.queryOptions({
        input: { projectId },
      }).queryKey,
    });
  };

  // Loading view
  if (viewMode === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  // Clarifying view - full-width chat for intent confirmation
  if (viewMode === "clarifying") {
    return (
      <div className="flex h-screen flex-col">
        <header className="flex items-center gap-4 border-b border-border p-4">
          <Link to="/">
            <Button size="icon-sm" variant="ghost">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-medium">
              {project?.name ?? "New Project"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Tell me about your project
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ChatContainer
              messages={clarifyingMessages}
              onSendMessage={(content) =>
                sendClarifyingMessage({ text: content })
              }
              isLoading={isClarifyingChatLoading}
              placeholder="Describe your project..."
            />
          </div>

          {showGoToKanban && (
            <div className="border-t border-border p-4">
              <Button
                onClick={handleGoToKanban}
                disabled={
                  isClarifyingChatLoading || generateTasksMutation.isPending
                }
                className="w-full"
              >
                {generateTasksMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating tasks...
                  </>
                ) : (
                  <>
                    Go to Kanban Board
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Generating view - show loading while tasks are being generated
  if (viewMode === "generating") {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-lg text-muted-foreground">
          Generating tasks...
        </p>
        <p className="text-sm text-muted-foreground">
          Setting up your project board
        </p>
      </div>
    );
  }

  // Active view - Kanban board

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-border p-4">
        <Link to="/">
          <Button size="icon-sm" variant="ghost">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-medium">{project?.name}</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
        </div>
        <Button variant="outline" onClick={handleOpenProjectChat}>
          <MessageSquare className="mr-2 size-4" />
          Project Chat
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            tasks={tasks.map((t) => ({
              ...t,
              status: t.status as TaskStatus,
            }))}
            onTaskClick={handleTaskClick}
            onTaskStatusChange={handleTaskStatusChange}
            onAddTask={handleAddTask}
          />
        </div>

        {selectedTaskId && !projectChatOpen && <TaskDetailPanel />}

        {/* Project Chat Panel - inline side panel (50% width) */}
        {projectChatOpen && (
          <div className="flex h-full w-1/2 flex-shrink-0 flex-col border-l border-border bg-background animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-medium">Project Chat</h2>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleCloseProjectChat}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Session selector */}
            {projectChats.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-border p-2">
                {projectChats.map((chatSession) => (
                  <Button
                    key={chatSession.id}
                    variant={
                      selectedChatId === chatSession.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setSelectedChatId(chatSession.id);
                      setProjectChatMessages([]);
                    }}
                  >
                    {chatSession.title}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCreateNewSession}
                  disabled={createChatSessionMutation.isPending}
                >
                  <Plus className="mr-1 size-4" />
                  New Session
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-hidden">
              <ChatContainer
                messages={projectChatMessages}
                onSendMessage={(content) =>
                  sendProjectMessage({ text: content })
                }
                isLoading={isProjectChatLoading}
                placeholder="Chat about your project..."
              />
            </div>
          </div>
        )}
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
    </div>
  );
}
