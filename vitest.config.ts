import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@linden/icons": fileURLToPath(
        new URL("./foundations/assets/Icons.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "components/**/*.test.tsx",
      "tooling/validation/**/*.test.ts",
      "tooling/validation/**/*.test.tsx",
    ],
    setupFiles: ["./tooling/validation/setup.ts"],
  },
});
