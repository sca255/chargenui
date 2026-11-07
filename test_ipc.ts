import { serverIpc, PRESET_THEMES } from "./src/services/ipc/server-ipc";
import type { RoleplayCharacter } from "./src/types/character";

console.log("--- Testing CharGen IPC Server Engine ---");

// 1. Initial Status Check
const status1 = serverIpc.getStatus();
console.assert(status1.status === "online", "IPC Server should be online");
console.assert(Array.isArray(PRESET_THEMES) && PRESET_THEMES.length > 10, "PRESET_THEMES should have items");
console.log("✓ IPC status check passed:", status1.status);

// 2. Submit Concept without auto-generate
const mockConcept = "Valeria, a cybernetic inquisitor hunting rogue neural syndicates in Neo-Verona.";
const res1 = await serverIpc.submitConcept({
  concept: mockConcept,
  themes: ["Psychological Thriller", "Grimdark & Gritty"],
  suggestedBy: "Test Suggester Agent",
  autoGenerate: false,
});

console.assert(res1.idea.concept === mockConcept, "Idea concept should match");
console.assert(res1.idea.suggestedBy === "Test Suggester Agent", "suggestedBy should match");
console.assert(res1.character === undefined, "autoGenerate was false so character should be undefined");
console.log("✓ Concept submission (manual queue) verified:", res1.idea.id);

// 3. Last idea and recent ideas check
const lastIdea = serverIpc.getLastIdea();
console.assert(lastIdea?.concept === mockConcept, "Last idea should match submitted concept");
const recentIdeas = serverIpc.getRecentIdeas();
console.assert(recentIdeas.length >= 1, "Recent ideas list should contain submitted idea");
console.log("✓ Idea caching and history verified. Total cached:", recentIdeas.length);

// 4. Set & Get Active Character
const mockCharacter: RoleplayCharacter = {
  id: "char_test_ipc",
  name: "Valeria",
  tags: ["cyberpunk", "inquisitor"],
  description: "A stern cybernetic operative with glowing azure ocular implants.",
  personality: "Calculated, relentless, quietly observant.",
  scenario: "Investigating an illicit data cache.",
  first_mes: "Stand down. Your cyberware signature matches the registry breach.",
  mes_example: "",
  alternate_greetings: [],
  system_prompt: "",
  post_history_instructions: "",
  creator_notes: "",
  character_book: { name: "", entries: [] },
};

serverIpc.setActiveCharacter(mockCharacter);
const activeChar = serverIpc.getActiveCharacter();
console.assert(activeChar?.name === "Valeria", "Active character name should be Valeria");
console.log("✓ Active character sync verified:", activeChar?.name);

// 5. Mock WebSocket Client Test
let receivedMessages: any[] = [];
const mockWs = {
  send: (msg: string) => {
    receivedMessages.push(JSON.parse(msg));
  },
};

serverIpc.registerClient(mockWs);
console.assert(receivedMessages.length === 1, "Should receive welcome message upon connection");
console.assert(receivedMessages[0].type === "ipc:connected", "Welcome message type should be ipc:connected");
console.assert(receivedMessages[0].payload.activeCharacterName === "Valeria", "Welcome message should include active card");
console.log("✓ Mock WebSocket client registered and received welcome payload.");

// 6. Test WebSocket message handling: ping
await serverIpc.handleMessage(mockWs, JSON.stringify({ action: "ping" }));
const pongMsg = receivedMessages.find((m) => m.type === "pong");
console.assert(!!pongMsg, "Should respond to ping with pong");
console.log("✓ WebSocket ping/pong verified.");

// 7. Test WebSocket message handling: get_active_card
await serverIpc.handleMessage(mockWs, JSON.stringify({ action: "get_active_card" }));
const cardMsg = receivedMessages.find((m) => m.type === "card:active");
console.assert(cardMsg?.payload?.character?.name === "Valeria", "Should return active character");
console.log("✓ WebSocket get_active_card action verified.");

// 8. Test WebSocket message handling: suggest_concept
await serverIpc.handleMessage(
  mockWs,
  JSON.stringify({
    action: "suggest_concept",
    payload: {
      concept: "Seraphina, a fallen seraph running a covert jazz lounge in 1920s Chicago.",
      themes: ["Femme Fatale", "Slow Burn"],
    },
  })
);
const submitMsg = receivedMessages.find((m) => m.type === "idea:submitted");
console.assert(!!submitMsg, "Should respond with idea:submitted");
console.assert(serverIpc.getLastIdea()?.concept.includes("fallen seraph"), "Last idea updated");
console.log("✓ WebSocket suggest_concept action verified.");

// 9. Unregister client
serverIpc.unregisterClient(mockWs);
console.assert(serverIpc.getClientCount() === 0, "Client count should be 0 after unregister");
console.log("✓ WebSocket client unregistration verified.");

// 10. Test Unix Domain Socket IPC & Dual-Bind Event Broadcast
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { CharGenUnixClient } from "./src/services/ipc/unix-client";

const testSocketPath = path.join(os.tmpdir(), `test_chargen_dual_${Date.now()}.sock`);
serverIpc.startUnixServer(testSocketPath);
console.log("✓ Unix Domain Socket server started at:", testSocketPath);

// Register a mock WebSocket client again to verify dual-bind broadcast
const dualWsEvents: any[] = [];
const mockDualWs = {
  send: (msg: string) => {
    dualWsEvents.push(JSON.parse(msg));
  },
};
serverIpc.registerClient(mockDualWs);

// Connect Unix socket client
const unixClient = new CharGenUnixClient({ socketPath: testSocketPath });
const unixEvents: any[] = [];
unixClient.on("message", (msg) => {
  unixEvents.push(msg);
});

await unixClient.connect();
console.log("✓ Unix socket client connected successfully.");

// Wait for welcome event
await new Promise((resolve) => setTimeout(resolve, 50));
const welcomeEvent = unixEvents.find((m) => m.type === "ipc:connected");
console.assert(!!welcomeEvent, "Unix client should receive ipc:connected welcome payload");
console.assert(welcomeEvent.payload.transport === "unix_socket", "Welcome payload transport should be unix_socket");

// Test ping over Unix socket
const pingRes = await unixClient.ping();
console.assert(typeof pingRes.time === "number", "Ping response should include timestamp");
console.log("✓ Unix socket ping/pong roundtrip verified.");

// Test get_status over Unix socket
const statusRes = await unixClient.getStatus();
console.assert(statusRes.status === "online", "Status should be online");
console.assert(statusRes.connectedUnixClients === 1, "Status should report 1 Unix client");
console.assert(statusRes.connectedWsClients === 1, "Status should report 1 WS client");
console.assert(statusRes.connectedClients === 2, "Status should report 2 total clients");
console.log("✓ Dual-bind status verified (1 WS + 1 Unix socket client active).");

// Test get_active_card over Unix socket
const activeCardRes = await unixClient.getActiveCard();
console.assert(activeCardRes.character?.name === "Valeria", "Active card should be Valeria");
console.log("✓ Unix socket get_active_card verified.");

// Test get_themes over Unix socket
const themesRes = await unixClient.getThemes();
console.assert(Array.isArray(themesRes.themes) && themesRes.themes.length > 10, "Themes list verified");
console.log("✓ Unix socket get_themes verified.");

// Test suggest_concept over Unix socket AND verify dual-bind broadcast to WebSocket
const suggestedRes = await unixClient.suggestConcept({
  concept: "Lysandra, an exiled voidweaver navigating an orbital station.",
  themes: ["Moral Ambiguity", "Slow Burn"],
  suggestedBy: "Unix Side App Client",
  autoGenerate: false,
});
console.assert(suggestedRes.idea.concept.includes("Lysandra"), "Concept should be returned");
console.log("✓ Unix socket suggest_concept roundtrip verified.");

// Verify that the idea:received event was broadcast to BOTH the WebSocket client and Unix socket client!
await new Promise((resolve) => setTimeout(resolve, 50));
const wsIdeaEvent = dualWsEvents.find((m) => m.type === "idea:received");
console.assert(!!wsIdeaEvent, "WebSocket client should receive broadcast event from Unix socket action!");
console.assert(wsIdeaEvent.payload.idea.concept.includes("Lysandra"), "Broadcast idea concept should match");

const unixIdeaEvent = unixEvents.find((m) => m.type === "idea:received");
console.assert(!!unixIdeaEvent, "Unix socket client should also receive broadcast event!");
console.log("✓ Dual-bind cross-transport broadcast verified (WS + Unix socket).");

// Cleanup
unixClient.close();
serverIpc.unregisterClient(mockDualWs);
serverIpc.stopUnixServer();

if (fs.existsSync(testSocketPath)) {
  throw new Error("Unix socket file was not cleaned up on stopUnixServer!");
}
console.log("✓ Unix socket teardown & socket file cleanup verified.");

console.log("\n🎉 ALL IPC SERVER ENGINE TESTS PASSED SUCCESSFULLY!");
