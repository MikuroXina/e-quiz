import { oauthStateStorage, AuthContext } from "~/lib/session";
import type { Route } from "./+types/callback";
import { CloudflareContext } from "~/lib/cloudflare";
import * as v from "valibot";
import { redirect } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { teacher } from "~/db/schema";
import { UserInfoClient } from "auth0";

const getTokenResponseSchema = v.object({
  access_token: v.string(),
  token_type: v.literal("Bearer"),
  expires_in: v.number(),
});

export async function loader({ context, request }: Route.LoaderArgs) {
  const { env } = context.get(CloudflareContext);
  const stateSession = await oauthStateStorage(env).getSession();
  const stateRes = v.safeParse(v.string(), stateSession.get("state"));
  if (!stateRes.success) {
    console.log("invalid session: ", stateRes.issues);
    return redirect("/log_in");
  }

  const state = stateRes.output;
  const auth0CallbackRequestSchema = v.object({
    state: v.literal(state),
    code: v.string(),
  });
  const requestBodyRes = v.safeParse(auth0CallbackRequestSchema, await request.json());
  if (!requestBodyRes.success) {
    console.log("invalid callback params: ", requestBodyRes.issues);
    return redirect("/log_in");
  }
  const { code } = requestBodyRes.output;

  const getTokenBody = {
    grant_type: "authorization_code",
    client_id: env.AUTH0_CLIENT_ID,
    client_secret: env.AUTH0_CLIENT_SECRET,
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
    return redirect("/log_in");
  }
  const getTokenReturnRes = v.safeParse(getTokenResponseSchema, await getTokenRes.json());
  if (!getTokenReturnRes.success) {
    console.log("invalid response: ", getTokenReturnRes.issues);
    return redirect("/log_in");
  }
  const { access_token } = getTokenReturnRes.output;

  const { data: user } = await new UserInfoClient({
    domain: env.AUTH0_DOMAIN,
  }).getUserInfo(access_token);

  const newId = crypto.randomUUID();
  await drizzle(env.e_quiz_db)
    .insert(teacher)
    .values({
      id: newId,
      name: user.name,
    })
    .execute();

  context.set(AuthContext, {
    type: "teacher",
    id: newId,
  });

  return redirect("/");
}

export default function LogInCallback() {
  return <p>この画面は閉じてください</p>;
}
