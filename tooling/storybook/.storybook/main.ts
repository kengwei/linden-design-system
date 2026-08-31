import type { StorybookConfig } from "@storybook/react-vite";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../../../components/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
  viteFinal: async (config) =>
    mergeConfig(config, {
      resolve: {
        alias: {
          "@linden/icons": fileURLToPath(
            new URL("../../../foundations/assets/Icons.ts", import.meta.url),
          ),
        },
      },
    }),
};

export default config;
