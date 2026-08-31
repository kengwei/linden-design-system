import { pathToFileURL } from "node:url";
import { buttonContract } from "../components/Button/Button.contract.ts";
import { tokensContract } from "../foundations/tokens/Tokens.contract.ts";
import { iconsContract } from "../foundations/assets/Icons.contract.ts";
import { fontsContract } from "../foundations/assets/Fonts.contract.ts";
import { systemConfig } from "../system.config.ts";
import { applyGeneratedOutputs, type GeneratedOutput } from "./core.ts";
import { generateComponentOutputs } from "./component.ts";
import { generateTokenOutputs } from "./tokens.ts";
import { generateIconOutputs } from "./icons.ts";
import { generateFontOutputs } from "./fonts.ts";

export function renderAll(): GeneratedOutput[] {
  const outputs = [
    ...generateTokenOutputs(tokensContract),
    ...generateIconOutputs(iconsContract),
    ...generateFontOutputs(fontsContract),
    ...generateComponentOutputs(buttonContract, systemConfig),
  ];
  const paths = new Set<string>();
  for (const output of outputs) {
    if (paths.has(output.path)) throw new TypeError(`duplicate generated path: ${output.path}`);
    paths.add(output.path);
  }
  return outputs;
}

export async function generateAll(check = false, overwrite = false): Promise<void> {
  // All renderers run before this call, so a validation or rendering failure leaves the tree untouched.
  await applyGeneratedOutputs(renderAll(), check, overwrite);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const unknown = argv.filter((argument) => argument !== "--check" && argument !== "--force");
  if (unknown.length > 0) throw new Error(`unknown argument: ${unknown[0]}`);
  const check = argv.includes("--check");
  const overwrite = argv.includes("--force");
  if (check && overwrite) throw new Error("--check and --force cannot be combined");
  await generateAll(check, overwrite);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
