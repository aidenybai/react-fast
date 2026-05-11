import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { transformSync } from "@babel/core";

const reactFastPlugin = () => ({
  name: "react-fast",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!id.match(/\.[tj]sx$/)) return;
    if (id.includes("node_modules")) return;
    const result = transformSync(code, {
      filename: id,
      plugins: ["babel-plugin-react-fast"],
      parserOpts: { plugins: ["jsx", "typescript"] },
      sourceMaps: true,
    });
    if (!result?.code) return;
    return { code: result.code, map: result.map };
  },
});

export default defineConfig({
  plugins: [reactFastPlugin(), react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/browser/**"],
    environment: "happy-dom",
  },
});
