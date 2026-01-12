"use client";

import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { useState } from "react";
import { InboxMessageItem } from "./inbox-message-item";

interface InboxMessage {
  id: string;
  type: "task_suggestion" | "completion_review";
  status: "pending" | "accepted" | "rejected" | "dismissed";
  title: string;
  description?: string | null;
  createdAt: Date;
}

interface InboxMessageListProps {
  pendingMessages: InboxMessage[];
  resolvedMessages: InboxMessage[];
  selectedMessageId: string | null;
  onSelectMessage: (id: string) => void;
}

export function InboxMessageList({
  pendingMessages,
  resolvedMessages,
  selectedMessageId,
  onSelectMessage,
}: InboxMessageListProps) {
  const [showResolved, setShowResolved] = useState(false);

  const hasMessages = pendingMessages.length > 0 || resolvedMessages.length > 0;

  if (!hasMessages) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <Inbox className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-sm font-medium text-muted-foreground">
          No messages
        </h3>
        <p className="mt-1 text-xs text-muted-foreground/80">
          When agents suggest tasks or request reviews, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Pending messages */}
      {pendingMessages.length > 0 && (
        <div>
          <div className="sticky top-0 bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
            Pending ({pendingMessages.length})
          </div>
          {pendingMessages.map((message) => (
            <InboxMessageItem
              key={message.id}
              message={message}
              isSelected={selectedMessageId === message.id}
              onClick={() => onSelectMessage(message.id)}
            />
          ))}
        </div>
      )}

      {/* Resolved messages */}
      {resolvedMessages.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowResolved(!showResolved)}
            className="sticky top-0 flex w-full items-center gap-1 bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/50"
          >
            {showResolved ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            Resolved ({resolvedMessages.length})
          </button>
          {showResolved &&
            resolvedMessages.map((message) => (
              <InboxMessageItem
                key={message.id}
                message={message}
                isSelected={selectedMessageId === message.id}
                onClick={() => onSelectMessage(message.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
