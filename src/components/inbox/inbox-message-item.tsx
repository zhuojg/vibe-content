"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  ClipboardList,
  Inbox,
  Lightbulb,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InboxMessage {
  id: string;
  type: "task_suggestion" | "completion_review";
  status: "pending" | "accepted" | "rejected" | "dismissed";
  title: string;
  description?: string | null;
  createdAt: Date;
}

interface InboxMessageItemProps {
  message: InboxMessage;
  isSelected: boolean;
  onClick: () => void;
}

function getTypeIcon(type: InboxMessage["type"]) {
  switch (type) {
    case "task_suggestion":
      return Lightbulb;
    case "completion_review":
      return ClipboardList;
    default:
      return Inbox;
  }
}

function getStatusIcon(status: InboxMessage["status"]) {
  switch (status) {
    case "accepted":
      return CheckCircle;
    case "rejected":
    case "dismissed":
      return XCircle;
    default:
      return null;
  }
}

function getStatusColor(status: InboxMessage["status"]) {
  switch (status) {
    case "accepted":
      return "text-green-500";
    case "rejected":
      return "text-red-500";
    case "dismissed":
      return "text-muted-foreground";
    default:
      return "";
  }
}

export function InboxMessageItem({
  message,
  isSelected,
  onClick,
}: InboxMessageItemProps) {
  const TypeIcon = getTypeIcon(message.type);
  const StatusIcon = getStatusIcon(message.status);
  const isPending = message.status === "pending";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors hover:bg-accent/50",
        isSelected && "bg-accent",
        isPending && "bg-accent/20",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex-shrink-0",
          isPending ? "text-primary" : "text-muted-foreground",
        )}
      >
        <TypeIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              isPending ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {message.title}
          </span>
          {StatusIcon && (
            <StatusIcon
              className={cn(
                "size-3.5 flex-shrink-0",
                getStatusColor(message.status),
              )}
            />
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {message.type === "task_suggestion"
              ? "Task Suggestion"
              : "Review Request"}
          </span>
          <span>·</span>
          <span>
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </button>
  );
}
