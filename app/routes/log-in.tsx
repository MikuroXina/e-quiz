import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/log-in";
import { Button, Typography } from "@heroui/react";
import { getOAuthStateStorage } from "~/lib/session";
import { data } from "react-router";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = context.get(CloudflareContext);
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  const state = Array.from(buf, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const stateStorage = getOAuthStateStorage(env);
  const stateSession = await stateStorage.getSession(request.headers.get("Cookie"));
  stateSession.set("state", state);
  const back = new URL(request.url).searchParams.get("back") ?? "/";
  stateSession.set("back", back);

  const params = new URLSearchParams({
    audience: env.AUTH0_AUDIENCE,
    response_type: "code",
    client_id: env.AUTH0_CLIENT_ID,
    redirect_uri: new URL("/callback", request.url).href,
    state,
    scope: ["openid", "profile", "email"].join(" "),
  });
  const link = new URL("/authorize?" + params, env.AUTH0_AUDIENCE).href;
  return data(
    { link },
    {
      headers: {
        "Set-Cookie": await stateStorage.commitSession(stateSession),
      },
    },
  );
}

export default function LogInCallback({ loaderData }: Route.ComponentProps) {
  return (
    <main className="p-4">
      <Typography type="h1">e-quiz ログイン</Typography>
      <div className="mt-4">
        <a href={loaderData.link}>
          <Button>ログイン / 新規登録</Button>
        </a>
      </div>
    </main>
  );
}
