import type { Validated } from "../contracts/core.ts";
import type {
  ColorScheme,
  TokenDefinition,
  TokenModeContext,
  TokenType,
  TokensContract,
} from "../contracts/tokens.ts";
import { systemConfig, type SystemConfig } from "../system.config.ts";
import {
  contractRevision,
  cssVariableName,
  GENERATOR_VERSION,
  generatedHeader,
  stableJson,
  tokenNameFromReference,
  validateCanonical,
  type GeneratedOutput,
} from "./core.ts";

type TokenLeaf = unknown;

function leafForMode(
  definition: TokenDefinition,
  context: TokenModeContext,
): TokenLeaf {
  const value = definition.$value as TokenLeaf;
  if (typeof value !== "object" || value === null) return value;
  if (definition.$type === "color" && "colorScheme" in value) {
    return (value.colorScheme as Record<ColorScheme, TokenLeaf>)[context.colorScheme];
  }
  if (definition.$type === "dimension" && "platform" in value) {
    const platform = value.platform as Record<string, TokenLeaf>;
    return platform[context.platform];
  }
  return value;
}

function finite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${path} must be a finite number`);
  }
  return value;
}

function decimal(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function cssValue(type: TokenType, value: TokenLeaf, path: string, config: SystemConfig): string {
  if (typeof value === "string") {
    if (value.startsWith("{") && value.endsWith("}")) {
      return `var(${cssVariableName(tokenNameFromReference(`foundation.tokens.${value.slice(1, -1)}`), config.packageScope)})`;
    }
    return value;
  }
  if (type === "color") {
    const color = value as Record<string, unknown>;
    const components = color.components;
    if (!Array.isArray(components) || components.length !== 3) {
      throw new TypeError(`${path} is not an srgb color`);
    }
    const [red, green, blue] = components.map((component, index) =>
      decimal(finite(component, `${path}.components[${index}]`) * 255),
    );
    const alpha = "alpha" in color ? decimal(finite(color.alpha, `${path}.alpha`)) : undefined;
    return alpha === undefined || alpha === "1"
      ? `rgb(${red} ${green} ${blue})`
      : `rgb(${red} ${green} ${blue} / ${alpha})`;
  }
  if (type === "dimension") {
    const dimension = value as Record<string, unknown>;
    if (dimension.unit !== "px" && dimension.unit !== "rem") {
      throw new TypeError(`${path}.unit is unsupported`);
    }
    return `${decimal(finite(dimension.value, `${path}.value`))}${dimension.unit}`;
  }
  if (type === "angle") {
    const angle = value as Record<string, unknown>;
    if (angle.unit !== "deg") {
      throw new TypeError(`${path}.unit is unsupported`);
    }
    return `${decimal(finite(angle.value, `${path}.value`))}deg`;
  }
  if (type === "duration") {
    const duration = value as Record<string, unknown>;
    if (duration.unit !== "ms" && duration.unit !== "s") {
      throw new TypeError(`${path}.unit is unsupported`);
    }
    return `${decimal(finite(duration.value, `${path}.value`))}${duration.unit}`;
  }
  if (type === "cubicBezier") {
    if (!Array.isArray(value) || value.length !== 4) {
      throw new TypeError(`${path} must be a cubic bezier`);
    }
    return `cubic-bezier(${value.map((coordinate, index) => decimal(finite(coordinate, `${path}[${index}]`))).join(", ")})`;
  }
  if (type === "shadow") {
    if (!Array.isArray(value)) throw new TypeError(`${path} must be a shadow list`);
    if (value.length === 0) return "none";
    return value.map((shadow, index) => {
      if (shadow === null || typeof shadow !== "object" || Array.isArray(shadow)) {
        throw new TypeError(`${path}[${index}] must be a shadow`);
      }
      const source = shadow as Record<string, TokenLeaf>;
      const dimensionPart = (field: "offsetX" | "offsetY" | "blur" | "spread") =>
        cssValue("dimension", source[field], `${path}[${index}].${field}`, config);
      const colorPart = cssValue("color", source.color, `${path}[${index}].color`, config);
      return `${source.inset === true ? "inset " : ""}${dimensionPart("offsetX")} ${dimensionPart("offsetY")} ${dimensionPart("blur")} ${dimensionPart("spread")} ${colorPart}`;
    }).join(", ");
  }
  if (type === "transition") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`${path} must be a transition`);
    }
    const transition = value as Record<string, TokenLeaf>;
    return `${cssValue("duration", transition.duration, `${path}.duration`, config)} ${cssValue("cubicBezier", transition.timingFunction, `${path}.timingFunction`, config)} ${cssValue("duration", transition.delay, `${path}.delay`, config)}`;
  }
  return decimal(finite(value, path));
}

function declarations(
  contract: Validated<TokensContract>,
  context: TokenModeContext,
  include: (definition: TokenDefinition) => boolean,
  config: SystemConfig,
  compareTo?: TokenModeContext,
): string[] {
  return Object.entries(contract.tokens)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .filter(([, definition]) => include(definition) && (!compareTo || stableJson(leafForMode(definition, context)) !== stableJson(leafForMode(definition, compareTo))))
    .map(([name, definition]) => {
      const value = leafForMode(definition, context);
      return `  ${cssVariableName(name, config.packageScope)}: ${cssValue(definition.$type, value, name, config)};`;
    });
}

function cssBlock(selector: string, values: readonly string[]): string {
  return `${selector} {\n${values.join("\n")}\n}`;
}

function renderCss(contract: Validated<TokensContract>, config: SystemConfig): string {
  const all = () => true;
  const dimensions = (definition: TokenDefinition) => definition.$type === "dimension";
  const colors = (definition: TokenDefinition) => definition.$type === "color";
  const mobile = { platform: "mobile", colorScheme: "light" } as const;
  const desktop = { platform: "desktop", colorScheme: "light" } as const;
  const desktopDark = { platform: "desktop", colorScheme: "dark" } as const;
  return `${generatedHeader(contract, "block", config)}${[
    cssBlock(":root", declarations(contract, desktop, all, config)),
    cssBlock('[data-platform="mobile"]', declarations(contract, mobile, dimensions, config, desktop)),
    cssBlock('[data-platform="desktop"]', declarations(contract, desktop, dimensions, config, mobile)),
    cssBlock('[data-color-scheme="dark"]', declarations(contract, desktopDark, colors, config)),
  ].join("\n\n")}\n`;
}

function renderTypeScript(contract: Validated<TokensContract>, config: SystemConfig): string {
  const names = Object.keys(contract.tokens).sort();
  const cssVariables = Object.fromEntries(names.map((name) => [name, cssVariableName(name, config.packageScope)]));
  const cssValues = Object.fromEntries(names.map((name) => [name, `var(${cssVariableName(name, config.packageScope)})`]));
  const references = Object.fromEntries(names.map((name) => [name, `foundation.tokens.${name}`]));
  const provenance = {
    systemId: config.systemId,
    packageScope: config.packageScope,
    contractId: contract.id,
    contractRevision: contractRevision(contract),
    generatorVersion: GENERATOR_VERSION,
    schemaVersion: contract.schemaVersion,
  };
  return `${generatedHeader(contract, "line", config)}export const tokenNames = ${JSON.stringify(names, null, 2)} as const;\n\nexport type TokenName = (typeof tokenNames)[number];\n\nexport const tokenCssVariables = ${JSON.stringify(cssVariables, null, 2)} as const satisfies Record<TokenName, string>;\n\nexport const tokenCssValues = ${JSON.stringify(cssValues, null, 2)} as const satisfies Record<TokenName, string>;\n\nexport const tokenReferences = ${JSON.stringify(references, null, 2)} as const satisfies Record<TokenName, \`foundation.tokens.\${TokenName}\`>;\n\nexport const tokenModes = ${JSON.stringify(contract.modes, null, 2)} as const;\n\nexport const tokenProvenance = ${JSON.stringify(provenance, null, 2)} as const;\n`;
}

function contractRevisionForData(contract: Validated<TokensContract>): string {
  return contractRevision(contract);
}

function renderDocumentation(contract: Validated<TokensContract>, config: SystemConfig): string {
  const names = Object.keys(contract.tokens).sort();
  const document = {
    kind: "token-documentation",
    id: contract.id,
    schemaVersion: contract.schemaVersion,
    revision: contractRevisionForData(contract),
    purpose: contract.purpose,
    modes: contract.modes,
    provenance: {
      systemId: config.systemId,
      packageScope: config.packageScope,
      generatorVersion: GENERATOR_VERSION,
    },
    tokens: Object.fromEntries(names.map((name) => [name, {
      ...contract.tokens[name],
      cssVariable: cssVariableName(name, config.packageScope),
      reference: `foundation.tokens.${name}`,
    }])),
    contrastPairs: [...contract.contrastPairs].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  };
  return `${generatedHeader(contract, "block", config)}const documentation = ${stableJson(document).trimEnd()};\nconst provenance = documentation.provenance;\n\nexport { documentation, provenance };\nexport default documentation;\n`;
}

export function generateTokenOutputs(
  contract: Validated<TokensContract>,
  config: SystemConfig = systemConfig,
): GeneratedOutput[] {
  validateCanonical(contract, "foundation.tokens");
  return [
    { path: "foundations/tokens/Tokens.css", contents: renderCss(contract, config) },
    { path: "foundations/tokens/Tokens.ts", contents: renderTypeScript(contract, config) },
    { path: "foundations/tokens/Tokens.doc.mjs", contents: renderDocumentation(contract, config) },
  ];
}

export function renderTokens(
  contract: Validated<TokensContract>,
  config: SystemConfig = systemConfig,
): GeneratedOutput[] {
  return generateTokenOutputs(contract, config);
}
