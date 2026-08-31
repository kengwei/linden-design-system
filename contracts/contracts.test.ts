import assert from "node:assert/strict";
import test from "node:test";
import { buttonContract } from "../components/Button/Button.contract.ts";
import { tokensContract as authoredTokensContract } from "../foundations/tokens/Tokens.contract.ts";
import { defineComponentContract } from "./component.ts";
import { createContractRevision } from "./revision.ts";
import { defineTokensContract, resolveToken, TOKEN_MODES } from "./tokens.ts";
import { generateTokenOutputs } from "../generators/tokens.ts";

const color = (r: number, g: number, b: number) => ({
  colorSpace: "srgb" as const,
  components: [r, g, b] as const,
});
const dimension = (value: number) => ({
  value,
  unit: "px" as const,
});

function tokensFixture() {
  return defineTokensContract({
    id: "foundation.tokens",
    schemaVersion: 2,
    purpose: "Approved shared slice.",
    modes: TOKEN_MODES,
    tokens: {
      "color.fill.primary": {
        $type: "color",
        $value: color(0, 0, 0),
        $description: "Primary fill.",
      },
      "color.text.on-primary": {
        $type: "color",
        $value: {
          colorScheme: {
            light: color(1, 1, 1),
            dark: color(0.9, 0.9, 0.9),
          },
        },
      },
      "color.border.primary": {
        $type: "color",
        $value: "{color.fill.primary}",
      },
      "color.overlay.scrim": {
        $type: "color",
        $value: {
          colorScheme: {
            light: { ...color(0, 0, 0), alpha: 0.2 },
            dark: { ...color(0, 0, 0), alpha: 0.32 },
          },
        },
      },
      "opacity.overlay.scrim": {
        $type: "number",
        $value: 0.2,
      },
      "opacity.overlay.scrim-strong": {
        $type: "number",
        $value: "{opacity.overlay.scrim}",
      },
      "dimension.10": {
        $type: "dimension",
        $value: {
          platform: {
            mobile: dimension(40),
            desktop: dimension(32),
          },
        },
      },
      "padding.10": {
        $type: "dimension",
        $value: "{dimension.10}",
      },
      "breakpoint.sm": {
        $type: "dimension",
        $value: dimension(640),
      },
      "weight.control.default": {
        $type: "fontWeight",
        $value: 600,
      },
      "style.control.default": {
        $type: "fontStyle",
        $value: "normal",
      },
    },
    contrastPairs: [
      {
        id: "on-primary-over-primary",
        foreground: "color.text.on-primary",
        background: "color.fill.primary",
        usage: "normal-text",
      },
    ],
  });
}

function componentFixture(tokens: ReturnType<typeof tokensFixture>) {
  return defineComponentContract(tokens, {
    id: "component.button",
    schemaVersion: 1,
    defaults: {},
    anatomy: { root: { required: true } },
    props: { label: { kind: "text", required: true } },
    behavior: { action: "trigger" },
    accessibility: { requiresAccessibleName: true },
    styling: {
      root: {
        fill: "foundation.tokens.color.fill.primary",
        text: "foundation.tokens.color.text.on-primary",
        border: "foundation.tokens.color.border.primary",
        height: "foundation.tokens.padding.10",
        fontWeight: "foundation.tokens.weight.control.default",
      },
    },
    guidance: {
      purpose: "Triggers an action.",
      useWhen: "Use for a concise user action.",
      avoidWhen: "Use Link for navigation.",
      content: {
        dos: ["Use a concise verb label."],
        donts: ["Do not use vague labels."],
      },
      examples: [{ intent: "submit", label: "Submit" }],
    },
    relationships: { relatedComponents: ["link"] },
    discovery: { intents: ["submit"] },
  });
}

test("loads authored token and Button contracts", () => {
  assert.equal(authoredTokensContract.id, "foundation.tokens");
  assert.equal(buttonContract.id, "component.button");

  const disabledOpacity = authoredTokensContract.tokens["opacity.base.50"];
  assert.ok(disabledOpacity);
  assert.equal(disabledOpacity.$type, "number");
  assert.equal(disabledOpacity.$value, 0.5);
  assert.equal(
    buttonContract.styling.disabled.opacity,
    "foundation.tokens.opacity.base.50",
  );
  assert.deepEqual(Object.keys(buttonContract.anatomy), [
    "root",
    "label",
    "leadingIconKeyline",
    "leadingIcon",
    "trailingIconKeyline",
    "trailingIcon",
    "loadingIndicatorKeyline",
    "loadingIndicator",
  ]);
  assert.equal(
    buttonContract.accessibility.allowsVisuallyHiddenLabelWhileLoading,
    true,
  );
  assert.equal(
    buttonContract.behavior.loading.indicator,
    "foundation.icons.icon.loader-circle",
  );
  assert.equal(
    buttonContract.styling.loading.duration,
    "foundation.tokens.motion.duration.loading-spinner",
  );
  assert.equal(buttonContract.styling.focus.cornerRadius, "foundation.tokens.dimension.3-5");
  assert.equal(buttonContract.styling.shared.cornerRadius, "foundation.tokens.radius.lg");
  assert.equal(buttonContract.styling.loading.duration, "foundation.tokens.motion.duration.loading-spinner");
});

test("places typography platform values on t-shirt base scales", () => {
  const expected = {
    xs: [[12, 16, 0.8], [11, 16, 0.7]],
    sm: [[14, 20, 0.4], [12, 16, 0.35]],
    md: [[16, 24, 0], [14, 20, 0]],
    lg: [[18, 28, -0.4], [16, 24, -0.35]],
    xl: [[20, 28, -0.4], [18, 28, -0.35]],
    "2xl": [[24, 32, -0.4], [20, 28, -0.35]],
    "3xl": [[30, 36, -0.8], [24, 32, -0.7]],
    "4xl": [[36, 40, -0.8], [30, 36, -0.7]],
    "5xl": [[48, 48, -0.8], [36, 40, -0.7]],
    "6xl": [[60, 60, -0.8], [48, 48, -0.7]],
    "7xl": [[72, 72, -0.8], [60, 60, -0.7]],
    "8xl": [[96, 96, -0.8], [72, 72, -0.7]],
    "9xl": [[128, 128, -0.8], [96, 96, -0.7]],
  } as const;
  const contexts = [
    { platform: "mobile", colorScheme: "light" },
    { platform: "desktop", colorScheme: "light" },
  ] as const;

  for (const [step, values] of Object.entries(expected)) {
    for (const [contextIndex, context] of contexts.entries()) {
      for (const [metric, metricIndex] of [["size", 0], ["leading", 1], ["tracking", 2]] as const) {
        assert.deepEqual(resolveToken(authoredTokensContract, `${metric}.${step}`, context), dimension(values[contextIndex][metricIndex]));
      }
    }
  }

  for (const [name, token] of Object.entries(authoredTokensContract.tokens)) {
    if (/^(size|leading|tracking)\.(display|headline|title|body|label)\./.test(name)) {
      assert.equal(typeof token.$value, "string", `${name} must alias a base leaf`);
    }
  }
  assert.equal(authoredTokensContract.tokens["size.body.medium"].$value, "{size.md}");
  assert.equal(authoredTokensContract.tokens["leading.body.medium"].$value, "{leading.md}");
  assert.equal(authoredTokensContract.tokens["tracking.body.medium"].$value, "{tracking.md}");
  assert.equal(authoredTokensContract.tokens["size.control.md"].$value, "{size.md}");
  assert.equal(authoredTokensContract.tokens["weight.control.default"].$value, "{weight.500}");
  assert.deepEqual(resolveToken(authoredTokensContract, "size.body.medium", contexts[0]), dimension(16));
  assert.deepEqual(resolveToken(authoredTokensContract, "size.body.medium", contexts[1]), dimension(14));
  assert.equal(Object.keys(authoredTokensContract.tokens).some((name) => /fixed-/.test(name)), false);
});

test("keeps the complete platform base scale and mode-free geometry semantics", () => {
  const baseSteps = ["0", "px", "0-5", "1", "1-5", "2", "2-5", "3", "3-5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "15", "16", "18", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96", "112", "128", "144", "160", "168", "192", "224", "256", "288", "320", "384"] as const;
  assert.deepEqual(Object.keys(authoredTokensContract.tokens).filter((name) => name.startsWith("dimension.")).sort(), baseSteps.map((step) => `dimension.${step}`).sort());
  assert.deepEqual(resolveToken(authoredTokensContract, "dimension.15", { platform: "mobile", colorScheme: "light" }), dimension(60));
  assert.deepEqual(resolveToken(authoredTokensContract, "dimension.15", { platform: "desktop", colorScheme: "light" }), dimension(52));
  assert.deepEqual(resolveToken(authoredTokensContract, "dimension.18", { platform: "mobile", colorScheme: "light" }), dimension(72));
  assert.deepEqual(resolveToken(authoredTokensContract, "dimension.18", { platform: "desktop", colorScheme: "light" }), dimension(60));

  for (const family of ["gap", "padding", "margin", "gutter"] as const) {
    assert.equal(authoredTokensContract.tokens[`${family}.2-5`].$value, "{dimension.2-5}");
    assert.deepEqual(resolveToken(authoredTokensContract, `${family}.2-5`, { platform: "mobile", colorScheme: "light" }), dimension(10));
    assert.deepEqual(resolveToken(authoredTokensContract, `${family}.2-5`, { platform: "desktop", colorScheme: "light" }), dimension(8));
  }

  assert.deepEqual(authoredTokensContract.tokens["radius.full"].$value, dimension(9999));
  assert.deepEqual(resolveToken(authoredTokensContract, "radius.full", { platform: "desktop", colorScheme: "light" }), dimension(9999));
  assert.equal(authoredTokensContract.tokens["focus-ring.offset-md"].$value, "{dimension.1}");
  assert.equal(authoredTokensContract.tokens["radius.lg"].$value, "{dimension.2-5}");
  assert.equal(Object.keys(authoredTokensContract.tokens).some((name) => /^(space|font-|font-size|line-height|letter-spacing)|^dimension\.(base|control|keyline|padding|gap)/.test(name)), false);
});

test("resolves DTCG composite motion and elevation references", () => {
  const context = { platform: "desktop", colorScheme: "light" } as const;
  assert.deepEqual(resolveToken(authoredTokensContract, "motion.enter.fast", context), {
    duration: { value: 150, unit: "ms" },
    delay: { value: 0, unit: "ms" },
    timingFunction: [0, 0, 0, 1],
  });
  assert.equal(Object.hasOwn(authoredTokensContract.tokens["motion.spring.snappy.stiffness"], "$extensions"), true);
  assert.equal(resolveToken(authoredTokensContract, "z-index.tooltip", context), 70);
  const modalBase = authoredTokensContract.tokens["elevation.base.5"];
  assert.equal(modalBase.$type, "shadow");
  if (modalBase.$type !== "shadow") throw new Error("elevation.base.5 must remain a shadow token");
  assert.ok(Array.isArray(modalBase.$value));
  if (!Array.isArray(modalBase.$value)) throw new Error("elevation.base.5 must author shadow layers");
  assert.equal(modalBase.$value[0].color, "{color.shadow.10}");
  assert.deepEqual(resolveToken(authoredTokensContract, "color.shadow.10", context), {
    colorSpace: "srgb",
    components: [0, 0, 0],
    alpha: 0.1,
    hex: "#000000",
  });
  const modal = resolveToken(authoredTokensContract, "elevation.modal", context);
  assert.ok(Array.isArray(modal));
  assert.equal(modal.length, 2);
  const elevationSnapshot = (role: string, platform: "mobile" | "desktop", colorScheme: "light" | "dark") => {
    const layers = resolveToken(authoredTokensContract, `elevation.${role}`, { platform, colorScheme });
    assert.ok(Array.isArray(layers));
    return layers.map((layer) => [layer.color.alpha ?? 1, layer.offsetX.value, layer.offsetY.value, layer.blur.value, layer.spread.value]);
  };
  const expectedElevations = {
    low: [[0.04, 0, 1, 2, 0], [0.06, 0, 1, 1, 0]],
    medium: [[0.05, 0, 2, 4, 0], [0.08, 0, 1, 2, 0]],
    high: [[0.06, 0, 4, 8, 0], [0.1, 0, 2, 4, 0]],
    overlay: [[0.08, 0, 8, 16, 0], [0.12, 0, 4, 8, 0]],
    modal: [[0.1, 0, 12, 24, 0], [0.14, 0, 6, 12, 0]],
  } as const;
  for (const [role, expected] of Object.entries(expectedElevations)) for (const platform of TOKEN_MODES.platform) for (const colorScheme of TOKEN_MODES.colorScheme) {
    assert.deepEqual(elevationSnapshot(role, platform, colorScheme), expected);
  }
  assert.deepEqual(
    resolveToken(authoredTokensContract, "elevation.modal", { platform: "mobile", colorScheme: "light" }),
    modal,
  );
  const css = generateTokenOutputs(authoredTokensContract).find((output) => output.path === "foundations/tokens/Tokens.css")?.contents;
  assert.match(css ?? "", /--linden-motion-enter-fast: var\(--linden-motion-duration-150\) var\(--linden-motion-easing-decelerate\) var\(--linden-motion-delay-0\);/);
  assert.match(css ?? "", /--linden-elevation-modal: var\(--linden-elevation-base-5\);/);
});

test("accepts canonical names, four-context resolution, aliases, and revision order invariance", () => {
  const tokens = tokensFixture();
  const reordered = defineTokensContract({
    ...tokens,
    tokens: Object.fromEntries(Object.entries(tokens.tokens).reverse()),
    contrastPairs: [...tokens.contrastPairs],
  });
  assert.equal(createContractRevision(reordered), createContractRevision(tokens));

  const contexts = [
    { platform: "mobile", colorScheme: "light" },
    { platform: "desktop", colorScheme: "dark" },
    { platform: "mobile", colorScheme: "dark" },
    { platform: "desktop", colorScheme: "light" },
  ] as const;

  for (const context of contexts) {
    assert.deepEqual(
      resolveToken(tokens, "color.text.on-primary", context),
      context.colorScheme === "light"
        ? color(1, 1, 1)
        : color(0.9, 0.9, 0.9),
    );
    assert.deepEqual(
      resolveToken(tokens, "padding.10", context),
      context.platform === "mobile" ? dimension(40) : dimension(32),
    );
    assert.deepEqual(resolveToken(tokens, "color.border.primary", context), color(0, 0, 0));
  }

  assert.equal(componentFixture(tokens).id, "component.button");
});

test("token revision changes with mode data changes", () => {
  const base = tokensFixture();
  const changed = defineTokensContract({
    ...base,
    tokens: {
      ...base.tokens,
      "color.text.on-primary": {
        ...base.tokens["color.text.on-primary"],
        $value: {
          colorScheme: {
            light: color(1, 1, 1),
            dark: color(0.96, 0.96, 0.96),
          },
        },
      },
    },
  });
  assert.notEqual(createContractRevision(base), createContractRevision(changed));
});

test("rejects explicitly undefined optional fields while keeping valid contracts hashable", () => {
  const tokens = tokensFixture();
  assert.equal(createContractRevision(tokens), createContractRevision(tokensFixture()));

  assert.throws(
    () =>
      defineTokensContract({
        ...tokens,
        contrastPairs: undefined as never,
      }),
    TypeError,
  );

  assert.throws(
    () =>
      defineTokensContract({
        ...tokens,
        contrastPairs: [
          {
            ...tokens.contrastPairs[0],
            foreground: new String("color.text.on-primary") as never,
          },
        ],
      }),
    /foreground must be a nonempty string/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        ...tokens,
        tokens: {
          ...tokens.tokens,
          "color.fill.primary": {
            ...tokens.tokens["color.fill.primary"],
            $description: undefined as never,
          },
        },
      }),
    TypeError,
  );

  assert.throws(
    () =>
      defineTokensContract({
        ...tokens,
        tokens: {
          ...tokens.tokens,
          "color.fill.primary": {
            ...tokens.tokens["color.fill.primary"],
            $value: { colorSpace: "srgb", components: [0.1, 0.2, 0.3], alpha: undefined as never },
          },
        },
      }),
    TypeError,
  );

  assert.throws(
    () =>
      defineTokensContract({
        ...tokens,
        tokens: {
          ...tokens.tokens,
          "color.fill.primary": {
            ...tokens.tokens["color.fill.primary"],
            $value: { colorSpace: "srgb", components: [0.1, 0.2, 0.3], hex: undefined as never },
          },
        },
      }),
    TypeError,
  );
});

test("rejects malformed names and mismatched type prefixes", () => {
  for (const name of ["color", "color.fill..primary", "color.fill.invalid_underscore"]) {
    assert.throws(
      () =>
        defineTokensContract({
          id: "foundation.tokens",
          schemaVersion: 2,
          purpose: "invalid",
          modes: TOKEN_MODES,
          tokens: {
            [name]: { $type: "color", $value: color(0, 0, 0) },
          },
          contrastPairs: [],
        }),
      /supported token path/,
    );
  }
  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "invalid",
        modes: TOKEN_MODES,
        tokens: {
          "weird.fill.cta-primary": {
            $type: "color",
            $value: color(0, 0, 0),
          },
        },
        contrastPairs: [],
      }),
    /supported token path/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "invalid",
        modes: TOKEN_MODES,
        tokens: {
          "color.text.label": {
            $type: "fontWeight",
            $value: 600,
          },
        },
        contrastPairs: [],
      }),
    /does not match its type/,
  );

  assert.doesNotThrow(() =>
    defineTokensContract({
      id: "foundation.tokens",
      schemaVersion: 2,
      purpose: "base and public roots accepted",
      modes: TOKEN_MODES,
      tokens: {
        "dimension.10": {
          $type: "dimension",
          $value: {
            platform: {
              mobile: dimension(40),
              desktop: dimension(32),
            },
          },
        },
        "gap.related": { $type: "dimension", $value: "{dimension.10}" },
      },
      contrastPairs: [],
    }),
  );
});

test("validates alias resolution, context-local cycles, and alias shape errors", () => {
  assert.deepEqual(
    resolveToken(
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "aliases",
        modes: TOKEN_MODES,
        tokens: {
          "color.palette.indigo-600": { $type: "color", $value: color(0.2, 0.2, 0.2) },
          "color.brand.primary": { $type: "color", $value: "{color.palette.indigo-600}" },
          "color.fill.primary": { $type: "color", $value: "{color.brand.primary}" },
        },
        contrastPairs: [],
      }),
      "color.fill.primary",
      { platform: "mobile", colorScheme: "light" },
    ),
    color(0.2, 0.2, 0.2),
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "missing alias",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.base": { $type: "color", $value: color(0.1, 0.2, 0.3) },
          "color.fill.semantic": { $type: "color", $value: "{color.fill.missing}" },
        },
        contrastPairs: [],
      }),
    /unknown token/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "legacy dimension alias",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.base": { $type: "color", $value: color(0.1, 0.2, 0.3) },
          "color.fill.semantic": { $type: "color", $value: "{dimension.fill.base}" },
        },
        contrastPairs: [],
      }),
    /unknown token/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "mismatched alias",
        modes: TOKEN_MODES,
        tokens: {
          "weight.base": { $type: "fontWeight", $value: 500 },
          "color.fill.semantic": { $type: "color", $value: "{weight.base}" },
        },
        contrastPairs: [],
      }),
    /wrong type/,
  );

  const crossModeGraph = defineTokensContract({
    id: "foundation.tokens",
    schemaVersion: 2,
    purpose: "cross-mode graph",
    modes: TOKEN_MODES,
    tokens: {
      "color.fill.base-light": { $type: "color", $value: color(0.9, 0.9, 0.9) },
      "color.fill.base-dark": { $type: "color", $value: color(0.1, 0.1, 0.1) },
      "color.fill.inverse": {
        $type: "color",
        $value: {
          colorScheme: {
            light: "{color.fill.semantic}",
            dark: "{color.fill.base-dark}",
          },
        },
      },
      "color.fill.semantic": {
        $type: "color",
        $value: {
          colorScheme: {
            light: "{color.fill.base-light}",
            dark: "{color.fill.inverse}",
          },
        },
      },
    },
    contrastPairs: [],
  });
  assert.deepEqual(
    resolveToken(crossModeGraph, "color.fill.semantic", { platform: "desktop", colorScheme: "light" }),
    color(0.9, 0.9, 0.9),
  );
  assert.deepEqual(
    resolveToken(crossModeGraph, "color.fill.semantic", { platform: "desktop", colorScheme: "dark" }),
    color(0.1, 0.1, 0.1),
  );

  assert.throws(
    () =>
      resolveToken(
        defineTokensContract({
          id: "foundation.tokens",
          schemaVersion: 2,
          purpose: "same-context cycle",
          modes: TOKEN_MODES,
          tokens: {
            "color.fill.one": {
              $type: "color",
              $value: {
                colorScheme: {
                  light: "{color.fill.two}",
                  dark: color(0, 0, 0),
                },
              },
            },
            "color.fill.two": {
              $type: "color",
              $value: {
                colorScheme: {
                  light: "{color.fill.one}",
                  dark: color(1, 1, 1),
                },
              },
            },
          },
          contrastPairs: [],
        }),
        "color.fill.one",
        { platform: "mobile", colorScheme: "light" },
      ),
    /alias cycle detected/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "bare alias",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.base": { $type: "color", $value: color(0.2, 0.2, 0.2) },
          "color.fill.semantic": { $type: "color", $value: "color.fill.base" as never },
        },
        contrastPairs: [],
      }),
    /not a supported token path|supported srgb color/,
  );
});

test("validates opacity number tokens, aliases, bounds, and roots", () => {
  const tokens = defineTokensContract({
    id: "foundation.tokens",
    schemaVersion: 2,
    purpose: "opacity numbers",
    modes: TOKEN_MODES,
    tokens: {
      "opacity.overlay.scrim": { $type: "number", $value: 0.24 },
      "opacity.overlay.scrim-strong": {
        $type: "number",
        $value: "{opacity.overlay.scrim}",
      },
    },
    contrastPairs: [],
  });

  for (const context of [
    { platform: "mobile", colorScheme: "light" },
    { platform: "desktop", colorScheme: "dark" },
    { platform: "desktop", colorScheme: "light" },
  ] as const) {
    assert.equal(resolveToken(tokens, "opacity.overlay.scrim", context), 0.24);
    assert.equal(resolveToken(tokens, "opacity.overlay.scrim-strong", context), 0.24);
  }

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "opacity above 1",
        modes: TOKEN_MODES,
        tokens: {
          "opacity.overlay.scrim": { $type: "number", $value: 1.2 },
        },
        contrastPairs: [],
      }),
    /between 0 and 1/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "opacity below 0",
        modes: TOKEN_MODES,
        tokens: {
          "opacity.overlay.scrim": { $type: "number", $value: -0.1 },
        },
        contrastPairs: [],
      }),
    /between 0 and 1/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "unsupported number root",
        modes: TOKEN_MODES,
        tokens: {
          "number.overlay.scrim": { $type: "number", $value: 0.2 },
        },
        contrastPairs: [],
      }),
    /supported token path/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "wrong number root",
        modes: TOKEN_MODES,
        tokens: {
          "color.overlay.scrim": { $type: "number", $value: 0.2 },
        },
        contrastPairs: [],
      }),
    /does not match its type/,
  );
});

test("allows signed tracking dimensions without widening the base dimension scale", () => {
  const tokens = defineTokensContract({
    id: "foundation.tokens",
    schemaVersion: 2,
    purpose: "signed tracking",
    modes: TOKEN_MODES,
    tokens: {
      "tracking.tight": { $type: "dimension", $value: dimension(-0.4) },
      "tracking.label": { $type: "dimension", $value: "{tracking.tight}" },
    },
    contrastPairs: [],
  });

  assert.deepEqual(
    resolveToken(tokens, "tracking.tight", {
      platform: "desktop",
      colorScheme: "light",
    }),
    dimension(-0.4),
  );
  assert.deepEqual(
    resolveToken(tokens, "tracking.label", {
      platform: "desktop",
      colorScheme: "dark",
    }),
    dimension(-0.4),
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "negative size rejected",
        modes: TOKEN_MODES,
        tokens: {
          "dimension.1": { $type: "dimension", $value: dimension(-4) },
        },
        contrastPairs: [],
      }),
    /nonnegative finite/,
  );
});

test("validates wrapped mode values and both mode axes", () => {
  const wrapped = defineTokensContract({
    id: "foundation.tokens",
    schemaVersion: 2,
    purpose: "wrapped modes",
    modes: TOKEN_MODES,
    tokens: {
      "color.fill.base-light": { $type: "color", $value: color(0.8, 0.8, 0.8) },
      "color.fill.base-dark": { $type: "color", $value: color(0.1, 0.1, 0.1) },
      "color.fill.surface": {
        $type: "color",
        $value: {
          colorScheme: {
            light: "{color.fill.base-light}",
            dark: "{color.fill.base-dark}",
          },
        },
      },
      "dimension.mobile": { $type: "dimension", $value: dimension(8) },
      "dimension.desktop": { $type: "dimension", $value: dimension(12) },
      "dimension.stack": {
        $type: "dimension",
        $value: {
          platform: {
            mobile: "{dimension.mobile}",
            desktop: "{dimension.desktop}",
          },
        },
      },
      "size.md": {
        $type: "dimension",
        $value: {
          platform: {
            mobile: dimension(40),
            desktop: dimension(44),
          },
        },
      },
      "gap.stack": { $type: "dimension", $value: "{dimension.stack}" },
      "size.control.md": { $type: "dimension", $value: "{size.md}" },
    },
    contrastPairs: [],
  });

  assert.deepEqual(
    resolveToken(wrapped, "color.fill.surface", { platform: "desktop", colorScheme: "dark" }),
    color(0.1, 0.1, 0.1),
  );
  assert.deepEqual(
    resolveToken(wrapped, "gap.stack", { platform: "desktop", colorScheme: "light" }),
    dimension(12),
  );

  for (const [name, type, value] of [
    [
      "color.fill.bad-wrapper",
      "color",
      { platform: { mobile: color(0, 0, 0), desktop: color(0, 0, 0) } },
    ],
    [
      "gap.bad-wrapper",
      "dimension",
      { colorScheme: { light: dimension(8), dark: dimension(10) } },
    ],
    [
      "color.fill.incomplete",
      "color",
      { colorScheme: { light: color(0, 0, 0) } },
    ],
  ] as const) {
    assert.throws(
      () =>
        defineTokensContract({
          id: "foundation.tokens",
          schemaVersion: 2,
          purpose: "invalid wrapper",
          modes: TOKEN_MODES,
          tokens: {
            [name]: { $type: type, $value: value as never },
          },
          contrastPairs: [],
        }),
      /invalid fields/,
    );
  }
});

test("rejects platform wrappers on semantic dimension tokens", () => {
  for (const name of ["size.control.md", "gap.related", "size.body.medium", "padding.md", "gutter.md"] as const) {
    assert.throws(
      () =>
        defineTokensContract({
          id: "foundation.tokens",
          schemaVersion: 2,
          purpose: "semantic platform wrapper",
          modes: TOKEN_MODES,
          tokens: {
            [name]: {
              $type: "dimension",
              $value: {
                platform: {
                  mobile: dimension(8),
                  desktop: dimension(12),
                },
              },
            },
          },
          contrastPairs: [],
        }),
      /may not own platform modes/,
    );
  }
});

test("validates contrast pairs across all contexts and alpha rules", () => {
  defineTokensContract({
    id: "foundation.tokens",
    schemaVersion: 2,
    purpose: "overlay contrast passes",
    modes: TOKEN_MODES,
    tokens: {
      "color.fill.surface": { $type: "color", $value: color(1, 1, 1) },
      "color.text.default": { $type: "color", $value: color(0, 0, 0) },
      "color.overlay.scrim": {
        $type: "color",
        $value: {
          colorScheme: {
            light: { ...color(0, 0, 0), alpha: 0.2 },
            dark: { ...color(0, 0, 0), alpha: 0.2 },
          },
        },
      },
    },
    contrastPairs: [
      {
        id: "default-over-scrim",
        foreground: "color.text.default",
        background: "color.fill.surface",
        overlay: "color.overlay.scrim",
        usage: "normal-text",
      },
    ],
  });

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "contrast pair exact keys",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.surface": { $type: "color", $value: color(1, 1, 1) },
          "color.text.default": { $type: "color", $value: color(0, 0, 0) },
          "color.overlay.scrim": { $type: "color", $value: { ...color(0, 0, 0), alpha: 0.2 } },
          "opacity.overlay.scrim": { $type: "number", $value: 0.2 },
        },
        contrastPairs: [
          {
            id: "overlay-has-extra-key",
            foreground: "color.text.default",
            background: "color.fill.surface",
            overlay: "color.overlay.scrim",
            opacity: "opacity.overlay.scrim",
            usage: "normal-text",
          } as never,
        ],
      }),
    /invalid fields/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "overlay wrong type",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.surface": { $type: "color", $value: color(1, 1, 1) },
          "color.text.default": { $type: "color", $value: color(0, 0, 0) },
          "opacity.overlay.scrim": { $type: "number", $value: 0.2 },
        },
        contrastPairs: [
          {
            id: "overlay-wrong-type",
            foreground: "color.text.default",
            background: "color.fill.surface",
            overlay: "opacity.overlay.scrim",
            usage: "normal-text",
          } as never,
        ],
      }),
    /overlay is not a color token/,
  );

  defineTokensContract({
    id: "foundation.tokens",
    schemaVersion: 2,
    purpose: "alpha foreground",
    modes: TOKEN_MODES,
    tokens: {
      "color.fill.surface": { $type: "color", $value: color(0, 0, 0) },
      "color.text.overlay": {
        $type: "color",
        $value: {
          colorScheme: {
            light: { ...color(1, 1, 1), alpha: 0.92 },
            dark: { ...color(1, 1, 1), alpha: 0.92 },
          },
        },
      },
    },
    contrastPairs: [
      {
        id: "overlay-on-surface",
        foreground: "color.text.overlay",
        background: "color.fill.surface",
        usage: "normal-text",
      },
    ],
  });

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "overlay contrast fails after compositing",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.surface": { $type: "color", $value: color(1, 1, 1) },
          "color.text.muted": { $type: "color", $value: color(0.7, 0.7, 0.7) },
          "color.overlay.scrim": {
            $type: "color",
            $value: {
              colorScheme: {
                light: { ...color(0, 0, 0), alpha: 0.08 },
                dark: { ...color(0, 0, 0), alpha: 0.08 },
              },
            },
          },
        },
        contrastPairs: [
          {
            id: "muted-over-scrim-fails",
            foreground: "color.text.muted",
            background: "color.fill.surface",
            overlay: "color.overlay.scrim",
            usage: "normal-text",
          },
        ],
      }),
    /fails in desktop\/light|fails in mobile\/light/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "alpha foreground fails after compositing",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.surface": { $type: "color", $value: color(0, 0, 0) },
          "color.text.translucent-fail": {
            $type: "color",
            $value: {
              colorScheme: {
                light: { ...color(1, 1, 1), alpha: 0.2 },
                dark: { ...color(1, 1, 1), alpha: 0.2 },
              },
            },
          },
        },
        contrastPairs: [
          {
            id: "translucent-fails-on-surface",
            foreground: "color.text.translucent-fail",
            background: "color.fill.surface",
            usage: "normal-text",
          },
        ],
      }),
    /fails in desktop\/light|fails in mobile\/light/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "alpha background",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.surface": {
            $type: "color",
            $value: { ...color(0, 0, 0), alpha: 0.8 },
          },
          "color.text.overlay": { $type: "color", $value: color(1, 1, 1) },
        },
        contrastPairs: [
          {
            id: "bad-background-alpha",
            foreground: "color.text.overlay",
            background: "color.fill.surface",
            usage: "normal-text",
          },
        ],
      }),
    /background must be opaque/,
  );

  assert.throws(
    () =>
      defineTokensContract({
        id: "foundation.tokens",
        schemaVersion: 2,
        purpose: "contrast",
        modes: TOKEN_MODES,
        tokens: {
          "color.fill.primary": {
            $type: "color",
            $value: color(0, 0, 0),
            $description: "Primary fill.",
          },
          "color.text.on-primary": {
            $type: "color",
            $value: {
              colorScheme: {
                light: color(1, 1, 1),
                dark: color(0.2, 0.2, 0.2),
              },
            },
          },
        },
        contrastPairs: [
          {
            id: "contrast-fails-in-dark",
            foreground: "color.text.on-primary",
            background: "color.fill.primary",
            usage: "normal-text",
          },
        ],
      }),
    /fails in desktop\/dark|fails in mobile\/dark/,
  );
});

test("rejects style token type mismatches", () => {
  const tokens = tokensFixture();

  assert.doesNotThrow(() =>
    defineComponentContract(tokens, {
      ...componentFixture(tokens),
      styling: {
        root: {
          fill: "foundation.tokens.color.fill.primary",
          text: "foundation.tokens.color.text.on-primary",
          overlay: "foundation.tokens.color.overlay.scrim",
          opacity: "foundation.tokens.opacity.overlay.scrim-strong",
          fontStyle: "foundation.tokens.style.control.default",
        },
      },
    }),
  );

  assert.throws(
    () =>
      defineComponentContract(tokens, {
        ...componentFixture(tokens),
        styling: {
          root: { fill: "foundation.tokens.size.control.medium" },
        },
      } as never),
    /wrong token type/,
  );

  assert.throws(
    () =>
      defineComponentContract(tokens, {
        ...componentFixture(tokens),
        styling: {
          root: { fontStyle: "foundation.tokens.color.fill.primary" },
        },
      } as never),
    /wrong token type/,
  );

  assert.throws(
    () =>
      defineComponentContract(tokens, {
        ...componentFixture(tokens),
        styling: {
          root: { overlay: "foundation.tokens.opacity.overlay.scrim" },
        },
      } as never),
    /wrong token type/,
  );

  assert.throws(
    () =>
      defineComponentContract(tokens, {
        ...componentFixture(tokens),
        styling: {
          root: { opacity: "foundation.tokens.color.overlay.scrim" },
        },
      } as never),
    /wrong token type/,
  );

  for (const property of ["background", "foreground"] as const) {
    assert.throws(
      () =>
        defineComponentContract(tokens, {
          ...componentFixture(tokens),
          styling: {
            root: { [property]: "foundation.tokens.color.fill.primary" },
          },
        } as never),
      /not a supported style property/,
    );
  }
});

test("validates resolver context keys exactly", () => {

  const tokens = tokensFixture();

  assert.throws(
    () => resolveToken(tokens, "color.fill.primary", { platform: "tv", colorScheme: "light" } as never),
    /platform/,
  );
  assert.throws(
    () => resolveToken(tokens, "color.fill.primary", { platform: "tablet" } as never),
    /platform/,
  );
  assert.throws(
    () => resolveToken(tokens, "color.fill.primary", { platform: "mobile", density: "compact", colorScheme: "light" } as never),
    /invalid fields/,
  );
  assert.throws(
    () =>
      resolveToken(tokens, "color.fill.primary", {
        platform: "desktop",
        colorScheme: "light",
        density: "compact",
      } as never),
    /invalid fields/,
  );
});

test("rejects schema v1, mismatched modes, and flat platform dimension leaves", () => {
  const tokens = tokensFixture();

  assert.throws(
    () => defineTokensContract({ ...tokens, schemaVersion: 1 as never }),
    /invalid schema/,
  );
  assert.throws(
    () => defineTokensContract({ ...tokens, modes: { ...TOKEN_MODES, density: ["wide", "compact"] } as never }),
    /invalid fields/,
  );
});

test("renders mobile and desktop platform defaults", () => {
  const tokens = tokensFixture();
  const css = generateTokenOutputs(tokens)
    .find((output) => output.path === "foundations/tokens/Tokens.css")?.contents;

  assert.ok(css);
  assert.match(css, /\[data-platform="mobile"\]/);

  const changed = defineTokensContract({
    ...tokens,
    tokens: {
      ...tokens.tokens,
      "breakpoint.sm": { $type: "dimension", $value: dimension(768) },
    },
  });
  const changedCss = generateTokenOutputs(changed)
    .find((output) => output.path === "foundations/tokens/Tokens.css")?.contents;
  assert.ok(changedCss);

});

test("validates angle and font-style primitives", () => {
  const angleTokens = defineTokensContract({
    ...tokensFixture(),
    tokens: {
      ...tokensFixture().tokens,
      "angle.skew.test": { $type: "angle", $value: { value: -12, unit: "deg" } },
      "style.italic": { $type: "fontStyle", $value: "italic" },
    },
  });
  assert.deepEqual(resolveToken(angleTokens, "angle.skew.test", { platform: "desktop", colorScheme: "light" }), { value: -12, unit: "deg" });
  assert.equal(resolveToken(angleTokens, "style.italic", { platform: "desktop", colorScheme: "light" }), "italic");
  assert.throws(
    () => defineTokensContract({
      ...tokensFixture(),
      tokens: {
        ...tokensFixture().tokens,
        "dimension.degrees": { $type: "dimension", $value: { value: 1, unit: "deg" as never } },
      },
    }),
    /unit is invalid/,
  );
});
