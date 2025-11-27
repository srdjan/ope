/**
 * Configuration port interface.
 * Defines the capability for accessing application configuration.
 * Following Light FP guideline: "Use interfaces ONLY with generics to define behavioral APIs"
 */
export interface ConfigPort {
  readonly port: number;
  readonly cloudBaseUrl: string;
  readonly cloudApiKey: string;
  readonly cloudModel: string;
  readonly llmBaseUrl: string;

  hasCloud(): boolean;
  hasLocalHttp(): boolean;
  isMockMode(): boolean;
}

/**
 * Environment-based configuration adapter.
 * Reads from Deno.env and provides immutable config.
 */
export const makeEnvConfig = (): ConfigPort => {
  const mockAiEnv = Deno.env.get("MOCK_AI");
  // Default to mock mode (true) unless explicitly set to "false"
  const mockAi = mockAiEnv !== "false";

  const cfg = Object.freeze({
    port: Number(Deno.env.get("PORT") ?? 8787),
    cloudBaseUrl: Deno.env.get("CLOUD_BASE_URL") ?? "",
    cloudApiKey: Deno.env.get("CLOUD_API_KEY") ?? "",
    cloudModel: Deno.env.get("CLOUD_MODEL") ?? "gpt5-mini",
    llmBaseUrl: Deno.env.get("LLM_BASE_URL") ?? "",
    mockAi,
  });

  return {
    get port() {
      return cfg.port;
    },
    get cloudBaseUrl() {
      return cfg.cloudBaseUrl;
    },
    get cloudApiKey() {
      return cfg.cloudApiKey;
    },
    get cloudModel() {
      return cfg.cloudModel;
    },
    get llmBaseUrl() {
      return cfg.llmBaseUrl;
    },
    hasCloud: () => cfg.cloudBaseUrl.length > 0 && cfg.cloudApiKey.length > 0,
    hasLocalHttp: () => cfg.llmBaseUrl.length > 0,
    isMockMode: () => cfg.mockAi,
  };
};

/**
 * Test configuration adapter.
 * Allows injecting config for testing without environment variables.
 */
export const makeTestConfig = (
  overrides: Partial<{
    port: number;
    cloudBaseUrl: string;
    cloudApiKey: string;
    cloudModel: string;
    llmBaseUrl: string;
    mockAi: boolean;
  }>,
): ConfigPort => {
  const cfg = Object.freeze({
    port: overrides.port ?? 8787,
    cloudBaseUrl: overrides.cloudBaseUrl ?? "",
    cloudApiKey: overrides.cloudApiKey ?? "",
    cloudModel: overrides.cloudModel ?? "gpt5-mini",
    llmBaseUrl: overrides.llmBaseUrl ?? "",
    mockAi: overrides.mockAi ?? true,
  });

  return {
    get port() {
      return cfg.port;
    },
    get cloudBaseUrl() {
      return cfg.cloudBaseUrl;
    },
    get cloudApiKey() {
      return cfg.cloudApiKey;
    },
    get cloudModel() {
      return cfg.cloudModel;
    },
    get llmBaseUrl() {
      return cfg.llmBaseUrl;
    },
    hasCloud: () => cfg.cloudBaseUrl.length > 0 && cfg.cloudApiKey.length > 0,
    hasLocalHttp: () => cfg.llmBaseUrl.length > 0,
    isMockMode: () => cfg.mockAi,
  };
};
