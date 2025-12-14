/**
 * Context Parser - Load context definitions from markdown file
 *
 * Parses contexts.md file to extract context definitions in YAML-like format.
 */

import type {
  ContextDefinition,
  ContextInstruction,
} from "../ports/context.ts";
import { err, ok, type Result } from "./result.ts";

type ParseError = {
  readonly kind: "FILE_NOT_FOUND" | "INVALID_FORMAT" | "MISSING_FIELD";
  readonly detail: string;
};

/**
 * Parse markdown file into context definitions
 */
export async function parseContextsFile(
  filePath: string,
): Promise<Result<ReadonlyArray<ContextDefinition>, ParseError>> {
  try {
    const content = await Deno.readTextFile(filePath);
    return parseContextsMarkdown(content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return err({
        kind: "FILE_NOT_FOUND",
        detail: `Context file not found: ${filePath}`,
      });
    }
    return err({
      kind: "INVALID_FORMAT",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Parse markdown content into context definitions
 */
export function parseContextsMarkdown(
  markdown: string,
): Result<ReadonlyArray<ContextDefinition>, ParseError> {
  const contexts: ContextDefinition[] = [];

  // Split by --- markers to find YAML blocks
  const sections = markdown.split(/\n---\n/);

  for (const section of sections) {
    // Look for YAML code blocks
    const yamlMatch = section.match(/```yaml\s*\n([\s\S]*?)\n```/);
    if (!yamlMatch) continue;

    const yamlContent = yamlMatch[1];
    const result = parseYamlContext(yamlContent);

    if (!result.ok) {
      return err(result.error);
    }

    contexts.push(result.value);
  }

  return ok(contexts);
}

/**
 * Parse YAML-like context definition
 * Simple parser for our specific YAML structure
 */
function parseYamlContext(
  yaml: string,
): Result<ContextDefinition, ParseError> {
  const lines = yaml.split("\n");
  let id = "";
  let name = "";
  let description = "";
  // Use a mutable type for parsing
  const instruction: {
    roleSuffix?: string;
    objectivePrefix?: string;
    additionalConstraints?: string[];
    additionalStyle?: string[];
    temperatureOverride?: number;
    maxTokensOverride?: number;
    systemSuffix?: string;
    userPrefix?: string;
  } = {};

  let currentKey: string | null = null;
  let currentArray: string[] | null = null;
  let multilineValue = "";
  let inMultiline = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle multiline strings (ended by next key or array item)
    if (inMultiline) {
      // Check if this line starts a new key (at same or lower indent)
      const keyMatch = line.match(/^(\s*)(\w+):\s*(.*)$/);
      if (keyMatch && keyMatch[1].length <= 2) {
        // Next key found, finish multiline
        if (currentKey === "systemSuffix") {
          instruction.systemSuffix = multilineValue.trim();
        } else if (currentKey === "userPrefix") {
          instruction.userPrefix = multilineValue.trim();
        }
        inMultiline = false;
        multilineValue = "";
        currentKey = null;
        // Don't continue - process this line as a new key below
      } else {
        // Continue multiline
        multilineValue += (multilineValue ? "\n" : "") + line.trim();
        continue;
      }
    }

    // Handle array items
    if (line.trim().startsWith("- ") && currentArray) {
      currentArray.push(line.trim().substring(2));
      continue;
    } else if (currentArray) {
      // End of array
      currentArray = null;
    }

    // Parse key: value pairs
    const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
    if (!match) continue;

    const indent = match[1];
    const key = match[2];
    const value = match[3];

    // Top-level keys
    if (indent.length === 0) {
      if (key === "id") id = value;
      else if (key === "name") name = value;
      else if (key === "description") description = value;
      else if (key === "instruction") {
        // Start of instruction block
      }
    } // Instruction-level keys (2 spaces indent)
    else if (indent.length === 2) {
      currentKey = key;

      if (key === "roleSuffix") {
        instruction.roleSuffix = value;
      } else if (key === "objectivePrefix") {
        instruction.objectivePrefix = value;
      } else if (key === "temperatureOverride") {
        instruction.temperatureOverride = parseFloat(value);
      } else if (key === "maxTokensOverride") {
        instruction.maxTokensOverride = parseInt(value, 10);
      } else if (key === "additionalConstraints") {
        currentArray = [];
        instruction.additionalConstraints = currentArray;
      } else if (key === "additionalStyle") {
        currentArray = [];
        instruction.additionalStyle = currentArray;
      } else if (key === "systemSuffix") {
        if (value === "|") {
          // Multiline string
          inMultiline = true;
          multilineValue = "";
        } else {
          instruction.systemSuffix = value;
        }
      } else if (key === "userPrefix") {
        if (value === "|") {
          // Multiline string
          inMultiline = true;
          multilineValue = "";
        } else {
          instruction.userPrefix = value;
        }
      }
    }
  }

  // Handle trailing multiline
  if (inMultiline && multilineValue) {
    if (currentKey === "systemSuffix") {
      instruction.systemSuffix = multilineValue.trim();
    } else if (currentKey === "userPrefix") {
      instruction.userPrefix = multilineValue.trim();
    }
  }

  // Validate required fields
  if (!id) {
    return err({ kind: "MISSING_FIELD", detail: "Missing required field: id" });
  }
  if (!name) {
    return err({
      kind: "MISSING_FIELD",
      detail: "Missing required field: name",
    });
  }
  if (!description) {
    return err({
      kind: "MISSING_FIELD",
      detail: "Missing required field: description",
    });
  }

  return ok({
    id,
    name,
    description,
    instruction: instruction as ContextInstruction,
  });
}
