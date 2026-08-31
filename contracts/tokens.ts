import type { Validated } from "./core.ts";
import {
  denseArray,
  exactKeys,
  fail,
  nonemptyString,
  oneOf,
  plainObject,
} from "./validation.ts";

export type TokenType =
  | "angle"
  | "color"
  | "cubicBezier"
  | "dimension"
  | "duration"
  | "fontFamily"
  | "fontStyle"
  | "fontWeight"
  | "number"
  | "shadow"
  | "transition";

export const TOKEN_MODES = {
  platform: ["mobile", "desktop"] as const,
  colorScheme: ["light", "dark"] as const,
} as const;

const contrastUsages = ["normal-text", "large-text", "non-text"] as const;

export type Platform = (typeof TOKEN_MODES.platform)[number];
export type ColorScheme = (typeof TOKEN_MODES.colorScheme)[number];
export type ContrastUsage = (typeof contrastUsages)[number];
export type TokenModeContext = Readonly<{ platform: Platform; colorScheme: ColorScheme }>;

const tokenPath =
  /^(angle|color|dimension|size|leading|tracking|family|weight|style|opacity|radius|border-width|focus-ring|blur|breakpoint|container|gap|padding|margin|gutter|motion|elevation|z-index)(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
const aliasPath =
  /^\{(angle|color|dimension|size|leading|tracking|family|weight|style|opacity|radius|border-width|focus-ring|blur|breakpoint|container|gap|padding|margin|gutter|motion|elevation|z-index)(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+\}$/;
const platformDimensionBasePath =
  /^(?:dimension\.[a-z0-9]+(?:-[a-z0-9]+)*|(?:size|leading|tracking)\.[a-z0-9]+(?:-[a-z0-9]+)*)$/;
type AliasTarget = `{${string}}`;

type ColorValue = Readonly<{
  colorSpace: "srgb";
  components: readonly [number, number, number];
  alpha?: number;
  hex?: string;
}>;
type DimensionValue = Readonly<{
  value: number;
  unit: "px" | "rem";
}>;
type DurationValue = Readonly<{
  value: number;
  unit: "ms" | "s";
}>;
type AngleValue = Readonly<{
  value: number;
  unit: "deg";
}>;
type CubicBezierValue = readonly [number, number, number, number];
type ShadowLeafValue = Readonly<{
  color: ColorLeafValue;
  offsetX: DimensionLeafValue;
  offsetY: DimensionLeafValue;
  blur: DimensionLeafValue;
  spread: DimensionLeafValue;
  inset: boolean;
}>;
type ShadowValue = readonly ShadowLeafValue[];
type TransitionValue = Readonly<{
  duration: DurationLeafValue;
  delay: DurationLeafValue;
  timingFunction: CubicBezierValue | AliasTarget;
}>;

type ColorModeValue = Readonly<{
  colorScheme: Readonly<{
    light: ColorLeafValue;
    dark: ColorLeafValue;
  }>;
}>;
type DimensionModeValue = Readonly<{
  platform: Readonly<{
    mobile: DimensionLeafValue;
    desktop: DimensionLeafValue;
  }>;
}>;

type ColorLeafValue = ColorValue | AliasTarget;
type DimensionLeafValue = DimensionValue | AliasTarget;
type DurationLeafValue = DurationValue | AliasTarget;
type AngleLeafValue = AngleValue | AliasTarget;
type FontStyleLeafValue = "italic" | "normal" | AliasTarget;
type FontWeightLeafValue = number | AliasTarget;
type NumberLeafValue = number | AliasTarget;
type TokenValue = ColorValue | DimensionValue | DurationValue | AngleValue | CubicBezierValue | ShadowValue | TransitionValue | string | number;

export type TokenDefinition =
  | Readonly<{
      $type: "angle";
      $value: AngleLeafValue;
      $description?: string;
    }>
  | Readonly<{
      $type: "color";
      $value: ColorValue | ColorModeValue | AliasTarget;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "cubicBezier";
      $value: CubicBezierValue | AliasTarget;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "dimension";
      $value: DimensionValue | DimensionModeValue | AliasTarget;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "duration";
      $value: DurationLeafValue;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "fontFamily";
      $value: string | AliasTarget;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "fontStyle";
      $value: FontStyleLeafValue;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "fontWeight";
      $value: FontWeightLeafValue;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "number";
      $value: NumberLeafValue;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "shadow";
      $value: ShadowValue | AliasTarget;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      $type: "transition";
      $value: TransitionValue | AliasTarget;
      $description?: string;
      $extensions?: Readonly<Record<string, unknown>>;
    }>;

export type ContrastPair = Readonly<{
  id: string;
  foreground: string;
  background: string;
  overlay?: string;
  usage: ContrastUsage;
}>;

export type TokensContract<TTokens extends Record<string, TokenDefinition> = Record<string, TokenDefinition>> = {
  readonly id: "foundation.tokens";
  readonly schemaVersion: 2;
  readonly purpose: string;
  readonly modes: typeof TOKEN_MODES;
  readonly tokens: TTokens;
  readonly contrastPairs: readonly ContrastPair[];
};

export type TokenReference<TokenName extends string = string> = `foundation.tokens.${TokenName}`;

const hexColor = /^#[0-9a-fA-F]{6}$/;
const tokenContractFields = ["id", "schemaVersion", "purpose", "modes", "tokens", "contrastPairs"] as const;
const contrastRatios: Record<ContrastUsage, number> = {
  "normal-text": 4.5,
  "large-text": 3,
  "non-text": 3,
};

function color(value: unknown, path: string): ColorValue {
  const source = plainObject(value, path);
  if (
    source.colorSpace !== "srgb" ||
    !Array.isArray(source.components) ||
    source.components.length !== 3
  ) {
    fail(`${path} is not a supported srgb color`);
  }
  const components = source.components as readonly unknown[];
  for (const [index, component] of components.entries()) {
    if (
      typeof component !== "number" ||
      !Number.isFinite(component) ||
      component < 0 ||
      component > 1
    ) {
      fail(`${path}.components[${index}] must be between 0 and 1`);
    }
  }
  for (const key of Object.keys(source)) {
    if (!["colorSpace", "components", "alpha", "hex"].includes(key)) {
      fail(`${path} has invalid fields`);
    }
  }
  if (
    Object.hasOwn(source, "alpha") &&
    (typeof source.alpha !== "number" ||
      !Number.isFinite(source.alpha) ||
      source.alpha < 0 ||
      source.alpha > 1)
  ) {
    fail(`${path}.alpha must be between 0 and 1`);
  }
  if (
    Object.hasOwn(source, "hex") &&
    (typeof source.hex !== "string" || !hexColor.test(source.hex))
  ) {
    fail(`${path}.hex must be a six-digit hex color`);
  }
  return value as ColorValue;
}

function dimension(value: unknown, path: string, allowNegative = false): DimensionValue {
  const source = exactKeys(value, ["value", "unit"], path);
  if (
    typeof source.value !== "number" ||
    !Number.isFinite(source.value) ||
    (!allowNegative && source.value < 0)
  ) {
    fail(`${path}.value must be a ${allowNegative ? "finite" : "nonnegative finite"} number`);
  }
  oneOf(source.unit, ["px", "rem"] as const, `${path}.unit`);
  return value as DimensionValue;
}

function duration(value: unknown, path: string): DurationValue {
  const source = exactKeys(value, ["value", "unit"], path);
  if (
    typeof source.value !== "number" ||
    !Number.isFinite(source.value) ||
    source.value < 0
  ) {
    fail(`${path}.value must be a nonnegative finite number`);
  }
  oneOf(source.unit, ["ms", "s"] as const, `${path}.unit`);
  return value as DurationValue;
}

function angle(value: unknown, path: string): AngleValue {
  const source = exactKeys(value, ["value", "unit"], path);
  if (typeof source.value !== "number" || !Number.isFinite(source.value)) {
    fail(`${path}.value must be a finite number`);
  }
  oneOf(source.unit, ["deg"] as const, `${path}.unit`);
  return value as AngleValue;
}

function cubicBezier(value: unknown, path: string): CubicBezierValue {
  const values = denseArray(value, path);
  if (values.length !== 4) fail(`${path} must contain four coordinates`);
  for (const [index, coordinate] of values.entries()) {
    if (typeof coordinate !== "number" || !Number.isFinite(coordinate)) {
      fail(`${path}[${index}] must be a finite number`);
    }
  }
  const coordinates = values as number[];
  if (coordinates[0] < 0 || coordinates[0] > 1 || coordinates[2] < 0 || coordinates[2] > 1) {
    fail(`${path} x coordinates must be between 0 and 1`);
  }
  return coordinates as unknown as CubicBezierValue;
}

function fontWeight(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 1000
  ) {
    fail(`${path} must be an integer from 1 to 1000`);
  }
  return value as number;
}

function numberValue(value: unknown, path: string, constrainOpacity: boolean): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${path} must be a finite number`);
  }
  const number = value as number;
  if (constrainOpacity && (number < 0 || number > 1)) {
    fail(`${path} must be between 0 and 1`);
  }
  return value as number;
}

function isAlias(value: unknown, path: string): value is AliasTarget {
  if (typeof value !== "string") return false;
  if (!value.startsWith("{") && !value.endsWith("}")) return false;
  if (!aliasPath.test(value)) fail(`${path} is not a supported token path`);
  return true;
}

function validateModesArray(
  value: unknown,
  expected: readonly string[],
  path: string,
): void {
  const modes = denseArray(value, path);
  if (modes.length !== expected.length) {
    fail(`${path} has invalid fields`);
  }
  for (const [index, mode] of expected.entries()) {
    if (modes[index] !== mode) fail(`${path} has invalid fields`);
  }
}

function aliasToTokenName(alias: AliasTarget): string {
  return alias.slice(1, -1);
}

function validateColorLeaf(value: unknown, path: string): void {
  if (isAlias(value, `${path}.`)) return;
  color(value, path);
}

function validateDimensionLeaf(value: unknown, path: string, allowNegative = false): void {
  if (isAlias(value, `${path}.`)) return;
  dimension(value, path, allowNegative);
}

function validateFontWeightLeaf(value: unknown, path: string): void {
  if (isAlias(value, `${path}.`)) return;
  fontWeight(value, path);
}

function validateFontFamilyLeaf(value: unknown, path: string): void {
  if (isAlias(value, `${path}.`)) return;
  nonemptyString(value, path);
}

function validateFontStyleLeaf(value: unknown, path: string): void {
  if (isAlias(value, `${path}.`)) return;
  oneOf(value, ["italic", "normal"] as const, path);
}

function validateDurationLeaf(value: unknown, path: string): void {
  if (isAlias(value, `${path}.`)) return;
  duration(value, path);
}

function validateCubicBezierLeaf(value: unknown, path: string): void {
  if (isAlias(value, `${path}.`)) return;
  cubicBezier(value, path);
}

function validateShadowLeaf(value: unknown, path: string): void {
  const source = exactKeys(value, ["color", "offsetX", "offsetY", "blur", "spread", "inset"], path);
  validateColorLeaf(source.color, `${path}.color`);
  validateDimensionLeaf(source.offsetX, `${path}.offsetX`, true);
  validateDimensionLeaf(source.offsetY, `${path}.offsetY`, true);
  validateDimensionLeaf(source.blur, `${path}.blur`);
  validateDimensionLeaf(source.spread, `${path}.spread`, true);
  if (typeof source.inset !== "boolean") fail(`${path}.inset must be a boolean`);
}

function validateShadowValue(value: unknown, path: string): void {
  if (isAlias(value, path)) return;
  const shadows = denseArray(value, path);
  for (const [index, shadow] of shadows.entries()) validateShadowLeaf(shadow, `${path}[${index}]`);
}

function validateTransitionValue(value: unknown, path: string): void {
  if (isAlias(value, path)) return;
  const source = exactKeys(value, ["duration", "delay", "timingFunction"], path);
  validateDurationLeaf(source.duration, `${path}.duration`);
  validateDurationLeaf(source.delay, `${path}.delay`);
  validateCubicBezierLeaf(source.timingFunction, `${path}.timingFunction`);
}

function validateValue(type: TokenType, value: unknown, path: string, root: string): void {
  if (type === "angle") {
    if (isAlias(value, `${path}`)) return;
    angle(value, path);
    return;
  }
  if (type === "color") {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const source = plainObject(value, `${path}`);
      const hasScheme = Object.hasOwn(source, "colorScheme");
      const hasPlatform = Object.hasOwn(source, "platform");
      if (hasScheme || hasPlatform) {
        if (!hasScheme || hasPlatform) {
          fail(`${path} has invalid fields`);
        }
        const modes = exactKeys(source, ["colorScheme"], `${path}`);
        const colorScheme = exactKeys(modes.colorScheme, [...TOKEN_MODES.colorScheme], `${path}.colorScheme`);
        validateColorLeaf(colorScheme.light, `${path}.colorScheme.light`);
        validateColorLeaf(colorScheme.dark, `${path}.colorScheme.dark`);
        return;
      }
    }
    if (typeof value === "string") {
      if (value.startsWith("{") || value.endsWith("}")) { isAlias(value, path); return; }
      fail(`${path} is not a supported token path`);
    }
    if (isAlias(value, `${path}`)) return;
    color(value, `${path}`);
    return;
  }
  if (type === "cubicBezier") {
    validateCubicBezierLeaf(value, path);
    return;
  }
  if (type === "dimension") {
    const allowNegative = root === "tracking";
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const source = plainObject(value, `${path}`);
      const hasScheme = Object.hasOwn(source, "colorScheme");
      const hasPlatform = Object.hasOwn(source, "platform");
      if (hasScheme || hasPlatform) {
        if (!hasPlatform || hasScheme) {
          fail(`${path} has invalid fields`);
        }
        const modes = exactKeys(source, ["platform"], `${path}`);
        const platform = exactKeys(modes.platform, [...TOKEN_MODES.platform], `${path}.platform`);
        validateDimensionLeaf(platform.mobile, `${path}.platform.mobile`, allowNegative);
        validateDimensionLeaf(platform.desktop, `${path}.platform.desktop`, allowNegative);
        return;
      }
    }
    if (typeof value === "string") {
      if (value.startsWith("{") || value.endsWith("}")) { isAlias(value, path); return; }
      fail(`${path} is not a supported token path`);
    }
    if (isAlias(value, `${path}`)) return;
    dimension(value, `${path}`, allowNegative);
    return;
  }
  if (type === "fontWeight") {
    validateFontWeightLeaf(value, `${path}`);
    return;
  }
  if (type === "fontFamily") {
    validateFontFamilyLeaf(value, `${path}`);
    return;
  }
  if (type === "fontStyle") {
    validateFontStyleLeaf(value, `${path}`);
    return;
  }
  if (type === "duration") {
    if (isAlias(value, `${path}`)) return;
    duration(value, `${path}`);
    return;
  }
  if (type === "shadow") {
    validateShadowValue(value, path);
    return;
  }
  if (type === "transition") {
    validateTransitionValue(value, path);
    return;
  }
  if (isAlias(value, `${path}`)) return;
  numberValue(value, `${path}`, root === "opacity");
}

function validateDefinition(value: unknown, path: string, root: string): TokenDefinition {
  const source = plainObject(value, path);
  const keys = Object.keys(source);
  if (
    keys.length < 2 ||
    keys.length > 4 ||
    !keys.includes("$type") ||
    !keys.includes("$value") ||
    keys.some((key) => !["$type", "$value", "$description", "$extensions"].includes(key)) ||
    (Object.hasOwn(source, "$description") && typeof source.$description !== "string") ||
    (Object.hasOwn(source, "$extensions") && (source.$extensions === null || typeof source.$extensions !== "object" || Array.isArray(source.$extensions)))
  ) {
    fail(`${path} has invalid fields`);
  }
  const type = oneOf(source.$type, ["angle", "color", "cubicBezier", "dimension", "duration", "fontFamily", "fontStyle", "fontWeight", "number", "shadow", "transition"] as const, `${path}.$type`);
  if (Object.hasOwn(source, "$description")) {
    nonemptyString(source.$description, `${path}.$description`);
  }
  validateValue(type, source.$value, `${path}.$value`, root);
  return source as TokenDefinition;
}

function collectAliasTargets(
  type: TokenType,
  value: unknown,
  path: string,
  visit: (alias: AliasTarget, path: string, type: TokenType) => void,
): void {
  if (isAlias(value, `${path}`)) {
    visit(value, path, type);
    return;
  }
  if (type === "color") {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const source = plainObject(value, `${path}`);
      if (Object.hasOwn(source, "colorScheme")) {
        const modes = exactKeys(source, ["colorScheme"], path);
        const colorScheme = exactKeys(modes.colorScheme, [...TOKEN_MODES.colorScheme], `${path}.colorScheme`);
        collectAliasTargets(type, colorScheme.light, `${path}.colorScheme.light`, visit);
        collectAliasTargets(type, colorScheme.dark, `${path}.colorScheme.dark`, visit);
      }
    }
    return;
  }
  if (type === "dimension") {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const source = plainObject(value, `${path}`);
      if (Object.hasOwn(source, "platform")) {
        const modes = exactKeys(source, ["platform"], path);
        const platform = exactKeys(modes.platform, [...TOKEN_MODES.platform], `${path}.platform`);
        collectAliasTargets(type, platform.mobile, `${path}.platform.mobile`, visit);
        collectAliasTargets(type, platform.desktop, `${path}.platform.desktop`, visit);
      }
    }
    return;
  }
  if (type === "shadow") {
    if (isAlias(value, path)) return;
    const shadows = denseArray(value, path);
    for (const [index, shadow] of shadows.entries()) {
      const source = exactKeys(shadow, ["color", "offsetX", "offsetY", "blur", "spread", "inset"], `${path}[${index}]`);
      collectAliasTargets("color", source.color, `${path}[${index}].color`, visit);
      for (const field of ["offsetX", "offsetY", "blur", "spread"] as const) {
        collectAliasTargets("dimension", source[field], `${path}[${index}].${field}`, visit);
      }
    }
    return;
  }
  if (type === "transition") {
    if (isAlias(value, path)) return;
    const source = exactKeys(value, ["duration", "delay", "timingFunction"], path);
    collectAliasTargets("duration", source.duration, `${path}.duration`, visit);
    collectAliasTargets("duration", source.delay, `${path}.delay`, visit);
    collectAliasTargets("cubicBezier", source.timingFunction, `${path}.timingFunction`, visit);
    return;
  }
}

function validateAliases(
  tokens: Record<string, TokenDefinition>,
  names: readonly string[],
): void {
  const checkTypeAndExistence = (alias: AliasTarget, path: string, type: TokenType) => {
    const targetName = aliasToTokenName(alias);
    const target = tokens[targetName];
    if (!tokenPath.test(targetName)) fail(`${path} is not a supported token path`);
    if (!target) fail(`${path} references an unknown token`);
    if (target.$type !== type) fail(`${path} references a token with a wrong type`);
  };
  for (const name of names) {
    const type = tokens[name].$type;
    collectAliasTargets(type, tokens[name].$value, `tokens.tokens.${name}.$value`, (alias, aliasPath, aliasType) => {
      checkTypeAndExistence(alias, aliasPath, aliasType);
    });
  }
}

function toLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(colorValue: ColorValue): number {
  const [red, green, blue] = colorValue.components;
  return (
    0.2126 * toLinear(red) +
    0.7152 * toLinear(green) +
    0.0722 * toLinear(blue)
  );
}

function compositeForeground(foreground: ColorValue, background: ColorValue): ColorValue {
  const alpha = foreground.alpha ?? 1;
  if (alpha >= 1) return foreground;
  return {
    colorSpace: "srgb",
    components: [
      foreground.components[0] * alpha + background.components[0] * (1 - alpha),
      foreground.components[1] * alpha + background.components[1] * (1 - alpha),
      foreground.components[2] * alpha + background.components[2] * (1 - alpha),
    ] as const,
  };
}

function ensureOpaqueBackground(background: ColorValue): void {
  if (Object.hasOwn(background, "alpha") && background.alpha !== undefined && background.alpha < 1) {
    fail("contrast background must be opaque");
  }
}

function contrastRatio(foreground: ColorValue, background: ColorValue): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const light = Math.max(foregroundLuminance, backgroundLuminance) + 0.05;
  const dark = Math.min(foregroundLuminance, backgroundLuminance) + 0.05;
  return light / dark;
}

export function resolveToken(
  tokens: Validated<TokensContract>,
  name: string,
  context: TokenModeContext,
): TokenValue {
  const contextObject = plainObject(context, `${name}.context`);
  const platform = oneOf(contextObject.platform, TOKEN_MODES.platform, `${name}.context.platform`);
  const contextShape = exactKeys(contextObject, ["platform", "colorScheme"], `${name}.context`);
  const colorScheme = oneOf(contextShape.colorScheme, TOKEN_MODES.colorScheme, `${name}.context.colorScheme`);
  const currentPath = "tokens.tokens";
  const resolving = new Set<string>();

  const resolveDefinition = (definition: TokenDefinition): TokenValue => {
    if (definition.$type === "angle") {
      return resolveAngleValue(definition.$value);
    }
    if (definition.$type === "color") {
      return resolveColorValue(definition.$value);
    }
    if (definition.$type === "cubicBezier") {
      return resolveCubicBezierValue(definition.$value);
    }
    if (definition.$type === "dimension") {
      return resolveDimensionValue(definition.$value);
    }
    if (definition.$type === "duration") {
      return resolveDurationValue(definition.$value);
    }
    if (definition.$type === "fontFamily") {
      return resolveFontFamilyValue(definition.$value);
    }
    if (definition.$type === "fontStyle") {
      return resolveFontStyleValue(definition.$value);
    }
    if (definition.$type === "fontWeight") {
      return resolveFontWeightValue(definition.$value);
    }
    if (definition.$type === "number") {
      return resolveNumberValue(definition.$value);
    }
    if (definition.$type === "shadow") {
      return resolveShadowValue(definition.$value);
    }
    if (definition.$type === "transition") {
      return resolveTransitionValue(definition.$value);
    }
    return fail("unknown token type");
  };

  const resolveTokenValue = (tokenName: string): TokenValue => {
    const definition = tokens.tokens[tokenName];
    if (!definition) fail(`unknown token ${tokenName}`);
    if (resolving.has(tokenName)) fail(`alias cycle detected at ${tokenName}`);
    resolving.add(tokenName);
    const value = resolveDefinition(definition as TokenDefinition);
    resolving.delete(tokenName);
    return value;
  };

  const resolveColorValue = (value: unknown): ColorValue => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as ColorValue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const source = plainObject(value, `${currentPath}.${name}.$value`);
      if (Object.hasOwn(source, "colorScheme")) {
        const modes = exactKeys(source, ["colorScheme"], `${currentPath}.${name}.$value`);
        const axis = exactKeys(modes.colorScheme, [...TOKEN_MODES.colorScheme], `${currentPath}.${name}.$value.colorScheme`);
        const modeValue = axis[colorScheme];
        if (isAlias(modeValue, `${currentPath}.${name}.$value.colorScheme.${colorScheme}`)) {
          return resolveTokenValue(aliasToTokenName(modeValue as AliasTarget)) as ColorValue;
        }
        return color(modeValue, `${currentPath}.${name}.$value.colorScheme.${colorScheme}`);
      }
    }
    return color(value, `${currentPath}.${name}.$value`);
  };

  const resolveAngleValue = (value: unknown): AngleValue => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as AngleValue;
    }
    return angle(value, `${currentPath}.${name}.$value`);
  };

  const resolveCubicBezierValue = (value: unknown): CubicBezierValue => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as CubicBezierValue;
    }
    return cubicBezier(value, `${currentPath}.${name}.$value`);
  };

  const resolveDimensionValue = (value: unknown): DimensionValue => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as DimensionValue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const source = plainObject(value, `${currentPath}.${name}.$value`);
      if (Object.hasOwn(source, "platform")) {
        const modes = exactKeys(source, ["platform"], `${currentPath}.${name}.$value`);
        const axis = exactKeys(modes.platform, [...TOKEN_MODES.platform], `${currentPath}.${name}.$value.platform`);
        const modeValue = axis[platform];
        const modePath = `${currentPath}.${name}.$value.platform.${platform}`;
        if (isAlias(modeValue, modePath)) {
          return resolveTokenValue(aliasToTokenName(modeValue as AliasTarget)) as DimensionValue;
        }
        return dimension(modeValue, modePath, name.startsWith("tracking."));
      }
    }
    return dimension(value, `${currentPath}.${name}.$value`, name.startsWith("tracking."));
  };

  const resolveFontWeightValue = (value: unknown): number => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as number;
    }
    return fontWeight(value, `${currentPath}.${name}.$value`);
  };

  const resolveDurationValue = (value: unknown): DurationValue => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as DurationValue;
    }
    return duration(value, `${currentPath}.${name}.$value`);
  };

  const resolveShadowValue = (value: unknown): ShadowValue => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as ShadowValue;
    }
    const shadows = denseArray(value, `${currentPath}.${name}.$value`);
    return shadows.map((shadow, index) => {
      const path = `${currentPath}.${name}.$value[${index}]`;
      const source = exactKeys(shadow, ["color", "offsetX", "offsetY", "blur", "spread", "inset"], path);
      const resolveColorLeaf = (leaf: unknown, leafPath: string): ColorValue =>
        isAlias(leaf, leafPath)
          ? resolveTokenValue(aliasToTokenName(leaf)) as ColorValue
          : color(leaf, leafPath);
      const resolveDimensionLeaf = (leaf: unknown, leafPath: string, allowNegative = false): DimensionValue =>
        isAlias(leaf, leafPath)
          ? resolveTokenValue(aliasToTokenName(leaf)) as DimensionValue
          : dimension(leaf, leafPath, allowNegative);
      return {
        color: resolveColorLeaf(source.color, `${path}.color`),
        offsetX: resolveDimensionLeaf(source.offsetX, `${path}.offsetX`, true),
        offsetY: resolveDimensionLeaf(source.offsetY, `${path}.offsetY`, true),
        blur: resolveDimensionLeaf(source.blur, `${path}.blur`),
        spread: resolveDimensionLeaf(source.spread, `${path}.spread`, true),
        inset: source.inset as boolean,
      };
    });
  };

  const resolveTransitionValue = (value: unknown): TransitionValue => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as TransitionValue;
    }
    const source = exactKeys(value, ["duration", "delay", "timingFunction"], `${currentPath}.${name}.$value`);
    const resolveDurationLeaf = (leaf: unknown, path: string): DurationValue =>
      isAlias(leaf, path)
        ? resolveTokenValue(aliasToTokenName(leaf)) as DurationValue
        : duration(leaf, path);
    const resolveTimingFunction = (leaf: unknown, path: string): CubicBezierValue =>
      isAlias(leaf, path)
        ? resolveTokenValue(aliasToTokenName(leaf)) as CubicBezierValue
        : cubicBezier(leaf, path);
    return {
      duration: resolveDurationLeaf(source.duration, `${currentPath}.${name}.$value.duration`),
      delay: resolveDurationLeaf(source.delay, `${currentPath}.${name}.$value.delay`),
      timingFunction: resolveTimingFunction(source.timingFunction, `${currentPath}.${name}.$value.timingFunction`),
    };
  };

  const resolveFontFamilyValue = (value: unknown): string => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as string;
    }
    return nonemptyString(value, `${currentPath}.${name}.$value`);
  };

  const resolveFontStyleValue = (value: unknown): string => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as string;
    }
    return oneOf(value, ["italic", "normal"] as const, `${currentPath}.${name}.$value`);
  };

  const resolveNumberValue = (value: unknown): number => {
    if (isAlias(value, `${currentPath}.${name}.$value`)) {
      return resolveTokenValue(aliasToTokenName(value)) as number;
    }
    return numberValue(value, `${currentPath}.${name}.$value`, name.split(".")[0] === "opacity");
  };

  return resolveTokenValue(name);
}

function tokenModeContexts(): readonly TokenModeContext[] {
  return [
    ...TOKEN_MODES.colorScheme.map((colorScheme) => ({ platform: "mobile", colorScheme }) as const),
    ...TOKEN_MODES.colorScheme.map((colorScheme) => ({ platform: "desktop", colorScheme }) as const),
  ];
}

function validateContrasts(tokens: TokensContract): void {
  const items = denseArray(tokens.contrastPairs, "tokens.contrastPairs");
  const ids = new Set<string>();
  const required = ["id", "foreground", "background", "usage"] as const;
  if (!Array.isArray(items)) fail("tokens.contrastPairs must be an array");
  for (const [index, entry] of items.entries()) {
    const entryPath = `tokens.contrastPairs[${index}]`;
    const value = plainObject(entry, entryPath);
    const keys = Object.keys(value);
    if (
      keys.some((key) => ![...required, "overlay"].includes(key)) ||
      required.some((key) => !keys.includes(key))
    ) {
      fail(`${entryPath} has invalid fields`);
    }
    const source = value;
    const id = nonemptyString(source.id, `${entryPath}.id`);
    const foreground = nonemptyString(
      source.foreground,
      `${entryPath}.foreground`,
    );
    const background = nonemptyString(
      source.background,
      `${entryPath}.background`,
    );
    if (ids.has(id)) fail(`tokens.contrastPairs[${index}].id is duplicated`);
    ids.add(id);
    if (!tokenPath.test(foreground)) {
      fail(`tokens.contrastPairs[${index}].foreground is not a supported token path`);
    }
    if (!tokenPath.test(background)) {
      fail(`tokens.contrastPairs[${index}].background is not a supported token path`);
    }
    const usage = oneOf(source.usage, contrastUsages, `${entryPath}.usage`);
    let overlay: string | undefined;
    if (Object.hasOwn(source, "overlay")) {
      overlay = nonemptyString(source.overlay, `${entryPath}.overlay`);
      if (!tokenPath.test(overlay)) {
        fail(`${entryPath}.overlay is not a supported token path`);
      }
    }
    const foregroundType = getTokenType(tokens, foreground);
    if (foregroundType !== "color") {
      fail(`tokens.contrastPairs[${index}].foreground is not a color token`);
    }
    const backgroundType = getTokenType(tokens, background);
    if (backgroundType !== "color") {
      fail(`tokens.contrastPairs[${index}].background is not a color token`);
    }
    if (overlay !== undefined && getTokenType(tokens, overlay) !== "color") {
      fail(`${entryPath}.overlay is not a color token`);
    }
    for (const context of tokenModeContexts()) {
        const resolvedForeground = resolveToken(
          tokens as Validated<TokensContract>,
          foreground,
          context,
        ) as ColorValue;
        const resolvedBackground = resolveToken(
          tokens as Validated<TokensContract>,
          background,
          context,
        ) as ColorValue;
        ensureOpaqueBackground(resolvedBackground);
        const effectiveBackground = overlay
          ? compositeForeground(
              resolveToken(tokens as Validated<TokensContract>, overlay, context) as ColorValue,
              resolvedBackground,
            )
          : resolvedBackground;
        const ratio = contrastRatio(
          compositeForeground(resolvedForeground, effectiveBackground),
          effectiveBackground,
        );
        if (ratio < contrastRatios[usage]) {
          fail(`tokens.contrastPairs[${index}] fails in ${context.platform}/${context.colorScheme}`);
        }
    }
  }
}

export function getTokenType(
  tokens: TokensContract,
  name: string,
): TokenType | undefined {
  return tokens.tokens[name]?.$type;
}

export function defineTokensContract<
  const TTokens extends Record<string, TokenDefinition>,
>(value: TokensContract<TTokens>): Validated<TokensContract<TTokens>> {
  const contract = plainObject(value, "tokens") as TokensContract<TTokens>;
  const keys = Object.keys(contract).sort();
  const required = ["id", "schemaVersion", "purpose", "modes", "tokens", "contrastPairs"] as const;
  for (const key of required) {
    if (!(key in contract)) fail("tokens has invalid fields");
  }
  const allowed = [...tokenContractFields].sort();
  if (
    keys.length < required.length ||
    keys.length > tokenContractFields.length ||
    keys.some((key) => !allowed.includes(key as (typeof tokenContractFields)[number]))
  ) {
    fail("tokens has invalid fields");
  }

  if (
    contract.id !== "foundation.tokens" ||
    contract.schemaVersion !== 2 ||
    !contract.modes
  ) {
    fail("tokens has an invalid schema");
  }
  nonemptyString(contract.purpose, "tokens.purpose");
  const modeShape = plainObject(contract.modes, "tokens.modes");
  const modes = exactKeys(modeShape, ["platform", "colorScheme"], "tokens.modes");
  validateModesArray(modes.platform, TOKEN_MODES.platform, "tokens.modes.platform");
  validateModesArray(modes.colorScheme, TOKEN_MODES.colorScheme, "tokens.modes.colorScheme");

  if (contract.contrastPairs === undefined) {
    fail("tokens.contrastPairs is required");
  }

  if (!contract.tokens) fail("tokens.tokens is required");
  const tokens = plainObject(contract.tokens, "tokens.tokens");
  const names = Object.keys(tokens);
  if (names.length === 0) fail("tokens.tokens must not be empty");

  for (const name of names) {
    const root = name.split(".")[0];
    const validated = validateDefinition(tokens[name], `tokens.tokens.${name}`, root);
    if (!tokenPath.test(name)) {
      fail(`tokens.tokens.${name} is not a supported token path`);
    }
    const supportsRoot = (() => {
      if (validated.$type === "angle") return root === "angle" && name.startsWith("angle.skew.");
      if (validated.$type === "fontFamily") return root === "family";
      if (validated.$type === "fontStyle") return root === "style";
      if (validated.$type === "fontWeight") return root === "weight";
      if (validated.$type === "color") return root === "color";
      if (validated.$type === "number") return root === "opacity" || root === "motion" || root === "z-index";
      if (validated.$type === "duration" || validated.$type === "cubicBezier" || validated.$type === "transition") return root === "motion";
      if (validated.$type === "shadow") return root === "elevation";
      return root === "dimension" || root === "size" || root === "leading" || root === "tracking" || root === "radius" || root === "border-width" || root === "focus-ring" || root === "blur" || root === "breakpoint" || root === "container" || root === "gap" || root === "padding" || root === "margin" || root === "gutter";
    })();
    if (!supportsRoot) {
      fail(`tokens.tokens.${name} does not match its type`);
    }
    if (
      validated.$type === "dimension" &&
      validated.$value !== null &&
      typeof validated.$value === "object" &&
      "platform" in validated.$value &&
      !platformDimensionBasePath.test(name)
    ) {
      fail(`tokens.tokens.${name} may not own platform modes; alias a mode-aware base token`);
    }
  }
  validateAliases(tokens as Record<string, TokenDefinition>, names);

  const withContrasts = {
    ...contract,
    tokens,
    modes: TOKEN_MODES,
    contrastPairs: denseArray(contract.contrastPairs, "tokens.contrastPairs"),
  } as TokensContract<TTokens>;

  for (const name of names) {
    for (const context of tokenModeContexts()) {
      resolveToken(withContrasts as unknown as Validated<TokensContract>, name, context);
    }
  }

  if (contract.contrastPairs !== undefined) {
    if (!Array.isArray(contract.contrastPairs)) fail("tokens.contrastPairs is not an array");
    validateContrasts(withContrasts);
  }

  return withContrasts as Validated<TokensContract<TTokens>>;
}

export function tokenReference<
  TTokens extends Record<string, TokenDefinition>,
  TName extends Extract<keyof TTokens, string>,
>(
  _tokens: Validated<TokensContract<TTokens>>,
  name: TName,
): TokenReference<TName> {
  return `foundation.tokens.${name}`;
}
