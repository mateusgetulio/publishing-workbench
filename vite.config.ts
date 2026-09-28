import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import RubyPlugin from "vite-plugin-ruby";

export default defineConfig({
  plugins: [react(), RubyPlugin()],
  test: {
    environment: "jsdom",
    include: ["app/frontend/**/*.test.{ts,tsx}"],
    setupFiles: ["app/frontend/test/setup.ts"],
  },
});
