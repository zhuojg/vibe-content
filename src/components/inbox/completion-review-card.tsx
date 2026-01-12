"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, ClipboardList, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ReviewData {
  output: string;
  agentType: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface CompletionReviewCardProps {
  title: string;
  description?: string | null;
  reviewData?: ReviewData | null;
  task?: Task | null;
  createdAt: Date;
  status: "pending" | "accepted" | "rejected" | "dismissed";
  onApprove: () => Promise<void>;
  onReject: (comment?: string) => Promise<void>;
}

export function CompletionReviewCard({
  title,
  description,
  reviewData,
  task,
  createdAt,
  status,
  onApprove,
  onReject,
}: CompletionReviewCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const isPending = status === "pending";

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(rejectComment || undefined);
    } finally {
      setIsRejecting(false);
      setShowRejectInput(false);
      setRejectComment("");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2 text-blue-500">
          <ClipboardList className="size-4" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Completion Review
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

        {task && (
          <div className="mb-4 rounded-md border border-border bg-accent/30 p-3">
            <h4 className="text-sm font-medium">Related Task</h4>
            <p className="mt-1 text-sm">{task.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground capitalize">
              Status: {task.status.replace("_", " ")}
            </p>
          </div>
        )}

        {reviewData && (
          <div className="rounded-md border border-border bg-accent/30 p-3">
            <h4 className="text-sm font-medium">Work Summary</h4>
            <p className="mt-1 text-xs text-muted-foreground capitalize">
              Completed by: {reviewData.agentType}
            </p>
            <div className="mt-2 whitespace-pre-wrap text-sm">
              {reviewData.output}
            </div>
          </div>
        )}

        {!isPending && (
          <div className="mt-4 rounded-md bg-muted/50 p-3 text-center text-sm text-muted-foreground">
            This review has been{" "}
            {status === "accepted"
              ? "approved"
              : status === "rejected"
                ? "rejected"
                : "dismissed"}
            .
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && !showRejectInput && (
        <div className="flex gap-2 border-t border-border p-4">
          <Button
            variant="outline"
            onClick={() => setShowRejectInput(true)}
            disabled={isApproving}
            className="flex-1"
          >
            <X className="mr-2 size-4" />
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="flex-1"
          >
            {isApproving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Check className="mr-2 size-4" />
            )}
            Approve
          </Button>
        </div>
      )}

      {isPending && showRejectInput && (
        <div className="border-t border-border p-4">
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Add feedback for the agent (optional)..."
            className="mb-3 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectInput(false);
                setRejectComment("");
              }}
              disabled={isRejecting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
              className="flex-1"
            >
              {isRejecting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <X className="mr-2 size-4" />
              )}
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
