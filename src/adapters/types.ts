import type {
  MaxTokens,
  SystemPrompt,
  Temperature,
  UserPrompt,
} from "../lib/branded.ts";
import type { Result } from "../lib/result.ts";

export type GenerateArgs = {
  readonly system: SystemPrompt;
  readonly user: UserPrompt;
  readonly maxTokens: MaxTokens;
  readonly temperature: Temperature;
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
