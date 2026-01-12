import {
  type InferUIMessageChunk,
  readUIMessageStream,
  type UIMessage,
} from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatStreamStatus = "idle" | "connecting" | "streaming" | "complete";

interface UseChatStreamOptions {
  chatId: string | null;
  enabled: boolean;
  onComplete?: () => void;
}

interface UseChatStreamReturn {
  messages: UIMessage[];
  status: ChatStreamStatus;
  isStreaming: boolean;
  abort: () => Promise<void>;
}

/**
 * Parse SSE stream into UIMessageChunk stream
 */
function parseSSEToChunks(
  responseBody: ReadableStream<Uint8Array>,
): ReadableStream<InferUIMessageChunk<UIMessage>> {
  const reader = responseBody.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              controller.enqueue(parsed);
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

/**
 * Hook for streaming chat messages by chatId.
 * Uses the unified /api/agent/{chatId}/stream endpoint.
 */
export function useChatStream({
  chatId,
  enabled,
  onComplete,
}: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ChatStreamStatus>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasConnectedRef = useRef(false);
  const currentChatIdRef = useRef<string | null>(null);

  // Connect to stream when chatId is available and enabled
  useEffect(() => {
    if (!enabled || !chatId) {
      hasConnectedRef.current = false;
      return;
    }

    // Prevent reconnecting if we've already connected for this chatId
    if (hasConnectedRef.current && currentChatIdRef.current === chatId) return;
    hasConnectedRef.current = true;
    currentChatIdRef.current = chatId;

    const connect = async () => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setStatus("connecting");
      setMessages([]);

      try {
        const response = await fetch(`/api/agent/${chatId}/stream`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          if (response.status === 204) {
            // No active stream
            setStatus("complete");
            onComplete?.();
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        setStatus("streaming");

        // Parse SSE stream and then read as UI messages
        const chunkStream = parseSSEToChunks(response.body);

        for await (const message of readUIMessageStream({
          stream: chunkStream,
        })) {
          if (abortController.signal.aborted) break;
          setMessages([message]);
        }

        setStatus("complete");
        onComplete?.();
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // User aborted
          setStatus("idle");
        } else {
          console.error("Stream error:", error);
          setStatus("complete");
        }
      } finally {
        abortControllerRef.current = null;
      }
    };

    connect();

    return () => {
      // Cleanup on unmount or dependency change
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, chatId, onComplete]);

  // Reset state when chatId changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset when chatId changes
  useEffect(() => {
    setMessages([]);
    setStatus("idle");
    hasConnectedRef.current = false;
    currentChatIdRef.current = null;
  }, [chatId]);

  const abort = useCallback(async () => {
    if (!chatId) return;

    // Abort local stream reader
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Send abort signal to server
    try {
      await fetch(`/api/agent/${chatId}/stream`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to abort stream:", error);
    }

    setStatus("idle");
    hasConnectedRef.current = false;
  }, [chatId]);

  return {
    messages,
    status,
    isStreaming: status === "streaming" || status === "connecting",
    abort,
  };
}
