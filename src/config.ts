export const PORT = Number(Deno.env.get("PORT") ?? 8787);

export const CLOUD_BASE_URL = Deno.env.get("CLOUD_BASE_URL") ?? "";
export const CLOUD_API_KEY = Deno.env.get("CLOUD_API_KEY") ?? "";

export const LLM_BASE_URL = Deno.env.get("LLM_BASE_URL") ?? "";

export function hasCloud(): boolean {
  return CLOUD_BASE_URL.length > 0 && CLOUD_API_KEY.length > 0;
}
export function hasLocalHttp(): boolean {
  return LLM_BASE_URL.length > 0;
}
