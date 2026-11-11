import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
  test: {
    environment: "node",
    // Les tests de composants et de stockage déclarent eux-mêmes « @vitest-environment jsdom »
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
