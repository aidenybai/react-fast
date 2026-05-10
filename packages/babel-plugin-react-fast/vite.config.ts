import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: [
    {
      entry: ["./src/index.ts"],
      format: ["cjs", "esm"],
      dts: true,
      clean: false,
      platform: "node",
      sourcemap: true,
      minify: false,
      external: ["@babel/core", "@babel/types", "@babel/helper-module-imports"],
    },
  ],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
