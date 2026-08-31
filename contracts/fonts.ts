import type { Validated } from "./core.ts";
import {
  denseArray,
  exactKeys,
  fail,
  nonemptyString,
  nonemptyUniqueStrings,
  oneOf,
} from "./validation.ts";

export type FontAssetDefinition = Readonly<{
  id: `font.${"sans" | "mono"}.${"normal" | "italic"}.${"woff2" | "ttf"}`;
  family: "Geist" | "Geist Mono";
  role: "sans" | "mono";
  style: "normal" | "italic";
  format: "woff2" | "ttf";
  weight: Readonly<{ min: 100; max: 900 }>;
  sourcePath: string;
  repositoryPath: string;
  sha256: string;
}>;

export type FontsContract = Readonly<{
  id: "foundation.fonts";
  schemaVersion: 1;
  purpose: string;
  source: Readonly<{
    npm: Readonly<{
      name: "geist";
      version: string;
      tarballUrl: string;
      integrity: string;
      sha256: string;
    }>;
    release: Readonly<{ url: string; sha256: string }>;
  }>;
  license: Readonly<{
    id: "OFL-1.1";
    repositoryPath: string;
    sha256: string;
  }>;
  fallbacks: Readonly<{
    sans: readonly string[];
    mono: readonly string[];
  }>;
  assets: readonly FontAssetDefinition[];
}>;

const sha256 = /^[a-f0-9]{64}$/;
const exactVersion = /^\d+\.\d+\.\d+$/;
const sha512Sri = /^sha512-[A-Za-z0-9+/]+={0,2}$/;
const expectedAssets = new Set([
  "font.sans.normal.woff2",
  "font.sans.italic.woff2",
  "font.sans.normal.ttf",
  "font.sans.italic.ttf",
  "font.mono.normal.woff2",
  "font.mono.italic.woff2",
  "font.mono.normal.ttf",
  "font.mono.italic.ttf",
]);

function validateSha(value: unknown, path: string): string {
  const digest = nonemptyString(value, path);
  if (!sha256.test(digest)) fail(`${path} must be a lowercase SHA-256 digest`);
  return digest;
}

function safeRelativePath(value: unknown, path: string): string {
  const result = nonemptyString(value, path);
  if (result.startsWith("/") || result.includes("\\") || result.split("/").includes("..")) {
    fail(`${path} must be a safe repository-relative path`);
  }
  return result;
}

export function defineFontsContract(value: FontsContract): Validated<FontsContract> {
  const contract = exactKeys(
    value,
    ["id", "schemaVersion", "purpose", "source", "license", "fallbacks", "assets"],
    "fonts",
  );
  if (contract.id !== "foundation.fonts" || contract.schemaVersion !== 1) {
    fail("fonts has an invalid schema");
  }
  nonemptyString(contract.purpose, "fonts.purpose");

  const source = exactKeys(contract.source, ["npm", "release"], "fonts.source");
  const npm = exactKeys(
    source.npm,
    ["name", "version", "tarballUrl", "integrity", "sha256"],
    "fonts.source.npm",
  );
  oneOf(npm.name, ["geist"] as const, "fonts.source.npm.name");
  const version = nonemptyString(npm.version, "fonts.source.npm.version");
  if (!exactVersion.test(version)) fail("fonts.source.npm.version must be exact");
  if (
    nonemptyString(npm.tarballUrl, "fonts.source.npm.tarballUrl") !==
    `https://registry.npmjs.org/geist/-/geist-${version}.tgz`
  ) {
    fail("fonts.source.npm.tarballUrl must match the pinned package version");
  }
  if (!sha512Sri.test(nonemptyString(npm.integrity, "fonts.source.npm.integrity"))) {
    fail("fonts.source.npm.integrity must be SHA-512 SRI");
  }
  validateSha(npm.sha256, "fonts.source.npm.sha256");

  const release = exactKeys(source.release, ["url", "sha256"], "fonts.source.release");
  const releaseUrl = nonemptyString(release.url, "fonts.source.release.url");
  if (
    releaseUrl !==
    `https://github.com/vercel/geist-font/releases/download/v${version}/geist-font-v${version}.zip`
  ) {
    fail("fonts.source.release.url must match the pinned package version");
  }
  validateSha(release.sha256, "fonts.source.release.sha256");

  const license = exactKeys(
    contract.license,
    ["id", "repositoryPath", "sha256"],
    "fonts.license",
  );
  oneOf(license.id, ["OFL-1.1"] as const, "fonts.license.id");
  const licensePath = safeRelativePath(license.repositoryPath, "fonts.license.repositoryPath");
  if (!licensePath.startsWith("foundations/assets/fonts/") || !licensePath.endsWith("/OFL.txt")) {
    fail("fonts.license.repositoryPath must identify the checked-in font license");
  }
  validateSha(license.sha256, "fonts.license.sha256");

  const fallbacks = exactKeys(contract.fallbacks, ["sans", "mono"], "fonts.fallbacks");
  const sansFallbacks = nonemptyUniqueStrings(fallbacks.sans, "fonts.fallbacks.sans");
  const monoFallbacks = nonemptyUniqueStrings(fallbacks.mono, "fonts.fallbacks.mono");
  if (sansFallbacks[0] !== "Geist" || sansFallbacks.at(-1) !== "sans-serif") {
    fail("fonts.fallbacks.sans must start with Geist and end with sans-serif");
  }
  if (monoFallbacks[0] !== "Geist Mono" || monoFallbacks.at(-1) !== "monospace") {
    fail("fonts.fallbacks.mono must start with Geist Mono and end with monospace");
  }

  const assets = denseArray(contract.assets, "fonts.assets");
  if (assets.length !== expectedAssets.size) fail("fonts.assets must contain eight files");
  const ids = new Set<string>();
  const sourcePaths = new Set<string>();
  const repositoryPaths = new Set<string>();
  for (const [index, assetValue] of assets.entries()) {
    const path = `fonts.assets[${index}]`;
    const asset = exactKeys(
      assetValue,
      ["id", "family", "role", "style", "format", "weight", "sourcePath", "repositoryPath", "sha256"],
      path,
    );
    const role = oneOf(asset.role, ["sans", "mono"] as const, `${path}.role`);
    const style = oneOf(asset.style, ["normal", "italic"] as const, `${path}.style`);
    const format = oneOf(asset.format, ["woff2", "ttf"] as const, `${path}.format`);
    const id = nonemptyString(asset.id, `${path}.id`);
    if (id !== `font.${role}.${style}.${format}` || !expectedAssets.has(id)) {
      fail(`${path}.id does not match its role, style, and format`);
    }
    if (ids.has(id)) fail(`${path}.id is duplicated`);
    ids.add(id);
    const family = oneOf(asset.family, ["Geist", "Geist Mono"] as const, `${path}.family`);
    if (family !== (role === "sans" ? "Geist" : "Geist Mono")) {
      fail(`${path}.family does not match its role`);
    }
    const weight = exactKeys(asset.weight, ["min", "max"], `${path}.weight`);
    if (weight.min !== 100 || weight.max !== 900) fail(`${path}.weight must be 100..900`);
    const sourcePath = safeRelativePath(asset.sourcePath, `${path}.sourcePath`);
    const repositoryPath = safeRelativePath(asset.repositoryPath, `${path}.repositoryPath`);
    if (!sourcePath.startsWith("dist/fonts/") || !sourcePath.endsWith(`.${format}`)) {
      fail(`${path}.sourcePath must identify the package font file`);
    }
    if (!repositoryPath.startsWith("foundations/assets/fonts/") || !repositoryPath.endsWith(`.${format}`)) {
      fail(`${path}.repositoryPath must identify the checked-in font file`);
    }
    if (sourcePaths.has(sourcePath) || repositoryPaths.has(repositoryPath)) {
      fail(`${path} has a duplicated file path`);
    }
    sourcePaths.add(sourcePath);
    repositoryPaths.add(repositoryPath);
    validateSha(asset.sha256, `${path}.sha256`);
  }
  if ([...expectedAssets].some((id) => !ids.has(id))) fail("fonts.assets is incomplete");

  return value as Validated<FontsContract>;
}
