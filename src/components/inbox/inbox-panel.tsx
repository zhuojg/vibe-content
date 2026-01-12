"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInboxPanel } from "@/hooks/use-inbox-panel";
import { useTaskPanel } from "@/hooks/use-task-panel";
import { InboxMessageDetail } from "./inbox-message-detail";
import { InboxMessageList } from "./inbox-message-list";

type InboxPanelProps = {
  onClose?: () => void;
  hideHeader?: boolean;
};

export function InboxPanel({ onClose, hideHeader }: InboxPanelProps) {
  const {
    selectedMessage,
    selectedMessageId,
    pendingMessages,
    resolvedMessages,
    isLoading,
    selectMessage,
    acceptMessage,
    rejectMessage,
    dismissMessage,
    closePanel,
  } = useInboxPanel();

  const { selectTask } = useTaskPanel();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closePanel();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-background">
        {!hideHeader && (
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-medium">Inbox</h2>
            <Button size="icon-sm" variant="ghost" onClick={handleClose}>
              <X className="size-4" />
            </Button>
          </div>
        )}
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Show detail view if a message is selected
  if (selectedMessage) {
    return (
      <div className="flex h-full flex-col bg-background">
        <InboxMessageDetail
          message={selectedMessage}
          onBack={() => selectMessage(null)}
          onAccept={(overrides) => acceptMessage(selectedMessage.id, overrides)}
          onReject={(comment) => rejectMessage(selectedMessage.id, comment)}
          onDismiss={() => dismissMessage(selectedMessage.id)}
          onViewTask={selectTask}
        />
      </div>
    );
  }

  // Show list view
  return (
    <div className="flex h-full flex-col bg-background">
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-medium">Inbox</h2>
          <Button size="icon-sm" variant="ghost" onClick={handleClose}>
            <X className="size-4" />
          </Button>
        </div>
      )}
      <InboxMessageList
        pendingMessages={pendingMessages}
        resolvedMessages={resolvedMessages}
        selectedMessageId={selectedMessageId}
        onSelectMessage={selectMessage}
      />
    </div>
  );
}
