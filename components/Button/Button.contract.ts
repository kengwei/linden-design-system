import { defineComponentContract } from "../../contracts/component.ts";
import { iconReference } from "../../contracts/assets.ts";
import { tokenReference } from "../../contracts/tokens.ts";
import { iconsContract } from "../../foundations/assets/Icons.contract.ts";
import { tokensContract } from "../../foundations/tokens/Tokens.contract.ts";

const ref = <TName extends keyof typeof tokensContract.tokens>(name: TName) =>
  tokenReference(tokensContract, name);

export const buttonContract = defineComponentContract(tokensContract, {
  id: "component.button",
  schemaVersion: 1,
  defaults: {
    variant: "primary",
    size: "medium",
    loading: false,
    disabled: false,
  },
  anatomy: {
    root: { required: true },
    label: { required: true },
    leadingIconKeyline: { required: true },
    leadingIcon: { required: false },
    trailingIconKeyline: { required: true },
    trailingIcon: { required: false },
    loadingIndicatorKeyline: { required: true },
    loadingIndicator: { required: true },
  },
  props: {
    label: { kind: "text", required: true },
    variant: {
      kind: "choice",
      values: ["primary", "secondary", "tertiary", "danger"] as const,
      required: false,
    },
    size: {
      kind: "choice",
      values: ["small", "medium", "large"] as const,
      required: false,
    },
    loading: { kind: "boolean", required: false },
    disabled: { kind: "boolean", required: false },
    leadingIcon: { kind: "icon", required: false },
    trailingIcon: { kind: "icon", required: false },
  },
  behavior: {
    action: "triggers-action",
    activation: "platform-standard",
    loading: {
      interactionDisabled: true,
      layoutSizePreserved: true,
      busyStateExposed: true,
      accessibleNamePreserved: true,
      contentVisuallyHidden: true,
      indicator: iconReference(iconsContract, "icon.loader-circle"),
      indicatorCenteredOutsideFlow: true,
      indicatorDecorative: true,
      reducedMotion: "static",
    },
    disabled: { interactionDisabled: true },
    focus: { visibleOnKeyboard: true },
  },
  accessibility: {
    requiresAccessibleName: true,
    requiresVisibleLabel: true,
    allowsIconOnly: false,
    keyboardActivation: "platform-standard",
    focusIndicatorRequired: true,
    loadingBusyStateRequired: true,
    allowsVisuallyHiddenLabelWhileLoading: true,
  },
  styling: {
    variants: {
      primary: {
        rest: {
          fill: ref("color.fill.primary"),
          text: ref("color.text.on-primary"),
          border: ref("color.border.primary"),
        },
        hover: {
          fill: ref("color.fill.primary-hover"),
          text: ref("color.text.on-primary"),
          border: ref("color.fill.primary-hover"),
        },
        pressed: {
          fill: ref("color.fill.primary-pressed"),
          text: ref("color.text.on-primary"),
          border: ref("color.fill.primary-pressed"),
        },
      },
      secondary: {
        rest: {
          fill: ref("color.fill.secondary"),
          text: ref("color.text.on-secondary"),
          border: ref("color.border.secondary"),
        },
        hover: {
          fill: ref("color.fill.secondary-hover"),
          text: ref("color.text.on-secondary"),
          border: ref("color.border.secondary"),
        },
        pressed: {
          fill: ref("color.fill.secondary-pressed"),
          text: ref("color.text.on-secondary"),
          border: ref("color.border.secondary"),
        },
      },
      tertiary: {
        rest: {
          fill: ref("color.fill.tertiary"),
          text: ref("color.text.primary"),
          border: ref("color.border.tertiary"),
        },
        hover: {
          fill: ref("color.fill.tertiary-hover"),
          text: ref("color.text.primary"),
          border: ref("color.border.tertiary"),
        },
        pressed: {
          fill: ref("color.fill.tertiary-pressed"),
          text: ref("color.text.primary"),
          border: ref("color.border.tertiary"),
        },
      },
      danger: {
        rest: {
          fill: ref("color.fill.danger"),
          text: ref("color.text.on-danger"),
          border: ref("color.border.danger"),
        },
        hover: {
          fill: ref("color.fill.danger-hover"),
          text: ref("color.text.on-danger"),
          border: ref("color.fill.danger-hover"),
        },
        pressed: {
          fill: ref("color.fill.danger-pressed"),
          text: ref("color.text.on-danger"),
          border: ref("color.fill.danger-pressed"),
        },
      },
    },
    disabled: {
      opacity: ref("opacity.base.50"),
    },
    focus: {
      outlineColor: ref("color.state.focused"),
      outlineWidth: ref("border-width.4"),
      outlineOffset: ref("focus-ring.offset-md"),
      cornerRadius: ref("dimension.3-5"),
    },
    loading: {
      duration: ref("motion.duration.loading-spinner"),
    },
    shared: {
      borderWidth: ref("border-width.1"),
      cornerRadius: ref("radius.lg"),
      fontFamily: ref("family.control.default"),
      fontStyle: ref("style.control.default"),
    },
    sizes: {
      small: {
        height: ref("dimension.10"),
        paddingInline: ref("padding.3"),
        gap: ref("gap.1-5"),
        keyline: ref("dimension.4"),
        fontSize: ref("size.control.md"),
        lineHeight: ref("leading.control.md"),
        fontWeight: ref("weight.control.default"),
        letterSpacing: ref("tracking.control.md"),
      },
      medium: {
        height: ref("dimension.11"),
        paddingInline: ref("padding.4"),
        gap: ref("gap.2"),
        keyline: ref("dimension.5"),
        fontSize: ref("size.control.md"),
        lineHeight: ref("leading.control.md"),
        fontWeight: ref("weight.control.default"),
        letterSpacing: ref("tracking.control.md"),
      },
      large: {
        height: ref("dimension.12"),
        paddingInline: ref("padding.6"),
        gap: ref("gap.2"),
        keyline: ref("dimension.6"),
        fontSize: ref("size.control.md"),
        lineHeight: ref("leading.control.md"),
        fontWeight: ref("weight.control.default"),
        letterSpacing: ref("tracking.control.md"),
      },
    },
  },
  guidance: {
    purpose: "Triggers an action.",
    useWhen: "Use for a concise user action.",
    avoidWhen: "Use Link for navigation.",
    content: {
      dos: ["Use a concise verb label.", "Keep the label stable during loading."],
      donts: ["Do not use vague labels.", "Do not use an icon-only label."],
    },
    examples: [
      { intent: "submit", label: "Submit", variant: "primary" },
      { intent: "confirm", label: "Confirm", variant: "secondary" },
      { intent: "trigger-action", label: "Refresh", variant: "tertiary" },
      { intent: "destructive-action", label: "Delete", variant: "danger" },
    ],
  },
  relationships: { relatedComponents: ["link"] },
  discovery: { intents: ["submit", "confirm", "trigger-action", "destructive-action"] },
});
