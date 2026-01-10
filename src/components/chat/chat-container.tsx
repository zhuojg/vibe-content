"use client";

import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message count change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-2 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
      </div>
      <ChatInput
        onSend={onSendMessage}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}
