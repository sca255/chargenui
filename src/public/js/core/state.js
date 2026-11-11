// Application State
export const state = {
  character: {
    id: "",
    name: "",
    avatar: null,
    tags: [],
    description: "",
    personality: "",
    scenario: "",
    first_mes: "",
    mes_example: "",
    alternate_greetings: [],
    system_prompt: "",
    post_history_instructions: "",
    creator_notes: "",
    character_book: {
      name: "",
      entries: []
    }
  },

  provider: {
    type: "none",
    apiKey: "",
    baseUrl: "",
    model: "",
    temperature: 0.85
  },

  visionImageBase64: null,
  envKeys: {},
  selectedThemes: [],

  // Card Library & Deck State
  savedCards: [],
  activeCardId: null,

  // Revision History & Diff State
  history: [],
  selectedDiffIndex: 0,
  selectedDiffField: "description",

  // Scenario Matrix State
  scenarioMatrix: null,

  // Weaver Guided Interview State
  weaverInterview: null,

  // Bot Generation Mode: "single" | "multi_character" | "rpg_world"
  botMode: "single",

  // Agent Mode State
  agentChatHistory: [],
  agentPinnedRules: [],

  // Enhancer Web Search & Lore Cache
  enhanceRetrievedLore: null,
  enhanceRetrievedLoreQuery: null,

  // Image Prompt Queue State
  imageQueue: [],
  lastGeneratedImagePrompt: null,
  imageConfig: {
    defaultTargetModel: "flux",
    defaultArtStyle: "anime",
  },

  // Historical & Fantasy Eras State
  eras: [],
  selectedEra: null,
  eraCategoryFilter: "All",
  eraRegionFilter: "All",
  eraSearchQuery: "",
};
