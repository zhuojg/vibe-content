"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FolderKanban } from "lucide-react";
import { ChatInput } from "@/components/chat/chat-input";
import { useInitialChatStore } from "@/lib/stores/initial-chat-store";
import { client, orpc } from "@/orpc/client";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setInitialChat = useInitialChatStore((state) => state.setInitialChat);

  const projectsQuery = useQuery(orpc.project.listProjects.queryOptions());
  const projects = projectsQuery.data ?? [];

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => client.project.createProject({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.project.listProjects.queryOptions().queryKey,
      });
    },
  });

  const handleSubmit = async (content: string) => {
    const newProject = await createProjectMutation.mutateAsync("New Project");
    setInitialChat(newProject.id, content);
    navigate({
      to: "/project/$projectId",
      params: { projectId: newProject.id },
    });
  };

  const handleProjectClick = (project: (typeof projects)[0]) => {
    navigate({
      to: "/project/$projectId",
      params: { projectId: project.id },
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">Vibe Agents</h1>
        <p className="text-sm text-muted-foreground">
          Start a conversation to create a new project
        </p>
      </header>

      <div className="flex flex-1 flex-col items-center px-8">
        <div className="mt-32 w-full max-w-2xl">
          <ChatInput
            onSend={handleSubmit}
            placeholder="Describe your project..."
            isLoading={createProjectMutation.isPending}
          />
        </div>

        {projects.length > 0 && (
          <div className="mt-16 w-full max-w-4xl">
            <h2 className="mb-6 text-lg font-medium">Your Projects</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <button
                  type="button"
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="group flex cursor-pointer items-center gap-3 border border-border p-4 text-left transition-colors hover:border-ring hover:bg-accent"
                >
                  <FolderKanban className="size-5 text-muted-foreground group-hover:text-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.status}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
