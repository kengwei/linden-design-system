import type { Validated } from "../contracts/core.ts";
import type {
  IconAssetDefinition,
  IconsContract,
} from "../contracts/assets.ts";
import { systemConfig, type SystemConfig } from "../system.config.ts";
import {
  generatedHeader,
  provenance,
  stableJson,
  validateCanonical,
  type GeneratedOutput,
} from "./core.ts";

const publicNames: Record<string, string> = {
  Plus: "PlusIcon",
  ArrowRight: "ArrowRightIcon",
  LoaderCircle: "LoaderCircleIcon",
};

function renderTypeScript(
  contract: Validated<IconsContract>,
  config: SystemConfig,
): string {
  const entries = Object.entries(contract.icons).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  const imports = entries.map(([, definition]) => definition.source.exportName);
  const missing = imports.filter((name) => !publicNames[name]);
  if (missing.length > 0) {
    throw new TypeError(`unsupported public icon export: ${missing[0]}`);
  }
  const importList = imports
    .map((name) => `${name} as Lucide${name}`)
    .join(", ");
  const wrappers = entries
    .map(([, definition]) => {
      const sourceName = definition.source.exportName;
      const publicName = publicNames[sourceName];
      return `export function ${publicName}(props: LindenIconProps) {\n  return renderIcon(Lucide${sourceName}, props);\n}`;
    })
    .join("\n\n");
  const componentMap = Object.fromEntries(
    entries.map(([name, definition]) => [name, publicNames[definition.source.exportName]]),
  );
  const referenceMap = Object.fromEntries(
    entries.map(([name]) => [name, `foundation.icons.${name}`]),
  );
  const mapSource = Object.entries(componentMap)
    .map(([name, component]) => `  ${JSON.stringify(name)}: ${component},`)
    .join("\n");
  return `${generatedHeader(contract, "line", config)}import { createElement, type ComponentType } from "react";\nimport { ${importList}, type LucideProps } from "lucide-react";\n\nexport type LindenIconProps = Omit<LucideProps, "size" | "width" | "height" | "color">;\n\nfunction renderIcon(Source: ComponentType<LucideProps>, props: LindenIconProps) {\n  const decorative = props["aria-hidden"] === undefined && props["aria-label"] === undefined && props["aria-labelledby"] === undefined;\n  return createElement(Source, {\n    ...props,\n    size: "100%",\n    width: "100%",\n    height: "100%",\n    color: "currentColor",\n    focusable: "false",\n    "aria-hidden": decorative ? true : props["aria-hidden"],\n  });\n}\n\n${wrappers}\n\nexport const iconComponents = {\n${mapSource}\n} as const;\n\nexport type IconAssetId = keyof typeof iconComponents;\n\nexport const iconReferences = ${JSON.stringify(referenceMap, null, 2)} as const satisfies Record<IconAssetId, \`foundation.icons.\${IconAssetId}\`>;\n\n\nexport const iconKeyline = ${JSON.stringify(contract.keyline, null, 2)} as const;\n\nexport const iconProvenance = ${JSON.stringify(provenance(contract, config), null, 2)} as const;\n`;
}

function renderDocumentation(
  contract: Validated<IconsContract>,
  config: SystemConfig,
): string {
  const icons = Object.fromEntries(
    Object.entries(contract.icons)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([name, definition]) => [
        name,
        {
          ...definition,
          reference: `foundation.icons.${name}`,
        },
      ]),
  );
  const document = {
    kind: "icon-documentation",
    id: contract.id,
    schemaVersion: contract.schemaVersion,
    purpose: contract.purpose,
    keyline: contract.keyline,
    icons,
    provenance: provenance(contract, config),
  };
  return `${generatedHeader(contract, "block", config)}const documentation = ${stableJson(document).trimEnd()};\nconst provenance = documentation.provenance;\n\nexport { documentation, provenance };\nexport default documentation;\n`;
}

export function generateIconOutputs(
  contract: Validated<IconsContract>,
  config: SystemConfig = systemConfig,
): GeneratedOutput[] {
  validateCanonical(contract, "foundation.icons");
  return [
    {
      path: "foundations/assets/Icons.ts",
      contents: renderTypeScript(contract, config),
    },
    {
      path: "foundations/assets/Icons.doc.mjs",
      contents: renderDocumentation(contract, config),
    },
  ];
}
