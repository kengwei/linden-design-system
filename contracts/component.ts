import type {
  ContractObject,
  ContractScalar,
  Validated,
} from "./core.ts";
import type {
  TokenDefinition,
  TokenReference,
  TokenType,
  TokensContract,
} from "./tokens.ts";
import { getTokenType } from "./tokens.ts";
import {
  booleanValue,
  contractData,
  contractScalar,
  denseArray,
  exactKeys,
  fail,
  nonemptyString,
  nonemptyUniqueStrings,
  plainObject,
} from "./validation.ts";

export type ComponentProp =
  | { readonly kind: "text" | "boolean" | "icon"; readonly required: boolean }
  | {
      readonly kind: "choice";
      readonly values: readonly string[];
      readonly required: boolean;
    };

export type ComponentExample = Readonly<
  { intent: string; label: string } & Record<string, ContractScalar>
>;

export interface ComponentStyle<TokenName extends string> {
  readonly [key: string]: TokenReference<TokenName> | ComponentStyle<TokenName>;
}

export type ComponentContract<TokenName extends string = string> = {
  readonly id: `component.${string}`;
  readonly schemaVersion: 1;
  readonly defaults: Readonly<Record<string, string | boolean>>;
  readonly anatomy: Readonly<Record<string, { readonly required: boolean }>>;
  readonly props: Readonly<Record<string, ComponentProp>>;
  readonly behavior: ContractObject;
  readonly accessibility: ContractObject;
  readonly styling: ComponentStyle<TokenName>;
  readonly guidance: {
    readonly purpose: string;
    readonly useWhen: string;
    readonly avoidWhen: string;
    readonly content: {
      readonly dos: readonly string[];
      readonly donts: readonly string[];
    };
    readonly examples: readonly ComponentExample[];
  };
  readonly relationships: { readonly relatedComponents: readonly string[] };
  readonly discovery: { readonly intents: readonly string[] };
};

const componentId = /^component\.[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

const styleTokenTypes = {
  fill: "color",
  text: "color",
  border: "color",
  overlay: "color",
  opacity: "number",
  outlineColor: "color",
  outlineWidth: "dimension",
  outlineOffset: "dimension",
  borderWidth: "dimension",
  cornerRadius: "dimension",
  fontFamily: "fontFamily",
  fontStyle: "fontStyle",
  letterSpacing: "dimension",
  height: "dimension",
  paddingInline: "dimension",
  gap: "dimension",
  keyline: "dimension",
  fontSize: "dimension",
  lineHeight: "dimension",
  fontWeight: "fontWeight",
  duration: "duration",
} as const satisfies Record<string, TokenType>;

function validateProp(value: unknown, path: string): ComponentProp {
  const source = plainObject(value, path);
  if (source.kind === "choice") {
    const prop = exactKeys(source, ["kind", "values", "required"], path);
    nonemptyUniqueStrings(prop.values, `${path}.values`);
    booleanValue(prop.required, `${path}.required`);
  } else {
    const prop = exactKeys(source, ["kind", "required"], path);
    if (!["text", "boolean", "icon"].includes(String(prop.kind))) {
      fail(`${path}.kind is invalid`);
    }
    booleanValue(prop.required, `${path}.required`);
  }
  return value as ComponentProp;
}

function validatePropValue(
  value: unknown,
  prop: ComponentProp,
  path: string,
): void {
  if (prop.kind === "boolean") {
    booleanValue(value, path);
    return;
  }
  if (prop.kind === "choice") {
    const selected = nonemptyString(value, path);
    if (!prop.values.includes(selected)) fail(`${path} is not an allowed choice`);
    return;
  }
  nonemptyString(value, path);
}

function validateStyleTree(
  value: unknown,
  tokens: TokensContract,
  path: string,
): void {
  const node = plainObject(value, path);
  const entries = Object.entries(node);
  if (entries.length === 0) fail(`${path} must not be empty`);

  for (const [key, child] of entries) {
    if (typeof child !== "string") {
      validateStyleTree(child, tokens, `${path}.${key}`);
      continue;
    }
    const expectedType = styleTokenTypes[key as keyof typeof styleTokenTypes];
    if (!expectedType) fail(`${path}.${key} is not a supported style property`);
    const prefix = "foundation.tokens.";
    if (!child.startsWith(prefix)) fail(`${path}.${key} is not a token reference`);
    const name = child.slice(prefix.length);
    if (getTokenType(tokens, name) !== expectedType) {
      fail(`${path}.${key} has the wrong token type`);
    }
  }
}

export function defineComponentContract<
  const TTokens extends Record<string, TokenDefinition>,
  const TComponent extends ComponentContract<Extract<keyof TTokens, string>>,
>(
  tokens: Validated<TokensContract<TTokens>>,
  value: TComponent,
): Validated<TComponent> {
  const component = exactKeys(
    value,
    [
      "id",
      "schemaVersion",
      "defaults",
      "anatomy",
      "props",
      "behavior",
      "accessibility",
      "styling",
      "guidance",
      "relationships",
      "discovery",
    ],
    "component",
  );
  const id = nonemptyString(component.id, "component.id");
  if (!componentId.test(id) || component.schemaVersion !== 1) {
    fail("component has an invalid schema");
  }

  const anatomy = plainObject(component.anatomy, "component.anatomy");
  if (Object.keys(anatomy).length === 0) fail("component.anatomy must not be empty");
  for (const [name, part] of Object.entries(anatomy)) {
    const definition = exactKeys(part, ["required"], `component.anatomy.${name}`);
    booleanValue(definition.required, `component.anatomy.${name}.required`);
  }

  const propsSource = plainObject(component.props, "component.props");
  const propEntries = Object.entries(propsSource);
  if (propEntries.length === 0) fail("component.props must not be empty");
  const props = new Map<string, ComponentProp>();
  for (const [name, prop] of propEntries) {
    props.set(name, validateProp(prop, `component.props.${name}`));
  }

  const defaults = plainObject(component.defaults, "component.defaults");
  for (const [name, defaultValue] of Object.entries(defaults)) {
    const prop = props.get(name);
    if (!prop) fail(`component.defaults.${name} has no matching prop`);
    const matchedProp = prop as ComponentProp;
    if (matchedProp.kind === "text" || matchedProp.kind === "icon") {
      fail(`component.defaults.${name} cannot have a default`);
    }
    validatePropValue(defaultValue, matchedProp, `component.defaults.${name}`);
  }

  contractData(component.behavior, "component.behavior");
  contractData(component.accessibility, "component.accessibility");

  validateStyleTree(component.styling, tokens, "component.styling");

  const guidance = exactKeys(
    component.guidance,
    ["purpose", "useWhen", "avoidWhen", "content", "examples"],
    "component.guidance",
  );
  nonemptyString(guidance.purpose, "component.guidance.purpose");
  nonemptyString(guidance.useWhen, "component.guidance.useWhen");
  nonemptyString(guidance.avoidWhen, "component.guidance.avoidWhen");
  const content = exactKeys(
    guidance.content,
    ["dos", "donts"],
    "component.guidance.content",
  );
  nonemptyUniqueStrings(content.dos, "component.guidance.content.dos");
  nonemptyUniqueStrings(content.donts, "component.guidance.content.donts");

  const relationships = exactKeys(
    component.relationships,
    ["relatedComponents"],
    "component.relationships",
  );
  nonemptyUniqueStrings(
    relationships.relatedComponents,
    "component.relationships.relatedComponents",
  );
  const discovery = exactKeys(
    component.discovery,
    ["intents"],
    "component.discovery",
  );
  const intents = new Set(
    nonemptyUniqueStrings(discovery.intents, "component.discovery.intents"),
  );

  const examples = denseArray(guidance.examples, "component.guidance.examples");
  if (examples.length === 0) fail("component.guidance.examples must not be empty");
  const exampleIntents = new Set<string>();
  const exampleKeys = new Set<string>();
  for (const [index, example] of examples.entries()) {
    const path = `component.guidance.examples[${index}]`;
    const item = plainObject(example, path);
    const intent = nonemptyString(item.intent, `${path}.intent`);
    const label = nonemptyString(item.label, `${path}.label`);
    if (!intents.has(intent)) fail(`${path}.intent is not discoverable`);
    for (const [name, setting] of Object.entries(item)) {
      if (name === "intent" || name === "label") continue;
      const prop = props.get(name);
      if (!prop) fail(`${path}.${name} has no matching prop`);
      validatePropValue(setting, prop as ComponentProp, `${path}.${name}`);
    }
    const settings = Object.entries(item)
      .filter(([name]) => name !== "intent" && name !== "label")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, setting]) => `${name}:${String(contractScalar(setting, `${path}.${name}`))}`)
      .join("|");
    const key = `${intent}\u0000${label}\u0000${settings}`;
    if (exampleKeys.has(key)) fail("component.guidance.examples has duplicates");
    exampleKeys.add(key);
    exampleIntents.add(intent);
  }
  for (const intent of intents) {
    if (!exampleIntents.has(intent)) {
      fail(`component.discovery.intents includes ${intent} without an example`);
    }
  }

  return value as Validated<TComponent>;
}
