import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { router } from "@/orpc/router";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error("[RPC Error]", error);
    }),
  ],
});

export const Route = createFileRoute("/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { response } = await handler.handle(request, {
          prefix: "/rpc",
          context: {
            headers: request.headers,
          }, // Provide initial context if needed
        });

        return response ?? new Response("Not Found HHH", { status: 404 });
      },
    },
  },
});
