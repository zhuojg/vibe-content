"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { client, orpc } from "@/orpc/client";

// Infer types from the oRPC client
type InboxMessage = Awaited<
  ReturnType<typeof client.inbox.getInboxMessages>
>[number];

type SuggestedTaskData = {
  title: string;
  description?: string;
  assignedAgent?: string;
};

interface InboxPanelContextValue {
  // State
  isOpen: boolean;
  selectedMessageId: string | null;
  selectedMessage: InboxMessage | undefined;
  messages: InboxMessage[];
  pendingMessages: InboxMessage[];
  resolvedMessages: InboxMessage[];
  pendingCount: number;
  isLoading: boolean;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  selectMessage: (id: string | null) => void;
  acceptMessage: (
    id: string,
    overrides?: Partial<SuggestedTaskData>,
  ) => Promise<void>;
  rejectMessage: (id: string, comment?: string) => Promise<void>;
  dismissMessage: (id: string) => Promise<void>;
  refetchMessages: () => void;
}

const InboxPanelContext = createContext<InboxPanelContextValue | null>(null);

interface InboxPanelProviderProps {
  projectId: string;
  children: ReactNode;
}

export function InboxPanelProvider({
  projectId,
  children,
}: InboxPanelProviderProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );

  // Query inbox messages
  const messagesQuery = useQuery({
    ...orpc.inbox.getInboxMessages.queryOptions({ input: { projectId } }),
    // Poll for new messages every 5 seconds when panel is open
    refetchInterval: isOpen ? 5000 : false,
  });

  const messages = messagesQuery.data ?? [];
  const isLoading = messagesQuery.isLoading;

  // Separate pending and resolved messages
  const pendingMessages = useMemo(
    () => messages.filter((m) => m.status === "pending"),
    [messages],
  );

  const resolvedMessages = useMemo(
    () => messages.filter((m) => m.status !== "pending"),
    [messages],
  );

  const pendingCount = pendingMessages.length;

  // Find selected message
  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedMessageId),
    [messages, selectedMessageId],
  );

  // Invalidate messages query
  const invalidateMessages = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: orpc.inbox.getInboxMessages.queryOptions({
        input: { projectId },
      }).queryKey,
    });
    // Also invalidate tasks since accept might create one
    queryClient.invalidateQueries({
      queryKey: orpc.task.getTasksByProject.queryOptions({
        input: { projectId },
      }).queryKey,
    });
  }, [queryClient, projectId]);

  // Accept message mutation
  const acceptMutation = useMutation({
    mutationFn: async ({
      messageId,
      taskOverrides,
    }: {
      messageId: string;
      taskOverrides?: Partial<SuggestedTaskData>;
    }) => {
      return client.inbox.acceptInboxMessage({ messageId, taskOverrides });
    },
    onSuccess: () => {
      invalidateMessages();
      setSelectedMessageId(null);
    },
  });

  // Reject message mutation
  const rejectMutation = useMutation({
    mutationFn: async ({
      messageId,
      comment,
    }: {
      messageId: string;
      comment?: string;
    }) => {
      return client.inbox.rejectInboxMessage({ messageId, comment });
    },
    onSuccess: () => {
      invalidateMessages();
      setSelectedMessageId(null);
    },
  });

  // Dismiss message mutation
  const dismissMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return client.inbox.dismissInboxMessage({ messageId });
    },
    onSuccess: () => {
      invalidateMessages();
      setSelectedMessageId(null);
    },
  });

  // Panel actions
  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => {
    setIsOpen(false);
    setSelectedMessageId(null);
  }, []);
  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setSelectedMessageId(null);
    }
  }, [isOpen]);

  // Message actions
  const selectMessage = useCallback((id: string | null) => {
    setSelectedMessageId(id);
  }, []);

  const acceptMessage = useCallback(
    async (id: string, overrides?: Partial<SuggestedTaskData>) => {
      await acceptMutation.mutateAsync({
        messageId: id,
        taskOverrides: overrides,
      });
    },
    [acceptMutation],
  );

  const rejectMessage = useCallback(
    async (id: string, comment?: string) => {
      await rejectMutation.mutateAsync({ messageId: id, comment });
    },
    [rejectMutation],
  );

  const dismissMessage = useCallback(
    async (id: string) => {
      await dismissMutation.mutateAsync(id);
    },
    [dismissMutation],
  );

  const refetchMessages = useCallback(() => {
    messagesQuery.refetch();
  }, [messagesQuery]);

  const value: InboxPanelContextValue = {
    isOpen,
    selectedMessageId,
    selectedMessage,
    messages,
    pendingMessages,
    resolvedMessages,
    pendingCount,
    isLoading,
    openPanel,
    closePanel,
    togglePanel,
    selectMessage,
    acceptMessage,
    rejectMessage,
    dismissMessage,
    refetchMessages,
  };

  return (
    <InboxPanelContext.Provider value={value}>
      {children}
    </InboxPanelContext.Provider>
  );
}

export function useInboxPanel(): InboxPanelContextValue {
  const context = useContext(InboxPanelContext);
  if (!context) {
    throw new Error("useInboxPanel must be used within an InboxPanelProvider");
  }
  return context;
}
