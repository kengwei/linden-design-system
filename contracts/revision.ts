import { createHash } from "node:crypto";
import type { Contract, Validated } from "./core.ts";

const plainObject = (value: object): value is Record<string, unknown> => Object.getPrototypeOf(value) === Object.prototype;

export function normalizeContract<T extends Contract>(value: Validated<T>): string {
  const seen = new Set<object>();
  const normalize = (input: unknown): string => {
    if (input === null || typeof input === "string" || typeof input === "boolean") return JSON.stringify(input);
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new TypeError("non-finite numbers are unsupported");
      return JSON.stringify(input);
    }
    if (typeof input === "undefined" || typeof input === "function" || typeof input === "symbol" || typeof input === "bigint") throw new TypeError("unsupported value");
    if (typeof input !== "object") throw new TypeError("unsupported value");
    if (seen.has(input)) throw new TypeError("cycles are unsupported");
    seen.add(input);
    try {
      if (Array.isArray(input)) {
        if (Object.getPrototypeOf(input) !== Array.prototype) throw new TypeError("unsupported object");
        const values: unknown[] = [];
        for (const key of Reflect.ownKeys(input)) {
          if (key === "length") continue;
          if (typeof key !== "string") throw new TypeError("unsupported object");
          const descriptor = Object.getOwnPropertyDescriptor(input, key);
          if (!descriptor?.enumerable || !("value" in descriptor)) throw new TypeError("unsupported object");
          if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= input.length) throw new TypeError("unsupported object");
        }
        for (let index = 0; index < input.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
          if (!descriptor) throw new TypeError("sparse arrays are unsupported");
          values.push(descriptor.value);
        }
        return `[${values.map(normalize).join(",")}]`;
      }
      if (!plainObject(input)) throw new TypeError("unsupported object");
      const entries = Reflect.ownKeys(input).map((key) => {
        if (typeof key !== "string") throw new TypeError("unsupported object");
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (!descriptor?.enumerable || !("value" in descriptor)) throw new TypeError("unsupported object");
        return [key, descriptor.value] as const;
      }).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
      return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${normalize(child)}`).join(",")}}`;
    } finally {
      seen.delete(input);
    }
  };
  return normalize(value);
}

export function createContractRevision<T extends Contract>(value: Validated<T>): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(normalizeContract(value), "utf8").digest("hex")}`;
}
