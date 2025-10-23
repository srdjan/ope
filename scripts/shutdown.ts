/**
 * Shutdown script for OPE server
 *
 * Usage:
 *   deno run --allow-net scripts/shutdown.ts
 *   deno run --allow-net scripts/shutdown.ts http://localhost:8787
 */

const host = Deno.args[0] ?? Deno.env.get("OPE_HOST") ?? "http://localhost:8787";

console.log(`Sending shutdown request to ${host}...`);

try {
  const response = await fetch(`${host}/shutdown`, {
    method: "POST",
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`✓ ${data.message}`);
    Deno.exit(0);
  } else {
    console.error(`✗ Shutdown failed: HTTP ${response.status}`);
    const text = await response.text();
    console.error(text);
    Deno.exit(1);
  }
} catch (error) {
  console.error(`✗ Failed to connect to server: ${error.message}`);
  Deno.exit(1);
}
