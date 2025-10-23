import type {
  CitationUrl,
  MaxTokens,
  ModelId,
  PromptText,
  SystemPrompt,
  Temperature,
  UserPrompt,
} from "./lib/branded.ts";

export type TaskType = "qa" | "extract" | "summarize";

export type GenerateRequest = {
  readonly rawPrompt: PromptText;
  readonly taskType?: TaskType;
  readonly targetHint?: "local" | "cloud";
  readonly context?: string; // Context ID (e.g., "medical", "legal", "code")
};

export type PromptIR = {
  readonly role: string;
  readonly objective: string;
  readonly constraints: ReadonlyArray<string>;
  readonly style: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<string>;
  readonly outputSchema: {
    readonly answer: "string";
    readonly citations: "string[]";
  };
  readonly examples: ReadonlyArray<
    { readonly user: string; readonly assistant: string }
  >;
};

export type CompiledPrompt = {
  readonly system: SystemPrompt;
  readonly user: UserPrompt;
  readonly decoding: {
    readonly temperature: Temperature;
    readonly maxTokens: MaxTokens;
  };
};

export type FinalResponse = {
  readonly output: {
    readonly answer: string;
    readonly citations: ReadonlyArray<CitationUrl>;
  };
  readonly meta: {
    readonly model: ModelId;
    readonly ir: PromptIR;
    readonly compiled: {
      readonly system: SystemPrompt;
      readonly user: UserPrompt;
    };
    readonly decoding: {
      readonly temperature: Temperature;
      readonly maxTokens: MaxTokens;
    };
    readonly validation: {
      readonly wasRepaired: boolean;
      readonly errorKind: string | null;
      readonly errorDetail: string | null;
    };
  };
};

// Configuration capabilities for dependency injection
export type AvailableCapabilities = {
  readonly hasCloud: boolean;
  readonly hasLocalHttp: boolean;
};
