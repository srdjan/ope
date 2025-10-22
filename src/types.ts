export type GenerateRequest = {
  readonly rawPrompt: string;
  readonly taskType?: "qa" | "extract" | "summarize";
  readonly targetHint?: "local" | "cloud";
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
  readonly system: string;
  readonly user: string;
  readonly decoding: {
    readonly temperature: number;
    readonly maxTokens: number;
  };
};

export type FinalResponse = {
  readonly output: {
    readonly answer: string;
    readonly citations: ReadonlyArray<string>;
  };
  readonly meta: {
    readonly model: string;
    readonly ir: PromptIR;
    readonly compiled: { readonly system: string; readonly user: string };
    readonly decoding: {
      readonly temperature: number;
      readonly maxTokens: number;
    };
  };
};

// Configuration capabilities for dependency injection
export type AvailableCapabilities = {
  readonly hasCloud: boolean;
  readonly hasLocalHttp: boolean;
};
