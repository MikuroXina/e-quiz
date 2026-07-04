import type { InferSelectModel } from "drizzle-orm";
import { createContext, createCookieSessionStorage } from "react-router";
import type { teacher } from "~/db/schema";
import type { Route } from "../+types/root";
import { CloudflareContext } from "./cloudflare";

export const SessionContext = createContext<
  | {
      type: "teacher";
      id: InferSelectModel<typeof teacher>["id"];
    }
  | {
      type: "unauthorized";
    }
>({
  type: "unauthorized",
});

export const authMiddleware: Route.MiddlewareFunction = async ({ request, context }) => {
  const cloudflare = context.get(CloudflareContext);
  const storage = createCookieSessionStorage({
    cookie: {
      name: "__e_quiz_session",
      secrets: [cloudflare.env.COOKIE_SECRET],
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: cloudflare.env.NODE_ENV === "production",
      maxAge: 6 * 60 * 60,
    },
  });
  const session = await storage.getSession(request.headers.get("Cookie"));
  if (session.has("teacher_id")) {
    context.set(SessionContext, {
      type: "teacher",
      id: session.get("teacher_id"),
    });
  }
  // TODO: redirect to log in if there is no valid session
};
