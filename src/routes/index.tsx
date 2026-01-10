"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { ArrowRight, FolderKanban } from "lucide-react";
import { useState } from "react";
import { ChatContainer } from "@/components/chat/chat-container";
import { Button } from "@/components/ui/button";
import { client, orpc } from "@/orpc/client";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const projectsQuery = useQuery(orpc.project.listProjects.queryOptions());

  const messagesQuery = useQuery({
    ...orpc.project.getProjectMessages.queryOptions({
      input: {
        projectId: projectId ?? "",
      },
    }),
    enabled: !!projectId,
  });

  const messages: UIMessage[] = (messagesQuery.data ?? []).map(
    (m) => m.message as UIMessage,
  );

  const projects = projectsQuery.data ?? [];

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      client.chat.sendProjectMessage({ projectId: projectId!, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.project.getProjectMessages.queryOptions({
          input: {
            projectId: projectId!,
          },
        }).queryKey,
      });
    },
  });

  const generateTasksMutation = useMutation(
    orpc.agent.generateInitialTasks.mutationOptions(),
  );

  const handleSendMessage = async (content: string) => {
    setIsLoading(true);
    try {
      if (!projectId) {
        const project = await client.project.createProject({ name: content });
        console.log(project);
        setProjectId(project.id);
        await client.chat.sendProjectMessage({
          projectId: project.id,
          content,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.project.getProjectMessages.queryOptions({
            input: {
              projectId: project.id,
            },
          }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.project.listProjects.queryOptions().queryKey,
        });
      } else {
        await sendMessageMutation.mutateAsync(content);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToKanban = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      await generateTasksMutation.mutateAsync({ projectId: projectId! });
      navigate({ to: "/project/$projectId", params: { projectId } });
    } finally {
      setIsLoading(false);
    }
  };

  const showGoToKanban = messages.length >= 4;
  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">Kanban Agent Demo</h1>
        <p className="text-sm text-muted-foreground">
          Start a conversation to create a new project
        </p>
      </header>

      <div
        className={`flex flex-1 flex-col ${hasMessages ? "" : "items-center justify-center"}`}
      >
        <div
          className={`w-full ${hasMessages ? "flex-1 overflow-hidden" : "max-w-2xl px-4"}`}
        >
          <ChatContainer
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Describe your project..."
          />
        </div>

        {showGoToKanban && (
          <div className="border-t border-border p-4">
            <Button onClick={handleGoToKanban} disabled={isLoading}>
              {isLoading ? "Setting up..." : "Go to Kanban Board"}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        )}
      </div>

      {projects.length > 0 && (
        <div className="border-t border-border p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Your Projects
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/project/$projectId"
                params={{ projectId: project.id }}
                className="group flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-ring hover:bg-accent"
              >
                <FolderKanban className="size-5 text-muted-foreground group-hover:text-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.status}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
