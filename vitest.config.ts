import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const projectRoot = fs.realpathSync(process.cwd());
// Use file:// URL so Vite's loadAndTransform handles non-ASCII path characters correctly
const setupFileUrl = pathToFileURL(path.resolve(projectRoot, "src/test/setup.ts")).href;

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [setupFileUrl],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(projectRoot, "src") },
  },
});
