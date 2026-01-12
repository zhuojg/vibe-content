"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, Lightbulb, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SuggestedTaskData {
  title: string;
  description?: string;
  assignedAgent?: string;
}

interface TaskSuggestionCardProps {
  title: string;
  description?: string | null;
  suggestedTaskData?: SuggestedTaskData | null;
  createdAt: Date;
  status: "pending" | "accepted" | "rejected" | "dismissed";
  onAccept: (overrides?: Partial<SuggestedTaskData>) => Promise<void>;
  onDismiss: () => Promise<void>;
}

export function TaskSuggestionCard({
  title,
  description,
  suggestedTaskData,
  createdAt,
  status,
  onAccept,
  onDismiss,
}: TaskSuggestionCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const isPending = status === "pending";

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onDismiss();
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2 text-primary">
          <Lightbulb className="size-4" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Task Suggestion
          </span>
        </div>
        <h3 className="mt-2 text-lg font-medium">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {description && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Message
            </h4>
            <p className="mt-1 text-sm">{description}</p>
          </div>
        )}

        {suggestedTaskData && (
          <div className="rounded-md border border-border bg-accent/30 p-3">
            <h4 className="text-sm font-medium">Suggested Task</h4>
            <div className="mt-2 space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Title:</span>
                <p className="text-sm">{suggestedTaskData.title}</p>
              </div>
              {suggestedTaskData.description && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Description:
                  </span>
                  <p className="text-sm">{suggestedTaskData.description}</p>
                </div>
              )}
              {suggestedTaskData.assignedAgent && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Assigned Agent:
                  </span>
                  <p className="text-sm capitalize">
                    {suggestedTaskData.assignedAgent}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!isPending && (
          <div className="mt-4 rounded-md bg-muted/50 p-3 text-center text-sm text-muted-foreground">
            This suggestion has been{" "}
            {status === "accepted" ? "accepted" : "dismissed"}.
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2 border-t border-border p-4">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isDismissing || isAccepting}
            className="flex-1"
          >
            {isDismissing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <X className="mr-2 size-4" />
            )}
            Dismiss
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isDismissing}
            className="flex-1"
          >
            {isAccepting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Check className="mr-2 size-4" />
            )}
            Accept
          </Button>
        </div>
      )}
    </div>
  );
}
