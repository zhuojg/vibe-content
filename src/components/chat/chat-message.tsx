"use client";

import type { ToolUIPart, UIMessage } from "ai";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { cn } from "@/lib/utils";
import { ChatToolSubagent } from "./chat-tool-subagent";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] text-sm",
          isUser
            ? "rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            : "w-full text-foreground",
        )}
      >
        {message.parts.map((part, index) => (
          <MessagePart
            key={`${message.id}-${index}`}
            part={part}
            message={message}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Extract tool name from tool part type (e.g., "tool-subagent" -> "subagent")
 */
function getToolName(part: ToolUIPart): string {
  // Try to get from title first
  if ("title" in part && part.title) {
    return part.title;
  }
  // Fall back to extracting from type
  return part.type.replace(/^tool-/, "");
}

function MessagePart({
  part,
  message,
}: {
  part: UIMessage["parts"][number];
  message: UIMessage;
}) {
  if (part.type === "text") {
    return (
      <MessageResponse mode="static" className="whitespace-pre-wrap">
        {part.text}
      </MessageResponse>
    );
  }

  // Handle tool parts
  if (part.type.startsWith("tool-")) {
    const toolPart = part as ToolUIPart;
    const toolName = getToolName(toolPart);

    // Handle subagent tool specially
    if (toolName === "subagent") {
      return <ChatToolSubagent part={toolPart} parentMessage={message} />;
    }

    // Handle other tool types with Tool component
    return (
      <Tool defaultOpen={false}>
        <ToolHeader
          type={toolPart.type}
          state={toolPart.state}
          title={toolName}
        />
        <ToolContent>
          <ToolInput input={toolPart.input} />
          <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
        </ToolContent>
      </Tool>
    );
  }

  // Skip data parts (they're processed by their corresponding tool parts)
  if (part.type.startsWith("data-")) {
    return null;
  }

  return null;
}
