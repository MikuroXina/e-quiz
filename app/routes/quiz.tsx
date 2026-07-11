import { AuthContext } from "~/lib/session";
import type { Route } from "./+types/quiz";
import * as v from "valibot";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export const submitSchema = v.object({
  answer: v.pipe(v.string(), v.toNumber(), v.integer()),
});

export async function action({ context, request, params }: Route.ActionArgs) {
  const auth = context.get(AuthContext);
  if (auth.type !== "student") {
    console.log("unauthorized submission for: ", auth);
    return new Response(null, { status: 401 });
  }

  const bodyRes = v.safeParse(
    submitSchema,
    Object.fromEntries((await request.formData()).entries()),
  );
  if (!bodyRes.success) {
    console.log("bad parameter: ", bodyRes.issues);
    return new Response(null, { status: 400 });
  }

  const { answer } = bodyRes.output;

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  await db.insert(schema.submission).values({
    createdById: auth.id,
    sentToId: params.quiz_id,
    createdAt: new Date(),
    answer,
  });
}
