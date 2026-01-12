"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompletionReviewCard } from "./completion-review-card";
import { TaskSuggestionCard } from "./task-suggestion-card";

interface SuggestedTaskData {
  title: string;
  description?: string;
  assignedAgent?: string;
}

interface ReviewData {
  output: string;
  agentType: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface InboxMessage {
  id: string;
  type: "task_suggestion" | "completion_review";
  status: "pending" | "accepted" | "rejected" | "dismissed";
  title: string;
  description?: string | null;
  suggestedTaskData?: SuggestedTaskData | null;
  reviewData?: ReviewData | null;
  task?: Task | null;
  createdAt: Date;
}

interface InboxMessageDetailProps {
  message: InboxMessage;
  onBack: () => void;
  onAccept: (overrides?: Partial<SuggestedTaskData>) => Promise<void>;
  onReject: (comment?: string) => Promise<void>;
  onDismiss: () => Promise<void>;
  onViewTask?: (taskId: string) => void;
}

export function InboxMessageDetail({
  message,
  onBack,
  onAccept,
  onReject,
  onDismiss,
  onViewTask,
}: InboxMessageDetailProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Back button */}
      <div className="flex-shrink-0 border-b border-border p-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-hidden">
        {message.type === "task_suggestion" ? (
          <TaskSuggestionCard
            title={message.title}
            description={message.description}
            suggestedTaskData={message.suggestedTaskData}
            createdAt={message.createdAt}
            status={message.status}
            onAccept={onAccept}
            onDismiss={onDismiss}
          />
        ) : (
          <CompletionReviewCard
            title={message.title}
            description={message.description}
            reviewData={message.reviewData}
            task={message.task}
            createdAt={message.createdAt}
            status={message.status}
            onApprove={() => onAccept()}
            onReject={onReject}
            onViewTask={onViewTask}
          />
        )}
      </div>
    </div>
  );
}
