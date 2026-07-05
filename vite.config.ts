import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  fmt: {
    sortTailwindcss: true,
  },
  plugins: [tailwindcss(), reactRouter(), cloudflare()],
  server: {
    port: 8787,
  },
  resolve: {
    tsconfigPaths: true,
  },
});
