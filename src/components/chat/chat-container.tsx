"use client";

import type { UIMessage } from "ai";
import { MessageSquare } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatInput } from "./chat-input";

interface ChatContainerProps {
  messages: UIMessage[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder,
}: ChatContainerProps) {
  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="gap-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="size-12" />}
              title="Start a conversation"
              description="Type a message below to begin chatting"
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) => (
                    <MessagePart key={`${message.id}-${index}`} part={part} />
                  ))}
                </MessageContent>
              </Message>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted px-4 py-2 text-sm text-muted-foreground rounded-lg">
                Thinking...
              </div>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <ChatInput
        onSend={onSendMessage}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") {
    return <MessageResponse>{part.text}</MessageResponse>;
  }

  // For tool parts, show a simple indicator
  if (part.type.startsWith("tool-")) {
    return (
      <div className="my-1 rounded border border-border bg-background/50 px-2 py-1 font-mono text-xs text-muted-foreground">
        Tool: {"toolName" in part ? String(part.toolName) : "unknown"}
      </div>
    );
  }

  // Only render text parts for now
  return null;
}
