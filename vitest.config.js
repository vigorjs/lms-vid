import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react({ include: /\.[jt]sx?$/ })],
  resolve: { alias: { "@": path.resolve(process.cwd()) } },
  test: { environment: "node", include: ["tests/**/*.test.js"], coverage: { reporter: ["text", "html"] } },
});
