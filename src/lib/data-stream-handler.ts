import {
  type InferUIMessageChunk,
  readUIMessageStream,
  type UIMessage,
} from "ai";
import { useEffect, useRef } from "react";
import { create } from "zustand";

/**
 * Merge message chunks into UI message, useful for sub agent streaming on client side.
 * Adapted from sheji project's implementation.
 */
async function mergeUIMessageChunks<UI_MESSAGE extends UIMessage>(
  chunks: Array<InferUIMessageChunk<UI_MESSAGE>>,
): Promise<UI_MESSAGE | undefined> {
  const fakeStream = new ReadableStream<InferUIMessageChunk<UI_MESSAGE>>({
    start(controller) {
      for (const item of chunks) {
        controller.enqueue(item);
      }
      controller.close();
    },
  });

  let message: UI_MESSAGE | undefined;
  for await (const uiMessage of readUIMessageStream<UI_MESSAGE>({
    stream: fakeStream,
  })) {
    message = uiMessage;
  }

  return message;
}

type ToolUIMessageStoreProps = {
  messages: Record<string, UIMessage>;
  chunks: Record<string, Array<InferUIMessageChunk<UIMessage>>>;
  appendChunk: (
    toolCallId: string,
    chunk: InferUIMessageChunk<UIMessage>,
  ) => Promise<void>;
  setMessage: (toolCallId: string, message: UIMessage) => void;
  clearMessages: () => void;
};

export const useToolUIMessageStore = create<ToolUIMessageStoreProps>(
  (set, get) => ({
    messages: {},
    chunks: {},
    appendChunk: async (toolCallId, chunk) => {
      const currentChunks = { ...get().chunks };
      if (!(toolCallId in currentChunks)) {
        currentChunks[toolCallId] = [];
      }
      currentChunks[toolCallId] = [...currentChunks[toolCallId], chunk];

      const messages = { ...get().messages };
      const message = await mergeUIMessageChunks(currentChunks[toolCallId]);
      if (message) {
        messages[toolCallId] = message;
      }

      set({ chunks: currentChunks, messages });
    },
    setMessage: (toolCallId, message) => {
      set((state) => ({
        messages: { ...state.messages, [toolCallId]: message },
      }));
    },
    clearMessages: () => set({ messages: {}, chunks: {} }),
  }),
);

type CustomDataType = {
  "sub-agent-message": {
    subAgentCallId: string;
    message: UIMessage;
  };
  "sub-agent-message-chunk": {
    subAgentCallId: string;
    chunk: InferUIMessageChunk<UIMessage>;
  };
};

type CustomDataUIPart =
  | {
      type: "data-sub-agent-message";
      data: {
        subAgentCallId: string;
        message: UIMessage;
      };
    }
  | {
      type: "data-sub-agent-message-chunk";
      data: {
        subAgentCallId: string;
        chunk: InferUIMessageChunk<UIMessage>;
      };
    }
  | {
      type: string;
      data: unknown;
    };

export function useDataStreamHandler(dataStream: CustomDataUIPart[]) {
  const lastProcessedIndex = useRef(-1);
  const { appendChunk, setMessage } = useToolUIMessageStore();

  useEffect(() => {
    if (!dataStream.length) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    for (const delta of newDeltas) {
      if (delta.type === "data-sub-agent-message-chunk") {
        const data = delta.data as CustomDataType["sub-agent-message-chunk"];
        appendChunk(data.subAgentCallId, data.chunk);
      }
      if (delta.type === "data-sub-agent-message") {
        const data = delta.data as CustomDataType["sub-agent-message"];
        setMessage(data.subAgentCallId, data.message);
      }
    }
  }, [dataStream, appendChunk, setMessage]);
}
