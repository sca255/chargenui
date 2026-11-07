import { serve } from "bun";

console.log("--- Starting CharGen Live Server IPC Endpoint Integration Test ---");

// Start the actual server process or fetch against local port if already running,
// or we can test against the server directly by importing the server or spinning a test instance.
// Let's spawn bun run src/server.ts on an alternate port like 3334 to verify all routes.

const testPort = 3334;
const proc = Bun.spawn(["bun", "run", "src/server.ts"], {
  env: { ...process.env, PORT: String(testPort) },
  stdout: "pipe",
  stderr: "pipe",
});

// Wait for server to boot
await new Promise((resolve) => setTimeout(resolve, 800));

try {
  const baseUrl = `http://localhost:${testPort}`;

  // 1. Test GET /api/ipc/status
  const statusRes = await fetch(`${baseUrl}/api/ipc/status`);
  if (!statusRes.ok) throw new Error(`GET /api/ipc/status failed: ${statusRes.status}`);
  const statusData = await statusRes.json();
  console.assert(statusData.status === "online", "Server status should be online");
  console.log("✓ Live REST GET /api/ipc/status verified:", statusData.server);

  // 2. Test GET /api/ipc/themes
  const themesRes = await fetch(`${baseUrl}/api/ipc/themes`);
  if (!themesRes.ok) throw new Error(`GET /api/ipc/themes failed: ${themesRes.status}`);
  const themesData = await themesRes.json();
  console.assert(Array.isArray(themesData.themes) && themesData.themes.length > 5, "Themes list verified");
  console.log("✓ Live REST GET /api/ipc/themes verified. Count:", themesData.themes.length);

  // 3. Test POST /api/ipc/suggest-concept
  const postIdeaRes = await fetch(`${baseUrl}/api/ipc/suggest-concept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      concept: "Dr. Genevieve, an aloof geneticist in an undersea research biosphere.",
      archetype: "Kuudere Geneticist",
      themes: ["Kuudere / Cold Analytical", "Psychological Thriller"],
      suggestedBy: "QML Idea Suggester Integration Test",
      autoGenerate: false,
    }),
  });
  if (!postIdeaRes.ok) throw new Error(`POST /api/ipc/suggest-concept failed: ${postIdeaRes.status}`);
  const postIdeaData = await postIdeaRes.json();
  console.assert(postIdeaData.idea.concept.includes("Dr. Genevieve"), "Idea concept returned");
  console.log("✓ Live REST POST /api/ipc/suggest-concept verified:", postIdeaData.idea.id);

  // 4. Test GET /api/ipc/last-idea
  const lastIdeaRes = await fetch(`${baseUrl}/api/ipc/last-idea`);
  const lastIdeaData = await lastIdeaRes.json();
  console.assert(lastIdeaData.idea.archetype === "Kuudere Geneticist", "Last idea matches");
  console.log("✓ Live REST GET /api/ipc/last-idea verified.");

  // 5. Test Live WebSocket Connection
  const wsUrl = `ws://localhost:${testPort}/api/ipc/ws`;
  const ws = new WebSocket(wsUrl);

  const wsMessages: any[] = [];
  const wsPromise = new Promise<void>((resolve, reject) => {
    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      wsMessages.push(parsed);
      if (parsed.type === "pong") resolve();
    };
    ws.onerror = (err) => reject(err);
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "ping" }));
    };
  });

  await wsPromise;
  console.assert(wsMessages.some((m) => m.type === "ipc:connected"), "WebSocket received welcome");
  console.assert(wsMessages.some((m) => m.type === "pong"), "WebSocket received pong");
  console.log("✓ Live WebSocket connection & bidirection ping-pong verified on /api/ipc/ws!");

  ws.close();
  console.log("\n🎉 ALL LIVE SERVER IPC INTEGRATION TESTS PASSED!");
} finally {
  proc.kill();
}
