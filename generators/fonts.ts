import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import type { Validated } from "../contracts/core.ts";
import type { FontAssetDefinition, FontsContract } from "../contracts/fonts.ts";
import { systemConfig, type SystemConfig } from "../system.config.ts";
import {
  cssVariable,
  generatedHeader,
  REPOSITORY_ROOT,
  validateCanonical,
  type GeneratedOutput,
} from "./core.ts";

const outputPath = "foundations/assets/Fonts.css";
const unquotedFamilies = new Set([
  "-apple-system",
  "system-ui",
  "ui-sans-serif",
  "ui-monospace",
  "sans-serif",
  "monospace",
]);

function verifyFile(repositoryPath: string, expectedSha256: string): void {
  const bytes = readFileSync(resolve(REPOSITORY_ROOT, repositoryPath));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expectedSha256) {
    throw new TypeError(
      `${repositoryPath} has SHA-256 ${actual}; expected ${expectedSha256}`,
    );
  }
}

function cssFamily(value: string): string {
  return unquotedFamilies.has(value) ? value : JSON.stringify(value);
}

function assetUrl(asset: FontAssetDefinition): string {
  const path = relative(dirname(outputPath), asset.repositoryPath).replaceAll("\\", "/");
  return path.startsWith(".") ? path : `./${path}`;
}

function renderFontFace(asset: FontAssetDefinition): string {
  return `@font-face {\n  font-family: ${JSON.stringify(asset.family)};\n  src: url(${JSON.stringify(assetUrl(asset))}) format("woff2");\n  font-style: ${asset.style};\n  font-weight: ${asset.weight.min} ${asset.weight.max};\n  font-display: swap;\n}`;
}

function renderCss(contract: Validated<FontsContract>, config: SystemConfig): string {
  const faces = contract.assets
    .filter((asset) => asset.format === "woff2")
    .map(renderFontFace)
    .join("\n\n");
  const sans = contract.fallbacks.sans.map(cssFamily).join(", ");
  const mono = contract.fallbacks.mono.map(cssFamily).join(", ");
  return `${generatedHeader(contract, "css", config)}${faces}\n\n:root {\n  ${cssVariable(config.packageScope, "font-family.base.sans")}: ${sans};\n  ${cssVariable(config.packageScope, "font-family.base.mono")}: ${mono};\n}\n`;
}

export function generateFontOutputs(
  contract: Validated<FontsContract>,
  config: SystemConfig = systemConfig,
): GeneratedOutput[] {
  validateCanonical(contract, "foundation.fonts");
  verifyFile(contract.license.repositoryPath, contract.license.sha256);
  for (const asset of contract.assets) verifyFile(asset.repositoryPath, asset.sha256);
  return [{ path: outputPath, contents: renderCss(contract, config) }];
}
