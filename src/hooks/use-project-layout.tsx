"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { InboxPanelProvider, useInboxPanel } from "./use-inbox-panel";
import { TaskPanelProvider, useTaskPanel } from "./use-task-panel";

type LeftSidebarTab = "inbox" | "chat";

type ProjectLayoutContextValue = {
  // Left sidebar
  leftSidebarOpen: boolean;
  activeLeftTab: LeftSidebarTab;
  toggleLeftSidebar: () => void;
  openLeftSidebar: (tab?: LeftSidebarTab) => void;
  closeLeftSidebar: () => void;
  setActiveLeftTab: (tab: LeftSidebarTab) => void;
  inboxPendingCount: number;

  // Task panel
  taskPanelOpen: boolean;
  selectTask: (taskId: string | null) => void;
  closeTaskPanel: () => void;

  // Derived state
  hasOpenRightPanel: boolean;
};

const ProjectLayoutContext = createContext<ProjectLayoutContextValue | null>(
  null,
);

type ProjectLayoutProviderInnerProps = {
  children: ReactNode;
};

function ProjectLayoutProviderInner({
  children,
}: ProjectLayoutProviderInnerProps) {
  const inbox = useInboxPanel();
  const taskPanel = useTaskPanel();

  // Left sidebar state
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftSidebarTab>("inbox");

  // Derived state
  const taskPanelOpen = taskPanel.selectedTaskId !== null;
  const hasOpenRightPanel = taskPanelOpen;

  // Left sidebar actions
  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarOpen((prev) => !prev);
  }, []);

  const openLeftSidebar = useCallback((tab?: LeftSidebarTab) => {
    setLeftSidebarOpen(true);
    if (tab) {
      setActiveLeftTab(tab);
    }
  }, []);

  const closeLeftSidebar = useCallback(() => {
    setLeftSidebarOpen(false);
  }, []);

  // Task panel actions
  const selectTask = useCallback(
    (taskId: string | null) => {
      taskPanel.selectTask(taskId);
    },
    [taskPanel],
  );

  const closeTaskPanel = useCallback(() => {
    taskPanel.closePanel();
  }, [taskPanel]);

  const value: ProjectLayoutContextValue = useMemo(
    () => ({
      leftSidebarOpen,
      activeLeftTab,
      toggleLeftSidebar,
      openLeftSidebar,
      closeLeftSidebar,
      setActiveLeftTab,
      inboxPendingCount: inbox.pendingCount,
      taskPanelOpen,
      selectTask,
      closeTaskPanel,
      hasOpenRightPanel,
    }),
    [
      leftSidebarOpen,
      activeLeftTab,
      toggleLeftSidebar,
      openLeftSidebar,
      closeLeftSidebar,
      inbox.pendingCount,
      taskPanelOpen,
      selectTask,
      closeTaskPanel,
      hasOpenRightPanel,
    ],
  );

  return (
    <ProjectLayoutContext.Provider value={value}>
      {children}
    </ProjectLayoutContext.Provider>
  );
}

type ProjectLayoutProviderProps = {
  projectId: string;
  children: ReactNode;
};

export function ProjectLayoutProvider({
  projectId,
  children,
}: ProjectLayoutProviderProps) {
  return (
    <InboxPanelProvider projectId={projectId}>
      <TaskPanelProvider projectId={projectId}>
        <ProjectLayoutProviderInner>{children}</ProjectLayoutProviderInner>
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
