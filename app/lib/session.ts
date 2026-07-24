import type { InferSelectModel } from "drizzle-orm";
import { createContext, createCookieSessionStorage } from "react-router";
import type { student, teacher } from "~/db/schema";
import type { Route } from "../+types/root";
import { CloudflareContext } from "./cloudflare";
import { UserInfoClient } from "auth0";
import * as v from "valibot";

export const entryKindSchema = v.union([v.literal("STUDENT"), v.literal("TEACHER")]);
export type EntryKind = v.InferOutput<typeof entryKindSchema>;

export const statePackSchema = (state: string) =>
  v.pipe(
    v.string(),
    v.parseJson(),
    v.object({
      state: v.literal(state),
      entryKind: entryKindSchema,
    }),
  );

export const getOAuthStateStorage = (env: Env) =>
  createCookieSessionStorage<{ state: string; entryKind: EntryKind; back: string }>({
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

export interface AuthSession {
  accessToken: string;
  entryKind: EntryKind;
  /**
   * ID of student/teacher used to evade login scheme. It must be empty on production env.
   */
  testId: string;
}

export const getAuthStorage = (env: Env) =>
  createCookieSessionStorage<AuthSession>({
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
      type: "student";
      id: InferSelectModel<typeof student>["id"];
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
  const testId = session.get("testId") ?? "";
  if (testId !== "" && env.NODE_ENV !== "development") {
    throw new Error("test id was activated on not development environment");
  }

  const accessToken = session.get("accessToken");
  const entryKind = session.get("entryKind");
  if (entryKind == null) {
    context.set(AuthContext, {
      type: "unauthorized",
    });
    return;
  }

  let id = testId;
  if (testId === "" && accessToken != null) {
    const { data: user } = await new UserInfoClient({
      domain: env.AUTH0_DOMAIN,
    }).getUserInfo(accessToken);
    id = user.sub;
  }
  if (entryKind === "TEACHER") {
    context.set(AuthContext, {
      type: "teacher",
      id,
    });
  } else {
    context.set(AuthContext, {
      type: "student",
      id,
    });
  }
};
