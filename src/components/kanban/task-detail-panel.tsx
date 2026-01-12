"use client";

import { Loader2, Play, Square, User, X } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ChatContainer } from "@/components/chat/chat-container";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type AgentType, useTaskPanel } from "@/hooks/use-task-panel";
import { StatusBadge } from "./status-selector";

const AGENT_OPTIONS = [
  "developer",
  "designer",
  "researcher",
  "writer",
  "analyst",
];

interface TodoFormValues {
  agentType: AgentType;
  description: string;
}

// TODO Status Content - Agent selection and description
function TodoContent() {
  const { selectedTask, isLoading, startTask } = useTaskPanel();

  const form = useForm<TodoFormValues>({
    defaultValues: {
      agentType: "developer",
      description: selectedTask?.description ?? "",
    },
  });

  const handleSubmit = (data: TodoFormValues) => {
    startTask(data.agentType, data.description);
  };

  return (
    <div className="flex flex-1 flex-col p-4">
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-1 flex-col gap-4"
      >
        <FieldGroup>
          <Controller
            name="agentType"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="agentType">Select Agent</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    if (val) field.onChange(val);
                  }}
                >
                  <SelectTrigger id="agentType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="flex-1">
                <FieldLabel htmlFor="description">Task Description</FieldLabel>
                <textarea
                  {...field}
                  id="description"
                  placeholder="Describe what needs to be done..."
                  className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <Button
          type="submit"
          variant="outline"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="mr-2 size-4" />
              Start Task
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

// Chat content for all non-todo statuses
function ChatContent() {
  const {
    selectedTask,
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    abortStream,
  } = useTaskPanel();

  const agentLabel =
    AGENT_OPTIONS.find((a) => a === selectedTask?.assignedAgent) ?? "Agent";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{agentLabel}</span>
          {isStreaming && (
            <span className="text-xs text-muted-foreground">
              (streaming...)
            </span>
          )}
        </div>
        {isStreaming && (
          <Button
            size="sm"
            variant="outline"
            onClick={abortStream}
            className="text-destructive hover:bg-destructive/10"
          >
            <Square className="mr-1 size-3" />
            Stop
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatContainer
          messages={messages}
          onSendMessage={sendMessage}
          isLoading={isLoading || isStreaming}
          placeholder="Chat with agent..."
        />
      </div>
    </div>
  );
}

export function TaskDetailPanel() {
  const { selectedTask, closePanel } = useTaskPanel();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closePanel]);

  // Don't render if no task selected
  if (!selectedTask) return null;

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-background">
      <div className="flex items-start justify-between border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-medium">
              {selectedTask.title}
            </h2>
            <StatusBadge status={selectedTask.status} />
          </div>
          {selectedTask.description && selectedTask.status !== "todo" && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {selectedTask.description}
            </p>
          )}
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={closePanel}
          className="ml-2 flex-shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>
      {selectedTask.status === "todo" ? <TodoContent /> : <ChatContent />}
    </div>
  );
}

// Re-export AgentType from the hook for backwards compatibility
export type { AgentType } from "@/hooks/use-task-panel";
