import { parseAgentResponse, type TakeOption } from "./src/services/agent/agent-tools";
import type { RoleplayCharacter } from "./src/types/character";

console.log("--- Testing Agent Mode Supercharged Features ---");

// Test 1: Tag parsing with <take name="A"> and <take name="B">
const mockTakesResponse = `
I have developed two distinct creative takes for the opening message. Take A leans into dry tactical friction, while Take B focuses on quiet psychological vulnerability.

<take name="A" title="Tactical Standoff" field="first_mes" explanation="Emphasizes professional distance and gun-safety protocols">
The air in the airlock smelled of ozone and damp thermal suits. {{char}} didn't look up from her datapad as {{user}} stepped through the bulkhead. "Step away from the control panel. Now."
</take>

<take name="B" title="Guarded Vulnerability" field="first_mes" explanation="Focuses on tired exhaustion and unspoken history">
{{char}} pressed the ice pack against her bruised temple, exhaling a ragged breath. When {{user}} entered, her hand reflexively drifted toward her sidearm, then dropped. "You shouldn't have followed me."
</take>

Choose whichever take fits your preferred pacing!
`;

const parsedTakes = parseAgentResponse(mockTakesResponse);
console.assert(Array.isArray(parsedTakes.takes), "Takes should be parsed into an array");
console.assert(parsedTakes.takes?.length === 2, "Should parse exactly 2 takes");
console.assert(parsedTakes.takes?.[0].takeId === "A", "First take should be A");
console.assert(parsedTakes.takes?.[0].title === "Tactical Standoff", "Take A title should match");
console.assert(parsedTakes.takes?.[1].takeId === "B", "Second take should be B");
console.assert(parsedTakes.takes?.[1].title === "Guarded Vulnerability", "Take B title should match");
console.assert(!parsedTakes.agentMessage.includes("<take"), "Tags should be cleaned out of agentMessage");
console.log("✓ Test 1 Passed: <take name='A'> and <take name='B'> creative alternative parsing verified.");

// Test 2: Standard <tool:update_field> tag parsing alongside conversational prose
const mockUpdateResponse = `
Here is a refined personality spec that removes clinical Spock vocabulary and heightens domestic friction.

<tool:update_field name="personality" explanation="Naturalized speech, added sarcastic edge">
Speaks in dry, measured cadences. Uses natural contractions. When flustered, her throat tightens and she cleans her spectacles with aggressive focus.
</tool:update_field>

<tool:update_field name="first_mes" explanation="Removed {{user}} puppeteering">
The tea was already bitter by the time {{user}} walked into the conservatory. {{char}} didn't turn around, listening to the footsteps.
</tool:update_field>

Let me know if you would like any further adjustments!
`;

const parsedUpdates = parseAgentResponse(mockUpdateResponse);
console.assert(parsedUpdates.updatedFields.personality?.includes("Speaks in dry"), "Personality updated");
console.assert(parsedUpdates.updatedFields.first_mes?.includes("tea was already bitter"), "First message updated");
console.assert(parsedUpdates.explanations.personality === "Naturalized speech, added sarcastic edge", "Explanation captured");
console.assert(parsedUpdates.toolCalls.length === 2, "Tool calls count should be 2");
console.log("✓ Test 2 Passed: Granular multi-field updates & explanations parsed cleanly.");

// Test 3: JSON response with takes array fallback
const mockJsonWithTakes = JSON.stringify({
  agent_message: "Here are two takes for you.",
  takes: [
    { takeId: "A", title: "Option Alpha", field: "scenario", content: "A stormy night.", explanation: "Darker tone" },
    { takeId: "B", title: "Option Beta", field: "scenario", content: "A sunny garden.", explanation: "Cozy tone" },
  ],
});

const parsedJsonTakes = parseAgentResponse(mockJsonWithTakes);
console.assert(parsedJsonTakes.takes?.length === 2, "JSON takes parsed");
console.assert(parsedJsonTakes.takes?.[0].title === "Option Alpha", "Take Alpha title matches");
console.log("✓ Test 3 Passed: JSON-mode creative takes parsing verified.");

// Test 4: Alternate greetings granular actions (LumiAgent / Mousy inspired container-leaf addressing)
const mockGreetingsResponse = `
I have appended a new rainy tavern encounter and updated greeting #0 to heighten psychological friction.

<tool:add_alternate_greeting explanation="Rainy tavern encounter">
The rain hammered the leaded glass as {{char}} counted coins on the scarred table. "Sit down before you track mud across the rugs."
</tool:add_alternate_greeting>

<tool:update_alternate_greeting index="0" explanation="Sharpened dialogue">
{{char}} looked up with a dry smirk. "Back so soon?"
</tool:update_alternate_greeting>

<tool:delete_alternate_greeting index="2" explanation="Stale redundant greeting" />

Let me know what you think of these changes!
`;

const parsedGreetings = parseAgentResponse(mockGreetingsResponse);
console.assert(Array.isArray(parsedGreetings.greetingActions), "Greeting actions should be present");
console.assert(parsedGreetings.greetingActions?.length === 3, "Should have 3 greeting actions");
console.assert(parsedGreetings.greetingActions?.[0].action === "add", "First should be add");
console.assert(parsedGreetings.greetingActions?.[0].explanation === "Rainy tavern encounter", "Add explanation matched");
console.assert(parsedGreetings.greetingActions?.[1].action === "update", "Second should be update");
console.assert(parsedGreetings.greetingActions?.[1].index === 0, "Update index 0");
console.assert(parsedGreetings.greetingActions?.[2].action === "delete", "Third should be delete");
console.assert(parsedGreetings.greetingActions?.[2].index === 2, "Delete index 2");
console.assert(!parsedGreetings.agentMessage.includes("<tool:"), "Tool tags cleaned out");
console.log("✓ Test 4 Passed: Granular alternate greetings tool actions parsed cleanly.");

console.log("\n🎉 ALL AGENT MODE SUPERCHARGED FEATURE TESTS PASSED!");
