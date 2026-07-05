import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";

export default defineConfig({
  fmt: {
    sortTailwindcss: true,
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
    }),
    react(),
    tailwindcss(),
    reactRouter(),
  ],
  server: {
    port: 8787,
  },
  resolve: {
    tsconfigPaths: true,
  },
});
