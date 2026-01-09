import { os } from "@orpc/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

// Define common errors with type-safe data schemas
const commonErrors = {
  UNAUTHORIZED: {
    message: "Authentication required",
  },
  FORBIDDEN: {
    message: "Permission denied",
    data: z.object({ reason: z.string().optional() }),
  },
  NOT_FOUND: {
    message: "Resource not found",
    data: z.object({ resource: z.string().optional() }),
  },
  VALIDATION_ERROR: {
    message: "Validation failed",
    data: z.object({ field: z.string().optional(), message: z.string() }),
  },
};

// Base procedure with session context
export const base = os.errors(commonErrors).$context<{ headers: Headers }>();

export const publicProcedure = base;

const authMiddleware = base.middleware(async ({ context, next, errors }) => {
  const sessionData = await auth.api.getSession({
    headers: context.headers, // or reqHeaders if you're using the plugin
  });

  if (!sessionData?.session || !sessionData?.user) {
    throw errors.UNAUTHORIZED();
  }

  // Adds session and user to the context
  return next({
    context: {
      session: sessionData.session,
      user: sessionData.user,
    },
  });
});

export const protectedProcedure = base.use(authMiddleware);

export { commonErrors };
