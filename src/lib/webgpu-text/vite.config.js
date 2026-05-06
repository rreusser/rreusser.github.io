import { observable, config } from "@observablehq/notebook-kit/vite";
import { defineConfig } from "vite";
import { debugNotebook } from "@rreusser/mcp-observable-notebook-kit-debug";

export default defineConfig({
  ...config(),
  plugins: [debugNotebook(), observable()],
  build: {
    target: "esnext",
    outDir: "dist",
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
    // Exclude msdf-generator from pre-bundling to preserve worker structure
    exclude: ['@zappar/msdf-generator'],
  },
  worker: {
    format: 'es',
  },
});
