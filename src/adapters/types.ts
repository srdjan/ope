import type { Result } from "../lib/result.ts";

export type GenerateArgs = {
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature: number;
};

export type GenerateResult = { readonly text: string };

export type AdapterError =
  | { readonly kind: "CONFIG_MISSING"; readonly detail: string }
  | {
    readonly kind: "NETWORK_ERROR";
    readonly status: number;
    readonly body: string;
  }
  | { readonly kind: "INVALID_RESPONSE"; readonly detail: string };

// Use interface for capability/port pattern per Light FP guidelines
export interface Adapter {
  (args: GenerateArgs): Promise<Result<GenerateResult, AdapterError>>;
}
