import type { InferSelectModel } from "drizzle-orm";
import { createContext, createCookieSessionStorage } from "react-router";
import type { teacher } from "~/db/schema";
import type { Route } from "../+types/root";
import { CloudflareContext } from "./cloudflare";
import { UserInfoClient } from "auth0";

export const getOAuthStateStorage = (env: Env) =>
  createCookieSessionStorage<{ state: string; back: string }>({
    cookie: {
      name: "__e_quiz_oauth_session",
      secrets: [env.COOKIE_SECRET],
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      maxAge: 5 * 60,
    },
  });

export const getAuthStorage = (env: Env) =>
  createCookieSessionStorage<{ accessToken: string }>({
    cookie: {
      name: "__e_quiz_session",
      secrets: [env.COOKIE_SECRET],
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      maxAge: 6 * 60 * 60,
    },
  });

export const AuthContext = createContext<
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
  const { env } = context.get(CloudflareContext);
  const storage = getAuthStorage(env);
  const session = await storage.getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");
  if (accessToken != null) {
    const { data: user } = await new UserInfoClient({
      domain: env.AUTH0_DOMAIN,
    }).getUserInfo(accessToken);
    context.set(AuthContext, {
      type: "teacher",
      id: user.sub,
    });
    return;
  }

  context.set(AuthContext, {
    type: "unauthorized",
  });
};
