export type Contract = {
  readonly id: string;
  readonly schemaVersion: number;
};

export type ContractScalar = string | number | boolean;
export type ContractData =
  | ContractScalar
  | readonly ContractData[]
  | { readonly [key: string]: ContractData };
export type ContractObject = { readonly [key: string]: ContractData };

declare const validated: unique symbol;
export type Validated<T extends Contract> = T & { readonly [validated]: true };
