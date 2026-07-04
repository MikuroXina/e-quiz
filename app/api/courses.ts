import { SessionContext } from "~/lib/session";
import type { Route } from "../+types/root";
import * as v from "valibot";
import { CloudflareContext } from "~/lib/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { course } from "~/db/schema";

export const postCoursesSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
});

export async function action({ request, context }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parseRes = v.safeParse(postCoursesSchema, form);
  if (!parseRes.success) {
    console.log("bad parameter: ", form);
    return { success: false };
  }
  const body = parseRes.output;

  const session = context.get(SessionContext);
  if (session.type !== "teacher") {
    console.log("forbidden user: ", session);
    return { success: false };
  }

  const { env } = context.get(CloudflareContext);
  const db = drizzle(env.e_quiz_db);
  const newId = crypto.randomUUID();
  await db
    .insert(course)
    .values({
      id: newId,
      name: body.name,
    })
    .execute();
  return { success: true };
}
