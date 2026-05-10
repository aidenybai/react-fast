import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: [
    {
      entry: ["./src/index.ts"],
      format: ["iife"],
      globalName: "ReactFast",
      dts: false,
      clean: false,
      platform: "browser",
      sourcemap: true,
      minify: process.env.NODE_ENV === "production",
    },
    {
      entry: ["./src/index.ts"],
      format: ["cjs", "esm"],
      dts: true,
      clean: false,
      platform: "browser",
      sourcemap: true,
      minify: process.env.NODE_ENV === "production",
    },
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "jsdom",
  },
});
