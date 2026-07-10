import { CloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/log-in";
import { Button, Tabs, Typography } from "@heroui/react";
import { getOAuthStateStorage, type EntryKind } from "~/lib/session";
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

  return data(
    {
      state,
      audience: env.AUTH0_AUDIENCE,
      clientId: env.AUTH0_CLIENT_ID,
      redirectUri: new URL("/callback", request.url).href,
    },
    {
      headers: {
        "Set-Cookie": await stateStorage.commitSession(stateSession),
      },
    },
  );
}

const createParams = ({
  state,
  audience,
  clientId,
  redirectUri,
  kind,
}: {
  state: string;
  audience: string;
  clientId: string;
  redirectUri: string;
  kind: EntryKind;
}): URLSearchParams =>
  new URLSearchParams({
    audience,
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: JSON.stringify({ state, entryKind: kind }),
    scope: ["openid", "profile", "email"].join(" "),
  });

export default function LogInCallback({
  loaderData: { state, audience, clientId, redirectUri },
}: Route.ComponentProps) {
  return (
    <main className="p-4">
      <Typography type="h1">e-quiz ログイン</Typography>
      <div className="mt-4">
        <Tabs>
          <Tabs.ListContainer>
            <Tabs.List>
              <Tabs.Tab id="student">
                学生
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="teacher">
                教員
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="student">
            <a
              href={
                new URL(
                  "/authorize?" +
                    createParams({ state, audience, clientId, redirectUri, kind: "STUDENT" }),
                  audience,
                ).href
              }
            >
              <Button>学生としてログイン / 新規登録</Button>
            </a>
          </Tabs.Panel>
          <Tabs.Panel id="teacher">
            <a
              href={
                new URL(
                  "/authorize?" +
                    createParams({ state, audience, clientId, redirectUri, kind: "TEACHER" }),
                  audience,
                ).href
              }
            >
              <Button>教員としてログイン / 新規登録</Button>
            </a>
          </Tabs.Panel>
        </Tabs>
      </div>
    </main>
  );
}
