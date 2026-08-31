import type { Validated } from "./core.ts";
import {
  booleanValue,
  exactKeys,
  fail,
  nonemptyString,
  oneOf,
  plainObject,
} from "./validation.ts";

export type IconAssetDefinition = Readonly<{
  source: Readonly<{
    library: "lucide-react";
    exportName: string;
  }>;
}>;

export type IconsContract<
  TIcons extends Record<`icon.${string}`, IconAssetDefinition> = Record<
    `icon.${string}`,
    IconAssetDefinition
  >,
> = Readonly<{
  id: "foundation.icons";
  schemaVersion: 1;
  purpose: string;
  keyline: Readonly<{
    persistent: true;
    sizeOwner: "consumer-token";
    fit: "contain";
    color: "currentColor";
    swapGeometry: "fixed";
    decorativeByDefault: true;
  }>;
  icons: TIcons;
}>;

export type IconReference<TName extends string = string> =
  `foundation.icons.${TName}`;

const iconName = /^icon\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function defineIconsContract<
  const TIcons extends Record<`icon.${string}`, IconAssetDefinition>,
>(value: IconsContract<TIcons>): Validated<IconsContract<TIcons>> {
  const contract = exactKeys(
    value,
    ["id", "schemaVersion", "purpose", "keyline", "icons"],
    "icons",
  );
  if (contract.id !== "foundation.icons" || contract.schemaVersion !== 1) {
    fail("icons has an invalid schema");
  }
  nonemptyString(contract.purpose, "icons.purpose");
  const keyline = exactKeys(
    contract.keyline,
    ["persistent", "sizeOwner", "fit", "color", "swapGeometry", "decorativeByDefault"],
    "icons.keyline",
  );
  if (!booleanValue(keyline.persistent, "icons.keyline.persistent")) {
    fail("icons.keyline.persistent must be true");
  }
  oneOf(keyline.sizeOwner, ["consumer-token"] as const, "icons.keyline.sizeOwner");
  oneOf(keyline.fit, ["contain"] as const, "icons.keyline.fit");
  oneOf(keyline.color, ["currentColor"] as const, "icons.keyline.color");
  oneOf(keyline.swapGeometry, ["fixed"] as const, "icons.keyline.swapGeometry");
  if (!booleanValue(keyline.decorativeByDefault, "icons.keyline.decorativeByDefault")) {
    fail("icons.keyline.decorativeByDefault must be true");
  }

  const icons = plainObject(contract.icons, "icons.icons");
  const names = Object.keys(icons);
  if (names.length === 0) fail("icons.icons must not be empty");
  const sourceExports = new Set<string>();
  for (const name of names) {
    if (!iconName.test(name)) fail(`icons.icons.${name} has an invalid asset ID`);
    const definition = exactKeys(
      icons[name],
      ["source"],
      `icons.icons.${name}`,
    );
    const source = exactKeys(
      definition.source,
      ["library", "exportName"],
      `icons.icons.${name}.source`,
    );
    oneOf(source.library, ["lucide-react"] as const, `icons.icons.${name}.source.library`);
    const exportName = nonemptyString(
      source.exportName,
      `icons.icons.${name}.source.exportName`,
    );
    if (sourceExports.has(exportName)) fail(`icons.icons.${name}.source.exportName is duplicated`);
    sourceExports.add(exportName);

  }

  return value as Validated<IconsContract<TIcons>>;
}

export function iconReference<
  TIcons extends Record<`icon.${string}`, IconAssetDefinition>,
  TName extends Extract<keyof TIcons, string>,
>(
  _icons: Validated<IconsContract<TIcons>>,
  name: TName,
): IconReference<TName> {
  return `foundation.icons.${name}`;
}
