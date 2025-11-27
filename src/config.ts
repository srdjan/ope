import { type ConfigPort, makeEnvConfig } from "./ports/config.ts";

// Singleton instance using port pattern
const config = makeEnvConfig();

// Re-export for backwards compatibility
export const PORT = config.port;
export const CLOUD_BASE_URL = config.cloudBaseUrl;
export const CLOUD_API_KEY = config.cloudApiKey;
export const CLOUD_MODEL = config.cloudModel;
export const LLM_BASE_URL = config.llmBaseUrl;

export function hasCloud(): boolean {
  return config.hasCloud();
}

export function hasLocalHttp(): boolean {
  return config.hasLocalHttp();
}

export function isMockMode(): boolean {
  return config.isMockMode();
}

// Export config port for advanced usage
export { config, type ConfigPort };
