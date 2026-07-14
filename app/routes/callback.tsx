import { getOAuthStateStorage, getAuthStorage, statePackSchema } from "~/lib/session";
import type { Route } from "./+types/callback";
import { CloudflareContext } from "~/lib/cloudflare";
import * as v from "valibot";
import { redirect } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { student, teacher } from "~/db/schema";
import { UserInfoClient } from "auth0";

const getTokenResponseSchema = v.object({
  access_token: v.string(),
  token_type: v.literal("Bearer"),
  expires_in: v.number(),
});

export async function loader({ context, request }: Route.LoaderArgs) {
  const { env } = context.get(CloudflareContext);
  const stateStorage = getOAuthStateStorage(env);
  const stateSession = await stateStorage.getSession(request.headers.get("Cookie"));
  const state = stateSession.get("state");
  const returnToLogInResponse = async () =>
    redirect("/log_in", {
      headers: {
        "Set-Cookie": await stateStorage.destroySession(stateSession),
      },
    });
  if (state == null) {
    console.log("invalid session");
    return await returnToLogInResponse();
  }

  const auth0CallbackRequestSchema = v.object({
    state: statePackSchema(state),
    code: v.string(),
  });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const requestBodyRes = v.safeParse(auth0CallbackRequestSchema, params);
  if (!requestBodyRes.success) {
    console.log("invalid callback params: ", requestBodyRes.issues);
    return await returnToLogInResponse();
  }
  const {
    code,
    state: { entryKind },
  } = requestBodyRes.output;

  const getTokenBody = {
    grant_type: "authorization_code",
    client_id: env.AUTH0_CLIENT_ID,
    client_secret: env.AUTH0_CLIENT_SECRET,
    redirect_uri: new URL("/callback", request.url),
    code,
  };
  const getTokenRes = await fetch(new URL("/oauth/token", env.AUTH0_AUDIENCE), {
    method: "POST",
    body: JSON.stringify(getTokenBody),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!getTokenRes.ok) {
    console.log("get token failure: ", await getTokenRes.text());
    return await returnToLogInResponse();
  }
  const getTokenReturnRes = v.safeParse(getTokenResponseSchema, await getTokenRes.json());
  if (!getTokenReturnRes.success) {
    console.log("invalid response: ", getTokenReturnRes.issues);
    return await returnToLogInResponse();
  }
  const { access_token } = getTokenReturnRes.output;

  try {
    const { data: user } = await new UserInfoClient({
      domain: env.AUTH0_DOMAIN,
    }).getUserInfo(access_token);
    const name = user.preferred_username ?? user.nickname;

    const db = drizzle(env.e_quiz_db);
    if (entryKind === "TEACHER") {
      await db
        .insert(teacher)
        .values({
          id: user.sub,
          name,
        })
        .onConflictDoUpdate({
          target: teacher.id,
          set: { name },
        })
        .execute();
    } else {
      await db
        .insert(student)
        .values({
          id: user.sub,
          name,
        })
        .onConflictDoUpdate({
          target: student.id,
          set: { name },
        })
        .execute();
    }

    const headers = new Headers();
    const authStorage = getAuthStorage(env);
    const authSession = await authStorage.getSession(request.headers.get("Cookie"));
    authSession.set("accessToken", access_token);
    authSession.set("entryKind", entryKind);
    headers.append("Set-Cookie", await authStorage.commitSession(authSession));
    headers.append("Set-Cookie", await stateStorage.destroySession(stateSession));

    const back = stateSession.get("back") ?? "/";
    return redirect(new URL(back, request.url).href, { headers });
  } catch (err: unknown) {
    console.log("create user transaction error: ", err);
    return await returnToLogInResponse();
  }
}

export default function LogInCallback() {
  return <p>この画面は閉じてください</p>;
}
