import type { SafeClient } from "@orpc/client";
import { createORPCClient, createSafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { RouterUtils } from "@orpc/tanstack-query";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { Router } from "./router";

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("RPCLink not allowed on server");
    }
    return `${window.location.origin}/rpc`;
  },
});

// Standard client (throws on errors - use with React Query)
export const client: RouterClient<Router> = createORPCClient(link);

// Safe client (returns [error, data] tuple - ORPC style)
export const safeClient: SafeClient<RouterClient<Router>> =
  createSafeClient(client);

// TanStack Query utils - use orpc.*.queryOptions() directly in components
export const orpc: RouterUtils<RouterClient<Router>> =
  createTanstackQueryUtils(client);
