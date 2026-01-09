import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { protectedProcedure } from "..";

export const getCurrent = protectedProcedure.handler(
  async ({ context, errors }) => {
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, context.session.userId))
      .limit(1);

    if (!currentUser) {
      throw errors.NOT_FOUND({ data: { resource: "user" } });
    }

    return currentUser;
  },
);
