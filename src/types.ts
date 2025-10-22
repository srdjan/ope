export type GenerateRequest = {
  rawPrompt: string;
  taskType?: "qa" | "extract" | "summarize";
  targetHint?: "local" | "cloud";
};

export type PromptIR = {
  role: string;
  objective: string;
  constraints: string[];
  style: string[];
  steps: string[];
  outputSchema: { answer: "string"; citations: "string[]" };
  examples: Array<{ user: string; assistant: string }>;
};

export type CompiledPrompt = {
  system: string;
  user: string;
  decoding: { temperature: number; maxTokens: number };
};

export type FinalResponse = {
  output: { answer: string; citations: string[] };
  meta: {
    model: string;
    ir: PromptIR;
    compiled: { system: string; user: string };
    decoding: { temperature: number; maxTokens: number };
  };
};
