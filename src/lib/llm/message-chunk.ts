import { generateId, type LanguageModel, type ModelMessage } from "ai";
import { match } from "ts-pattern";

type StreamInnerType<S> = S extends ReadableStream<infer T> ? T : never;

type LanguageModelStreamChunk = StreamInnerType<
  Awaited<
    ReturnType<
      Extract<LanguageModel, { specificationVersion: "v3" }>["doStream"]
    >
  >["stream"]
>;

/**
 * Split a model message to server side chunks, which can be used as the input for MockLanguageModelV2.
 */
export function splitModelMessageToModelChunks(
  message: ModelMessage,
): LanguageModelStreamChunk[] {
  const chunks: LanguageModelStreamChunk[] = [];

  const content =
    typeof message.content === "string"
      ? [{ type: "text" as const, text: message.content }]
      : message.content;

  for (const v of content) {
    match(v)
      .with({ type: "text" }, (textPart) => {
        const id = generateId();
        chunks.push({ type: "text-start", id });

        const splitted = textPart.text.split(" ");
        for (const [index, item] of splitted.entries()) {
          chunks.push({
            type: "text-delta",
            delta: index === 0 ? item : ` ${item}`,
            id,
          });
        }

        chunks.push({ type: "text-end", id });
      })
      .with({ type: "tool-call" }, (toolCallPart) => {
        chunks.push({
          type: "tool-call",
          toolCallId: toolCallPart.toolCallId,
          toolName: toolCallPart.toolName,
          input: JSON.stringify(toolCallPart.input),
        });
      })
      .with({ type: "tool-approval-request" }, (_) => {})
      .with({ type: "tool-approval-response" }, (_) => {})
      .with({ type: "tool-result" }, (toolResultPart) => {
        if (toolResultPart.output.type !== "execution-denied")
          chunks.push({
            type: "tool-result",
            toolCallId: toolResultPart.toolCallId,
            toolName: toolResultPart.toolName,
            result: toolResultPart.output.value ?? {},
          });
      })
      .with({ type: "file" }, (filePart) => {
        chunks.push({
          type: "file",
          mediaType: filePart.mediaType,
          data: filePart.data as string,
        });
      })
      .with({ type: "reasoning" }, (reasoningPart) => {
        const id = generateId();
        chunks.push({
          type: "reasoning-start",
          id,
        });

        const splitted = reasoningPart.text.split(" ");
        for (const [index, item] of splitted.entries()) {
          chunks.push({
            type: "reasoning-delta",
            delta: index === 0 ? item : ` ${item}`,
            id,
          });
        }

        chunks.push({
          type: "reasoning-end",
          id,
        });
      })
      // FIXME 这里先不处理了
      .with({ type: "image" }, () => {})
      .exhaustive();
  }

  return chunks;
}
