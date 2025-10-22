// Minimal schema validation with graceful repair.
// If the model returns JSON, try to parse; else wrap as { answer, citations: [] }

export type OutShape = { answer: string; citations: string[] };

export function validateOrRepair(text: string): OutShape {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "answer" in parsed && "citations" in parsed) {
      const answer = String(parsed.answer ?? "");
      const citations = Array.isArray(parsed.citations) ? parsed.citations.map(String) : [];
      return { answer, citations };
    }
  } catch (_) { /* fall through */ }
  return { answer: text.trim(), citations: [] };
}
