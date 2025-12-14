/**
 * Realistic mock adapter that returns pre-defined responses for demos.
 * Uses the mock dataset to match prompts and return proper JSON responses.
 */

import { ok } from "../lib/result.ts";
import type { Adapter, GenerateArgs, GenerateResult } from "./types.ts";
import { findMockResponse } from "./mockData.ts";
import { logInfo } from "../lib/logger.ts";

/**
 * Extract the raw user prompt from the compiled user prompt.
 * The compiled format is: "TASK:\n{prompt}\n\nOUTPUT: ..."
 */
function extractRawPrompt(compiledUser: string): string {
  const taskMatch = compiledUser.match(/TASK:\n([\s\S]*?)\n\nOUTPUT:/);
  if (taskMatch && taskMatch[1]) {
    return taskMatch[1].trim();
  }
  // Fallback: return the whole thing if pattern doesn't match
  return compiledUser;
}

/**
 * Mock adapter that returns realistic, pre-defined JSON responses.
 * Matches the user prompt against a dataset of demo responses.
 */
export const mockRealistic: Adapter = (
  args: GenerateArgs,
): Promise<import("../lib/result.ts").Result<GenerateResult, import("./types.ts").AdapterError>> => {
  const rawPrompt = extractRawPrompt(args.user);
  const mockResponse = findMockResponse(rawPrompt);

  logInfo("mockRealistic adapter called", {
    adapter: "mockRealistic",
    rawPromptLength: rawPrompt.length,
    rawPromptPreview: rawPrompt.slice(0, 100),
  });

  // Return properly formatted JSON that will pass validation without repair
  const text = JSON.stringify({
    answer: mockResponse.answer,
    citations: mockResponse.citations,
  });

  logInfo("mockRealistic response generated", {
    adapter: "mockRealistic",
    responseLength: text.length,
    hasCitations: mockResponse.citations.length > 0,
  });

  return Promise.resolve(ok({ text }));
};
