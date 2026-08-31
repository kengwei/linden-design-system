import type { ContractData, ContractObject, ContractScalar } from "./core.ts";

export type ObjectValue = Record<string, unknown>;

export const fail = (message: string): never => {
  throw new TypeError(message);
};

export function plainObject(value: unknown, path: string): ObjectValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${path} must be an object`);
  }
  const objectValue = value as object;
  if (Object.getPrototypeOf(objectValue) !== Object.prototype) {
    fail(`${path} must be a plain object`);
  }
  for (const key of Reflect.ownKeys(objectValue)) {
    if (typeof key !== "string") fail(`${path} has invalid fields`);
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      fail(`${path}.${String(key)} must be an enumerable data property`);
    }
  }
  return value as ObjectValue;
}

export function exactKeys(value: unknown, keys: readonly string[], path: string): ObjectValue {
  const record = plainObject(value, path);
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${path} has invalid fields`);
  }
  return record;
}

export function denseArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(`${path} must be a dense array`);
  }
  const arrayValue = value as readonly unknown[];
  for (const key of Reflect.ownKeys(arrayValue)) {
    if (key === "length") continue;
    if (
      typeof key !== "string" ||
      !/^(0|[1-9]\d*)$/.test(key) ||
      Number(key) >= arrayValue.length
    ) {
      fail(`${path} must be a dense array`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(arrayValue, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      fail(`${path} must be a dense array`);
    }
  }
  for (let index = 0; index < arrayValue.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(arrayValue, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      fail(`${path} must be a dense array`);
    }
  }
  return arrayValue;
}

export function nonemptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${path} must be a nonempty string`);
  }
  return value as string;
}

export function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(`${path} must be a boolean`);
  return value as boolean;
}

export function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    fail(`${path} is invalid`);
  }
  return value as T;
}

export function nonemptyUniqueStrings(value: unknown, path: string): readonly string[] {
  const array = denseArray(value, path);
  if (array.length === 0) fail(`${path} must be a nonempty array`);
  const items = array.map((item, index) =>
    nonemptyString(item, `${path}[${index}]`),
  );
  if (new Set(items).size !== items.length) {
    fail(`${path} must not contain duplicates`);
  }
  return items;
}

export function contractScalar(value: unknown, path: string): ContractScalar {
  if (typeof value === "string") return nonemptyString(value, path);
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fail(`${path} must be a contract scalar`);
}

export function contractData(value: unknown, path: string): ContractData {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return contractScalar(value, path);
  }
  if (Array.isArray(value)) {
    const array = denseArray(value, path);
    if (array.length === 0) fail(`${path} must not be empty`);
    return array.map((item, index) => contractData(item, `${path}[${index}]`));
  }
  const record = plainObject(value, path);
  const entries = Object.entries(record);
  if (entries.length === 0) fail(`${path} must not be empty`);
  for (const [key, child] of entries) contractData(child, `${path}.${key}`);
  return value as ContractObject;
}
