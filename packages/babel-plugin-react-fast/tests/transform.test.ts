import { describe, it, expect } from "vitest";
import { transformSync } from "@babel/core";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import plugin from "../src/index.js";

const fixturesDir = join(__dirname, "fixtures");

const transform = (code: string): string => {
  const result = transformSync(code, {
    plugins: [plugin],
    configFile: false,
    babelrc: false,
  });
  return result?.code || "";
};

const fixtures = readdirSync(fixturesDir).filter((name) => {
  try {
    return readdirSync(join(fixturesDir, name)).includes("code.js");
  } catch {
    return false;
  }
});

describe("babel-plugin-react-fast", () => {
  for (const fixture of fixtures) {
    it(fixture, () => {
      const input = readFileSync(join(fixturesDir, fixture, "code.js"), "utf-8");
      const output = transform(input);
      expect(output).toMatchSnapshot();
    });
  }
});
