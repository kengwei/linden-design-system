import type { Validated } from "../contracts/core.ts";
import type { ComponentContract, ComponentProp } from "../contracts/component.ts";
import type { SystemConfig } from "../system.config.ts";
import {
  GENERATOR_VERSION,
  contractRevision,
  cssVariableName,
  generatedHeader,
  pascalCase,
  stableJson,
  tokenNameFromReference,
  validateCanonical,
  type GeneratedOutput,
} from "./core.ts";

const expectedBehavior = {
  action: "triggers-action",
  activation: "platform-standard",
  loading: {
    interactionDisabled: true,
    layoutSizePreserved: true,
    busyStateExposed: true,
    accessibleNamePreserved: true,
    contentVisuallyHidden: true,
    indicator: "foundation.icons.icon.loader-circle",
    indicatorCenteredOutsideFlow: true,
    indicatorDecorative: true,
    reducedMotion: "static",
  },
  disabled: { interactionDisabled: true },
  focus: { visibleOnKeyboard: true },
};

const expectedAccessibility = {
  requiresAccessibleName: true,
  requiresVisibleLabel: true,
  allowsIconOnly: false,
  keyboardActivation: "platform-standard",
  focusIndicatorRequired: true,
  loadingBusyStateRequired: true,
  allowsVisuallyHiddenLabelWhileLoading: true,
};

const expectedProps = {
  label: { kind: "text", required: true },
  variant: { kind: "choice", required: false },
  size: { kind: "choice", required: false },
  loading: { kind: "boolean", required: false },
  disabled: { kind: "boolean", required: false },
  leadingIcon: { kind: "icon", required: false },
  trailingIcon: { kind: "icon", required: false },
};

function requireEqual(value: unknown, expected: unknown, path: string): void {
  if (stableJson(value) !== stableJson(expected)) throw new TypeError(`${path} is unsupported`);
}

function requireKeys(value: object, keys: readonly string[], path: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${path} has unsupported fields`);
  }
}

function requireTokenReference(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.startsWith("foundation.tokens.")) {
    throw new TypeError(`${path} must be a token reference`);
  }
  return value;
}

function validateActionControl<TName extends string>(contract: Validated<ComponentContract<TName>>): void {
  requireEqual(contract.behavior, expectedBehavior, "component.behavior");
  requireEqual(contract.accessibility, expectedAccessibility, "component.accessibility");
  requireKeys(contract.anatomy, ["root", "label", "leadingIconKeyline", "leadingIcon", "trailingIconKeyline", "trailingIcon", "loadingIndicatorKeyline", "loadingIndicator"], "component.anatomy");
  requireEqual(contract.anatomy, {
    root: { required: true },
    label: { required: true },
    leadingIconKeyline: { required: true },
    leadingIcon: { required: false },
    trailingIconKeyline: { required: true },
    trailingIcon: { required: false },
    loadingIndicatorKeyline: { required: true },
    loadingIndicator: { required: true },
  }, "component.anatomy");
  requireKeys(contract.props, Object.keys(expectedProps), "component.props");
  for (const [name, expected] of Object.entries(expectedProps)) {
    const prop = contract.props[name] as ComponentProp | undefined;
    if (!prop || prop.kind !== expected.kind || prop.required !== expected.required) {
      throw new TypeError(`component.props.${name} is unsupported`);
    }
    if (prop.kind === "choice" && (name === "variant" || name === "size") && prop.values.length === 0) {
      throw new TypeError(`component.props.${name}.values must not be empty`);
    }
  }
  const styling = contract.styling as Record<string, unknown>;
  requireKeys(styling, ["variants", "disabled", "focus", "loading", "shared", "sizes"], "component.styling");
  const variants = styling.variants as Record<string, unknown>;
  if (!variants || Object.keys(variants).length === 0) throw new TypeError("component.styling.variants must not be empty");
  const variantProp = contract.props.variant as Extract<ComponentProp, { kind: "choice" }>;
  requireKeys(variants, variantProp.values, "component.styling.variants");
  for (const [variantName, variant] of Object.entries(variants)) {
    const states = variant as Record<string, unknown>;
    requireKeys(states, ["rest", "hover", "pressed"], `component.styling.variants.${variantName}`);
    for (const stateName of ["rest", "hover", "pressed"] as const) {
      const state = states[stateName] as Record<string, unknown>;
      requireKeys(state, ["fill", "text", "border"], `component.styling.variants.${variantName}.${stateName}`);
      for (const [property, token] of Object.entries(state)) requireTokenReference(token, `component.styling.variants.${variantName}.${stateName}.${property}`);
    }
  }
  const expectedSections: Record<string, readonly string[]> = {
    disabled: ["opacity"],
    focus: ["outlineColor", "outlineWidth", "outlineOffset", "cornerRadius"],
    loading: ["duration"],
    shared: ["borderWidth", "cornerRadius", "fontFamily", "fontStyle"],
  };
  for (const [section, keys] of Object.entries(expectedSections)) {
    const node = styling[section] as Record<string, unknown>;
    requireKeys(node, keys, `component.styling.${section}`);
    for (const [property, token] of Object.entries(node)) requireTokenReference(token, `component.styling.${section}.${property}`);
  }
  const sizes = styling.sizes as Record<string, unknown>;
  const sizePropKeys = ["height", "paddingInline", "gap", "keyline", "fontSize", "lineHeight", "fontWeight", "letterSpacing"];
  const sizeProp = contract.props.size as Extract<ComponentProp, { kind: "choice" }>;
  requireKeys(sizes, sizeProp.values, "component.styling.sizes");
  for (const [sizeName, size] of Object.entries(sizes)) {
    requireKeys(size as object, sizePropKeys, `component.styling.sizes.${sizeName}`);
    for (const [property, token] of Object.entries(size as Record<string, unknown>)) requireTokenReference(token, `component.styling.sizes.${sizeName}.${property}`);
  }
}

function componentNames(id: string): { name: string; kebab: string } {
  if (!id.startsWith("component.")) throw new TypeError("component id is unsupported");
  const raw = id.slice("component.".length);
  if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(raw)) throw new TypeError("component id is unsupported");
  const name = pascalCase(raw);
  return { name, kebab: raw.replaceAll(".", "-") };
}

function ref(value: unknown, config: SystemConfig): string {
  return `var(${cssVariableName(tokenNameFromReference(requireTokenReference(value, "style token")), config.packageScope)})`;
}

function renderComponentTsx<TName extends string>(contract: Validated<ComponentContract<TName>>, config: SystemConfig): string {
  const { name, kebab } = componentNames(contract.id);
  const props = contract.props as Record<string, ComponentProp>;
  const variant = props.variant.kind === "choice" ? props.variant.values : [];
  const size = props.size.kind === "choice" ? props.size.values : [];
  const defaultVariant = String(contract.defaults.variant ?? variant[0]);
  const defaultSize = String(contract.defaults.size ?? size[0]);
  const prefix = config.packageScope.slice(1);
  const lines = [
    generatedHeader(contract, "line", config).trimEnd(),
    'import type { ButtonHTMLAttributes, ReactNode } from "react";',
    `import { LoaderCircleIcon } from "${config.packageScope}/${config.packages.icons}";`,
    `import "./${name}.css";`,
    "",
    `export type ${name}Variant = ${variant.map((value) => JSON.stringify(value)).join(" | ")};`,
    `export type ${name}Size = ${size.map((value) => JSON.stringify(value)).join(" | ")};`,
    "",
    `export type ${name}Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled" | "style"> & {`,
    `  label: string;`,
    `  variant?: ${name}Variant;`,
    `  size?: ${name}Size;`,
    "  loading?: boolean;",
    "  disabled?: boolean;",
    "  leadingIcon?: ReactNode;",
    "  trailingIcon?: ReactNode;",
    "};",
    "",
    `export function ${name}({ label, variant = ${JSON.stringify(defaultVariant)}, size = ${JSON.stringify(defaultSize)}, loading = ${Boolean(contract.defaults.loading)}, disabled = ${Boolean(contract.defaults.disabled)}, leadingIcon, trailingIcon, type = "button", className, ...buttonProps }: ${name}Props) {`,
    `  if (!label.trim()) throw new TypeError("${name} label must not be blank");`,
    "  const isDisabled = disabled || loading;",
    "  return (",
    `    <button {...buttonProps} type={type} className={["${prefix}-${kebab}", className].filter(Boolean).join(" ")} disabled={isDisabled} aria-busy={loading || undefined} data-variant={variant} data-size={size} data-loading={loading ? "true" : "false"}>`,
    '      <span data-part="leading-icon-keyline" data-visible={leadingIcon ? "true" : "false"} aria-hidden="true">{leadingIcon ? <span data-part="leading-icon">{leadingIcon}</span> : null}</span>',
    '      <span data-part="label">{label}</span>',
    '      <span data-part="trailing-icon-keyline" data-visible={trailingIcon ? "true" : "false"} aria-hidden="true">{trailingIcon ? <span data-part="trailing-icon">{trailingIcon}</span> : null}</span>',
    '      <span data-part="loading-indicator-keyline" aria-hidden="true"><span data-part="loading-indicator"><LoaderCircleIcon /></span></span>',
    "    </button>",
    "  );",
    "}",
    "",
  ];
  return `${lines.join("\n")}`;
}

function renderCss<TName extends string>(contract: Validated<ComponentContract<TName>>, config: SystemConfig): string {
  const { name, kebab } = componentNames(contract.id);
  const prefix = config.packageScope.slice(1);
  const styling = contract.styling as Record<string, unknown>;
  const variants = styling.variants as Record<string, Record<string, Record<string, unknown>>>;
  const sizes = styling.sizes as Record<string, Record<string, unknown>>;
  const variantValues = (contract.props.variant as Extract<ComponentProp, { kind: "choice" }>).values;
  const sizeValues = (contract.props.size as Extract<ComponentProp, { kind: "choice" }>).values;
  const shared = styling.shared as Record<string, unknown>;
  const focus = styling.focus as Record<string, unknown>;
  const disabled = styling.disabled as Record<string, unknown>;
  const loading = styling.loading as Record<string, unknown>;
  const selector = `.${prefix}-${kebab}`;
  const lines = [
    generatedHeader(contract, "block", config).trimEnd(),
    `${selector} {`,
    "  position: relative;",
    "  display: inline-flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  box-sizing: border-box;",
    `  font-family: ${ref(shared.fontFamily, config)};`,
    `  font-style: ${ref(shared.fontStyle, config)};`,
    `  border-width: ${ref(shared.borderWidth, config)};`,
    "  border-style: solid;",
    `  border-radius: ${ref(shared.cornerRadius, config)};`,
    "  cursor: pointer;",
    "}",
    `${selector} > [data-part$="keyline"] {`,
    "  display: inline-flex;",
    "  flex: none;",
    "  align-items: center;",
    "  justify-content: center;",
    "  color: inherit;",
    "}",
    `${selector} [data-part="leading-icon"],`,
    `${selector} [data-part="trailing-icon"],`,
    `${selector} [data-part="loading-indicator"] {`,
    "  display: inline-flex;",
    "  inline-size: 100%;",
    "  block-size: 100%;",
    "  color: inherit;",
    "}",
    `${selector} [data-part="leading-icon"] > *,`,
    `${selector} [data-part="trailing-icon"] > *,`,
    `${selector} [data-part="loading-indicator"] > * {`,
    "  inline-size: 100%;",
    "  block-size: 100%;",
    "  color: inherit;",
    "}",
    `${selector} > [data-part$="keyline"][data-visible="false"] {`,
    "  display: none;",
    "}",
    `${selector} > [data-part="loading-indicator-keyline"] {`,
    "  display: none;",
    "  position: absolute;",
    "  inset-inline-start: 50%;",
    "  inset-block-start: 50%;",
    "  translate: -50% -50%;",
    "}",
  ];
  for (const variantName of variantValues) {
    const states = variants[variantName];
    const rest = states.rest;
    const variantSelector = `${selector}[data-variant="${variantName}"]`;
    lines.push(variantSelector + " {", `  background: ${ref(rest.fill, config)};`, `  color: ${ref(rest.text, config)};`, `  border-color: ${ref(rest.border, config)};`, "}");
    lines.push(`${variantSelector}:not(:disabled):hover {`, `  background: ${ref(states.hover.fill, config)};`, `  color: ${ref(states.hover.text, config)};`, `  border-color: ${ref(states.hover.border, config)};`, "}");
    lines.push(`${variantSelector}:not(:disabled):active {`, `  background: ${ref(states.pressed.fill, config)};`, `  color: ${ref(states.pressed.text, config)};`, `  border-color: ${ref(states.pressed.border, config)};`, "}");
  }
  for (const sizeName of sizeValues) {
    const values = sizes[sizeName];
    const sizeSelector = `${selector}[data-size="${sizeName}"]`;
    lines.push(`${sizeSelector} {`, `  height: ${ref(values.height, config)};`, `  padding-inline: ${ref(values.paddingInline, config)};`, `  gap: ${ref(values.gap, config)};`, `  font-size: ${ref(values.fontSize, config)};`, `  line-height: ${ref(values.lineHeight, config)};`, `  font-weight: ${ref(values.fontWeight, config)};`, `  letter-spacing: ${ref(values.letterSpacing, config)};`, "}");
    lines.push(`${sizeSelector} > [data-part$="keyline"] {`, `  inline-size: ${ref(values.keyline, config)};`, `  block-size: ${ref(values.keyline, config)};`, "}");
  }
  lines.push(`${selector}:focus-visible {`, "  outline: none;", "}");
  lines.push(`${selector}:focus-visible::after {`, "  content: \"\";", "  position: absolute;", "  pointer-events: none;", "  box-sizing: border-box;", `  inset: calc(-1 * (${ref(focus.outlineOffset, config)} + ${ref(focus.outlineWidth, config)}));`, `  border: ${ref(focus.outlineWidth, config)} solid ${ref(focus.outlineColor, config)};`, `  border-radius: ${ref(focus.cornerRadius, config)};`, "}");
  lines.push(`${selector}:disabled:not([data-loading="true"]) {`, `  opacity: ${ref(disabled.opacity, config)};`, "}");
  lines.push(`${selector}[data-loading="true"] {`, "  cursor: progress;", "}");
  lines.push(`${selector}[data-loading="true"] > [data-part="leading-icon-keyline"],`, `${selector}[data-loading="true"] > [data-part="label"],`, `${selector}[data-loading="true"] > [data-part="trailing-icon-keyline"] {`, "  opacity: 0;", "}");
  lines.push(`${selector}[data-loading="true"] > [data-part="loading-indicator-keyline"] {`, "  display: inline-flex;", `  animation: ${prefix}-${kebab}-loading-spinner ${ref(loading.duration, config)} linear infinite;`, "}");
  lines.push(`@keyframes ${prefix}-${kebab}-loading-spinner {`, "  to {", "    rotate: 1turn;", "  }", "}");
  lines.push("@media (prefers-reduced-motion: reduce) {", `  ${selector}[data-loading="true"] > [data-part="loading-indicator-keyline"] {`, "    animation: none;", "  }", "}");
  return `${lines.join("\n")}\n`;
}

function renderTest<TName extends string>(contract: Validated<ComponentContract<TName>>, config: SystemConfig): string {
  const { name } = componentNames(contract.id);
  const variants = (contract.props.variant as Extract<ComponentProp, { kind: "choice" }>).values;
  const sizes = (contract.props.size as Extract<ComponentProp, { kind: "choice" }>).values;
  return `${generatedHeader(contract, "line", config)}import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ${name} } from "./${name}.tsx";
import { ${name.toLowerCase()}Contract } from "./${name}.contract.ts";

describe("${name} contract conformance", () => {
  it("projects contract defaults", () => {
    render(<${name} label="Save" />);
    const control = screen.getByRole("button", { name: "Save" });
    expect(control).toHaveAttribute("data-variant", ${JSON.stringify(contract.defaults.variant)});
    expect(control).toHaveAttribute("data-size", ${JSON.stringify(contract.defaults.size)});
    expect(control).toBeEnabled();
  });

  it("covers every declared variant and size", () => {
    expect(Object.keys(${name.toLowerCase()}Contract.styling.variants).sort()).toEqual(${stableJson([...variants].sort()).trim()});
    expect(Object.keys(${name.toLowerCase()}Contract.styling.sizes).sort()).toEqual(${stableJson([...sizes].sort()).trim()});
  });

  it("projects loading through native disabled and aria-busy", () => {
    render(<${name} label="Save" loading />);
    const control = screen.getByRole("button", { name: "Save" });
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute("aria-busy", "true");
    expect(control).toHaveAccessibleName("Save");
    expect(control.querySelector('[data-part="label"]')).toHaveTextContent("Save");
    expect(control.querySelector('[data-part="loading-indicator-keyline"]')).toHaveAttribute("aria-hidden", "true");
    expect(control.querySelector('[data-part="loading-indicator"]')).toBeInTheDocument();
  });

  it("keeps all keylines in the DOM", () => {
    render(<${name} label="Save" />);
    const control = screen.getByRole("button", { name: "Save" });
    expect(control.querySelector('[data-part="leading-icon-keyline"]')).toHaveAttribute("data-visible", "false");
    expect(control.querySelector('[data-part="trailing-icon-keyline"]')).toHaveAttribute("data-visible", "false");
    expect(control.querySelector('[data-part="loading-indicator-keyline"]')).toBeInTheDocument();
  });

  it("projects disabled through the native disabled attribute", () => {
    render(<${name} label="Save" disabled />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
`;
}

function storyName(value: string): string {
  return pascalCase(value) || "Example";
}

function renderStories<TName extends string>(contract: Validated<ComponentContract<TName>>, config: SystemConfig): string {
  const { name } = componentNames(contract.id);
  const examples = contract.guidance.examples;
  const variantValues = (contract.props.variant as Extract<ComponentProp, { kind: "choice" }>).values;
  const sizeValues = (contract.props.size as Extract<ComponentProp, { kind: "choice" }>).values;
  const lines = [generatedHeader(contract, "line", config).trimEnd(), 'import type { Meta, StoryObj } from "@storybook/react-vite";', `import { ${name} } from "./${name}.tsx";`, "", `const meta = { title: "Components/${name}", component: ${name}, parameters: { layout: "centered" }, args: ${stableJson({ label: String(examples[0]?.label ?? name), ...contract.defaults }).trim()} } satisfies Meta<typeof ${name}>;`, "", "export default meta;", `type Story = StoryObj<typeof meta>;`, "", "export const Default: Story = {};", ""];
  for (const example of examples) {
    const args = { label: example.label, ...Object.fromEntries(Object.entries(example).filter(([key]) => key !== "intent" && key !== "label")) };
    lines.push(`export const ${storyName(example.intent)}: Story = { args: ${stableJson(args).trim()} };`, "");
  }
  for (const value of variantValues) lines.push(`export const Variant${storyName(value)}: Story = { args: { variant: ${JSON.stringify(value)} } };`, "");
  for (const value of sizeValues) lines.push(`export const Size${storyName(value)}: Story = { args: { size: ${JSON.stringify(value)} } };`, "");
  lines.push('export const Loading: Story = { args: { loading: true } };', 'export const Disabled: Story = { args: { disabled: true } };', "");
  return lines.join("\n");
}

export function createComponentDocumentation<TName extends string>(
  contract: Validated<ComponentContract<TName>>,
  config: SystemConfig,
) {
  const revision = contractRevision(contract);
  return {
    kind: "component-documentation",
    id: contract.id,
    schemaVersion: contract.schemaVersion,
    revision,
    provenance: {
      systemId: config.systemId,
      packageScope: config.packageScope,
      contractId: contract.id,
      schemaVersion: contract.schemaVersion,
      contractRevision: revision,
      generatorVersion: GENERATOR_VERSION,
    },
    purpose: contract.guidance.purpose,
    guidance: contract.guidance,
    anatomy: contract.anatomy,
    props: contract.props,
    behavior: contract.behavior,
    accessibility: contract.accessibility,
    styling: contract.styling,
    examples: contract.guidance.examples,
    relationships: contract.relationships,
    discovery: contract.discovery,
  };
}

function renderDocumentation<TName extends string>(contract: Validated<ComponentContract<TName>>, config: SystemConfig): string {
  const document = createComponentDocumentation(contract, config);
  const header = generatedHeader(contract, "block", config);
  return `${header}const documentation = ${stableJson(document).trimEnd()};\nconst provenance = documentation.provenance;\n\nexport { documentation, provenance };\nexport default documentation;\n`;
}

export function generateComponentOutputs<TName extends string>(contract: Validated<ComponentContract<TName>>, config: SystemConfig): GeneratedOutput[] {
  validateCanonical(contract, contract.id);
  validateActionControl(contract);
  const { name } = componentNames(contract.id);
  return [
    { path: `components/${name}/${name}.tsx`, contents: renderComponentTsx(contract, config) },
    { path: `components/${name}/${name}.css`, contents: renderCss(contract, config) },
    { path: `components/${name}/${name}.test.tsx`, contents: renderTest(contract, config) },
    { path: `components/${name}/${name}.stories.tsx`, contents: renderStories(contract, config) },
    { path: `components/${name}/${name}.doc.mjs`, contents: renderDocumentation(contract, config) },
  ];
}
