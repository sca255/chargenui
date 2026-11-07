import { executeEraAgentTurn } from "./src/services/eras/era-agent";

const provider = {
  type: "llamacpp" as const,
  baseUrl: "http://localhost:5001/v1",
  model: "lfm2.5-24b",
  temperature: 0.7,
};

// 1. Read-only Q&A
console.log("=== TEST 1: Read-only Q&A ===");
let t0 = Date.now();
const r1 = await executeEraAgentTurn({
  userPrompt: "What tools do you have available? List them briefly.",
  provider,
});
console.log(`(${Math.round((Date.now() - t0) / 1000)}s)`);
console.log("agentMessage:", r1.agentMessage.slice(0, 400));
console.log("toolCalls:", r1.toolCallsExecuted.map((t) => `${t.tool}(${t.status})`));
console.log("error:", r1.error);
console.log();

// 2. Forge a simple era pair
console.log("=== TEST 2: Forge era pair ===");
t0 = Date.now();
const r2 = await executeEraAgentTurn({
  userPrompt:
    "Create a storm-wracked lighthouse-abbey setting where polygyny is the norm in the multi-partner variant and strict monogamy is the norm in the sole-partner variant. Keep it simple.",
  provider,
});
console.log(`(${Math.round((Date.now() - t0) / 1000)}s)`);
console.log("agentMessage:", r2.agentMessage.slice(0, 500));
console.log("toolCalls:");
for (const t of r2.toolCallsExecuted) {
  console.log(`  ${t.tool}(${t.status}): ${t.resultSummary.slice(0, 130)}`);
}
console.log("eraPair:", r2.eraPair ? `${r2.eraPair.polygyny.id}` : "none");
console.log("savedFile:", r2.savedFile);
console.log("error:", r2.error);
console.log();

// 3. Typo follow-up (original bug)
if (r2.savedFile) {
  console.log("=== TEST 3: typo follow-up 'more simialr' ===");
  t0 = Date.now();
  const r3 = await executeEraAgentTurn({
    userPrompt: "give me something more simialr to this",
    provider,
    chatHistory: [
      { role: "user", content: "Create a storm-wracked lighthouse-abbey setting where polygyny is the norm in the multi-partner variant and strict monogamy is the norm in the sole-partner variant." },
      { role: "assistant", content: `Created and saved \`${r2.savedFile.filename.replace(".json", "")}\`.` },
    ],
    currentEraPair: r2.eraPair,
  });
  console.log(`(${Math.round((Date.now() - t0) / 1000)}s)`);
  console.log("agentMessage:", r3.agentMessage.slice(0, 600));
  console.log("toolCalls:");
  for (const t of r3.toolCallsExecuted) {
    console.log(`  ${t.tool}(${t.status}): ${t.resultSummary.slice(0, 130)}`);
  }
  console.log("eraPair:", r3.eraPair ? r3.eraPair.polygyny.id : "none");
  console.log("savedFile:", r3.savedFile);
  console.log("error:", r3.error);
}
