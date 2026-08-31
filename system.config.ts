import {
  exactKeys,
  fail,
  nonemptyString,
} from "./contracts/validation.ts";

export type SystemConfig = Readonly<{
  schemaVersion: 1;
  systemId: string;
  displayName: string;
  packageScope: `@${string}`;
  packages: Readonly<{
    ui: string;
    tokens: string;
    icons: string;
  }>;
}>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const packageScope = /^@[a-z0-9][a-z0-9-]*$/;
const packageLabel = /^[a-z0-9][a-z0-9-]*$/;

export function defineSystemConfig(value: SystemConfig): SystemConfig {
  const config = exactKeys(
    value,
    ["schemaVersion", "systemId", "displayName", "packageScope", "packages"],
    "systemConfig",
  );
  if (config.schemaVersion !== 1) fail("systemConfig has an invalid schema");

  const id = nonemptyString(config.systemId, "systemConfig.systemId");
  if (!uuid.test(id)) fail("systemConfig.systemId must be a UUID");

  nonemptyString(config.displayName, "systemConfig.displayName");
  const scope = nonemptyString(config.packageScope, "systemConfig.packageScope");
  if (!packageScope.test(scope)) fail("systemConfig.packageScope is invalid");

  const packages = exactKeys(
    config.packages,
    ["ui", "tokens", "icons"],
    "systemConfig.packages",
  );
  const labels = Object.entries(packages).map(([name, label]) => {
    const normalized = nonemptyString(label, `systemConfig.packages.${name}`);
    if (!packageLabel.test(normalized)) {
      fail(`systemConfig.packages.${name} is invalid`);
    }
    return normalized;
  });
  if (new Set(labels).size !== labels.length) {
    fail("systemConfig.packages must be unique");
  }

  return Object.freeze({
    ...value,
    packages: Object.freeze({ ...value.packages }),
  });
}

export const systemConfig = defineSystemConfig({
  schemaVersion: 1,
  systemId: "7c1d3e2a-9f64-4b8e-a1d7-6e5c2f908314",
  displayName: "Linden",
  packageScope: "@linden",
  packages: {
    ui: "ui",
    tokens: "tokens",
    icons: "icons",
  },
});
