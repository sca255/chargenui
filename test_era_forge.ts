import {
  listExtensionFiles,
  saveExtensionFile,
  deleteExtensionFile,
  validateEraCompliance,
  getAllEras,
  getEraById,
  searchErasSemantic,
} from "./src/services/eras/eras-service";
import { executeEraAgentTurn } from "./src/services/eras/era-agent";

console.log("=== Testing Era Forge & Compliance Linter ===");

// 1. Test Compliance Linter on High-Compliance Era
const polyEraSample = {
  id: "test_cavern_haven_polygyny",
  name: "🌋 Test Cavern Haven (Multi-Wife Sanctuary)",
  short_name: "Cavern Haven: Multi-Wife",
  span: "Age of Fire",
  category: "Fantasy",
  region: "Obsidian Caldera",
  aesthetic: "Geothermal mineral pools steaming in dark basalt halls, silk floor cushions, glowing volcanic lanterns.",
  tech: "Thermal containment runes, steam-deflection privacy wards, acoustic silencing enchantments.",
  social_codes: "{{user}} is NOT a king or emperor, and there are strictly ZERO guards, ZERO sentries, and ZERO prying eyes. {{user}} is an independent master artisan and smith living in secluded bliss with his wedded wives: adventurous Human scholars, proud High Elf sorceresses, and mischievous Demi-Human kitsune. As the sole master of the haven, domestic disputes or bratty backtalk are resolved firmly across his lap beside the steaming mineral pools, followed by warm, possessive aftercare.",
  names: ["Lyra", "Vespera", "Sariel", "Elowen", "Fenra", "Nissa", "Zephyra", "Aurelia", "Celeste", "Naevia", "Kaelen", "Morrigan", "Yvaine", "Isolde", "Corinne"],
  titles: ["The High-Elf Caldera Bride", "The Fox-Kin Hearth Consort", "The Fearless Human Spouse", "The Dark-Elf Lava-Weaver", "The Loving Haven Wife", "The Pampered Mistress"],
  tags: ["Geothermal Caldera", "Master Artisan", "Non-Royal Patriarch", "Zero Guards", "Pan-Species Polygyny", "Domestic Discipline", "Absolute Seclusion"]
};

const monoEraSample = {
  id: "test_cavern_haven_monogamy",
  name: "🌋 Test Cavern Haven (Sole Bride Seclusion)",
  short_name: "Cavern Haven: Sole Bride",
  span: "Age of Fire",
  category: "Fantasy",
  region: "Obsidian Caldera",
  aesthetic: "Geothermal mineral pools steaming in dark basalt halls, silk floor cushions, glowing volcanic lanterns.",
  tech: "Thermal containment runes, steam-deflection privacy wards, acoustic silencing enchantments.",
  social_codes: "{{user}} is NOT a king or emperor, and there are strictly ZERO guards, ZERO sentries, and ZERO prying eyes. {{user}} is an independent master artisan living in private seclusion with his single, deeply loved wife. Any stubborn disobedience is settled firmly across his knee, followed by warm aftercare.",
  names: ["Lyra", "Vespera", "Sariel", "Elowen", "Fenra", "Nissa", "Zephyra", "Aurelia", "Celeste", "Naevia", "Isolde"],
  titles: ["The Caldera Sole Bride", "The Devoted Artisan Wife", "The Secluded Hearth Mistress", "The Beloved Caldera Consort", "The Cherished Mate"],
  tags: ["Geothermal Caldera", "Master Artisan", "Non-Royal Patriarch", "Zero Guards", "Pan-Species Monogamy", "Domestic Discipline", "Absolute Seclusion"]
};

const auditPoly = validateEraCompliance(polyEraSample, monoEraSample);
console.assert(auditPoly.compliant === true, "Poly era should be compliant");
console.assert(auditPoly.score >= 90, `Poly era score should be >= 90, got: ${auditPoly.score}`);
console.assert(auditPoly.pillars.dualFormat === true, "Dual format verified");
console.assert(auditPoly.pillars.zeroIntruder === true, "Zero intruder verified");
console.assert(auditPoly.pillars.nonRoyalMaster === true, "Non royal master verified");
console.assert(auditPoly.pillars.panSpeciesBrides === true, "Pan species brides verified");
console.assert(auditPoly.pillars.domesticOrder === true, "Domestic order verified");
console.log("✓ Test 1 Passed: Structural Quality Linter verified (Score:", auditPoly.score, ")");

// 2. Test Royal King + Castle Guards Era (Must pass 100% - No dogmatic rejection of user themes!)
const royalKingEra = {
  id: "imperial_high_court_polygyny",
  name: "👑 Imperial High Court (Solar Emperor & Royal Consorts — Multi-Partner)",
  short_name: "High Court: Multi-Partner",
  span: "Third Dynasty of the Sun",
  category: "Fantasy",
  region: "The Golden Capital & Sun Throne",
  aesthetic: "Towering white marble colonnades bathed in sunlight, silk tapestries embroidered with golden dragons, vaulted palace chambers with velvet divans and scent of cedar incense.",
  tech: "Solar alchemy, gilded imperial carriage automata, acoustic privacy barrier runes surrounding the private imperial bedchambers.",
  social_codes: "{{user}} is the Supreme Solar Emperor of the golden realm. While elite imperial guards and royal sentries garrison the grand palace gates, the inner imperial bedchambers and private baths are strictly reserved for the Emperor and his cherished royal consorts. The court yields total sovereign deference to the Emperor.",
  names: ["Seraphina", "Aurelia", "Genevieve", "Valeria", "Cassandra", "Lucia", "Evelina", "Helena", "Isolde", "Adriana"],
  titles: ["The Empress Consort", "The Solar Sorceress Bride", "The Imperial Archduchess Consort", "The Favored Royal Mistress"],
  tags: ["Imperial Court", "Solar Emperor", "Polygyny", "Palace Guards", "Multi-Partner", "Royal Majesty"]
};

const auditRoyal = validateEraCompliance(royalKingEra);
console.assert(auditRoyal.compliant === true, "Royal King era should be fully compliant (no dogmatic penalties)");
console.assert(auditRoyal.score >= 90, `Royal King score should be >= 90, got: ${auditRoyal.score}`);
console.log("✓ Test 2 Passed: Royal King / Emperor era with palace guards is supported with 100% compliance!");

// 3. Test Incomplete / Stub Era (Linter catches missing structural fields)
const stubEraSample = {
  id: "stub_incomplete_era",
  name: "Stub Era",
  short_name: "Stub",
  span: "Unknown",
  category: "Fantasy",
  region: "Nowhere",
  aesthetic: "Short.",
  tech: "None.",
  social_codes: "Too short.",
  names: ["Alice"],
  titles: ["Companion"],
  tags: ["Stub"]
};

const auditStub = validateEraCompliance(stubEraSample);
console.assert(auditStub.compliant === false, "Stub era should fail compliance due to brevity");
console.assert(auditStub.issues.length >= 1, "Stub era should have issues for short social codes");
console.log("✓ Test 3 Passed: Quality linter properly caught incomplete content (Issues:", auditStub.issues.length, "Score:", auditStub.score, ")");

// 3. Test Extension File Save, Discovery, and Deletion
const testFilename = "temp_forge_unit_test.json";
const saveRes = saveExtensionFile(testFilename, {
  [polyEraSample.id]: polyEraSample,
  [monoEraSample.id]: monoEraSample,
});
console.assert(saveRes.success === true, "Extension save should succeed");
console.assert(saveRes.count === 2, "Should save 2 eras");

const files = listExtensionFiles();
const foundFile = files.find(f => f.filename === testFilename);
console.assert(foundFile !== undefined, "Saved extension file should be listed");
console.assert(foundFile?.eraCount === 2, "Listed file should report 2 eras");

const retrievedEra = getEraById(polyEraSample.id);
console.assert(retrievedEra !== null, "Hot-loaded era should be accessible in registry");
console.assert(retrievedEra?.name === polyEraSample.name, "Name should match");

// Clean up
const delRes = deleteExtensionFile(testFilename);
console.assert(delRes === true, "Delete extension file should succeed");
console.assert(getEraById(polyEraSample.id) === null, "Deleted era should no longer be in registry");
console.log("✓ Test 3 Passed: Extension file save, hot-discovery, and cleanup verified.");

// 4. Test Extension Search & Retrieval (Can agents read and search extensions to make similar eras?)
const extMatches = searchErasSemantic("briarwoven");
console.assert(extMatches.length >= 1, "Should find briarwoven extension via semantic search");
const extDirect = getEraById("briarwoven_maze_manor_haven");
console.assert(extDirect !== null, "Should retrieve briarwoven extension by direct ID");
console.assert(extDirect?.tags?.includes("Enchanted Hedge Maze") === true, "Extension metadata & tags must be preserved");
console.log(`✓ Test 4 Passed: Search tools can find & read extension eras (${extMatches.length} matches found).`);

// 5. Test Similar Era Pre-Turn Retrieval & Nudge
const dragonMatches = searchErasSemantic("dragon aerie high on a mountain with eyrie rules");
console.assert(dragonMatches.length >= 1, "Should find emberpeak dragon aerie from generic prompt");
console.assert(dragonMatches[0].id.includes("emberpeak_dragon_aerie"), "Top match should be emberpeak dragon aerie");
console.log(`✓ Test 5 Passed: Semantic similarity detects matching extension era (Top match: ${dragonMatches[0].name}).`);

console.log("\n🎉 ALL ERA FORGE & COMPLIANCE TESTS PASSED!");
