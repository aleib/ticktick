import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Vite doesn't automatically honor TS `paths` mappings. We alias to the shared
      // source entry so local dev stays fast and build works without publishing `shared`.
      "@ticktick/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    port: 5173
  }
});


