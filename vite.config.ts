// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  // Force Nitro with the Vercel preset so SSR routes (/admin, /reset-password, etc.)
  // work on Vercel. Without this, Lovable's config skips Nitro outside its sandbox
  // and direct visits to non-root paths return 404.
  nitro: { preset: "vercel" },
  tanstackStart: {
    server: { entry: "server" },
  },
});
