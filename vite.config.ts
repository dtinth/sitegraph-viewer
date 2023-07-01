import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          d3: ["d3-force-3d"],
          preact: ["preact"],
          nanostores: [
            "nanostores",
            "@nanostores/preact",
            "nanostores-computed-dynamic",
          ],
          pixi: ["pixi.js"],
          zod: ["zod"],
        },
      },
    },
  },
});
