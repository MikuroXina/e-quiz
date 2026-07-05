import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/log-in";
import { Button } from "@heroui/react";
import { oauthStateStorage } from "~/lib/session";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = context.get(CloudflareContext);
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  const state = Array.from(buf, (byte) => byte.toString(16).padStart(2, "0")).join(" ");
  const session = await oauthStateStorage(env).getSession(request.headers.get("Cookie"));
  session.set("state", state);

  const params = new URLSearchParams({
    audience: env.AUTH0_AUDIENCE,
    response_type: "code",
    client_id: env.AUTH0_CLIENT_ID,
    redirect_uri: new URL("/callback", request.url).href,
    state,
  });
  const link = new URL("/authorize" + params, env.AUTH0_AUDIENCE).href;
  return { link };
}

export default function LogInCallback({ loaderData }: Route.ComponentProps) {
  return (
    <div className="p-4">
      <a href={loaderData.link}>
        <Button>ログイン</Button>
      </a>
    </div>
  );
}
