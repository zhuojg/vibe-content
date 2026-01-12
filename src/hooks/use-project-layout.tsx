"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { InboxPanelProvider, useInboxPanel } from "./use-inbox-panel";
import { TaskPanelProvider, useTaskPanel } from "./use-task-panel";

interface ProjectLayoutContextValue {
  // Panel visibility
  inboxOpen: boolean;
  taskPanelOpen: boolean;
  projectChatOpen: boolean;

  // Derived state
  hasOpenRightPanel: boolean;

  // Inbox actions
  toggleInbox: () => void;
  openInbox: () => void;
  closeInbox: () => void;
  inboxPendingCount: number;

  // Task panel actions (proxied from TaskPanel context)
  selectTask: (taskId: string | null) => void;
  closeTaskPanel: () => void;

  // Project chat actions
  openProjectChat: () => void;
  closeProjectChat: () => void;
  setProjectChatOpen: (open: boolean) => void;
}

const ProjectLayoutContext = createContext<ProjectLayoutContextValue | null>(
  null,
);

interface ProjectLayoutProviderInnerProps {
  children: ReactNode;
  projectChatOpen: boolean;
  setProjectChatOpen: (open: boolean) => void;
}

function ProjectLayoutProviderInner({
  children,
  projectChatOpen,
  setProjectChatOpen,
}: ProjectLayoutProviderInnerProps) {
  const inbox = useInboxPanel();
  const taskPanel = useTaskPanel();

  // Derived state
  const taskPanelOpen = taskPanel.selectedTaskId !== null;
  const hasOpenRightPanel = taskPanelOpen || projectChatOpen;

  // Inbox actions with mutual exclusion
  const toggleInbox = useCallback(() => {
    inbox.togglePanel();
  }, [inbox]);

  const openInbox = useCallback(() => {
    inbox.openPanel();
  }, [inbox]);

  const closeInbox = useCallback(() => {
    inbox.closePanel();
  }, [inbox]);

  // Task panel actions with mutual exclusion
  const selectTask = useCallback(
    (taskId: string | null) => {
      if (taskId !== null) {
        // Close project chat when selecting a task
        setProjectChatOpen(false);
      }
      taskPanel.selectTask(taskId);
    },
    [taskPanel, setProjectChatOpen],
  );

  const closeTaskPanel = useCallback(() => {
    taskPanel.closePanel();
  }, [taskPanel]);

  // Project chat actions with mutual exclusion
  const openProjectChat = useCallback(() => {
    // Close task panel when opening project chat
    taskPanel.selectTask(null);
    setProjectChatOpen(true);
  }, [taskPanel, setProjectChatOpen]);

  const closeProjectChat = useCallback(() => {
    setProjectChatOpen(false);
  }, [setProjectChatOpen]);

  const value: ProjectLayoutContextValue = useMemo(
    () => ({
      inboxOpen: inbox.isOpen,
      taskPanelOpen,
      projectChatOpen,
      hasOpenRightPanel,
      toggleInbox,
      openInbox,
      closeInbox,
      inboxPendingCount: inbox.pendingCount,
      selectTask,
      closeTaskPanel,
      openProjectChat,
      closeProjectChat,
      setProjectChatOpen,
    }),
    [
      inbox.isOpen,
      inbox.pendingCount,
      taskPanelOpen,
      projectChatOpen,
      hasOpenRightPanel,
      toggleInbox,
      openInbox,
      closeInbox,
      selectTask,
      closeTaskPanel,
      openProjectChat,
      closeProjectChat,
      setProjectChatOpen,
    ],
  );

  return (
    <ProjectLayoutContext.Provider value={value}>
      {children}
    </ProjectLayoutContext.Provider>
  );
}

interface ProjectLayoutProviderProps {
  projectId: string;
  children: ReactNode;
  projectChatOpen: boolean;
  setProjectChatOpen: (open: boolean) => void;
}

export function ProjectLayoutProvider({
  projectId,
  children,
  projectChatOpen,
  setProjectChatOpen,
}: ProjectLayoutProviderProps) {
  return (
    <InboxPanelProvider projectId={projectId}>
      <TaskPanelProvider projectId={projectId}>
        <ProjectLayoutProviderInner
          projectChatOpen={projectChatOpen}
          setProjectChatOpen={setProjectChatOpen}
        >
          {children}
        </ProjectLayoutProviderInner>
      </TaskPanelProvider>
    </InboxPanelProvider>
  );
}

export function useProjectLayout(): ProjectLayoutContextValue {
  const context = useContext(ProjectLayoutContext);
  if (!context) {
    throw new Error(
      "useProjectLayout must be used within a ProjectLayoutProvider",
    );
  }
  return context;
}
