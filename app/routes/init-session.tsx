import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/init-session";
import { data, redirect } from "react-router";
import { getAuthStorage } from "~/lib/session";

export async function loader({ context, request }: Route.LoaderArgs) {
  const { env } = context.get(CloudflareContext);
  if (env.NODE_ENV === "production") {
    return redirect("/");
  }

  const searchParams = new URL(request.url).searchParams;
  const authStorage = getAuthStorage(env);
  const session = await authStorage.getSession(request.headers.get("Cookie"));

  session.set("entryKind", searchParams.get("entry_kind") === "TEACHER" ? "TEACHER" : "STUDENT");
  session.set("testId", searchParams.get("id") ?? "");
  session.set("accessToken", "");

  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await authStorage.commitSession(session),
      },
    },
  );
}

export default function InitSessionPage() {
  return (
    <main>
      <p>This is an endpoint for setup test auth session.</p>
      <p>Succeeded to log in, so you can close this page.</p>
      <p>
        If you see this page on the production environment, it must be an incident. Please tell us
        about the situation happened.
      </p>
    </main>
  );
}
