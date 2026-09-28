import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import RubyPlugin from "vite-plugin-ruby";

export default defineConfig({
  plugins: [react(), RubyPlugin()],
  cacheDir: "../../node_modules/.vite",
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
  },
});
