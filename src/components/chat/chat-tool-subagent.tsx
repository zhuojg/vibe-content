"use client";

import type { ToolUIPart, UIMessage } from "ai";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";
import { useToolUIMessageStore } from "@/lib/data-stream-handler";

type SubagentInput = {
  agent?: string;
  requirement?: string;
};

function SubagentContent({
  agentName,
  requirement,
  message,
  isStreaming = false,
}: {
  agentName?: string;
  requirement?: string;
  message: UIMessage | undefined;
  isStreaming?: boolean;
}) {
  return (
    <Task className="w-full" defaultOpen={false}>
      <TaskTrigger title={agentName ?? "Subagent"} />
      <TaskContent>
        {requirement && (
          <TaskItem className="text-muted-foreground text-sm">
            {requirement}
          </TaskItem>
        )}

        {message?.parts.map((part, idx) =>
          part.type === "text" ? (
            <MessageResponse
              key={`${message.id}-${idx}`}
              mode={isStreaming ? "streaming" : "static"}
              className="text-muted-foreground text-sm"
            >
              {part.text}
            </MessageResponse>
          ) : null,
        )}
      </TaskContent>
    </Task>
  );
}

export function ChatToolSubagent({
  part,
  parentMessage,
}: {
  part: ToolUIPart;
  parentMessage: UIMessage;
}) {
  // Always call hook unconditionally
  const { messages } = useToolUIMessageStore();

  const { toolCallId, state } = part;
  const isStreaming = state !== "output-available";

  // Cast input to expected shape
  const input = part.input as SubagentInput | undefined;

  // Find embedded data-sub-agent-message part in parent message
  let embeddedMessage: UIMessage | undefined;
  for (const p of parentMessage.parts) {
    if (
      p.type === "data-sub-agent-message" &&
      // @ts-expect-error - custom data type
      p.data?.subAgentCallId === toolCallId
    ) {
      // @ts-expect-error - custom data type
      embeddedMessage = p.data.message;
      break;
    }
  }

  // During streaming, prefer zustand store; after completion, prefer embedded message
  const subagentMessage = embeddedMessage ?? messages[toolCallId];

  // If we have a message from streaming store but not yet completed
  if (!embeddedMessage && toolCallId in messages) {
    return (
      <SubagentContent
        agentName={input?.agent}
        requirement={input?.requirement}
        message={messages[toolCallId]}
        isStreaming
      />
    );
  }

  // If we have the final embedded message
  if (subagentMessage) {
    return (
      <SubagentContent
        agentName={input?.agent}
        requirement={input?.requirement}
        message={subagentMessage}
        isStreaming={isStreaming}
      />
    );
  }

  return null;
}
