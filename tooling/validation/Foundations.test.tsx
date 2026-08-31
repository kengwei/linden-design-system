import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ArrowRightIcon,
  LoaderCircleIcon,
  PlusIcon,
} from "@linden/icons";
import {
  defineIconsContract,
  iconReference,
} from "../../contracts/assets.ts";
import {
  defineTokensContract,
  resolveToken,
} from "../../contracts/tokens.ts";
import { iconsContract } from "../../foundations/assets/Icons.contract.ts";
import { tokensContract } from "../../foundations/tokens/Tokens.contract.ts";
import { generateIconOutputs } from "../../generators/icons.ts";
import { generateTokenOutputs } from "../../generators/tokens.ts";

describe("global icon and motion foundations", () => {
  it("keeps stable icon references and verified adapter mappings", () => {
    expect(iconsContract.keyline.persistent).toBe(true);
    expect(iconReference(iconsContract, "icon.plus")).toBe(
      "foundation.icons.icon.plus",
    );
    expect(iconReference(iconsContract, "icon.arrow-right")).toBe(
      "foundation.icons.icon.arrow-right",
    );
    expect(iconReference(iconsContract, "icon.loader-circle")).toBe(
      "foundation.icons.icon.loader-circle",
    );
    const runtime = generateIconOutputs(iconsContract).find(
      (output) => output.path === "foundations/assets/Icons.ts",
    );
    expect(runtime?.contents).toContain(
      'import { ArrowRight as LucideArrowRight, LoaderCircle as LucideLoaderCircle, Plus as LucidePlus, type LucideProps } from "lucide-react";',
    );
  });

  it("fits every swap into the same decorative current-color geometry", () => {
    render(
      <>
        <PlusIcon data-testid="plus" />
        <ArrowRightIcon data-testid="arrow" aria-hidden={false} />
        <LoaderCircleIcon data-testid="loader" aria-label="Loading" />
        <PlusIcon data-testid="labelled" aria-labelledby="icon-label" />
        <span id="icon-label">Add item</span>
      </>,
    );

    for (const id of ["plus", "arrow", "loader"]) {
      const icon = screen.getByTestId(id);
      expect(icon).toHaveAttribute("width", "100%");
      expect(icon).toHaveAttribute("height", "100%");
      expect(icon).toHaveAttribute("stroke", "currentColor");
      expect(icon).toHaveAttribute("focusable", "false");
    }
    expect(screen.getByTestId("plus")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("arrow")).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByTestId("loader")).not.toHaveAttribute("aria-hidden");
    expect(screen.getByTestId("labelled")).toHaveAttribute(
      "aria-labelledby",
      "icon-label",
    );
    expect(screen.getByTestId("labelled")).not.toHaveAttribute("aria-hidden");
  });

  it("resolves base dimensions, typography, motion, and colors across modes", () => {
    expect(
      resolveToken(tokensContract, "dimension.4", {
        platform: "desktop",
        colorScheme: "light",
      }),
    ).toEqual({ value: 14, unit: "px" });
    expect(
      resolveToken(tokensContract, "dimension.5", {
        platform: "desktop",
        colorScheme: "light",
      }),
    ).toEqual({ value: 16, unit: "px" });
    expect(
      resolveToken(tokensContract, "dimension.6", {
        platform: "desktop",
        colorScheme: "light",
      }),
    ).toEqual({ value: 20, unit: "px" });
    expect(
      resolveToken(tokensContract, "motion.duration.loading-spinner", {
        platform: "desktop",
        colorScheme: "light",
      }),
    ).toEqual({ value: 1000, unit: "ms" });
    expect(
      resolveToken(tokensContract, "color.fill.danger", {
        platform: "desktop",
        colorScheme: "light",
      }),
    ).toMatchObject({ hex: "#C10007" });
    const dimensionSteps = ["0", "px", "0-5", "1", "1-5", "2", "2-5", "3", "3-5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "15", "16", "18", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96", "112", "128", "144", "160", "168", "192", "224", "256", "288", "320", "384"];
    const desktopDimensionValues = [0, 1, 2, 4, 6, 8, 8, 10, 12, 14, 16, 20, 24, 28, 30, 32, 36, 40, 48, 52, 56, 60, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 448, 512, 576, 640, 672, 768, 896, 1024, 1152, 1280, 1536];
    expect(tokensContract.modes.platform).toEqual(["mobile", "desktop"]);
    expect(tokensContract.modes.colorScheme).toEqual(["light", "dark"]);
    expect(Object.keys(tokensContract.tokens)).toHaveLength(821);
    expect(Object.keys(tokensContract.tokens).filter((name) => name.startsWith("dimension.")).sort()).toEqual(dimensionSteps.map((step) => `dimension.${step}`).sort());
    for (const [step, value] of dimensionSteps.map((step, index) => [step, desktopDimensionValues[index]] as const)) {
      expect(resolveToken(tokensContract, `dimension.${step}`, { platform: "desktop", colorScheme: "light" })).toEqual({ value, unit: "px" });
    }
    const baseTypographyTokens = Object.fromEntries(
      Object.entries(tokensContract.tokens)
        .filter(([name]) => /^(size|leading|tracking)\.[^.]+$|^family\.(sans|mono|nunito-sans|jetbrains-mono)$|^style\.(italic|normal)$|^weight\.\d+$/.test(name)),
    );
    const platformDimensionTokens = Object.entries(tokensContract.tokens)
      .filter(([, token]) => typeof token.$value === "object" && token.$value !== null && "platform" in token.$value);
    expect(platformDimensionTokens.every(([name]) => /^dimension\.|^(size|leading|tracking)\.[^.]+$/.test(name))).toBe(true);
    expect(baseTypographyTokens["family.mono"]).toMatchObject({ $type: "fontFamily", $value: "Geist Mono" });
    expect(baseTypographyTokens["family.nunito-sans"]).toMatchObject({ $type: "fontFamily", $value: "Nunito Sans" });
    expect(baseTypographyTokens["family.jetbrains-mono"]).toMatchObject({ $type: "fontFamily", $value: "JetBrains Mono" });
    expect(baseTypographyTokens["style.italic"]).toMatchObject({ $type: "fontStyle", $value: "italic" });
    expect(baseTypographyTokens["style.normal"]).toMatchObject({ $type: "fontStyle", $value: "normal" });
    expect(baseTypographyTokens["family.sans"]).toMatchObject({ $type: "fontFamily", $value: "Geist" });
    expect(resolveToken(tokensContract, "size.9xl", { platform: "mobile", colorScheme: "light" })).toEqual({ value: 128, unit: "px" });
    expect(baseTypographyTokens["weight.100"]).toMatchObject({ $type: "fontWeight", $value: 100 });
    expect(baseTypographyTokens["weight.600"]).toMatchObject({ $type: "fontWeight", $value: 600 });
    expect(baseTypographyTokens["weight.900"]).toMatchObject({ $type: "fontWeight", $value: 900 });
    expect(resolveToken(tokensContract, "tracking.3xl", { platform: "desktop", colorScheme: "light" })).toEqual({ value: -0.7, unit: "px" });
    expect(resolveToken(tokensContract, "tracking.md", { platform: "desktop", colorScheme: "light" })).toEqual({ value: 0, unit: "px" });
    expect(resolveToken(tokensContract, "tracking.xs", { platform: "desktop", colorScheme: "light" })).toEqual({ value: 0.7, unit: "px" });
    expect(Object.keys(baseTypographyTokens).some((name) => name.includes("fixed-"))).toBe(false);
    for (const [name, token] of Object.entries(baseTypographyTokens)) {
      if (/^(size|leading|tracking)\.[^.]+$/.test(name)) {
        expect(typeof token.$value).toBe("object");
      }
    }
    expect(tokensContract.tokens["family.default"]).toMatchObject({ $type: "fontFamily", $value: "{family.sans}" });
    expect(tokensContract.tokens["family.monospace"]).toMatchObject({ $type: "fontFamily", $value: "{family.mono}" });
    expect(tokensContract.tokens["style.default"]).toMatchObject({ $type: "fontStyle", $value: "{style.normal}" });
    const semanticTextTokens = tokensContract.tokens as Record<string, { $value: unknown }>;
    for (const [name, token] of Object.entries(semanticTextTokens)) {
      if (/^(size|leading|tracking)\.(display|headline|title|body|label)\./.test(name)) {
        expect(typeof token.$value).toBe("string");
      }
    }
    expect(semanticTextTokens["size.body.medium"].$value).toBe("{size.md}");
    expect(semanticTextTokens["leading.body.medium"].$value).toBe("{leading.md}");
    expect(resolveToken(tokensContract, "size.body.medium", { platform: "mobile", colorScheme: "light" })).toEqual({ value: 16, unit: "px" });
    expect(resolveToken(tokensContract, "leading.body.medium", { platform: "mobile", colorScheme: "light" })).toEqual({ value: 24, unit: "px" });
    expect(resolveToken(tokensContract, "size.body.medium", { platform: "desktop", colorScheme: "light" })).toEqual({ value: 14, unit: "px" });
    expect(resolveToken(tokensContract, "leading.body.medium", { platform: "desktop", colorScheme: "light" })).toEqual({ value: 20, unit: "px" });
    const textWeightTokens = Object.entries(tokensContract.tokens)
      .filter(([name]) => /^weight\.(display|headline|title|body|label)\./.test(name));
    expect(textWeightTokens).toHaveLength(35);
    expect(textWeightTokens.filter(([name]) => name.endsWith(".expressive")).map(([name]) => name).sort()).toEqual([
      "weight.display.large.expressive",
      "weight.display.medium.expressive",
      "weight.display.small.expressive",
      "weight.headline.large.expressive",
      "weight.headline.medium.expressive",
    ]);
    expect(semanticTextTokens["weight.title.small.emphasized"]).toMatchObject({ $value: "{weight.700}" });
    expect(semanticTextTokens["weight.body.medium.default"]).toMatchObject({ $value: "{weight.400}" });
    expect(semanticTextTokens["weight.headline.large.expressive"]).toMatchObject({ $value: "{weight.300}" });
    const opacitySteps = ["0", "5", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "60", "65", "70", "75", "80", "85", "90", "95", "100"];
    expect(Object.keys(tokensContract.tokens).filter((name) => name.startsWith("opacity.base.")).sort()).toEqual(opacitySteps.map((step) => `opacity.base.${step}`).sort());
    for (const step of opacitySteps) {
      expect(resolveToken(tokensContract, `opacity.base.${step}`, { platform: "desktop", colorScheme: "light" })).toBe(Number(step) / 100);
    }
    expect(tokensContract.tokens["opacity.layer.disabled" as keyof typeof tokensContract.tokens]).toBeUndefined();
    const documentationColors = {
      "color.fill.surface": ["#FFFFFF", "#1C1917"],
      "color.fill.surface-muted": ["#F5F5F4", "#292524"],
      "color.text.surface-primary": ["#0C0A09", "#FAFAF9"],
      "color.text.surface-secondary": ["#57534D", "#A6A09B"],
      "color.border.surface": ["#E7E5E4", "#292524"],
      "color.fill.success-subtle": ["#ECFDF5", "#002C22"],
      "color.border.success": ["#A4F4CF", "#006045"],
      "color.text.success": ["#006045", "#A4F4CF"],
      "color.fill.danger-subtle": ["#FEF2F2", "#460809"],
      "color.border.danger-subtle": ["#FFC9C9", "#9F0712"],
      "color.text.danger": ["#9F0712", "#FFC9C9"],
    } as const;
    for (const [name, [light, dark]] of Object.entries(documentationColors)) {
      expect(resolveToken(tokensContract, name, { platform: "desktop", colorScheme: "light" })).toMatchObject({ hex: light });
      expect(resolveToken(tokensContract, name, { platform: "desktop", colorScheme: "dark" })).toMatchObject({ hex: dark });
    }
    expect(resolveToken(tokensContract, "color.base.white-5", { platform: "desktop", colorScheme: "light" })).toMatchObject({ hex: "#FFFFFF", alpha: 0.05 });
    expect(resolveToken(tokensContract, "color.base.white-10", { platform: "desktop", colorScheme: "light" })).toMatchObject({ hex: "#FFFFFF", alpha: 0.1 });
    const expectedColorModes = {
      "color.fill.default": ["color.base.white-default", "color.base.stone-950"],
      "color.fill.surface": ["color.base.white-default", "color.base.stone-900"],
      "color.fill.surface-muted": ["color.base.stone-100", "color.base.stone-800"],
      "color.text.surface-primary": ["color.base.stone-950", "color.base.stone-50"],
      "color.text.surface-secondary": ["color.base.stone-600", "color.base.stone-400"],
      "color.border.surface": ["color.base.stone-200", "color.base.stone-800"],
      "color.fill.primary": ["color.base.stone-900", "color.base.stone-200"],
      "color.fill.primary-hover": ["color.base.stone-800", "color.base.stone-300"],
      "color.fill.primary-pressed": ["color.base.stone-950", "color.base.stone-400"],
      "color.text.on-primary": ["color.base.stone-50", "color.base.stone-900"],
      "color.border.primary": ["color.fill.primary", "color.fill.primary"],
      "color.fill.secondary": ["color.base.white-default", "color.base.stone-950"],
      "color.fill.secondary-hover": ["color.base.stone-100", "color.base.stone-800"],
      "color.fill.secondary-pressed": ["color.base.stone-200", "color.base.stone-700"],
      "color.text.on-secondary": ["color.base.stone-900", "color.base.stone-50"],
      "color.border.secondary": ["color.base.stone-200", "color.base.stone-800"],
      "color.fill.tertiary": ["color.fill.default", "color.fill.default"],
      "color.fill.tertiary-hover": ["color.fill.secondary-hover", "color.fill.secondary-hover"],
      "color.fill.tertiary-pressed": ["color.fill.secondary-pressed", "color.fill.secondary-pressed"],
      "color.text.primary": ["color.base.stone-950", "color.base.stone-50"],
      "color.border.tertiary": ["color.fill.tertiary", "color.fill.tertiary"],
      "color.fill.danger": ["color.base.red-700", "color.base.red-600"],
      "color.fill.danger-hover": ["color.base.red-800", "color.base.red-700"],
      "color.fill.danger-pressed": ["color.base.red-900", "color.base.red-800"],
      "color.text.on-danger": ["color.base.white-default", "color.base.white-default"],
      "color.border.danger": ["color.fill.danger", "color.fill.danger"],
      "color.state.focused": ["color.base.stone-400", "color.base.stone-500"],
      "color.overlay.hover": ["color.base.black-5", "color.base.white-5"],
      "color.overlay.pressed": ["color.base.black-10", "color.base.white-10"],
    } as const;
    for (const [name, [light, dark]] of Object.entries(expectedColorModes)) {
      expect(tokensContract.tokens[name as keyof typeof tokensContract.tokens].$value).toEqual({ colorScheme: { light: `{${light}}`, dark: `{${dark}}` } });
    }
    const expectedPlatformModes = {
      "radius.lg": "{dimension.2-5}",
      "border-width.1": "{dimension.px}",
      "border-width.4": "{dimension.1}",
      "focus-ring.offset-md": "{dimension.1}",
      "padding.3": "{dimension.3}",
      "padding.4": "{dimension.4}",
      "padding.6": "{dimension.6}",
      "gap.1-5": "{dimension.1-5}",
      "gap.2": "{dimension.2}",
      "size.control.md": "{size.md}",
      "leading.control.md": "{leading.md}",
      "tracking.control.md": "{tracking.md}",
    } as const;
    for (const [name, alias] of Object.entries(expectedPlatformModes)) {
      expect(tokensContract.tokens[name as keyof typeof tokensContract.tokens].$value).toBe(alias);
    }
    expect(resolveToken(tokensContract, "dimension.11", { platform: "mobile", colorScheme: "light" })).toEqual({ value: 44, unit: "px" });
    expect(resolveToken(tokensContract, "dimension.11", { platform: "desktop", colorScheme: "light" })).toEqual({ value: 36, unit: "px" });
    expect(
      resolveToken(tokensContract, "color.fill.danger", {
        platform: "desktop",
        colorScheme: "dark",
      }),
    ).toMatchObject({ hex: "#E7000B" });
    expect(
      resolveToken(tokensContract, "color.border.danger", {
        platform: "desktop",
        colorScheme: "dark",
      }),
    ).toEqual(
      resolveToken(tokensContract, "color.fill.danger", {
        platform: "desktop",
        colorScheme: "dark",
      }),
    );
    expect(
      tokensContract.contrastPairs
        .filter((pair) => pair.id.startsWith("danger-"))
        .map((pair) => pair.id),
    ).toEqual(["danger-rest", "danger-hover", "danger-pressed", "danger-subtle-primary", "danger-subtle-secondary"]);
    expect(tokensContract.contrastPairs.map((pair) => pair.id)).toEqual(expect.arrayContaining([
      "surface-primary",
      "surface-secondary",
      "success-subtle-primary",
      "success-subtle-secondary",
    ]));

    const css = generateTokenOutputs(tokensContract).find(
      (output) => output.path === "foundations/tokens/Tokens.css",
    );
    expect(css?.contents).toContain("--linden-dimension-0: 0px;");
    expect(css?.contents).toContain("--linden-dimension-96: 320px;");
    expect(css?.contents).toContain("--linden-family-sans: Geist;");
    expect(css?.contents).toContain("--linden-family-mono: Geist Mono;");
    expect(css?.contents).toContain("--linden-style-italic: italic;");
    expect(css?.contents).toContain("--linden-size-9xl: 96px;");
    expect(css?.contents).toContain("--linden-weight-100: 100;");
    expect(css?.contents).toContain("--linden-weight-600: 600;");
    expect(css?.contents).toContain("--linden-weight-900: 900;");
    expect(css?.contents).toContain("--linden-tracking-3xl: -0.7px;");
    expect(css?.contents).toContain("--linden-tracking-md: 0px;");
    expect(css?.contents).toContain("--linden-tracking-xs: 0.7px;");
    expect(css?.contents).toContain("--linden-leading-md: 20px;");
    expect(css?.contents).toContain("--linden-opacity-base-100: 1;");
    expect(css?.contents).not.toContain("--linden-opacity-layer-disabled");
    expect(css?.contents).toMatch(/\[data-platform="mobile"\][\s\S]*--linden-dimension-11: 44px;/);
    expect(css?.contents).toMatch(/\[data-platform="desktop"\][\s\S]*--linden-dimension-11: 36px;/);
    expect(css?.contents).toContain('[data-color-scheme="dark"]');
    expect(css?.contents).toContain("--linden-color-fill-surface: var(--linden-color-base-white-default);");
    expect(css?.contents).toContain("--linden-color-text-surface-primary: var(--linden-color-base-stone-950);");
    expect(css?.contents).toContain(
      "--linden-motion-duration-loading-spinner: var(--linden-motion-duration-1000);",
    );
    expect(css?.contents).toContain("--linden-angle-skew-0: 0deg;");
    expect(css?.contents).toContain("--linden-angle-skew-12: 12deg;");
  });

  it("rejects a duration with a non-duration unit", () => {
    assert.throws(
      () =>
        defineTokensContract({
          ...tokensContract,
          tokens: {
            ...tokensContract.tokens,
            "motion.duration.invalid": {
              $type: "duration",
              $value: { value: 1000, unit: "px" as never },
            },
          },
        }),
      /unit is invalid/,
    );
  });

  it("rejects a non-persistent keyline", () => {
    assert.throws(
      () =>
        defineIconsContract({
          ...iconsContract,
          keyline: {
            ...iconsContract.keyline,
            persistent: false as never,
          },
        }),
      /persistent must be true/,
    );
  });
});
