import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import cesium from "vite-plugin-cesium";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    cesium(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@zip.js/zip.js/lib/zip-no-worker.js": path.resolve(__dirname, "./src/lib/zip-stub.js"),
      "@zip.js/zip.js": path.resolve(__dirname, "./src/lib/zip-stub.js"),
    },
  },
  optimizeDeps: {
    include: ["cesium"],
  },
}));
