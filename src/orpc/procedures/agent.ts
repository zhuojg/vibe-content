import { streamToEventIterator, type } from "@orpc/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { protectedProcedure } from "..";

export const chat = protectedProcedure
  .input(type<{ chatId: string; messages: UIMessage[] }>())
  .handler(async ({ input }) => {
    const result = streamText({
      model: "test",
      system: "You are a helpful assistant.",
      messages: await convertToModelMessages(input.messages),
    });

    return streamToEventIterator(result.toUIMessageStream());
  });
