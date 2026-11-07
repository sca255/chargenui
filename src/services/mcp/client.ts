import { spawn } from "node:child_process";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Executes a one-shot tool call against an MCP server via stdio or HTTP
 */
export async function executeMcpToolCall(
  server: McpServerConfig,
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<string> {
  if (server.transport === "http") {
    if (!server.url) throw new Error("HTTP MCP server requires a 'url'");
    const res = await fetch(server.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolArgs,
        },
      }),
    });
    if (!res.ok) throw new Error(`MCP HTTP error ${res.status}`);
    const data = (await res.json()) as any;
    return formatMcpResult(data.result);
  }

  // Stdio transport
  if (!server.command) throw new Error("Stdio MCP server requires a 'command'");

  return new Promise((resolve, reject) => {
    const child = spawn(server.command!, server.args || [], {
      env: { ...process.env, ...(server.env || {}) },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn MCP server ${server.name}: ${err.message}`));
    });

    // Send initialize, notifications/initialized, and tools/call
    const initPayload = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "chargenui", version: "1.0.0" },
      },
    }) + "\n";

    const notifyPayload = JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    }) + "\n";

    const callPayload = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: toolArgs,
      },
    }) + "\n";

    child.stdin.write(initPayload);
    child.stdin.write(notifyPayload);
    child.stdin.write(callPayload);
    child.stdin.end();

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`MCP server ${server.name} timed out after 15 seconds.`));
    }, 15000);

    child.on("close", (code) => {
      clearTimeout(timeout);
      // Parse JSON-RPC responses from stdout lines
      const lines = stdout.split("\n").filter((l) => l.trim().startsWith("{"));
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2 && msg.result) {
            resolve(formatMcpResult(msg.result));
            return;
          }
          if (msg.id === 2 && msg.error) {
            reject(new Error(`MCP error: ${msg.error.message || JSON.stringify(msg.error)}`));
            return;
          }
        } catch {}
      }

      if (stderr.trim()) {
        reject(new Error(`MCP server failed (code ${code}): ${stderr.slice(0, 300)}`));
      } else {
        reject(new Error(`MCP server closed without tool response. Output:\n${stdout.slice(0, 300)}`));
      }
    });
  });
}

function formatMcpResult(result: any): string {
  if (!result) return "";
  if (Array.isArray(result.content)) {
    return result.content
      .map((c: any) => (typeof c.text === "string" ? c.text : JSON.stringify(c)))
      .join("\n\n");
  }
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}
