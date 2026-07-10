import { AuthContext, getAuthStorage } from "~/lib/session";
import type { Route } from "./+types/log-out";
import { CloudflareContext } from "~/lib/cloudflare";
import { redirect } from "react-router";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(AuthContext);
  if (auth.type === "unauthorized") {
    return redirect("/");
  }
  const { env } = context.get(CloudflareContext);
  const storage = getAuthStorage(env);
  const session = await storage.getSession(request.headers.get("Cookie"));
  return redirect("/log_in", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export default function LogOut() {
  return <div>ログアウト中…</div>;
}
