export type GenerateArgs = {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
};

export type Adapter = (args: GenerateArgs) => Promise<{ text: string }>;
