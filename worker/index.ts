import { createRequestHandler, RouterContextProvider } from "react-router";

import { CloudflareContext } from "../app/cloudflare-context";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const context = new RouterContextProvider();
    context.set(CloudflareContext, {
      cloudflare: {
        ctx,
        env,
      },
    });
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
