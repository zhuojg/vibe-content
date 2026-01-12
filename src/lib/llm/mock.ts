import {
  type FinishReason,
  type ModelMessage,
  simulateReadableStream,
} from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { splitModelMessageToModelChunks } from "./message-chunk";

type MockStep = {
  message: ModelMessage;
  inputTokens: {
    total: number;
    noCache: number;
    cacheRead: number | undefined;
    cacheWrite: number | undefined;
  };
  outputTokens: {
    total: number;
    text: number | undefined;
    reasoning: number | undefined;
  };
};

export function createMockLLM(steps: MockStep[], chunkDelayInMs = 100) {
  let currentStep = 0;

  return new MockLanguageModelV3({
    doStream: async () => {
      const step = steps[currentStep++] ?? steps[steps.length - 1];

      const chunks = splitModelMessageToModelChunks(step.message);

      return {
        stream: simulateReadableStream({
          chunks: [
            ...chunks,
            {
              type: "finish",
              finishReason: {
                unified: (typeof step.message.content !== "string" &&
                step.message.content.at(-1)?.type === "tool-call"
                  ? "tool-calls"
                  : "stop") as FinishReason,
                raw: void 0,
              },
              usage: {
                inputTokens: step.inputTokens,
                outputTokens: step.outputTokens,
              },
            },
          ],
          chunkDelayInMs,
        }),
      };
    },
  });
}
