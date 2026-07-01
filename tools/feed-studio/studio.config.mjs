import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(root, "../..");

export default defineConfig({
  root,
  server: {
    port: 4175,
    fs: {
      allow: [repoRoot]
    }
  }
});
