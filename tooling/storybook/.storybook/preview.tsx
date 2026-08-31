import type { Preview } from "@storybook/react-vite";
import "../../../foundations/tokens/Tokens.css";
import "../../../foundations/assets/Fonts.css";

const preview: Preview = {
  globalTypes: {
    platform: {
      description: "Token platform mode",
      defaultValue: "web",
      toolbar: {
        icon: "browser",
        items: ["mobile", "desktop", "web"],
      },
    },
    colorScheme: {
      description: "Token color-scheme mode",
      defaultValue: "light",
      toolbar: {
        icon: "contrast",
        items: ["light", "dark"],
      },
    },
  },
  decorators: [
    (Story, context) => (
      <div
        data-platform={context.globals.platform}
        data-color-scheme={context.globals.colorScheme}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { test: "error" },
  },
};

export default preview;
