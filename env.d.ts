/// <reference types="./worker-configuration.d.ts" />

import "react-router";

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: { env: Env; ctx: ExecutionContext };
  }
}

declare global {
  namespace Cloudflare {
    interface Env {
      COOKIE_SECRET: string;
    }
  }
}
