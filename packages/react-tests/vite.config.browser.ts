import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-fast"],
      },
    }),
  ],
  test: {
    include: ["src/browser/**/*.test.{ts,tsx}"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
