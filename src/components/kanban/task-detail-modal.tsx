"use client";

import type { UIMessage } from "ai";
import {
  Check,
  CheckCircle,
  Loader2,
  Play,
  RotateCcw,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { StatusBadge, type TaskStatus } from "./status-selector";

export type AgentType = string;

const AGENT_OPTIONS = [
  "developer",
  "designer",
  "researcher",
  "writer",
  "analyst",
];

interface TaskDetailModalProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    assignedAgent?: AgentType | null;
    output?: string | null;
    reviewComment?: string | null;
  };
  messages: UIMessage[];
  isLoading?: boolean;
  onClose: () => void;
  onSendMessage: (content: string) => void;
  onAssignAndStart?: (agentType: AgentType, description?: string) => void;
  onApprove?: () => void;
  onReject?: (comment: string) => void;
}

interface TodoFormValues {
  agentType: AgentType;
  description: string;
}

interface RejectFormValues {
  comment: string;
}

// TODO Status Content - Agent selection and description
function TodoContent({
  task,
  isLoading,
  onAssignAndStart,
}: {
  task: TaskDetailModalProps["task"];
  isLoading: boolean;
  onAssignAndStart?: (agentType: AgentType, description?: string) => void;
}) {
  const form = useForm<TodoFormValues>({
    defaultValues: {
      agentType: "developer",
      description: task.description ?? "",
    },
  });

  const handleSubmit = (data: TodoFormValues) => {
    console.log(data);
    onAssignAndStart?.(data.agentType, data.description);
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

// PROCESSING Status Content - Progress steps and chat
function ProcessingContent({
  task,
  messages,
  isLoading,
  onSendMessage,
}: {
  task: TaskDetailModalProps["task"];
  messages: UIMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
}) {
  const agentLabel =
    AGENT_OPTIONS.find((a) => a === task.assignedAgent) ?? "Agent";

  const mockSteps = [
    { label: "Analyzing requirements", done: true },
    { label: "Planning implementation", done: true },
    { label: "Executing task", done: false },
    { label: "Generating output", done: false },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{agentLabel}</span>
          <span className="text-xs text-muted-foreground">is working...</span>
        </div>

        {task.reviewComment && (
          <div className="mb-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-xs font-medium text-amber-600">
              Revision requested:
            </p>
            <p className="text-sm text-amber-700">{task.reviewComment}</p>
          </div>
        )}

        <div className="space-y-2">
          {mockSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-2 text-sm">
              {step.done ? (
                <CheckCircle className="size-4 text-green-500" />
              ) : (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              <span
                className={
                  step.done ? "text-foreground" : "text-muted-foreground"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatContainer
          messages={messages}
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          placeholder="Chat with execution agent..."
        />
      </div>
    </div>
  );
}

// IN_REVIEW Status Content - Output display and approve/reject
function InReviewContent({
  task,
  isLoading,
  onApprove,
  onReject,
}: {
  task: TaskDetailModalProps["task"];
  isLoading: boolean;
  onApprove?: () => void;
  onReject?: (comment: string) => void;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const rejectForm = useForm<RejectFormValues>({
    defaultValues: { comment: "" },
  });

  const handleRejectSubmit = (data: RejectFormValues) => {
    onReject?.(data.comment);
    setShowRejectForm(false);
  };

  const agentLabel =
    AGENT_OPTIONS.find((a) => a === task.assignedAgent) ?? "Agent";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <User className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{agentLabel}</span>
        <span className="text-xs text-muted-foreground">
          completed the task
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-medium">Agent Output</h3>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">
            {task.output ?? "No output available."}
          </div>
        </div>
      </div>

      <div className="border-t border-border p-4">
        {showRejectForm ? (
          <form
            onSubmit={rejectForm.handleSubmit(handleRejectSubmit)}
            className="space-y-3"
          >
            <Controller
              name="comment"
              control={rejectForm.control}
              rules={{ required: true }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <textarea
                    {...field}
                    placeholder="Describe what needs to be changed..."
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none"
                    rows={3}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowRejectForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isLoading || !rejectForm.watch("comment")}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 size-4" />
                )}
                Submit Feedback
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectForm(true)}
              disabled={isLoading}
              className="flex-1"
            >
              <RotateCcw className="mr-2 size-4" />
              Request Changes
            </Button>
            <Button onClick={onApprove} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-2 size-4" />
              )}
              Approve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// DONE/CANCEL Status Content - Final output display
function CompletedContent({ task }: { task: TaskDetailModalProps["task"] }) {
  const agentLabel =
    AGENT_OPTIONS.find((a) => a === task.assignedAgent) ?? "Agent";

  const isDone = task.status === "done";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border p-4">
        {isDone ? (
          <CheckCircle className="size-4 text-green-500" />
        ) : (
          <XCircle className="size-4 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {isDone ? "Task Completed" : "Task Cancelled"}
        </span>
        {task.assignedAgent && (
          <span className="text-xs text-muted-foreground">by {agentLabel}</span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {task.output ? (
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-medium">Final Output</h3>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">
              {task.output}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No output available.</p>
        )}
      </div>
    </div>
  );
}

export function TaskDetailModal({
  task,
  messages,
  isLoading = false,
  onClose,
  onSendMessage,
  onAssignAndStart,
  onApprove,
  onReject,
}: TaskDetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const renderContent = () => {
    switch (task.status) {
      case "todo":
        return (
          <TodoContent
            task={task}
            isLoading={isLoading}
            onAssignAndStart={onAssignAndStart}
          />
        );
      case "processing":
        return (
          <ProcessingContent
            task={task}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={onSendMessage}
          />
        );
      case "in_review":
        return (
          <InReviewContent
            task={task}
            isLoading={isLoading}
            onApprove={onApprove}
            onReject={onReject}
          />
        );
      case "done":
      case "cancel":
        return <CompletedContent task={task} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* biome-ignore lint/a11y/useSemanticElements: backdrop overlay */}
      <div
        role="button"
        tabIndex={0}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <div className="relative z-10 flex h-[80vh] w-full max-w-2xl flex-col border border-border bg-background">
        <div className="flex items-start justify-between border-b border-border p-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">{task.title}</h2>
              <StatusBadge status={task.status} />
            </div>
            {task.description && task.status !== "todo" && (
              <p className="mt-1 text-sm text-muted-foreground">
                {task.description}
              </p>
            )}
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
