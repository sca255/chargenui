// CharGen Harness Frontend Application Logic

// Application State
const state = {
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

// DOM References
const el = {
  headerProviderBadge: document.getElementById("header-provider-badge"),

  // Agent Mode Full Chat
  agentTargetScope: document.getElementById("agent-target-scope"),
  agentEnforceNaturalVoice: document.getElementById("agent-enforce-natural-voice"),
  agentChatStream: document.getElementById("agent-chat-stream"),
  agentChatInput: document.getElementById("agent-chat-input"),
  btnAgentSend: document.getElementById("btn-agent-send"),
  btnAgentCancel: document.getElementById("btn-agent-cancel"),
  btnAgentClearChat: document.getElementById("btn-agent-clear-chat"),
  btnAgentImportCard: document.getElementById("btn-agent-import-card"),
  btnAgentPrescription: document.getElementById("btn-agent-prescription"),
  btnOpenAgentFullscreen: document.getElementById("btn-open-agent-fullscreen"),
  btnAgentExpandFullscreen: document.getElementById("btn-agent-expand-fullscreen"),
  modalAgentStudio: document.getElementById("modal-agent-studio"),
  btnCloseAgentStudio: document.getElementById("btn-close-agent-studio"),
  btnAgentStudioToggleSidebar: document.getElementById("btn-agent-studio-toggle-sidebar"),
  agentStudioSidebarBtnText: document.getElementById("agent-studio-sidebar-btn-text"),
  agentStudioSidebar: document.getElementById("agent-studio-sidebar"),
  agentStudioStream: document.getElementById("agent-studio-stream"),
  agentStudioInput: document.getElementById("agent-studio-input"),
  btnAgentStudioSend: document.getElementById("btn-agent-studio-send"),
  btnAgentStudioCancel: document.getElementById("btn-agent-studio-cancel"),
  btnAgentStudioClear: document.getElementById("btn-agent-studio-clear"),
  btnAgentStudioSaveCard: document.getElementById("btn-agent-studio-save-card"),
  agentStudioScope: document.getElementById("agent-studio-scope"),
  agentStudioTwoTakes: document.getElementById("agent-studio-two-takes"),
  agentStudioReviewDiffs: document.getElementById("agent-studio-review-diffs"),
  agentStudioEnforceNaturalVoice: document.getElementById("agent-studio-enforce-natural-voice"),
  agentStudioCardBadge: document.getElementById("agent-studio-card-badge"),
  agentStudioSidebarTokens: document.getElementById("agent-studio-sidebar-tokens"),
  agentStudioFieldEditor: document.getElementById("agent-studio-field-editor"),
  agentStudioActiveFieldLabel: document.getElementById("agent-studio-active-field-label"),
  agentStudioAltsContainer: document.getElementById("agent-studio-alts-container"),
  agentStudioAltsCount: document.getElementById("agent-studio-alts-count"),
  btnAgentStudioDoctorField: document.getElementById("btn-agent-studio-doctor-field"),
  btnAgentStudioPrescription: document.getElementById("btn-agent-studio-prescription"),
  agentStudioPinnedInput: document.getElementById("agent-studio-pinned-input"),
  btnAgentStudioAddPinned: document.getElementById("btn-agent-studio-add-pinned"),
  agentStudioPinnedChips: document.getElementById("agent-studio-pinned-chips"),
  agentStudioPinnedCount: document.getElementById("agent-studio-pinned-count"),
  agentPinnedBar: document.getElementById("agent-pinned-directives-bar"),
  agentTogglePinned: document.getElementById("agent-toggle-pinned"),
  agentPinnedContent: document.getElementById("agent-pinned-content"),
  agentPinnedChevron: document.getElementById("agent-pinned-chevron"),
  agentPinnedChips: document.getElementById("agent-pinned-chips"),
  agentPinnedEmptyHint: document.getElementById("agent-pinned-empty-hint"),
  agentPinnedCountBadge: document.getElementById("agent-pinned-count-badge"),
  reimagineCardName: document.getElementById("reimagine-card-name"),
  reimaginePrompt: document.getElementById("reimagine-prompt"),
  btnRunReimagine: document.getElementById("btn-run-reimagine"),
  reimagineResult: document.getElementById("reimagine-result"),
  agentNewPinnedInput: document.getElementById("agent-new-pinned-input"),
  btnAddPinnedRule: document.getElementById("btn-add-pinned-rule"),
  agentTwoTakes: document.getElementById("agent-two-takes"),
  agentReviewDiffs: document.getElementById("agent-review-diffs"),
  floatingDoctorPill: document.getElementById("floating-doctor-pill"),

  // Navigation
  tabs: document.querySelectorAll(".nav-tab[data-tab]"),
  tabContents: document.querySelectorAll(".tab-content"),
  edTabs: document.querySelectorAll(".ed-tab"),
  edTabContents: document.querySelectorAll(".ed-tab-content"),

  // Form Fields & Active Card Link
  charName: document.getElementById("char-name"),
  activeCardPill: document.getElementById("active-card-pill"),
  activeCardNameLabel: document.getElementById("active-card-name-label"),
  btnUnlinkCard: document.getElementById("btn-unlink-card"),
  charTags: document.getElementById("char-tags"),
  btnFixMacros: document.getElementById("btn-fix-macros"),
  btnSaveToLibrary: document.getElementById("btn-save-to-library"),
  btnSaveAsNewCard: document.getElementById("btn-save-as-new-card"),
  btnNewCard: document.getElementById("btn-new-card"),
  btnRerollCardHeader: document.getElementById("btn-reroll-card-header"),
  chkMacroPreview: document.getElementById("chk-macro-preview"),
  macroPreviewUser: document.getElementById("macro-preview-user"),
  avatarImg: document.getElementById("char-avatar-img"),
  avatarPlaceholder: document.getElementById("char-avatar-placeholder"),
  avatarContainer: document.getElementById("avatar-container"),
  avatarFileInput: document.getElementById("avatar-file-input"),
  btnRemoveAvatar: document.getElementById("btn-remove-avatar"),
  btnUploadAvatar: document.getElementById("btn-upload-avatar"),

  fieldDesc: document.getElementById("field-description"),
  fieldPers: document.getElementById("field-personality"),
  fieldScenario: document.getElementById("field-scenario"),
  fieldFirstMes: document.getElementById("field-first-mes"),
  fieldMesExample: document.getElementById("field-mes-example"),
  fieldSystemPrompt: document.getElementById("field-system-prompt"),
  fieldPostHistory: document.getElementById("field-post-history"),
  fieldCreatorNotes: document.getElementById("field-creator-notes"),

  // AI Directives & System Prompt Incorporator
  incorporateTarget: document.getElementById("incorporate-target"),
  incorporateGuidance: document.getElementById("incorporate-guidance"),
  btnRunIncorporate: document.getElementById("btn-run-incorporate"),
  btnPlainMovePostHistory: document.getElementById("btn-plain-move-post-history"),
  incorporateStatusBox: document.getElementById("incorporate-status-box"),

  // Modal Incorporate
  modalIncorporateSystem: document.getElementById("modal-incorporate-system"),
  modalIncPreview: document.getElementById("modal-inc-preview"),
  modalIncGuidance: document.getElementById("modal-inc-guidance"),
  btnCloseIncModal: document.getElementById("btn-close-inc-modal"),
  btnModalIncRun: document.getElementById("btn-modal-inc-run"),
  btnModalIncFallback: document.getElementById("btn-modal-inc-fallback"),
  btnModalIncDiscard: document.getElementById("btn-modal-inc-discard"),

  // Alt Greetings & Lorebook
  altGreetingsList: document.getElementById("alt-greetings-list"),
  btnAddAltGreeting: document.getElementById("btn-add-alt-greeting"),
  lorebookList: document.getElementById("lorebook-entries-list"),
  btnAddLorebookEntry: document.getElementById("btn-add-lorebook-entry"),
  btnClearLorebook: document.getElementById("btn-clear-lorebook"),

  // Generator
  genConcept: document.getElementById("gen-concept"),
  genGenre: document.getElementById("gen-genre"),
  genStoryArc: document.getElementById("gen-story-arc"),
  genMinAlts: document.getElementById("gen-min-alts"),
  genEra: document.getElementById("gen-era"),
  btnOpenEraModal: document.getElementById("btn-open-era-modal"),
  btnBrowseEraAddon: document.getElementById("btn-browse-era-addon"),
  btnClearEra: document.getElementById("btn-clear-era"),
  btnEraQuickOff: document.getElementById("btn-era-quick-off"),
  btnEraQuickFantasy: document.getElementById("btn-era-quick-fantasy"),
  btnEraQuickMedieval: document.getElementById("btn-era-quick-medieval"),
  btnEraQuickAntiquity: document.getElementById("btn-era-quick-antiquity"),
  btnEraQuickVictorian: document.getElementById("btn-era-quick-victorian"),
  btnEraQuickUser: document.getElementById("btn-era-quick-user"),
  modalEraPicker: document.getElementById("modal-era-picker"),
  btnCloseEraModal: document.getElementById("btn-close-era-modal"),
  btnCloseEraModalBottom: document.getElementById("btn-close-era-modal-bottom"),
  eraSearchInput: document.getElementById("era-search-input"),
  eraRegionFilter: document.getElementById("era-region-filter"),
  eraCardsContainer: document.getElementById("era-cards-container"),
  eraDetailPanel: document.getElementById("era-detail-panel"),
  btnApplySelectedEra: document.getElementById("btn-apply-selected-era"),
  btnModalEraOff: document.getElementById("btn-modal-era-off"),
  btnModalEraFantasy: document.getElementById("btn-modal-era-fantasy"),
  btnEraCreateCustom: document.getElementById("btn-era-create-custom"),
  modalUserEraEditor: document.getElementById("modal-user-era-editor"),
  btnCloseUserEraEditor: document.getElementById("btn-close-user-era-editor"),
  btnCancelUserEra: document.getElementById("btn-cancel-user-era"),
  btnSaveUserEra: document.getElementById("btn-save-user-era"),
  userEraId: document.getElementById("user-era-id"),
  userEraName: document.getElementById("user-era-name"),
  userEraSpan: document.getElementById("user-era-span"),
  userEraRegion: document.getElementById("user-era-region"),
  userEraAesthetic: document.getElementById("user-era-aesthetic"),
  userEraTech: document.getElementById("user-era-tech"),
  userEraSocial: document.getElementById("user-era-social"),
  userEraNames: document.getElementById("user-era-names"),
  userEraTitles: document.getElementById("user-era-titles"),
  userEraModalTitle: document.getElementById("user-era-modal-title"),
  userErasCount: document.getElementById("user-eras-count"),
  eraCatalogCountBadge: document.getElementById("era-catalog-count-badge"),
  selectedThemesBox: document.getElementById("selected-themes-box"),
  noThemesHint: document.getElementById("no-themes-hint"),
  customThemeInput: document.getElementById("custom-theme-input"),
  btnAddCustomTheme: document.getElementById("btn-add-custom-theme"),
  btnClearThemes: document.getElementById("btn-clear-themes"),
  genTone: document.getElementById("gen-tone"),
  genFormat: document.getElementById("gen-format"),
  genNsfw: document.getElementById("gen-nsfw"),
  genWebSearch: document.getElementById("gen-web-search"),
  boxSearchQuery: document.getElementById("box-search-query"),
  genSearchQuery: document.getElementById("gen-search-query"),
  btnPreviewSearch: document.getElementById("btn-preview-search"),
  genIncludeHeadcanons: document.getElementById("gen-include-headcanons"),
  searchLorePreview: document.getElementById("search-lore-preview"),
  btnWeaverInterview: document.getElementById("btn-weaver-interview"),
  btnRunGenerate: document.getElementById("btn-run-generate"),
  btnRunReroll: document.getElementById("btn-run-reroll"),

  // Weaver Guided Interview Workshop Modal
  modalWeaverInterview: document.getElementById("modal-weaver-interview"),
  btnCloseWeaverInterview: document.getElementById("btn-close-weaver-interview"),
  btnWeaverCancel: document.getElementById("btn-weaver-cancel"),
  btnWeaverAutofill: document.getElementById("btn-weaver-autofill"),
  btnWeaverAskMore: document.getElementById("btn-weaver-ask-more"),
  btnWeaverSubmitForge: document.getElementById("btn-weaver-submit-forge"),
  weaverInterviewLoading: document.getElementById("weaver-interview-loading"),
  weaverInterviewContent: document.getElementById("weaver-interview-content"),
  weaverVisionBox: document.getElementById("weaver-vision-box"),
  weaverVisionText: document.getElementById("weaver-vision-text"),
  weaverQuestionsList: document.getElementById("weaver-questions-list"),

  // Vision
  visionDropzone: document.getElementById("vision-dropzone"),
  visionFileInput: document.getElementById("vision-file-input"),
  visionPreviewBox: document.getElementById("vision-preview-box"),
  visionImgPreview: document.getElementById("vision-img-preview"),
  visionHints: document.getElementById("vision-hints"),
  visionNsfw: document.getElementById("vision-nsfw"),
  btnRunVision: document.getElementById("btn-run-vision"),
  visionFindingsBox: document.getElementById("vision-findings-box"),
  visionFindingsText: document.getElementById("vision-findings-text"),

  // Enhancer Actions & Steering
  btnRunAudit: document.getElementById("btn-run-audit"),
  btnFullOverhaul: document.getElementById("btn-full-overhaul"),
  enhanceSteeringNotes: document.getElementById("enhance-steering-notes"),
  btnClearSteering: document.getElementById("btn-clear-steering"),
  steeringChips: document.getElementById("steering-chips"),
  enhanceWebSearch: document.getElementById("enhance-web-search"),
  boxEnhanceSearch: document.getElementById("box-enhance-search"),
  enhanceSearchQuery: document.getElementById("enhance-search-query"),
  btnEnhancePreviewSearch: document.getElementById("btn-enhance-preview-search"),
  enhanceIncludeHeadcanons: document.getElementById("enhance-include-headcanons"),
  enhanceSearchLorePreview: document.getElementById("enhance-search-lore-preview"),

  actDeepenPersona: document.getElementById("act-deepen-persona"),
  btnRunDeepen: document.getElementById("btn-run-deepen"),
  deepenCustomHint: document.getElementById("deepen-custom-hint"),

  actPolishVoice: document.getElementById("act-polish-voice"),
  btnRunVoice: document.getElementById("btn-run-voice"),
  voiceRegisterSelect: document.getElementById("voice-register-select"),
  voiceBanRobot: document.getElementById("voice-ban-robot"),
  voiceScenarioHint: document.getElementById("voice-scenario-hint"),

  actPunchFirstMes: document.getElementById("act-punch-first-mes"),
  btnRunGreetings: document.getElementById("btn-run-greetings"),
  greetingsSceneHint: document.getElementById("greetings-scene-hint"),
  greetingTheme1: document.getElementById("greeting-theme-1"),
  greetingTheme2: document.getElementById("greeting-theme-2"),
  greetingTheme3: document.getElementById("greeting-theme-3"),

  actFormatOptimize: document.getElementById("act-format-optimize"),
  btnRunFormat: document.getElementById("btn-run-format"),
  formatTargetSelect: document.getElementById("format-target-select"),
  formatTokenBudget: document.getElementById("format-token-budget"),

  actLorebookBuilder: document.getElementById("act-lorebook-builder"),
  btnRunLorebook: document.getElementById("btn-run-lorebook"),
  lorebookDepthSelect: document.getElementById("lorebook-depth-select"),
  lorebookTopicsHint: document.getElementById("lorebook-topics-hint"),

  actToneShift: document.getElementById("act-tone-shift"),
  btnRunTone: document.getElementById("btn-run-tone"),
  tonePresetChips: document.getElementById("tone-preset-chips"),
  toneCustomInput: document.getElementById("tone-custom-input"),

  // Inspector & Metrics
  cardScoreNum: document.getElementById("card-score-num"),
  cardScoreSummary: document.getElementById("card-score-summary"),
  auditFindingsList: document.getElementById("audit-findings-list"),
  tokenTotalNum: document.getElementById("token-total-num"),
  tbDesc: document.getElementById("tb-desc"),
  tbPers: document.getElementById("tb-pers"),
  tbScenario: document.getElementById("tb-scenario"),
  tbFirst: document.getElementById("tb-first"),
  tbExamples: document.getElementById("tb-examples"),
  tbSystem: document.getElementById("tb-system"),

  tokenBadgeDesc: document.getElementById("token-badge-desc"),
  tokenBadgePers: document.getElementById("token-badge-pers"),
  tokenBadgeScenario: document.getElementById("token-badge-scenario"),
  tokenBadgeFirst: document.getElementById("token-badge-first"),
  tokenBadgeExamples: document.getElementById("token-badge-examples"),

  // Import / Export
  btnImportCard: document.getElementById("btn-import-card"),
  fileImportInput: document.getElementById("file-import-input"),
  btnExportPng: document.getElementById("btn-export-png"),
  btnExportCharx: document.getElementById("btn-export-charx"),
  btnExportJson: document.getElementById("btn-export-json"),
  btnCopyPrompt: document.getElementById("btn-copy-prompt"),
  btnViewRawJson: document.getElementById("btn-view-raw-json"),

  btnRestoreAutosave: document.getElementById("btn-restore-autosave"),
  btnPreviewCreatorNotes: document.getElementById("btn-preview-creator-notes"),
  modalCreatorNotes: document.getElementById("modal-creator-notes"),
  btnCloseCreatorNotesModal: document.getElementById("btn-close-creator-notes-modal"),
  btnCloseCreatorNotesModal2: document.getElementById("btn-close-creator-notes-modal-2"),
  creatorNotesPreviewContainer: document.getElementById("creator-notes-preview-container"),

  // Library & Multi-Deck
  btnOpenLibrary: document.getElementById("btn-open-library"),
  libraryCountBadge: document.getElementById("library-count-badge"),

  // Image Prompt Generator & Offline Queue
  btnOpenImageQueue: document.getElementById("btn-open-image-queue"),
  btnGenImgPrompt: document.getElementById("btn-gen-img-prompt"),
  modalImagePrompts: document.getElementById("modal-image-prompts"),
  btnCloseImagePrompts: document.getElementById("btn-close-image-prompts"),
  imageQueueCountBadge: document.getElementById("image-queue-count-badge"),
  imgQueueTabCount: document.getElementById("img-queue-tab-count"),
  tabBtnImgGen: document.getElementById("tab-btn-img-gen"),
  tabBtnImgQueue: document.getElementById("tab-btn-img-queue"),
  imgTabGen: document.getElementById("img-tab-gen"),
  imgTabQueue: document.getElementById("img-tab-queue"),
  tabBtnImgComfy: document.getElementById("tab-btn-img-comfy"),
  imgTabComfy: document.getElementById("img-tab-comfy"),
  imgPurposeAvatar: document.getElementById("img-purpose-avatar"),
  imgPurposeGreeting: document.getElementById("img-purpose-greeting"),
  imgPurposeScenario: document.getElementById("img-purpose-scenario"),
  comfyServerUrl: document.getElementById("comfy-server-url"),
  btnTestComfyConn: document.getElementById("btn-test-comfy-conn"),
  comfyStatusBadge: document.getElementById("comfy-status-badge"),
  comfyWorkflowFileInput: document.getElementById("comfy-workflow-file-input"),
  comfyWorkflowJsonInput: document.getElementById("comfy-workflow-json-input"),
  comfyMappingContainer: document.getElementById("comfy-mapping-container"),
  comfyPosNodeSelect: document.getElementById("comfy-pos-node-select"),
  comfyNegNodeSelect: document.getElementById("comfy-neg-node-select"),
  comfyRandomizeSeedCheck: document.getElementById("comfy-randomize-seed-check"),
  btnComfyRunAll: document.getElementById("btn-comfy-run-all"),
  btnComfyExportBatchJson: document.getElementById("btn-comfy-export-batch-json"),
  comfyRunSummaryText: document.getElementById("comfy-run-summary-text"),
  comfyProgressConsole: document.getElementById("comfy-progress-console"),
  comfyProgressLines: document.getElementById("comfy-progress-lines"),
  imgTargetCharName: document.getElementById("img-target-char-name"),
  imgTargetModel: document.getElementById("img-target-model"),
  imgPortraitIntent: document.getElementById("img-portrait-intent"),
  imgArtStyle: document.getElementById("img-art-style"),
  imgShotType: document.getElementById("img-shot-type"),
  imgAspectRatio: document.getElementById("img-aspect-ratio"),
  imgCustomSteering: document.getElementById("img-custom-steering"),
  imgNsfwCheck: document.getElementById("img-nsfw-check"),
  btnDoGenImgPrompt: document.getElementById("btn-do-gen-img-prompt"),
  btnOpenVisualIdentity: document.getElementById("btn-open-visual-identity"),
  modalVisualIdentity: document.getElementById("modal-visual-identity"),
  btnCloseVisualIdentity: document.getElementById("btn-close-visual-identity"),
  viLoading: document.getElementById("vi-loading"),
  viContent: document.getElementById("vi-content"),
  viCharName: document.getElementById("vi-char-name"),
  btnViReextract: document.getElementById("btn-vi-reextract"),
  viGender: document.getElementById("vi-gender"),
  viAge: document.getElementById("vi-age"),
  viHair: document.getElementById("vi-hair"),
  viEyes: document.getElementById("vi-eyes"),
  viFeatures: document.getElementById("vi-features"),
  viBuild: document.getElementById("vi-build"),
  viClothing: document.getElementById("vi-clothing"),
  viTags: document.getElementById("vi-tags"),
  btnViSyncTags: document.getElementById("btn-vi-sync-tags"),
  btnViCancel: document.getElementById("btn-vi-cancel"),
  btnViSave: document.getElementById("btn-vi-save"),
  btnViSaveText: document.getElementById("btn-vi-save-text"),

  // Spine Synthesis Buttons
  btnRunGreetingsSpine: document.getElementById("btn-run-greetings-spine"),
  btnOpenSynthesizeSpineGenerate: document.getElementById("btn-open-synthesize-spine-generate"),
  btnOpenSynthesizeSpine: document.getElementById("btn-open-synthesize-spine"),

  // Regenerate Greetings with Spine Modal
  modalRegenGreetingsSpine: document.getElementById("modal-regenerate-greetings-spine"),
  btnCloseRegenGreetingsSpine: document.getElementById("btn-close-regen-greetings-spine"),

  // Improve Greetings Button
  btnImproveGreetings: document.getElementById("btn-improve-greetings"),
  regenTargetCharName: document.getElementById("regen-target-char-name"),
  regenStoryArc: document.getElementById("regen-story-arc"),
  regenMinAlts: document.getElementById("regen-min-alts"),
  regenSteering: document.getElementById("regen-steering"),
  regenLoading: document.getElementById("regen-loading"),
  btnRegenCancel: document.getElementById("btn-regen-cancel"),
  btnRegenExecute: document.getElementById("btn-regen-execute"),

  // Spine Synthesis Modal
  modalSynthesizeSpine: document.getElementById("modal-synthesize-spine"),
  btnCloseSynthesizeSpine: document.getElementById("btn-close-synthesize-spine"),
  spineTargetCharName: document.getElementById("spine-target-char-name"),
  spineOriginalConcept: document.getElementById("spine-original-concept"),
  spineOriginalStoryArc: document.getElementById("spine-original-story-arc"),
  spineGenre: document.getElementById("spine-genre"),
  spineEra: document.getElementById("spine-era"),
  spineThemes: document.getElementById("spine-themes"),
  spineTone: document.getElementById("spine-tone"),
  spineIntensity: document.getElementById("spine-intensity"),
  spineBotMode: document.getElementById("spine-bot-mode"),
  spineNsfw: document.getElementById("spine-nsfw"),
  spineLoading: document.getElementById("spine-loading"),
  btnSpineCancel: document.getElementById("btn-spine-cancel"),
  btnSpineSynthesize: document.getElementById("btn-spine-synthesize"),

  imgGenOutputContainer: document.getElementById("img-gen-output-container"),
  imgOutPositive: document.getElementById("img-out-positive"),
  imgOutNegative: document.getElementById("img-out-negative"),
  imgOutSettingsBadges: document.getElementById("img-out-settings-badges"),
  btnCopyPosPrompt: document.getElementById("btn-copy-pos-prompt"),
  btnCopyNegPrompt: document.getElementById("btn-copy-neg-prompt"),
  btnCopyComfySnippet: document.getElementById("btn-copy-comfy-snippet"),
  btnAddToImgQueue: document.getElementById("btn-add-to-img-queue"),
  btnQuickDispatchComfy: document.getElementById("btn-quick-dispatch-comfy"),
  imgQueueSearch: document.getElementById("img-queue-search"),
  imgQueueFilterStatus: document.getElementById("img-queue-filter-status"),
  btnQueueCopyAll: document.getElementById("btn-queue-copy-all"),
  btnQueueExportJson: document.getElementById("btn-queue-export-json"),
  btnQueueExportText: document.getElementById("btn-queue-export-text"),
  btnQueueClearDone: document.getElementById("btn-queue-clear-done"),
  btnQueueClearAll: document.getElementById("btn-queue-clear-all"),
  imgQueueListContainer: document.getElementById("img-queue-list-container"),

  // Card Gallery Browser
  tabBtnGallery: document.getElementById("tab-btn-gallery"),
  galleryTabCount: document.getElementById("gallery-tab-count"),
  galleryCountPill: document.getElementById("gallery-count-pill"),
  btnGalleryUpload: document.getElementById("btn-gallery-upload"),
  btnGalleryGenPrompt: document.getElementById("btn-gallery-gen-prompt"),
  btnGalleryClearAll: document.getElementById("btn-gallery-clear-all"),
  galleryFileInput: document.getElementById("gallery-file-input"),
  galleryDropzone: document.getElementById("gallery-dropzone"),
  galleryGrid: document.getElementById("gallery-grid"),
  galleryEmptyState: document.getElementById("gallery-empty-state"),
  modalGalleryLightbox: document.getElementById("modal-gallery-lightbox"),
  lightboxImg: document.getElementById("lightbox-img"),
  lightboxTitle: document.getElementById("lightbox-title"),
  btnCloseLightbox: document.getElementById("btn-close-lightbox"),

  modalCardLibrary: document.getElementById("modal-card-library"),
  btnCloseLibrary: document.getElementById("btn-close-library"),
  btnCloseLibraryFooter: document.getElementById("btn-close-library-footer"),
  librarySearchInput: document.getElementById("library-search-input"),
  btnLibSaveCurrent: document.getElementById("btn-lib-save-current"),
  btnLibNewBlank: document.getElementById("btn-lib-new-blank"),
  libraryCardsContainer: document.getElementById("library-cards-container"),

  // Household & Court Binder UI
  btnOpenHouseholds: document.getElementById("btn-open-households"),
  householdsCountBadge: document.getElementById("households-count-badge"),
  modalHouseholds: document.getElementById("modal-households"),
  btnCloseHouseholds: document.getElementById("btn-close-households"),
  btnCloseHouseholdsFooter: document.getElementById("btn-close-households-footer"),
  btnCreateHousehold: document.getElementById("btn-create-household"),
  householdListContainer: document.getElementById("household-list-container"),
  householdEmptyState: document.getElementById("household-empty-state"),
  householdEditorView: document.getElementById("household-editor-view"),
  hhInputName: document.getElementById("hh-input-name"),
  hhInputCategory: document.getElementById("hh-input-category"),
  hhInputUserTitle: document.getElementById("hh-input-usertitle"),
  hhInputLore: document.getElementById("hh-input-lore"),
  hhInputRules: document.getElementById("hh-input-rules"),
  btnSaveHouseholdMeta: document.getElementById("btn-save-household-meta"),
  btnDeleteHousehold: document.getElementById("btn-delete-household"),
  hhRosterCount: document.getElementById("hh-roster-count"),
  hhAddCardSelect: document.getElementById("hh-add-card-select"),
  btnHhAddMember: document.getElementById("btn-hh-add-member"),
  hhMembersTableContainer: document.getElementById("hh-members-table-container"),
  btnHhGenEncounter: document.getElementById("btn-hh-gen-encounter"),
  hhEncounterGoal: document.getElementById("hh-encounter-goal"),
  hhEncounterSaveAlt: document.getElementById("hh-encounter-save-alt"),
  hhEncounterOutputBox: document.getElementById("hh-encounter-output-box"),
  hhEncounterTitle: document.getElementById("hh-encounter-title"),
  btnHhCopyEncounter: document.getElementById("btn-hh-copy-encounter"),
  hhEncounterScenario: document.getElementById("hh-encounter-scenario"),
  hhEncounterText: document.getElementById("hh-encounter-text"),

  // Revision History & Visual Diff
  btnOpenHistory: document.getElementById("btn-open-history"),
  historyCountBadge: document.getElementById("history-count-badge"),
  modalHistoryDiff: document.getElementById("modal-history-diff"),
  btnCloseHistory: document.getElementById("btn-close-history"),
  btnCloseHistoryFooter: document.getElementById("btn-close-history-footer"),
  diffSnapshotList: document.getElementById("diff-snapshot-list"),
  diffCompareTitle: document.getElementById("diff-compare-title"),
  diffDeltaBadge: document.getElementById("diff-delta-badge"),
  btnDiffRestore: document.getElementById("btn-diff-restore"),
  diffFieldTabs: document.querySelectorAll(".diff-tab"),
  diffViewContent: document.getElementById("diff-view-content"),

  // Scenario Matrix
  actScenarioMatrix: document.getElementById("act-scenario-matrix"),
  matrixCustomSteering: document.getElementById("matrix-custom-steering"),
  btnGenerateMatrix: document.getElementById("btn-generate-matrix"),
  modalScenarioMatrix: document.getElementById("modal-scenario-matrix"),
  btnCloseMatrix: document.getElementById("btn-close-matrix"),
  btnCloseMatrixFooter: document.getElementById("btn-close-matrix-footer"),
  matrixLoading: document.getElementById("matrix-loading"),
  matrixPackagesContainer: document.getElementById("matrix-packages-container"),

  // Modals
  btnOpenSettings: document.getElementById("btn-open-settings"),
  btnCloseSettings: document.getElementById("btn-close-settings"),
  modalSettings: document.getElementById("modal-settings"),
  btnSaveSettings: document.getElementById("btn-save-settings"),
  settingProviderType: document.getElementById("setting-provider-type"),
  settingApiKey: document.getElementById("setting-api-key"),
  settingBaseUrl: document.getElementById("setting-base-url"),
  settingModelName: document.getElementById("setting-model-name"),
  settingTemperature: document.getElementById("setting-temperature"),
  tempVal: document.getElementById("temp-val"),
  groupBaseUrl: document.getElementById("group-base-url"),
  settingEnvDetected: document.getElementById("setting-env-detected"),

  settingSearchProvider: document.getElementById("setting-search-provider"),
  groupSearchKey: document.getElementById("group-search-key"),
  labelSearchKey: document.getElementById("label-search-key"),
  settingSearchKey: document.getElementById("setting-search-key"),
  settingMcpCommand: document.getElementById("setting-mcp-command"),
  settingImgDefaultModel: document.getElementById("setting-img-default-model"),
  settingImgDefaultArtStyle: document.getElementById("setting-img-default-art-style"),

  modalJson: document.getElementById("modal-json"),
  btnCloseJson: document.getElementById("btn-close-json"),
  rawJsonTextarea: document.getElementById("raw-json-textarea"),
  btnCopyRawJson: document.getElementById("btn-copy-raw-json"),

  // Prompt Configuration Elements
  headerPromptSelect: document.getElementById("header-prompt-select"),
  btnHeaderEditPrompt: document.getElementById("btn-header-edit-prompt"),
  headerPromptBadge: document.getElementById("header-prompt-badge"),
  settingPromptProfile: document.getElementById("setting-prompt-profile"),
  badgePromptPrivate: document.getElementById("badge-prompt-private"),
  promptEditSystem: document.getElementById("prompt-edit-system"),
  promptEditSpine: document.getElementById("prompt-edit-spine"),
  promptEditDesc: document.getElementById("prompt-edit-desc"),
  promptEditPers: document.getElementById("prompt-edit-pers"),
  promptEditScenario: document.getElementById("prompt-edit-scenario"),
  promptEditFirstmes: document.getElementById("prompt-edit-firstmes"),
  promptEditAlichat: document.getElementById("prompt-edit-alichat"),
  btnSaveCustomPrompts: document.getElementById("btn-save-custom-prompts"),
  btnResetPrompts: document.getElementById("btn-reset-prompts"),
};

let reimagineMode = "redesign";

// Update Top Header Provider Status Badge
async function updateLlmCacheBadge() {
  const btn = document.getElementById("btn-toggle-llm-cache");
  const countEl = document.getElementById("llm-cache-count");
  if (!btn) return;
  try {
    const res = await apiGet("/api/llm/cache");
    if (res) {
      if (countEl) countEl.textContent = res.totalEntries || 0;
      if (res.enabled) {
        btn.innerHTML = `⚡ Cache (<span id="llm-cache-count">${res.totalEntries || 0}</span>)`;
        btn.style.background = "rgba(16, 185, 129, 0.15)";
        btn.style.borderColor = "#10b981";
        btn.style.color = "#34d399";
        btn.title = `Persistent LLM cache is ACTIVE (${res.totalEntries || 0} responses cached). Click to toggle or right-click to clear.`;
      } else {
        btn.innerHTML = `🚫 Cache (<span id="llm-cache-count">${res.totalEntries || 0}</span>)`;
        btn.style.background = "rgba(107, 114, 128, 0.15)";
        btn.style.borderColor = "#6b7280";
        btn.style.color = "#9ca3af";
        btn.title = "Persistent LLM cache is OFF. Prompts will always hit the provider. Click to enable.";
      }
    }
  } catch (e) {
    console.warn("Failed fetching LLM cache stats:", e);
  }
}

function updateProviderBadge() {
  if (!el.headerProviderBadge) return;
  const p = state.provider;
  const envKeyPresent =
    (p.type === "gemini" && state.envKeys.hasGemini) ||
    (p.type === "openrouter" && state.envKeys.hasOpenRouter) ||
    (p.type === "openai" && state.envKeys.hasOpenAI) ||
    (p.type === "anthropic" && state.envKeys.hasAnthropic);

  const hasCredentials = p.type === "ollama" || p.type === "llamacpp" || p.apiKey || envKeyPresent;

  if (p && p.type && p.type !== "none" && hasCredentials) {
    const modelShort = p.model ? p.model.split("/").pop() : "";
    el.headerProviderBadge.textContent = `🟢 ${p.type.toUpperCase()}${modelShort ? `: ${modelShort}` : ''}`;
    el.headerProviderBadge.style.background = "rgba(16, 185, 129, 0.15)";
    el.headerProviderBadge.style.borderColor = "#10b981";
    el.headerProviderBadge.style.color = "#34d399";
    el.headerProviderBadge.title = `Active LLM Provider: ${p.type} (${p.model || 'default'}). Click to configure.`;
  } else {
    el.headerProviderBadge.textContent = "⚠️ No Key";
    el.headerProviderBadge.style.background = "rgba(239, 68, 68, 0.15)";
    el.headerProviderBadge.style.borderColor = "#ef4444";
    el.headerProviderBadge.style.color = "#f87171";
    el.headerProviderBadge.title = "⚠️ NO API KEY (NO FREE AI) - Click to configure API key in Settings";
  }
}

// Guard: Insults user if they try to run AI without configuring an API key / model
function assertProviderConfigured() {
  const p = state.provider;
  if (!p || !p.type || p.type === "none") {
    alert(
      "🤡 Did you seriously think we were offering free AI?\n\n" +
      "You haven't configured any provider or API key, you absolute melon!\n" +
      "We are NOT running a free charity for freeloaders.\n\n" +
      "Click 'OK' to open Settings (⚙️) and enter your own API key (Gemini, OpenRouter, Anthropic, OpenAI) or connect local Ollama."
    );
    el.modalSettings.classList.remove("hidden");
    return false;
  }

  const envKeyPresent =
    (p.type === "gemini" && state.envKeys.hasGemini) ||
    (p.type === "openrouter" && state.envKeys.hasOpenRouter) ||
    (p.type === "openai" && state.envKeys.hasOpenAI) ||
    (p.type === "anthropic" && state.envKeys.hasAnthropic);

  if (p.type !== "ollama" && p.type !== "llamacpp" && !p.apiKey && !envKeyPresent) {
    alert(
      `🤡 Bro thought the AI was free!\n\n` +
      `You selected '${p.type.toUpperCase()}' but didn't provide an API key!\n` +
      `We don't sponsor free tokens. Enter your API key in Settings (⚙️) or put it in .env.`
    );
    el.modalSettings.classList.remove("hidden");
    return false;
  }

  return true;
}

// RP Macro Normalizer & Interpolator
function normalizeRpMacros(text, charName) {
  if (!text) return "";
  let result = text;
  result = result.replace(/\{\{\s*user\s*\}\}/gi, "___RP_USER___");
  result = result.replace(/\{\{\s*(?:char|bot)\s*\}\}/gi, "___RP_CHAR___");
  result = result.replace(/(?:<user>|<USER>|\{user\}|\{USER\})/g, "___RP_USER___");
  result = result.replace(/(?:<char>|<CHAR>|\{char\}|\{CHAR\}|<bot>|<BOT>|\{bot\}|\{BOT\})/g, "___RP_CHAR___");
  result = result.replace(/___RP_USER___/g, "{{user}}");
  result = result.replace(/___RP_CHAR___/g, "{{char}}");
  result = result.replace(/(?:<start>|<Start>|\[START\]|\[start\])/g, "<START>");
  result = result.replace(/(?:^|\n)\s*(?:User|user|You|you|\{\{user\}\}):\s*/gm, m => m.startsWith("\n") ? "\n{{user}}: " : "{{user}}: ");
  if (charName && charName.trim().length > 1) {
    const escaped = charName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(?:^|\\n)\\s*(?:${escaped}|\\{\\{char\\}\\}):\\s*`, "gm"), m => m.startsWith("\n") ? "\n{{char}}: " : "{{char}}: ");
  }
  return result;
}

function interpolateRpMacros(text, userName, charName) {
  if (!text) return "";
  const u = userName || "Anon";
  const c = charName || "Character";
  return text
    .replace(/\{\{\s*user\s*\}\}/gi, u)
    .replace(/<USER>/gi, u)
    .replace(/\{\{\s*char\s*\}\}/gi, c)
    .replace(/<CHAR>/gi, c);
}

// Estimate tokens matching backend BPE heuristic (token-counter.ts)
function estimateTokens(text) {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Split on words and punctuation
  const words = trimmed.match(/[\w]+|[^\w\s]+/g);
  if (!words) return Math.ceil(trimmed.length / 3.8);

  let count = 0;
  for (const w of words) {
    if (w.length <= 4) {
      count += 1;
    } else {
      count += Math.ceil(w.length / 3.8);
    }
  }

  // Add line breaks and punctuation nuances
  const lineBreaks = (text.match(/\n/g) || []).length;
  count += Math.ceil(lineBreaks * 0.5);

  return Math.max(1, Math.round(count));
}

// Update Token Breakdown
function updateTokenMetrics() {
  const dTokens = estimateTokens(el.fieldDesc.value);
  const pTokens = estimateTokens(el.fieldPers.value);
  const sTokens = estimateTokens(el.fieldScenario.value);
  const fTokens = estimateTokens(el.fieldFirstMes.value);
  const eTokens = estimateTokens(el.fieldMesExample.value);
  const sysTokens = estimateTokens(el.fieldSystemPrompt.value) + estimateTokens(el.fieldPostHistory.value);

  const total = dTokens + pTokens + sTokens + fTokens + eTokens + sysTokens;

  el.tokenTotalNum.textContent = total.toLocaleString();
  el.tbDesc.textContent = dTokens.toLocaleString();
  el.tbPers.textContent = pTokens.toLocaleString();
  el.tbScenario.textContent = sTokens.toLocaleString();
  el.tbFirst.textContent = fTokens.toLocaleString();
  el.tbExamples.textContent = eTokens.toLocaleString();
  el.tbSystem.textContent = sysTokens.toLocaleString();

  if (el.tokenBadgeDesc) el.tokenBadgeDesc.textContent = `${dTokens} tokens`;
  if (el.tokenBadgePers) el.tokenBadgePers.textContent = `${pTokens} tokens`;
  if (el.tokenBadgeScenario) el.tokenBadgeScenario.textContent = `${sTokens} tokens`;
  if (el.tokenBadgeFirst) el.tokenBadgeFirst.textContent = `${fTokens} tokens`;
  if (el.tokenBadgeExamples) el.tokenBadgeExamples.textContent = `${eTokens} tokens`;
}

// Populate UI from Character State
function syncStateToUI() {
  const c = state.character;
  if (!c) return;

  // Guarantee alternate_greetings is always an array
  if (!Array.isArray(c.alternate_greetings)) {
    if (typeof c.alternate_greetings === "string" && c.alternate_greetings.trim()) {
      c.alternate_greetings = [c.alternate_greetings.trim()];
    } else {
      c.alternate_greetings = [];
    }
  }

  if (el.reimagineCardName) el.reimagineCardName.textContent = c.name || "No card";

  // Guarantee system_prompt is strictly empty and fallback-only migration is honored
  if (c.system_prompt) {
    if (!c.post_history_instructions) {
      c.post_history_instructions = c.system_prompt;
    }
    c.system_prompt = "";
  }

  el.charName.value = c.name || "";
  if (el.enhanceSearchQuery && (!el.enhanceSearchQuery.value || el.enhanceSearchQuery.dataset.autoSync === "true")) {
    if (c.name) {
      el.enhanceSearchQuery.value = c.name;
      el.enhanceSearchQuery.dataset.autoSync = "true";
    }
  }
  el.charTags.value = Array.isArray(c.tags) ? c.tags.join(", ") : "";

  if (c.avatar) {
    el.avatarImg.src = c.avatar;
    el.avatarImg.style.display = "block";
    el.avatarPlaceholder.style.display = "none";
    if (el.btnRemoveAvatar) el.btnRemoveAvatar.classList.remove("hidden");
  } else {
    el.avatarImg.src = "";
    el.avatarImg.style.display = "none";
    el.avatarPlaceholder.style.display = "block";
    if (el.btnRemoveAvatar) el.btnRemoveAvatar.classList.add("hidden");
  }

  el.fieldDesc.value = c.description || "";
  el.fieldPers.value = c.personality || "";
  el.fieldScenario.value = c.scenario || "";
  el.fieldFirstMes.value = c.first_mes || "";
  el.fieldMesExample.value = c.mes_example || "";
  el.fieldSystemPrompt.value = "";
  el.fieldPostHistory.value = c.post_history_instructions || "";
  el.fieldCreatorNotes.value = c.creator_notes || "";

  renderAltGreetings();
  renderLorebook();
  renderGallery();
  updateTokenMetrics();
  runLocalAudit();
  if (typeof updateAgentStudioSidebar === "function") {
    updateAgentStudioSidebar();
  }

  // Update Regenerate with Spine button state based on spine presence
  const hasSpine = !!(c.extensions && c.extensions["chargenui:authoringSpine"]);
  if (el.btnRunGreetingsSpine) {
    el.btnRunGreetingsSpine.disabled = !hasSpine;
    el.btnRunGreetingsSpine.style.opacity = hasSpine ? "1" : "0.5";
    el.btnRunGreetingsSpine.style.cursor = hasSpine ? "pointer" : "not-allowed";
    el.btnRunGreetingsSpine.title = hasSpine
      ? "Regenerate alternate greetings using stored spine and story arc"
      : "Requires stored Authoring Spine (create via Spark/Weaver or use Spine Synthesis modal)";
  }
}

// Sync UI changes back to Character State
function syncUIToState() {
  const c = state.character;
  c.name = el.charName.value.trim();
  c.tags = el.charTags.value.split(",").map(t => t.trim()).filter(Boolean);

  c.description = el.fieldDesc.value;
  c.personality = el.fieldPers.value;
  c.scenario = el.fieldScenario.value;
  c.first_mes = el.fieldFirstMes.value;
  c.mes_example = el.fieldMesExample.value;

  c.system_prompt = "";
  c.post_history_instructions = el.fieldPostHistory.value;
  c.creator_notes = el.fieldCreatorNotes.value;

  updateTokenMetrics();
  scheduleCardAutosave();
}

// Render Alternate Greetings
function renderAltGreetings() {
  if (!el.altGreetingsList) return;
  el.altGreetingsList.innerHTML = "";
  let alts = state.character.alternate_greetings;
  if (!Array.isArray(alts)) {
    if (typeof alts === "string" && alts.trim()) {
      alts = [alts.trim()];
    } else {
      alts = [];
    }
    state.character.alternate_greetings = alts;
  }

  if (alts.length === 0) {
    el.altGreetingsList.innerHTML = `<div style="color:var(--text-dim); font-size:12px; font-style:italic;">No alternate greetings added yet. Click "+ Add Alternate Greeting" or use the Enhancer suite to auto-generate them.</div>`;
    return;
  }

  alts.forEach((alt, idx) => {
    const card = document.createElement("div");
    card.style = "background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;";

    // Find if there is an attached gallery scene or background for this alt greeting (index = idx + 1)
    const galleryItems = Array.isArray(state.character?.extensions?.gallery) ? state.character.extensions.gallery : [];
    const altScene = galleryItems.find(g => g.greetingIndex === idx + 1 && !g.isBackground && g.type !== "background");
    const altBg = galleryItems.find(g => g.greetingIndex === idx + 1 && (g.isBackground || g.type === "background"));

    const sceneBadge = altScene
      ? `<span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(168, 85, 247, 0.2); border:1px solid rgba(168, 85, 247, 0.4); color:#d8b4fe;" title="Attached Scene: ${altScene.name || 'Scene'}">
           🖼️ Attached: <code>${altScene.name || 'gallery_image'}</code>
         </span>`
      : "";
    const bgBadge = altBg
      ? `<span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(56, 189, 248, 0.2); border:1px solid rgba(56, 189, 248, 0.4); color:#7dd3fc;" title="Attached Chat Background">
           🌄 Chat BG
         </span>`
      : "";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:700; font-size:12px; color:var(--accent-cyan);">Alternate Greeting #${idx + 1}</span>
          ${sceneBadge}
          ${bgBadge}
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-xs btn-queue-alt-greeting-img" data-idx="${idx}" style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe;" title="Generate & queue an active scene illustration for this greeting">🖼️ Scene</button>
          <button class="btn btn-xs btn-queue-alt-greeting-bg" data-idx="${idx}" style="background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); color: #7dd3fc;" title="Generate & queue an environmental chat background wallpaper for this greeting">🌄 Chat BG</button>
          <button class="btn btn-xs btn-improve-alt" data-idx="${idx}" style="background: linear-gradient(135deg, #059669, #0d9488); border: none; color: #fff; font-weight: 700;" title="Improve this specific greeting">✨ Improve</button>
          <button class="btn btn-sm btn-copy-alt" data-idx="${idx}">📋 Copy</button>
          <button class="btn btn-sm btn-danger btn-del-alt" data-idx="${idx}">🗑️ Delete</button>
        </div>
      </div>
      <textarea class="form-textarea alt-text-input" data-idx="${idx}" style="min-height:100px; font-family:monospace; font-size:12px;">${alt}</textarea>
    `;
    el.altGreetingsList.appendChild(card);
  });

  // Attach handlers
  el.altGreetingsList.querySelectorAll(".alt-text-input").forEach(ta => {
    ta.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      state.character.alternate_greetings[idx] = e.target.value;
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-del-alt").forEach(b => {
    b.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      state.character.alternate_greetings.splice(idx, 1);
      renderAltGreetings();
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-copy-alt").forEach(b => {
    b.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      navigator.clipboard.writeText(state.character.alternate_greetings[idx]);
      b.textContent = "✓ Copied!";
      setTimeout(() => b.textContent = "📋 Copy", 1500);
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-queue-alt-greeting-img").forEach(b => {
    b.addEventListener("click", async (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const text = state.character.alternate_greetings[idx] || "";
      await handleQueueGreetingImage(text, `Alternate Greeting #${idx + 1} Scene`, "greeting", idx + 1);
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-queue-alt-greeting-bg").forEach(b => {
    b.addEventListener("click", async (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const text = state.character.alternate_greetings[idx] || "";
      await handleQueueGreetingImage(text, `Alternate Greeting #${idx + 1} Chat BG`, "greeting_bg", idx + 1);
    });
  });

  // Improve individual alternate greeting
  el.altGreetingsList.querySelectorAll(".btn-improve-alt").forEach(b => {
    b.addEventListener("click", async (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      if (!state.character || !state.character.name) {
        alert("No active character loaded.");
        return;
      }
      if (!assertProviderConfigured()) return;

      const currentAlt = state.character.alternate_greetings[idx];
      if (!currentAlt) {
        alert("No greeting to improve.");
        return;
      }

      const btn = e.target;
      const origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "<span class='spinner'></span> <span>Improving...</span>";

      try {
        const payload = {
          character: state.character,
          options: {
            minAltGreetings: 1,
            steeringInstructions: `Improve ONLY alternate greeting #${idx + 1}. Current text:\n\n${state.character.alternate_greetings[idx]}\n\nImprove this specific greeting: make it more sensory, arc-aware (if story arc exists), exactly 2 paragraphs, richly sensory, arc-aware. Preserve the scene context but enhance sensory details, emotional stakes, and character voice. Do NOT change the scene context. Keep it as a distinct entry point into the story arc.`,
          },
          provider: state.provider,
          mode: "improve_greetings",
        };

        const res = await apiPost("/api/enhance", payload);
        
        if (res.character && res.character.alternate_greetings && res.character.alternate_greetings.length > 0) {
          state.character.alternate_greetings[idx] = res.character.alternate_greetings[0];
          renderAltGreetings();
          showIpcToast(`✅ Improved Alternate Greeting #${idx + 1}!`, "success");
        } else {
          throw new Error("No improved greeting returned");
        }
      } catch (err) {
        alert("❌ Improve failed: " + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.innerHTML = "✨ Improve";
      }
    });
  });

}// Render Lorebook Entries
function renderLorebook() {
  el.lorebookList.innerHTML = "";
  if (state.character.character_book && Array.isArray(state.character.character_book.entries)) {
    state.character.character_book.entries = state.character.character_book.entries.filter(e => {
      const c = (e.comment || '').toLowerCase();
      const txt = (e.content || '').toLowerCase();
      return !c.includes('weaver psychological blueprint') &&
             !c.includes('calibrated reaction gradient') &&
             !c.includes('weaver formative backstory') &&
             !c.includes('weaver vocal idiolect') &&
             !c.includes('backstory & crucible') &&
             !c.includes('psychological contradiction') &&
             !c.includes('behavioral dynamics') &&
             !txt.includes('[character bible:');
    });
  }
  const book = state.character.character_book;
  const entries = book?.entries || [];

  if (entries.length === 0) {
    el.lorebookList.innerHTML = `<div style="color:var(--text-dim); font-size:12px; font-style:italic;">No lorebook entries yet. Use the Enhancer's "World Info & Lorebook Generator" to auto-build entries from character gear, factions, and backstory.</div>`;
    return;
  }

  entries.forEach((ent, idx) => {
    const card = document.createElement("div");
    card.style = "background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-weight:700; font-size:12px; color:var(--accent-purple);">Lore: ${ent.comment || `Entry #${idx + 1}`}</span>
        <button class="btn btn-sm btn-danger btn-del-lore" data-idx="${idx}">🗑️</button>
      </div>
      <div style="margin-bottom:6px;">
        <label class="form-label" style="font-size:10px;">Activation Keys (comma-separated):</label>
        <input type="text" class="form-input lore-keys-input" data-idx="${idx}" value="${(ent.keys || []).join(', ')}" style="font-size:12px;">
      </div>
      <div>
        <label class="form-label" style="font-size:10px;">Lore Content:</label>
        <textarea class="form-textarea lore-content-input" data-idx="${idx}" style="min-height:70px; font-size:12px;">${ent.content || ''}</textarea>
      </div>
    `;
    el.lorebookList.appendChild(card);
  });

  el.lorebookList.querySelectorAll(".lore-keys-input").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      entries[idx].keys = e.target.value.split(",").map(k => k.trim()).filter(Boolean);
    });
  });

  el.lorebookList.querySelectorAll(".lore-content-input").forEach(ta => {
    ta.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      entries[idx].content = e.target.value;
    });
  });

  el.lorebookList.querySelectorAll(".btn-del-lore").forEach(b => {
    b.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      entries.splice(idx, 1);
      renderLorebook();
    });
  });
}

// ============================================================================
// Character Image Gallery Browser & Asset Manager
// ============================================================================

function getCharacterGalleryImages() {
  const c = state.character;
  if (!c) return [];

  if (!c.extensions) c.extensions = {};
  if (!Array.isArray(c.extensions.gallery)) {
    c.extensions.gallery = [];
  }

  // Ensure mirrored on c.data.extensions
  if (!c.data) c.data = {};
  if (!c.data.extensions) c.data.extensions = {};
  c.data.extensions.gallery = c.extensions.gallery;

  return c.extensions.gallery;
}

function renderGallery() {
  if (!el.galleryGrid) return;
  const gallery = getCharacterGalleryImages();
  const count = gallery.length;

  if (el.galleryTabCount) el.galleryTabCount.textContent = count.toString();
  if (el.galleryCountPill) el.galleryCountPill.textContent = `${count} image${count === 1 ? "" : "s"}`;

  if (count === 0) {
    if (el.galleryEmptyState) el.galleryEmptyState.style.display = "block";
    el.galleryGrid.style.display = "none";
    el.galleryGrid.innerHTML = "";
    return;
  }

  if (el.galleryEmptyState) el.galleryEmptyState.style.display = "none";
  el.galleryGrid.style.display = "grid";
  el.galleryGrid.innerHTML = "";

  gallery.forEach((item, idx) => {
    const isAvatar = state.character.avatar === item.dataUrl;
    const isGreetingScene = item.type === "scene" || item.greetingIndex !== undefined || item.dataUrl === state.character.greeting_image;
    const isBg = item.isBackground || item.type === "background" || item.dataUrl === state.character.chat_background;
    const galleryTag = `gallery://image-${idx + 1}`;
    const markdownSnippet = `![Gallery image](${galleryTag})`;

    let roleBadge = "";
    if (isAvatar) {
      roleBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; font-size: 10px;">👤 Active Avatar</span>`;
    } else if (isGreetingScene) {
      roleBadge = `<span class="badge" style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.5); color: #d8b4fe; font-size: 10px;">💬 Greeting Scene</span>`;
    } else if (isBg) {
      roleBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); color: #fcd34d; font-size: 10px;">🌆 Chat Background</span>`;
    } else {
      roleBadge = `<span class="badge" style="background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.5); color: #38bdf8; font-size: 10px;">🖼️ Gallery Asset</span>`;
    }

    const card = document.createElement("div");
    card.style = "background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.15s ease, border-color 0.15s ease;";
    card.innerHTML = `
      <div style="position: relative; height: 160px; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;" class="gallery-thumb-container" title="Click to view full image">
        <img src="${item.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.name || 'Gallery image'}">
        <div style="position: absolute; top: 6px; left: 6px; display: flex; gap: 4px; z-index: 2;">
          ${roleBadge}
        </div>
        <div style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #fff; font-family: monospace;">
          #${idx + 1}
        </div>
      </div>

      <div style="padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <input type="text" class="gal-name-input" data-id="${item.id}" value="${item.name || `gallery_image-${idx + 1}`}" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 4px; width: 100%;" title="Edit asset label">
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 4px 6px; border-radius: 4px;">
          <code style="font-size: 10px; color: var(--accent-cyan);">${galleryTag}</code>
          <button type="button" class="btn btn-xs btn-copy-gal-tag" data-snippet="${encodeURIComponent(markdownSnippet)}" style="padding: 1px 6px; font-size: 9px;" title="Copy markdown tag for greetings or messages">📋 Copy Tag</button>
        </div>

        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: auto;">
          ${!isAvatar ? `<button type="button" class="btn btn-xs btn-gal-set-avatar" data-id="${item.id}" style="flex: 1; font-size: 10px; justify-content: center;" title="Set this image as card avatar">👤 Avatar</button>` : ""}
          <button type="button" class="btn btn-xs btn-gal-add-greeting" data-tag="${galleryTag}" style="flex: 1; font-size: 10px; justify-content: center; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe;" title="Append this gallery image to First Message">💬 In Starter</button>
          ${!isBg ? `<button type="button" class="btn btn-xs btn-gal-set-bg" data-id="${item.id}" style="flex: 1; font-size: 10px; justify-content: center;" title="Set as chat ambient wallpaper">🌆 Chat BG</button>` : ""}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 6px; margin-top: 2px;">
          <button type="button" class="btn btn-xs btn-gal-download" data-url="${item.dataUrl}" data-name="${item.name || `image_${idx + 1}`}" style="font-size: 10px; padding: 2px 6px;">⬇️ Download</button>
          <button type="button" class="btn btn-xs btn-danger btn-gal-remove" data-id="${item.id}" data-url="${item.dataUrl}" style="font-size: 10px; padding: 2px 6px;">🗑️ Remove</button>
        </div>
      </div>
    `;

    // Click on thumbnail opens lightbox
    card.querySelector(".gallery-thumb-container").addEventListener("click", () => {
      openGalleryLightbox(item.dataUrl, item.name || `Gallery Image #${idx + 1}`);
    });

    // Name change listener
    const nameInput = card.querySelector(".gal-name-input");
    nameInput.addEventListener("change", (e) => {
      item.name = e.target.value.trim() || item.name;
      const targetInExt = state.character.extensions?.gallery?.find((g) => g.id === item.id || g.dataUrl === item.dataUrl);
      if (targetInExt) targetInExt.name = item.name;
      scheduleCardAutosave();
    });

    // Copy Tag
    card.querySelector(".btn-copy-gal-tag").addEventListener("click", (e) => {
      e.stopPropagation();
      const snippet = decodeURIComponent(e.currentTarget.dataset.snippet);
      navigator.clipboard.writeText(snippet);
      const original = e.currentTarget.textContent;
      e.currentTarget.textContent = "✓ Copied!";
      setTimeout(() => (e.currentTarget.textContent = original), 1500);
    });

    // Set Avatar
    const btnSetAvatar = card.querySelector(".btn-gal-set-avatar");
    if (btnSetAvatar) {
      btnSetAvatar.addEventListener("click", (e) => {
        e.stopPropagation();
        state.character.avatar = item.dataUrl;
        syncStateToUI();
        scheduleCardAutosave();
        showIpcToast("✓ Set gallery image as character profile avatar!", "success");
      });
    }

    // Add to Greeting Starter
    card.querySelector(".btn-gal-add-greeting").addEventListener("click", (e) => {
      e.stopPropagation();
      const tag = e.currentTarget.dataset.tag;
      const markdown = `\n\n![Gallery image](${tag})`;
      if (!state.character.first_mes) state.character.first_mes = "";
      if (!state.character.first_mes.includes(tag)) {
        state.character.first_mes = state.character.first_mes.trimEnd() + markdown;
        if (el.fieldFirstMes) el.fieldFirstMes.value = state.character.first_mes;
        scheduleCardAutosave();
        showIpcToast(`✓ Inserted ${tag} into character starter message!`, "success");
      } else {
        showIpcToast(`${tag} is already in the starter message!`, "info");
      }
    });

    // Set Chat BG
    const btnSetBg = card.querySelector(".btn-gal-set-bg");
    if (btnSetBg) {
      btnSetBg.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!state.character.extensions) state.character.extensions = {};
        state.character.chat_background = item.dataUrl;
        state.character.extensions.chat_background = item.dataUrl;
        if (!state.character.data) state.character.data = {};
        if (!state.character.data.extensions) state.character.data.extensions = {};
        state.character.data.extensions.chat_background = item.dataUrl;
        renderGallery();
        scheduleCardAutosave();
        showIpcToast("✓ Set image as chat background wallpaper!", "success");
      });
    }

    // Download
    card.querySelector(".btn-gal-download").addEventListener("click", (e) => {
      e.stopPropagation();
      const a = document.createElement("a");
      a.href = item.dataUrl;
      a.download = `${(state.character.name || "character").replace(/[^a-zA-Z0-9_-]/g, "_")}_${item.name || `image_${idx + 1}`}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    // Remove
    card.querySelector(".btn-gal-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      removeGalleryImage(item.id, item.dataUrl);
    });

    el.galleryGrid.appendChild(card);
  });
}

async function addImagesToGallery(files) {
  if (!files || files.length === 0) return;
  if (!state.character.extensions) state.character.extensions = {};
  if (!Array.isArray(state.character.extensions.gallery)) state.character.extensions.gallery = [];

  const readPromises = Array.from(files).map((file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          name: file.name.replace(/\.[^.]+$/, "") || "gallery_image",
          dataUrl: e.target.result,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  });

  const results = (await Promise.all(readPromises)).filter(Boolean);
  if (results.length === 0) return;

  results.forEach((res) => {
    if (!state.character.extensions.gallery.some((g) => g.dataUrl === res.dataUrl)) {
      const idx = state.character.extensions.gallery.length + 1;
      state.character.extensions.gallery.push({
        id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: res.name || `gallery_image-${idx}`,
        dataUrl: res.dataUrl,
        type: "scene",
        createdAt: new Date().toISOString(),
      });
    }
  });

  if (!state.character.data) state.character.data = {};
  if (!state.character.data.extensions) state.character.data.extensions = {};
  state.character.data.extensions.gallery = state.character.extensions.gallery;

  renderGallery();
  scheduleCardAutosave();
  showIpcToast(`✓ Added ${results.length} image(s) to character gallery!`, "success");
}

function removeGalleryImage(id, dataUrl) {
  if (!state.character.extensions) state.character.extensions = {};
  if (Array.isArray(state.character.extensions.gallery)) {
    state.character.extensions.gallery = state.character.extensions.gallery.filter(
      (g) => (id ? g.id !== id : g.dataUrl !== dataUrl)
    );
  }

  if (state.character.data?.extensions?.gallery) {
    state.character.data.extensions.gallery = state.character.extensions.gallery;
  }

  // Also remove from greeting_image or chat_background if matching
  if (state.character.greeting_image === dataUrl) {
    delete state.character.greeting_image;
    if (state.character.extensions) delete state.character.extensions.greeting_image;
    if (state.character.data?.extensions) delete state.character.data.extensions.greeting_image;
  }
  if (state.character.chat_background === dataUrl) {
    delete state.character.chat_background;
    if (state.character.extensions) delete state.character.extensions.chat_background;
    if (state.character.data?.extensions) delete state.character.data.extensions.chat_background;
  }

  renderGallery();
  scheduleCardAutosave();
  showIpcToast("✓ Removed image from gallery", "info");
}

function clearAllGalleryImages() {
  const current = getCharacterGalleryImages();
  if (current.length === 0) {
    alert("Gallery is already empty!");
    return;
  }
  if (!confirm(`Are you sure you want to remove all ${current.length} gallery images from this character?`)) return;

  if (state.character.extensions) {
    state.character.extensions.gallery = [];
    delete state.character.extensions.greeting_image;
    delete state.character.extensions.chat_background;
  }
  if (state.character.data?.extensions) {
    state.character.data.extensions.gallery = [];
    delete state.character.data.extensions.greeting_image;
    delete state.character.data.extensions.chat_background;
  }
  delete state.character.greeting_image;
  delete state.character.chat_background;

  renderGallery();
  scheduleCardAutosave();
  showIpcToast("✓ Cleared character image gallery", "info");
}

function openGalleryLightbox(dataUrl, title = "Image Preview") {
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxTitle = document.getElementById("lightbox-title");
  const modalGalleryLightbox = document.getElementById("modal-gallery-lightbox");
  if (lightboxImg) lightboxImg.src = dataUrl;
  if (lightboxTitle) lightboxTitle.textContent = title;
  if (modalGalleryLightbox) modalGalleryLightbox.classList.remove("hidden");
}

function closeGalleryLightbox() {
  const modalGalleryLightbox = document.getElementById("modal-gallery-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  if (modalGalleryLightbox) modalGalleryLightbox.classList.add("hidden");
  if (lightboxImg) lightboxImg.src = "";
}

// Local Fast Audit (100% matched to backend diagnostic.ts auditCharacterCard)
function runLocalAudit() {
  const c = state.character;
  const desc = (c.description || "").trim();
  const pers = (c.personality || "").trim();
  const firstMes = (c.first_mes || "").trim();
  const ex = (c.mes_example || "").trim();

  // If card is completely empty, display BS / 100 HEALTH
  const isEmpty = !desc && !pers && !firstMes;
  if (isEmpty) {
    el.cardScoreNum.textContent = "BS";
    el.cardScoreNum.style.color = "var(--accent-red)";
    el.cardScoreSummary.textContent = "Card is completely empty. There is no character content to evaluate.";
    el.auditFindingsList.innerHTML = `<div style="color:var(--text-muted); font-size:11px; font-style:italic;">Card is currently blank. Generate or enter character details.</div>`;
    return;
  }

  let score = 100;
  const issues = [];
  const strengths = [];

  // 1. Description analysis
  if (!desc) {
    score -= 30;
    issues.push("Description is completely empty.");
  } else if (desc.length < 150) {
    score -= 15;
    issues.push("Description is very brief/shallow.");
  } else {
    strengths.push("Substantial description length.");
  }

  // Check for generic cliché words
  const cliches = ["smirks mischievously", "heart of gold", "dark past", "mysterious stranger", "loyal to a fault", "lethal killer with a soft spot"];
  const foundCliches = cliches.filter((cl) => desc.toLowerCase().includes(cl));
  if (foundCliches.length > 0) {
    score -= 10;
    issues.push(`Contains cliché trope phrases: ${foundCliches.map((cl) => `"${cl}"`).join(", ")}.`);
  }

  // 2. Personality
  if (!pers) {
    score -= 15;
    issues.push("Missing dedicated personality or behavioral spec.");
  }

  // 3. Central contradiction check
  const hasContradiction = /contradiction|tension|conflict|torn between|paradox|split between/i.test(desc + " " + pers);
  if (!hasContradiction) {
    score -= 12;
    issues.push("No distinct central contradiction detected — character may read as a one-dimensional archetype.");
  } else {
    strengths.push("Has internal tension / central contradiction.");
  }

  // 4. First message analysis
  if (!firstMes) {
    score -= 25;
    issues.push("Missing opening first message.");
  } else if (firstMes.length < 120) {
    score -= 12;
    issues.push("First message is very short or passive.");
  } else {
    strengths.push("Well-developed opening message.");
  }

  // Puppeteering check
  if (firstMes.includes("You feel") || firstMes.includes("You say") || firstMes.includes("You think")) {
    score -= 10;
    issues.push("First message narrates {{user}}'s feelings or dialogue (puppeteering).");
  }

  // Single-quoted dialogue check (Lumiverse / SillyTavern highlighting)
  if (firstMes && /(?:^|[\s—–(\[{*])['‘][A-Z][^"'\n]+?[.!?]['’]/.test(firstMes)) {
    score -= 5;
    issues.push("First message uses single quotes ('...') for spoken dialogue. Lumiverse/SillyTavern require double quotes (\"...\") for highlighting.");
  }

  // 5. Example dialogues check
  if (!ex) {
    score -= 15;
    issues.push("No example dialogues provided (<START> blocks).");
  } else if (!ex.includes("<START>")) {
    score -= 5;
    issues.push("Example dialogues not in standard <START> format.");
  } else {
    strengths.push("Includes formatted example dialogues (<START>).");
  }

  // 6. Roleplay Macro syntax check
  const allText = [desc, pers, c.scenario || "", firstMes, ex, ...(c.alternate_greetings || [])].join("\n");
  let macroIssues = 0;
  if (/(?<!\{)\{(?:user|char|bot)\}(?!\})/i.test(allText)) {
    issues.push("Found malformed single-brace macros ({user} or {char}). Standard requires {{user}} / {{char}}.");
    macroIssues++;
    score -= 5;
  }
  if (/<user>|<char>|<bot>/i.test(allText)) {
    issues.push("Found legacy angle-bracket macros (<USER> / <CHAR>). Standard requires {{user}} / {{char}}.");
    macroIssues++;
    score -= 5;
  }
  if (ex && c.name && c.name.length > 2) {
    const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`^${escaped}:`, "m").test(ex)) {
      issues.push(`Example dialogues hardcode "${c.name}:" instead of "{{char}}:".`);
      macroIssues++;
      score -= 5;
    }
  }
  if (macroIssues === 0) {
    strengths.push("Valid roleplay macro formatting ({{user}} & {{char}}).");
  }

  // 7. Alternate greetings check
  if (!c.alternate_greetings || c.alternate_greetings.length === 0) {
    issues.push("No alternate greetings available for different RP scenarios.");
    score -= 5;
  } else {
    strengths.push(`Has ${c.alternate_greetings.length} alternate greeting(s).`);
  }

  // 8. Natural Spoken Cadence vs Robotic Thesaurus Caricature Check
  const roboticPhrases = [
    "treats every conversation as an academic lecture",
    "treating every conversation as an academic lecture",
    "uses complex linguistic structures and technical jargon as a shield",
    "statistical anomaly",
    "mathematically unsound",
    "nutrient density",
    "altering my trajectory",
    "inefficiency of your chaos",
  ];
  const combinedText = `${pers} ${ex}`.toLowerCase();
  const detectedRobotic = roboticPhrases.filter((p) => combinedText.includes(p));
  if (detectedRobotic.length > 0) {
    issues.push(`Robotic / unnatural dialogue tropes detected: ${detectedRobotic.map((r) => `"${r}"`).join(", ")}.`);
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  if (score <= 5) {
    el.cardScoreNum.textContent = "BS";
  } else {
    el.cardScoreNum.textContent = score;
  }
  el.cardScoreNum.style.color = score >= 80 ? "var(--accent-emerald)" : score >= 60 ? "var(--accent-amber)" : "var(--accent-red)";

  el.cardScoreSummary.textContent = score >= 85
    ? "Excellent card architecture with strong psychological texture and voice definition."
    : score >= 65
    ? "Solid foundation, but could be significantly enhanced in voice cadence, reaction gradient, and scene setting."
    : score <= 5
    ? "BS card health. Missing almost all essential roleplay fields."
    : "Basic or skeletal card. Needs persona deepening, behavioral calibration, and dialogue examples.";

  el.auditFindingsList.innerHTML = `
    ${issues.map(i => `<div style="color:var(--accent-amber); margin-bottom:4px;">⚠️ ${i}</div>`).join("")}
    ${strengths.map(s => `<div style="color:var(--accent-emerald); margin-bottom:4px;">✓ ${s}</div>`).join("")}
  `;
}

// Navigation Tabs Handlers
el.tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    if (!target) return; // Guard: Ignore tabs without data-tab
    const targetEl = document.getElementById(target);
    if (!targetEl) return; // Guard: Don't hide tabs if target element does not exist

    el.tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    el.tabContents.forEach(tc => tc.classList.add("hidden"));
    targetEl.classList.remove("hidden");

    if (target === "tab-agent") {
      renderAgentChatStream();
      if (el.agentChatInput) el.agentChatInput.focus();
    }
    if (target === "tab-eras") {
      loadInstalledExtensions();
    }
  });
});

el.edTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    el.edTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.edtab;
    el.edTabContents.forEach(tc => tc.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
  });
});

// Bind Inputs
[el.charName, el.charTags, el.fieldDesc, el.fieldPers, el.fieldScenario, el.fieldFirstMes, el.fieldMesExample, el.fieldSystemPrompt, el.fieldPostHistory, el.fieldCreatorNotes].forEach(input => {
  input.addEventListener("input", syncUIToState);
});

function normalizeDialogueQuotes(text) {
  if (!text) return "";
  let out = text;
  out = out.replace(/(\{\{[^}]+\}\})['’]s/g, "$1___CHAR_POSS___");
  out = out.replace(/([a-zA-Z0-9])['’]([a-zA-Z0-9])/g, "$1___INTRA_APOS___$2");
  out = out.replace(/(^|[\s—–(\[{*])['‘]([^"'\n]+?)['’](?=[\s—–,.;:!?)*\]}\n]|$)/gm, '$1"$2"');
  out = out.replace(/___INTRA_APOS___/g, "'");
  out = out.replace(/___CHAR_POSS___/g, "'s");
  return out;
}

// Fix & Normalize RP Macros and Dialogue Quotes
if (el.btnFixMacros) {
  el.btnFixMacros.addEventListener("click", () => {
    syncUIToState();
    const c = state.character;
    const name = c.name;

    c.description = normalizeRpMacros(c.description, name);
    c.personality = normalizeRpMacros(c.personality, name);
    c.scenario = normalizeRpMacros(c.scenario, name);
    c.first_mes = normalizeDialogueQuotes(normalizeRpMacros(c.first_mes, name));
    c.mes_example = normalizeDialogueQuotes(normalizeRpMacros(c.mes_example, name));
    c.system_prompt = normalizeRpMacros(c.system_prompt, name);
    c.post_history_instructions = normalizeRpMacros(c.post_history_instructions, name);

    if (Array.isArray(c.alternate_greetings)) {
      c.alternate_greetings = c.alternate_greetings.map(g => normalizeDialogueQuotes(normalizeRpMacros(g, name)));
    }

    syncStateToUI();
    recordSnapshot("Normalized macros and dialogue quotes");
    alert("🪄 All roleplay macros & dialogue quotes normalized! Converted single quotes in dialogue to standard double quotes for Lumiverse/SillyTavern syntax highlighting.");
  });
}

// Macro Live Preview Toggle
if (el.chkMacroPreview) {
  el.chkMacroPreview.addEventListener("change", () => {
    const isPreview = el.chkMacroPreview.checked;
    const userName = el.macroPreviewUser?.value.trim() || "Anon";
    const charName = state.character.name || "Character";

    if (isPreview) {
      syncUIToState();
      el.fieldDesc.value = interpolateRpMacros(state.character.description, userName, charName);
      el.fieldPers.value = interpolateRpMacros(state.character.personality, userName, charName);
      el.fieldScenario.value = interpolateRpMacros(state.character.scenario, userName, charName);
      el.fieldFirstMes.value = interpolateRpMacros(state.character.first_mes, userName, charName);
      el.fieldMesExample.value = interpolateRpMacros(state.character.mes_example, userName, charName);
    } else {
      syncStateToUI();
    }
  });

  if (el.macroPreviewUser) {
    el.macroPreviewUser.addEventListener("input", () => {
      if (el.chkMacroPreview.checked) {
        const userName = el.macroPreviewUser.value.trim() || "Anon";
        const charName = state.character.name || "Character";
        el.fieldDesc.value = interpolateRpMacros(state.character.description, userName, charName);
        el.fieldPers.value = interpolateRpMacros(state.character.personality, userName, charName);
        el.fieldScenario.value = interpolateRpMacros(state.character.scenario, userName, charName);
        el.fieldFirstMes.value = interpolateRpMacros(state.character.first_mes, userName, charName);
        el.fieldMesExample.value = interpolateRpMacros(state.character.mes_example, userName, charName);
      }
    });
  }
}

// Add Alt Greeting
el.btnAddAltGreeting?.addEventListener("click", () => {
  if (!state.character.alternate_greetings) state.character.alternate_greetings = [];
  state.character.alternate_greetings.push("Write your alternative opening scenario here...");
  renderAltGreetings();
});

// Queue Primary Opening Greeting Image & Chat Background
document.getElementById("btn-queue-first-greeting-img")?.addEventListener("click", async () => {
  const firstMes = el.fieldFirstMes?.value || state.character.first_mes || "";
  await handleQueueGreetingImage(firstMes, "First Message Greeting Scene", "greeting", 0);
});

document.getElementById("btn-queue-first-greeting-bg")?.addEventListener("click", async () => {
  const firstMes = el.fieldFirstMes?.value || state.character.first_mes || "";
  await handleQueueGreetingImage(firstMes, "First Message Chat Background", "greeting_bg", 0);
});

// Add Lorebook Entry
el.btnAddLorebookEntry.addEventListener("click", () => {
  if (!state.character.character_book) {
    state.character.character_book = { name: "Character Lore", entries: [] };
  }
  state.character.character_book.entries.push({
    comment: "New Topic",
    keys: ["keyword1", "keyword2"],
    content: "Lore details that trigger when keywords are spoken...",
    position: "before_char",
    enabled: true
  });
  renderLorebook();
});

// Clear Lorebook Entries
el.btnClearLorebook?.addEventListener("click", () => {
  if (confirm("Clear all lorebook entries from this card?")) {
    state.character.character_book = { name: "", entries: [] };
    renderLorebook();
    updateTokenCount();
  }
});

// API Helpers
async function apiGet(endpoint) {
  const res = await fetch(endpoint);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

async function apiPost(endpoint, data, signal) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

async function apiDelete(endpoint) {
  const res = await fetch(endpoint, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// Web Search Toggle & Preview
el.genWebSearch.addEventListener("change", () => {
  el.boxSearchQuery.classList.toggle("hidden", !el.genWebSearch.checked);
  if (el.genWebSearch.checked && !el.genSearchQuery.value) {
    el.genSearchQuery.value = el.genConcept.value.trim();
  }
});

el.btnPreviewSearch.addEventListener("click", async () => {
  const q = el.genSearchQuery.value.trim() || el.genConcept.value.trim();
  if (!q) {
    alert("Enter a character name or lore query to search!");
    return;
  }
  el.btnPreviewSearch.disabled = true;
  el.btnPreviewSearch.textContent = "...";
  try {
    const res = await apiPost("/api/search-lore", {
      query: q,
      providerType: state.searchConfig?.provider || "duckduckgo",
      apiKey: state.searchConfig?.apiKey,
      includeHeadcanons: el.genIncludeHeadcanons ? el.genIncludeHeadcanons.checked : true,
      provider: state.provider
    });
    el.searchLorePreview.classList.remove("hidden");
    let previewHtml = `<strong>Found ${res.results?.length || 0} research & fan lore sources:</strong><br><br>`;
    if (res.canonLore) {
      previewHtml += `<div style="margin-bottom:8px;"><strong style="color:var(--accent-cyan);">📚 Canon Lore & Wiki Background:</strong><br>${escapeHtml(res.canonLore.slice(0, 380))}...</div>`;
    }
    if (res.fanHeadcanons) {
      previewHtml += `<div><strong style="color:#f472b6;">✨ Fan Headcanons, Mindcanons & Tropes:</strong><br>${escapeHtml(res.fanHeadcanons.slice(0, 380))}...</div>`;
    }
    if (!res.canonLore && !res.fanHeadcanons) {
      previewHtml += "No detailed lore returned for this query.";
    }
    el.searchLorePreview.innerHTML = previewHtml;
  } catch (err) {
    alert("Search failed: " + err.message);
  } finally {
    el.btnPreviewSearch.disabled = false;
    el.btnPreviewSearch.textContent = "🔎 Fetch";
  }
});

// Multi-Theme & BDSM Trope Picker Logic
function renderThemePills() {
  if (!el.selectedThemesBox) return;
  const themes = state.selectedThemes || [];
  if (themes.length === 0) {
    el.selectedThemesBox.innerHTML = `<span id="no-themes-hint" style="font-size: 11px; color: var(--text-muted); align-self: center;">Click themes below or type custom tropes to tag...</span>`;
    if (el.btnClearThemes) el.btnClearThemes.style.display = "none";
  } else {
    if (el.btnClearThemes) el.btnClearThemes.style.display = "inline-block";
    el.selectedThemesBox.innerHTML = themes
      .map((t) => {
        const isBdsm = /bdsm|dom|sub|kink|collar|pet|femdom|maledom|brat|sadis|masoch|bondage|erotic|taboo|switch|sensory/i.test(t);
        return `<span class="selected-theme-pill ${isBdsm ? "pill-bdsm" : ""}" data-theme="${escapeHtml(t)}">
          <span>${escapeHtml(t)}</span>
          <span class="pill-remove" data-theme="${escapeHtml(t)}" title="Remove theme">×</span>
        </span>`;
      })
      .join("");
  }

  // Update active status on buttons
  const chips = document.querySelectorAll(".theme-chip");
  chips.forEach((chip) => {
    const theme = chip.getAttribute("data-theme");
    if (themes.includes(theme)) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

function addTheme(theme) {
  if (!theme) return;
  const trimmed = theme.trim();
  if (!trimmed) return;
  if (!state.selectedThemes) state.selectedThemes = [];
  if (!state.selectedThemes.includes(trimmed)) {
    state.selectedThemes.push(trimmed);
    renderThemePills();
  }
}

function removeTheme(theme) {
  if (!state.selectedThemes) return;
  state.selectedThemes = state.selectedThemes.filter((t) => t !== theme);
  renderThemePills();
}

function clearThemes() {
  state.selectedThemes = [];
  renderThemePills();
}

// Global click delegation for theme chips and pill remove buttons
document.addEventListener("click", (e) => {
  const chip = e.target.closest(".theme-chip");
  if (chip) {
    const theme = chip.getAttribute("data-theme");
    if (state.selectedThemes && state.selectedThemes.includes(theme)) {
      removeTheme(theme);
    } else {
      addTheme(theme);
    }
    return;
  }

  const pillRemove = e.target.closest(".pill-remove");
  if (pillRemove) {
    const theme = pillRemove.getAttribute("data-theme");
    removeTheme(theme);
    return;
  }
});

if (el.btnAddCustomTheme && el.customThemeInput) {
  el.btnAddCustomTheme.addEventListener("click", () => {
    addTheme(el.customThemeInput.value);
    el.customThemeInput.value = "";
  });
  el.customThemeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTheme(el.customThemeInput.value);
      el.customThemeInput.value = "";
    }
  });
}

if (el.btnClearThemes) {
  el.btnClearThemes.addEventListener("click", () => {
    clearThemes();
  });
}

// ==========================================
// Historical & Fantasy Era Discovery Studio
// ==========================================

let eraSearchDebounceTimer = null;

async function loadEraCatalogStats() {
  try {
    const res = await apiGet("/api/eras");
    if (res && Array.isArray(res.eras)) {
      state.eras = res.eras;
      if (el.eraCatalogCountBadge) {
        el.eraCatalogCountBadge.textContent = `${res.total || res.eras.length}+ Eras`;
      }
      const userEras = res.eras.filter((e) => e.is_user_era);
      if (el.userErasCount) {
        el.userErasCount.textContent = String(userEras.length);
      }
    }
  } catch (err) {
    console.warn("Failed to load era catalog:", err);
  }
}

function openEraModal(tabName = "All") {
  if (!el.modalEraPicker) return;
  state.eraCategoryFilter = tabName;

  // Sync tab buttons
  document.querySelectorAll("[data-era-tab]").forEach((btn) => {
    const t = btn.getAttribute("data-era-tab");
    btn.classList.toggle("active", t === tabName);
  });

  if (el.eraSearchInput) el.eraSearchInput.value = "";
  state.eraSearchQuery = "";
  if (el.eraRegionFilter) el.eraRegionFilter.value = "All";
  state.eraRegionFilter = "All";

  el.modalEraPicker.classList.remove("hidden");
  loadEraCatalogStats();
  searchAndRenderEras();
}

function closeEraModal() {
  if (el.modalEraPicker) el.modalEraPicker.classList.add("hidden");
}

function setEraInput(val, highlight = true, eraData = null) {
  if (el.genEra) {
    el.genEra.value = val || "";
    if (highlight && val) {
      el.genEra.classList.add("pulse-highlight");
      setTimeout(() => el.genEra?.classList.remove("pulse-highlight"), 2000);
    }
  }

  // Update quick chip active styling
  document.querySelectorAll(".era-chip-btn").forEach((b) => b.classList.remove("active"));
  if (!val) {
    el.btnEraQuickOff?.classList.add("active");
  } else if (val.toLowerCase().includes("timeless") || val.toLowerCase().includes("fantasy")) {
    el.btnEraQuickFantasy?.classList.add("active");
  } else if (val.toLowerCase().includes("medieval") || val.toLowerCase().includes("plantagenet") || val.toLowerCase().includes("shogun")) {
    el.btnEraQuickMedieval?.classList.add("active");
  }

  updateEraDossierPreview(eraData || val);
}

let promptSnippetExpanded = false;
async function updateEraDossierPreview(eraDataOrName) {
  const container = document.getElementById("era-dossier-preview");
  if (!container) return;

  if (!eraDataOrName || (typeof eraDataOrName === "string" && (!eraDataOrName.trim() || eraDataOrName.trim().toLowerCase() === "off"))) {
    container.style.display = "none";
    return;
  }

  let eraObj = null;
  let promptSnippet = "";

  if (typeof eraDataOrName === "object" && eraDataOrName !== null) {
    eraObj = eraDataOrName;
    promptSnippet = eraDataOrName.promptSnippet || "";
  } else if (typeof eraDataOrName === "string") {
    try {
      const res = await apiGet(`/api/eras/resolve?q=${encodeURIComponent(eraDataOrName.trim())}`);
      if (res && res.era) {
        eraObj = res.era;
      }
      promptSnippet = res?.promptSnippet || "";
    } catch (e) {
      console.warn("Failed resolving era preview:", e);
    }
  }

  const titleEl = document.getElementById("era-dossier-title");
  const spanEl = document.getElementById("era-dossier-span");
  const aestheticEl = document.getElementById("era-dossier-aesthetic");
  const techEl = document.getElementById("era-dossier-tech");
  const socialEl = document.getElementById("era-dossier-social");
  const snippetEl = document.getElementById("era-dossier-prompt-snippet");
  const toggleBtn = document.getElementById("btn-toggle-era-prompt-snippet");

  if (!promptSnippet && eraDataOrName) {
    const eraName = eraObj?.name || (typeof eraDataOrName === "string" ? eraDataOrName : "Selected Era");
    promptSnippet = `[ERA / SETTING CONSTRAINT: ${eraName}]\nAll dialogue, attire, social etiquette, technology, and terminology must authentically conform to this historical / setting period. Avoid anachronisms.`;
  }

  const eraTitle = eraObj?.name || eraObj?.short_name || (typeof eraDataOrName === "string" ? eraDataOrName : "HISTORICAL ERA");
  if (titleEl) titleEl.textContent = eraTitle;

  if (spanEl) {
    if (eraObj?.span) {
      spanEl.textContent = eraObj.span;
      spanEl.style.display = "inline-block";
    } else {
      spanEl.style.display = "none";
    }
  }

  if (aestheticEl) {
    if (eraObj?.aesthetic) {
      aestheticEl.textContent = eraObj.aesthetic;
      aestheticEl.style.display = "block";
    } else {
      aestheticEl.style.display = "none";
    }
  }

  if (techEl) {
    if (eraObj?.tech) {
      techEl.innerHTML = `<strong>⚙️ Tech &amp; Limitations:</strong> ${escapeHtml(eraObj.tech)}`;
      techEl.style.display = "block";
    } else {
      techEl.style.display = "none";
    }
  }

  if (socialEl) {
    if (eraObj?.social_codes) {
      socialEl.innerHTML = `<strong>📜 Social &amp; Hierarchy:</strong> ${escapeHtml(eraObj.social_codes)}`;
      socialEl.style.display = "block";
    } else {
      socialEl.style.display = "none";
    }
  }

  if (snippetEl) {
    snippetEl.textContent = promptSnippet || "";
  }

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      promptSnippetExpanded = !promptSnippetExpanded;
      if (promptSnippetExpanded) {
        snippetEl.style.webkitLineClamp = "unset";
        snippetEl.style.maxHeight = "none";
        toggleBtn.textContent = "▲ Collapse";
      } else {
        snippetEl.style.webkitLineClamp = "2";
        snippetEl.style.maxHeight = "";
        toggleBtn.textContent = "▼ Show Prompt";
      }
    };
  }

  container.style.display = "block";
}

async function searchAndRenderEras() {
  if (!el.eraCardsContainer) return;
  el.eraCardsContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);"><span class="spinner"></span> Searching eras...</div>`;

  try {
    const q = (el.eraSearchInput?.value || "").trim();
    const cat = state.eraCategoryFilter || "All";
    const reg = el.eraRegionFilter?.value || "All";
    const onlyUser = cat === "User Eras";

    const params = new URLSearchParams({
      q,
      category: cat,
      region: reg,
      onlyUser: String(onlyUser),
    });

    const res = await apiGet(`/api/eras/search?${params.toString()}`);
    const results = res?.results || [];

    if (results.length === 0) {
      el.eraCardsContainer.innerHTML = `
        <div style="text-align:center; padding: 32px 16px; color: var(--text-muted);">
          <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 600;">No historical or fantasy eras match your filter</div>
          <div style="font-size: 11px; margin-top: 4px;">Try searching for a country name, century (e.g. '14th century', '1200s'), or broad concept ('knight', 'gladiator', 'samurai').</div>
        </div>
      `;
      return;
    }

    el.eraCardsContainer.innerHTML = "";
    results.forEach((era) => {
      const card = document.createElement("div");
      card.className = "era-card";
      if (state.selectedEra && state.selectedEra.id === era.id) {
        card.classList.add("selected");
      }

      card.innerHTML = `
        <div class="era-card-title">
          <span>${escapeHtml(era.name)}</span>
          ${era.is_user_era ? `<span class="era-badge-user">User Custom</span>` : ""}
        </div>
        <div class="era-meta-badges">
          <span class="era-badge-span">📅 ${escapeHtml(era.span || "Epoch")}</span>
          <span class="era-badge-region">📍 ${escapeHtml(era.region || "Global")}</span>
          <span class="era-badge-category">${escapeHtml(era.category || "Historical")}</span>
        </div>
        <div class="era-card-snippet">${escapeHtml(era.aesthetic || era.tech || "")}</div>
      `;

      card.addEventListener("click", () => {
        document.querySelectorAll(".era-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        state.selectedEra = era;
        renderEraInspector(era);
        if (el.btnApplySelectedEra) el.btnApplySelectedEra.disabled = false;
      });

      el.eraCardsContainer.appendChild(card);
    });

    // Auto-select first if none selected
    if (!state.selectedEra && results[0]) {
      state.selectedEra = results[0];
      const firstCard = el.eraCardsContainer.firstElementChild;
      if (firstCard) firstCard.classList.add("selected");
      renderEraInspector(results[0]);
      if (el.btnApplySelectedEra) el.btnApplySelectedEra.disabled = false;
    }
  } catch (err) {
    el.eraCardsContainer.innerHTML = `<div style="color:#f87171; padding:16px;">Failed to search eras: ${err.message}</div>`;
  }
}

function renderEraInspector(era) {
  if (!el.eraDetailPanel) return;
  if (!era) {
    el.eraDetailPanel.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-dim);">Select an era from the list</div>`;
    return;
  }

  const namesList = Array.isArray(era.names) && era.names.length > 0 ? era.names.join(", ") : "Standard period authentic naming";
  const titlesList = Array.isArray(era.titles) && era.titles.length > 0 ? era.titles.join(", ") : "Period titles and stations";

  el.eraDetailPanel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0;">${escapeHtml(era.name)}</h3>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
          <span>${escapeHtml(era.span)}</span> • <span>${escapeHtml(era.region)}</span>
        </div>
      </div>
      ${era.is_user_era ? `
        <div style="display:flex; gap:6px;">
          <button id="btn-edit-user-era" class="btn btn-xs" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #93c5fd;">✏️ Edit</button>
          <button id="btn-delete-user-era" class="btn btn-xs" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5;">🗑️ Delete</button>
        </div>
      ` : ""}
    </div>

    <div class="era-detail-section">
      <div class="era-detail-label">🏛️ Aesthetic, Architecture & Atmosphere</div>
      <div class="era-detail-text">${escapeHtml(era.aesthetic || "Historical setting atmosphere.")}</div>
    </div>

    <div class="era-detail-section">
      <div class="era-detail-label">⚙️ Technology & Material Constraints</div>
      <div class="era-detail-text">${escapeHtml(era.tech || "Period material tools.")}</div>
    </div>

    <div class="era-detail-section">
      <div class="era-detail-label">⚖️ Social Codes, Hierarchy & Honor Dynamics</div>
      <div class="era-detail-text">${escapeHtml(era.social_codes || "Interpersonal etiquette.")}</div>
    </div>

    <div class="era-detail-section">
      <div class="era-detail-label">👤 Sample Authenticated Names</div>
      <div class="era-detail-text" style="font-size: 11px; color: #cbd5e1;">${escapeHtml(namesList)}</div>
    </div>

    <div class="era-detail-section" style="margin-bottom: 16px;">
      <div class="era-detail-label">👑 Suggested Social Stations & Titles</div>
      <div class="era-detail-text" style="font-size: 11px; color: #cbd5e1;">${escapeHtml(titlesList)}</div>
    </div>

    <button id="btn-inspector-apply" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 10px; font-weight: 700; margin-top: auto;">
      ✨ Apply "${escapeHtml(era.short_name || era.name)}" to Character Spark
    </button>
  `;

  document.getElementById("btn-inspector-apply")?.addEventListener("click", () => {
    applySelectedEraToSpark(era);
  });

  if (era.is_user_era) {
    document.getElementById("btn-edit-user-era")?.addEventListener("click", () => {
      openUserEraEditor(era);
    });
    document.getElementById("btn-delete-user-era")?.addEventListener("click", async () => {
      if (confirm(`Are you sure you want to delete custom era "${era.name}"?`)) {
        await deleteUserEraItem(era.id);
      }
    });
  }
}

function applySelectedEraToSpark(era) {
  if (!era) return;
  setEraInput(era.name, true, era);
  closeEraModal();
  showIpcToast(`Era selected: ${era.name}`, "info");
}

function openUserEraEditor(eraToEdit = null) {
  if (!el.modalUserEraEditor) return;
  if (eraToEdit) {
    if (el.userEraModalTitle) el.userEraModalTitle.textContent = "✏️ Edit Custom Era Template";
    if (el.userEraId) el.userEraId.value = eraToEdit.id || "";
    if (el.userEraName) el.userEraName.value = eraToEdit.name || "";
    if (el.userEraSpan) el.userEraSpan.value = eraToEdit.span || "";
    if (el.userEraRegion) el.userEraRegion.value = eraToEdit.region || "";
    if (el.userEraAesthetic) el.userEraAesthetic.value = eraToEdit.aesthetic || "";
    if (el.userEraTech) el.userEraTech.value = eraToEdit.tech || "";
    if (el.userEraSocial) el.userEraSocial.value = eraToEdit.social_codes || "";
    if (el.userEraNames) el.userEraNames.value = Array.isArray(eraToEdit.names) ? eraToEdit.names.join(", ") : "";
    if (el.userEraTitles) el.userEraTitles.value = Array.isArray(eraToEdit.titles) ? eraToEdit.titles.join(", ") : "";
  } else {
    if (el.userEraModalTitle) el.userEraModalTitle.textContent = "➕ Create Custom Era Template";
    if (el.userEraId) el.userEraId.value = "";
    if (el.userEraName) el.userEraName.value = "";
    if (el.userEraSpan) el.userEraSpan.value = "";
    if (el.userEraRegion) el.userEraRegion.value = "";
    if (el.userEraAesthetic) el.userEraAesthetic.value = "";
    if (el.userEraTech) el.userEraTech.value = "";
    if (el.userEraSocial) el.userEraSocial.value = "";
    if (el.userEraNames) el.userEraNames.value = "";
    if (el.userEraTitles) el.userEraTitles.value = "";
  }
  el.modalUserEraEditor.classList.remove("hidden");
}

function closeUserEraEditor() {
  if (el.modalUserEraEditor) el.modalUserEraEditor.classList.add("hidden");
}

async function saveUserEraFromForm() {
  const name = el.userEraName?.value.trim();
  const span = el.userEraSpan?.value.trim();
  if (!name || !span) {
    alert("Please provide both an Era Name and a Time Span / Century!");
    return;
  }

  const payload = {
    id: el.userEraId?.value.trim() || undefined,
    name,
    short_name: name,
    span,
    region: el.userEraRegion?.value.trim() || "Global",
    category: "User Eras",
    aesthetic: el.userEraAesthetic?.value.trim() || "User-defined period atmosphere.",
    tech: el.userEraTech?.value.trim() || "Period material tools.",
    social_codes: el.userEraSocial?.value.trim() || "Custom social dynamic.",
    names: (el.userEraNames?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
    titles: (el.userEraTitles?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
    tags: ["User Template"],
  };

  try {
    const res = await apiPost("/api/eras/user", payload);
    if (res && res.era) {
      closeUserEraEditor();
      await loadEraCatalogStats();
      state.eraCategoryFilter = "User Eras";
      document.querySelectorAll("[data-era-tab]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-era-tab") === "User Eras");
      });
      await searchAndRenderEras();
      state.selectedEra = res.era;
      renderEraInspector(res.era);
      showIpcToast(`Saved custom era: ${res.era.name}`, "success");
    }
  } catch (err) {
    alert("Failed to save custom era: " + err.message);
  }
}

async function deleteUserEraItem(id) {
  try {
    const res = await apiDelete(`/api/eras/user/${id}`);
    if (res && res.success) {
      state.selectedEra = null;
      await loadEraCatalogStats();
      await searchAndRenderEras();
      showIpcToast("Custom era deleted", "info");
    }
  } catch (err) {
    alert("Failed to delete custom era: " + err.message);
  }
}

// Global Event Listeners for Era Studio
el.btnOpenEraModal?.addEventListener("click", () => openEraModal("All"));
el.btnBrowseEraAddon?.addEventListener("click", () => openEraModal("All"));
el.btnCloseEraModal?.addEventListener("click", closeEraModal);
el.btnCloseEraModalBottom?.addEventListener("click", closeEraModal);
el.btnClearEra?.addEventListener("click", () => setEraInput("", false));
el.genEra?.addEventListener("input", (e) => {
  const val = e.target.value;
  updateEraDossierPreview(val);
});

el.btnEraQuickOff?.addEventListener("click", () => {
  setEraInput("", false);
  showIpcToast("Temporal constraints set to Off", "info");
});
el.btnEraQuickFantasy?.addEventListener("click", () => {
  setEraInput("🌌 Timeless High Fantasy (Achronological)", true);
  showIpcToast("Applied Timeless High Fantasy", "info");
});
el.btnEraQuickMedieval?.addEventListener("click", () => openEraModal("Medieval"));
el.btnEraQuickAntiquity?.addEventListener("click", () => openEraModal("Antiquity"));
el.btnEraQuickVictorian?.addEventListener("click", () => openEraModal("Victorian & Industrial"));
el.btnEraQuickUser?.addEventListener("click", () => openEraModal("User Eras"));

el.btnModalEraOff?.addEventListener("click", () => {
  setEraInput("", false);
  closeEraModal();
  showIpcToast("Era constraints cleared", "info");
});
el.btnModalEraFantasy?.addEventListener("click", () => {
  setEraInput("🌌 Timeless High Fantasy (Achronological)", true);
  closeEraModal();
  showIpcToast("Applied Timeless High Fantasy", "info");
});
el.btnApplySelectedEra?.addEventListener("click", () => {
  if (state.selectedEra) {
    applySelectedEraToSpark(state.selectedEra);
  }
});

// Category Tab clicks in modal
document.querySelectorAll("[data-era-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-era-tab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.eraCategoryFilter = btn.getAttribute("data-era-tab") || "All";
    searchAndRenderEras();
  });
});

// Region Filter change
el.eraRegionFilter?.addEventListener("change", () => {
  searchAndRenderEras();
});

// Search input debounced
el.eraSearchInput?.addEventListener("input", () => {
  clearTimeout(eraSearchDebounceTimer);
  eraSearchDebounceTimer = setTimeout(() => {
    searchAndRenderEras();
  }, 220);
});

// User Custom Era Editor
el.btnEraCreateCustom?.addEventListener("click", () => openUserEraEditor(null));
el.btnCloseUserEraEditor?.addEventListener("click", closeUserEraEditor);
el.btnCancelUserEra?.addEventListener("click", closeUserEraEditor);
el.btnSaveUserEra?.addEventListener("click", saveUserEraFromForm);

// Load Era catalog stats on page load
loadEraCatalogStats();

// Forge or Reroll Character Card
async function executeForgeOrReroll(isReroll = false, customSteer = "") {
  if (!assertProviderConfigured()) return;

  let concept = el.genConcept ? el.genConcept.value.trim() : "";
  if (!concept && state.character && state.character.name) {
    concept = `${state.character.name}: ${state.character.personality || state.character.description || ""}`.trim();
  }

  if (!concept) {
    alert("Please provide a concept or seed idea for the character!");
    return;
  }

  const btnRunSteerReroll = document.getElementById("btn-run-steer-reroll");
  const buttonsToLock = [el.btnRunGenerate, el.btnRunReroll, btnRunSteerReroll, el.btnRerollCardHeader].filter(Boolean);
  buttonsToLock.forEach((b) => { b.disabled = true; });

  const origGenerateHtml = el.btnRunGenerate ? el.btnRunGenerate.innerHTML : "";
  const origRerollHtml = el.btnRunReroll ? el.btnRunReroll.innerHTML : "";
  const origSteerHtml = btnRunSteerReroll ? btnRunSteerReroll.innerHTML : "";
  const origCardHeaderHtml = el.btnRerollCardHeader ? el.btnRerollCardHeader.innerHTML : "";

  if (isReroll) {
    if (el.btnRunReroll) el.btnRunReroll.innerHTML = `<span class="spinner"></span> <span>Rerolling...</span>`;
    if (btnRunSteerReroll) btnRunSteerReroll.innerHTML = `<span class="spinner"></span>`;
    if (el.btnRerollCardHeader) el.btnRerollCardHeader.innerHTML = `<span class="spinner"></span> <span>Rerolling...</span>`;
  } else {
    if (el.btnRunGenerate) el.btnRunGenerate.innerHTML = `<span class="spinner"></span> <span>Engineering Uncensored Card...</span>`;
  }

  try {
    const payload = {
      concept,
      genre: el.genGenre ? el.genGenre.value : "fantasy",
      storyArc: el.genStoryArc ? el.genStoryArc.value.trim() : undefined,
      minAltGreetings: el.genMinAlts ? (parseInt(el.genMinAlts.value, 10) || 3) : 3,
      era: el.genEra ? el.genEra.value.trim() : undefined,
      themes: state.selectedThemes || [],
      tone: el.genTone ? el.genTone.value : "dynamic",
      format: el.genFormat ? el.genFormat.value : "w++",
      nsfw: el.genNsfw ? el.genNsfw.checked : false,
      botMode: state.botMode || "single",
      enableWebSearch: el.genWebSearch ? el.genWebSearch.checked : false,
      searchQuery: (el.genSearchQuery ? el.genSearchQuery.value.trim() : "") || concept,
      includeHeadcanons: el.genIncludeHeadcanons ? el.genIncludeHeadcanons.checked : true,
      steeringInstructions: customSteer || (el.enhanceSteeringNotes ? el.enhanceSteeringNotes.value.trim() : undefined) || undefined,
      provider: state.provider
    };

    const res = await apiPost("/api/generate", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character };
      state.activeCardId = null;
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`${isReroll ? "Rerolled" : "Forged"}: ${state.character.name}`);
      updateLlmCacheBadge();
      alert(`🎉 Successfully ${isReroll ? "rerolled" : "forged"} "${state.character.name}"!`);
    }
  } catch (err) {
    alert(`${isReroll ? "Reroll" : "Generation"} failed: ` + err.message);
  } finally {
    buttonsToLock.forEach((b) => { b.disabled = false; });
    if (el.btnRunGenerate && origGenerateHtml) el.btnRunGenerate.innerHTML = origGenerateHtml;
    if (el.btnRunReroll && origRerollHtml) el.btnRunReroll.innerHTML = origRerollHtml;
    if (btnRunSteerReroll && origSteerHtml) btnRunSteerReroll.innerHTML = origSteerHtml;
    if (el.btnRerollCardHeader && origCardHeaderHtml) el.btnRerollCardHeader.innerHTML = origCardHeaderHtml;
  }
}

el.btnRunGenerate?.addEventListener("click", () => executeForgeOrReroll(false));
el.btnRunReroll?.addEventListener("click", () => executeForgeOrReroll(true));
el.btnRerollCardHeader?.addEventListener("click", () => executeForgeOrReroll(true));
document.getElementById("btn-run-steer-reroll")?.addEventListener("click", () => {
  const currentNotes = el.enhanceSteeringNotes ? el.enhanceSteeringNotes.value.trim() : "";
  const steer = prompt(
    "🎯 Influence / Steer this Character Reroll:\n\nEnter instructions to guide {{char}}'s psychology, tone, or dynamic:",
    currentNotes
  );
  if (steer !== null) {
    if (el.enhanceSteeringNotes && steer.trim()) {
      el.enhanceSteeringNotes.value = steer.trim();
    }
    executeForgeOrReroll(true, steer.trim());
  }
});

// Bot Generation Mode Selector Handlers (Solo Character, Multi-Character Cast, RPG World / GM)
document.querySelectorAll(".bot-mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    state.botMode = mode;
    document.querySelectorAll(".bot-mode-btn").forEach((b) => {
      if (b.dataset.mode === mode) {
        b.classList.add("active");
        b.style.borderColor = mode === "multi_character" ? "var(--accent-purple)" : mode === "rpg_world" ? "var(--accent-green)" : "var(--accent-cyan)";
        b.style.background = mode === "multi_character" ? "rgba(168, 85, 247, 0.15)" : mode === "rpg_world" ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)";
        b.style.color = mode === "multi_character" ? "#c084fc" : mode === "rpg_world" ? "#34d399" : "#38bdf8";
      } else {
        b.classList.remove("active");
        b.style.borderColor = "var(--border-main)";
        b.style.background = "var(--bg-card)";
        b.style.color = "var(--text-muted)";
      }
    });

    const lbl = document.getElementById("gen-concept-label");
    const txt = el.genConcept;
    if (mode === "multi_character") {
      if (lbl) lbl.textContent = "Multi-Character Cast / Duo / Household Concept";
      if (txt) txt.placeholder = "e.g. Two rival inquisitor partners bound by a blood contract: one ruthless and methodical, the other empathetic and reckless, hunting heretics while hiding their own forbidden pact.";
    } else if (mode === "rpg_world") {
      if (lbl) lbl.textContent = "RPG World / Game Master Setting & Inciting Incident";
      if (txt) txt.placeholder = "e.g. The Sunken Citadel of Oakhaven: A flooded gothic kingdom ruled by competing merchant factions, ancient sea cults, and drowned automatons. High-stakes survival and political intrigue.";
    } else {
      if (lbl) lbl.textContent = "Character Concept / Seed / Trope";
      if (txt) txt.placeholder = "e.g. A weary inquisitor who broke their sacred oath to protect a heretic child. Cold, formal, scarred, haunted by ghosts they refuse to name.";
    }
  });
});

// ==========================================
// Weaver Guided Interview Workshop Logic
// ==========================================
async function openWeaverInterviewModal(customInfluence) {
  if (!assertProviderConfigured()) return;

  const concept = el.genConcept.value.trim();
  if (!concept) {
    alert("Please provide a concept or seed idea for Weaver to analyze!");
    return;
  }

  el.modalWeaverInterview.classList.remove("hidden");
  el.weaverInterviewLoading.classList.remove("hidden");
  el.weaverInterviewContent.classList.add("hidden");
  el.btnWeaverSubmitForge.disabled = true;

  try {
    const payload = {
      concept,
      genre: el.genGenre.value,
      storyArc: el.genStoryArc ? el.genStoryArc.value.trim() : undefined,
      minAltGreetings: el.genMinAlts ? (parseInt(el.genMinAlts.value, 10) || 3) : 3,
      era: el.genEra ? el.genEra.value.trim() : undefined,
      themes: state.selectedThemes || [],
      tone: el.genTone.value,
      nsfw: el.genNsfw.checked,
      botMode: state.botMode || "single",
      influence: typeof customInfluence === "string" && customInfluence.trim() ? customInfluence.trim() : undefined,
      provider: state.provider,
    };

    const res = await apiPost("/api/weaver/interview-questions", payload);
    state.weaverInterview = {
      questions: res.questions || [],
      preliminaryVision: res.preliminaryVision || "",
      lastInfluence: payload.influence || "",
      answers: {},
    };

    renderWeaverInterviewQuestions();
    el.weaverInterviewLoading.classList.add("hidden");
    el.weaverInterviewContent.classList.remove("hidden");
    el.btnWeaverSubmitForge.disabled = false;
  } catch (err) {
    alert("Failed to formulate interview questions: " + err.message);
    el.modalWeaverInterview.classList.add("hidden");
  }
}

function renderWeaverInterviewQuestions() {
  if (!state.weaverInterview) return;
  const { questions, preliminaryVision } = state.weaverInterview;

  el.weaverVisionText.textContent = preliminaryVision || "A complex persona taking shape through your choices.";

  el.weaverQuestionsList.innerHTML = questions
    .map((q, idx) => {
      const qNum = idx + 1;
      const recIdx = q.recommendedOptionIndex || 0;
      return `
        <div class="weaver-question-card" data-qid="${escapeHtml(q.id)}" data-category="${escapeHtml(q.category)}" data-question="${escapeHtml(q.question)}" data-idx="${idx}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
            <div class="weaver-question-category">[${qNum}/${questions.length}] ${escapeHtml(q.category)}</div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button type="button" class="btn btn-sm btn-weaver-reroll-q" data-idx="${idx}" data-qid="${escapeHtml(q.id)}" style="padding: 2px 8px; font-size: 11px; color: #c084fc; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(192, 132, 252, 0.1);" title="Generate 3 fresh alternative options for this question">
                <span>🎲 Reroll</span>
              </button>
              <button type="button" class="btn btn-sm btn-weaver-toggle-influence" data-idx="${idx}" style="padding: 2px 8px; font-size: 11px; color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.1);" title="Influence / steer the rerolled choices for this question">
                <span>🎯 Influence</span>
              </button>
              <button type="button" class="btn btn-sm btn-weaver-remove-q" data-idx="${idx}" data-qid="${escapeHtml(q.id)}" style="padding: 2px 7px; font-size: 11px; color: #f87171; border: 1px solid rgba(248, 113, 113, 0.35); background: rgba(248, 113, 113, 0.1);" title="Remove / skip this question">
                <span>✕</span>
              </button>
              <span style="font-size: 10px; color: var(--text-dim);">Pick an option or type below</span>
            </div>
          </div>
          <div class="weaver-question-text">${escapeHtml(q.question)}</div>

          <!-- Collapsible Influence Drawer for Rerolling Choices -->
          <div class="weaver-influence-drawer hidden" id="weaver-influence-drawer-${idx}" style="margin: 6px 0 8px; padding: 8px 10px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-size: 11px; font-weight: 600; color: #7dd3fc; display: flex; align-items: center; gap: 4px;">
                <span>🎯</span> Influence Reroll Direction
              </span>
              <span style="font-size: 10px; color: var(--text-dim);">Steers all 3 new choices toward your intent</span>
            </div>
            <div style="display: flex; gap: 6px;">
              <input type="text" class="weaver-influence-input form-input" data-idx="${idx}" placeholder="e.g. 'darker taboo', 'magical curse', 'extreme obedience', 'slow-burn romance'..." style="font-size: 11px; padding: 4px 8px; flex: 1; height: 28px;">
              <button type="button" class="btn btn-sm btn-weaver-reroll-q" data-idx="${idx}" data-qid="${escapeHtml(q.id)}" style="font-size: 11px; padding: 2px 10px; background: #0284c7; color: #fff; border: none; white-space: nowrap; font-weight: 600; height: 28px;">
                <span>⚡ Reroll with Influence</span>
              </button>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Dark taboo, extreme psychological friction, forbidden temptation">⛓️ Taboo</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Dominant authority, command protocols, intoxicating psychological control">👑 Dominant</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Surrender of control, trembling vulnerability, obedient submissiveness">🥀 Submissive</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Visceral physical craving, intense romantic longing, slow-burn tension">🔥 Romance</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Supernatural curse, eldritch taint, mysterious ancient artifact">🔮 Curse</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Cold cynicism, calculating detachment, sharp dry sarcasm">🧠 Cynical</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Lethal combat threat, violent history, dangerous predator instinct">🗡️ Lethal</span>
            </div>
          </div>

          <div class="weaver-options-row" id="weaver-options-row-${idx}">
            ${(q.options || [])
              .map((opt, oIdx) => {
                const isRec = oIdx === recIdx;
                return `
                  <button type="button" class="weaver-option-btn ${isRec ? "selected" : ""}" data-qid="${escapeHtml(q.id)}" data-opt="${escapeHtml(opt)}" data-oidx="${oIdx}">
                    <span>${isRec ? "⭐ " : ""}${escapeHtml(opt)}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
          <div style="margin-top: 4px;">
            <input type="text" class="weaver-custom-answer-input" data-qid="${escapeHtml(q.id)}" placeholder="Selected answer or custom write-in..." value="${escapeHtml(q.options?.[recIdx] || "")}">
          </div>
        </div>
      `;
    })
    .join("");
}

function autoFillWeaverIntuition() {
  if (!state.weaverInterview?.questions) return;
  state.weaverInterview.questions.forEach((q) => {
    const card = document.querySelector(`.weaver-question-card[data-qid="${q.id}"]`);
    if (!card) return;
    const input = card.querySelector(".weaver-custom-answer-input");
    const recIdx = q.recommendedOptionIndex || 0;
    const recOption = q.options[recIdx] || q.options[0] || "";

    // Clear previous option selections
    card.querySelectorAll(".weaver-option-btn").forEach((b) => b.classList.remove("selected"));

    // Select the recommended button
    const recBtn = card.querySelector(`.weaver-option-btn[data-oidx="${recIdx}"]`);
    if (recBtn) recBtn.classList.add("selected");

    if (input) {
      input.value = recOption;
    }
  });
}

async function submitWeaverForge() {
  if (!state.weaverInterview) return;
  const concept = el.genConcept.value.trim();
  if (!concept) return;

  // Gather answers from inputs
  const cards = document.querySelectorAll(".weaver-question-card");
  const answers = [];
  cards.forEach((card) => {
    const qid = card.getAttribute("data-qid");
    const category = card.getAttribute("data-category") || "";
    const question = card.getAttribute("data-question") || "";
    const input = card.querySelector(".weaver-custom-answer-input");
    const val = input ? input.value.trim() : "";
    if (val) {
      answers.push({
        questionId: qid,
        category,
        question,
        selectedAnswer: val,
      });
    }
  });

  const btn = el.btnWeaverSubmitForge;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> <span>Synthesizing Bible &amp; Forging Card...</span>`;

  try {
    const includeLorebook = !!document.getElementById("weaver-include-lorebook")?.checked;
    const payload = {
      concept,
      genre: el.genGenre.value,
      storyArc: el.genStoryArc ? el.genStoryArc.value.trim() : undefined,
      minAltGreetings: el.genMinAlts ? (parseInt(el.genMinAlts.value, 10) || 3) : 3,
      era: el.genEra ? el.genEra.value.trim() : undefined,
      themes: state.selectedThemes || [],
      tone: el.genTone.value,
      format: el.genFormat.value,
      nsfw: el.genNsfw.checked,
      botMode: state.botMode || "single",
      enableWebSearch: el.genWebSearch.checked,
      searchQuery: el.genSearchQuery.value.trim() || concept,
      includeHeadcanons: el.genIncludeHeadcanons ? el.genIncludeHeadcanons.checked : true,
      interviewAnswers: answers,
      includeLorebook,
      provider: state.provider,
    };

    const res = await apiPost("/api/weaver/forge", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character };
      state.activeCardId = null;
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`Forged via Weaver Workshop: ${state.character.name}`);
      updateLlmCacheBadge();
      el.modalWeaverInterview.classList.add("hidden");
      alert(`🎉 Successfully forged "${state.character.name}" via Weaver Workshop!`);
    }
  } catch (err) {
    alert("Weaver forge failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>⚡ Synthesize Bible &amp; Forge Final Card</span>`;
  }
}

// Event Listeners for Weaver Workshop
el.btnWeaverInterview?.addEventListener("click", () => openWeaverInterviewModal());
el.btnCloseWeaverInterview?.addEventListener("click", () => el.modalWeaverInterview?.classList.add("hidden"));
el.btnWeaverCancel?.addEventListener("click", () => el.modalWeaverInterview?.classList.add("hidden"));
el.btnWeaverAutofill?.addEventListener("click", autoFillWeaverIntuition);
el.btnWeaverAskMore?.addEventListener("click", async () => {
  if (!state.weaverInterview?.questions) return;
  const concept = el.genConcept.value.trim();
  if (!concept) return;

  const btn = el.btnWeaverAskMore;
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> <span>Asking Weaver...</span>`;

  try {
    const payload = {
      concept,
      genre: el.genGenre.value,
      themes: state.selectedThemes || [],
      tone: el.genTone.value.trim(),
      nsfw: el.genNsfw.checked,
      era: el.genEra.value.trim(),
      botMode: el.genBotMode ? el.genBotMode.value : "single",
      existingQuestions: state.weaverInterview.questions,
      provider: state.provider,
    };

    const res = await apiPost("/api/weaver/interview-questions", payload);
    if (res && Array.isArray(res.questions)) {
      state.weaverInterview.questions = res.questions;
      if (res.preliminaryVision) {
        state.weaverInterview.preliminaryVision = res.preliminaryVision;
      }
      renderWeaverInterviewQuestions();
    }
  } catch (err) {
    alert("Failed to ask more questions: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
});
el.btnWeaverSubmitForge?.addEventListener("click", submitWeaverForge);
document.getElementById("btn-weaver-reroll-all")?.addEventListener("click", () => openWeaverInterviewModal());
document.getElementById("btn-weaver-influence-all")?.addEventListener("click", () => {
  const currentInfluence = state.weaverInterview?.lastInfluence || "";
  const steer = prompt(
    "🎯 How should Weaver steer the interview questions?\n\n(e.g., 'Focus on master-servant power exchange, dark taboo secrets, and fantasy curse'):",
    currentInfluence
  );
  if (steer !== null) {
    openWeaverInterviewModal(steer.trim());
  }
});

// Delegate option button clicks & per-question rerolls inside Weaver interview
el.weaverQuestionsList?.addEventListener("click", async (e) => {
  // Toggle influence drawer for this question
  const toggleBtn = e.target.closest(".btn-weaver-toggle-influence");
  if (toggleBtn) {
    const idx = toggleBtn.getAttribute("data-idx");
    const drawer = document.getElementById(`weaver-influence-drawer-${idx}`);
    if (drawer) {
      drawer.classList.toggle("hidden");
      if (!drawer.classList.contains("hidden")) {
        const inp = drawer.querySelector(".weaver-influence-input");
        if (inp) inp.focus();
      }
    }
    return;
  }

  // Quick steer chip clicked inside influence drawer
  const steerChip = e.target.closest(".weaver-steer-chip");
  if (steerChip) {
    const idx = steerChip.getAttribute("data-idx");
    const steer = steerChip.getAttribute("data-steer") || steerChip.textContent.trim();
    const drawer = document.getElementById(`weaver-influence-drawer-${idx}`);
    const inp = drawer?.querySelector(".weaver-influence-input");
    if (inp) {
      inp.value = steer;
      inp.focus();
    }
    return;
  }

  // 1. Reroll Choices for a single question
  const rerollBtn = e.target.closest(".btn-weaver-reroll-q");
  if (rerollBtn) {
    const idx = parseInt(rerollBtn.getAttribute("data-idx") || "0", 10);
    const q = state.weaverInterview?.questions?.[idx];
    if (!q) return;

    const card = rerollBtn.closest(".weaver-question-card");
    const influenceInput = card?.querySelector(".weaver-influence-input");
    const influenceVal = influenceInput ? influenceInput.value.trim() : "";

    rerollBtn.disabled = true;
    const originalHtml = rerollBtn.innerHTML;
    rerollBtn.innerHTML = `<span class="spinner" style="width:10px;height:10px;display:inline-block;vertical-align:middle;margin-right:4px;"></span><span>Rerolling...</span>`;

    try {
      const res = await fetch("/api/weaver/reroll-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: el.genConcept?.value?.trim() || "",
          category: q.category,
          question: q.question,
          currentOptions: q.options || [],
          genre: el.genGenre?.value || "Fiction",
          tone: el.genTone?.value || "",
          nsfw: el.genNsfw?.checked || false,
          influence: influenceVal || undefined,
          provider: state.provider,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Reroll failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.options)) {
        q.options = data.options;
        q.recommendedOptionIndex = data.recommendedOptionIndex || 0;

        // Re-render this question's options row
        const optionsRow = document.getElementById(`weaver-options-row-${idx}`);
        if (optionsRow) {
          optionsRow.innerHTML = q.options.map((opt, oIdx) => {
            const isRec = oIdx === q.recommendedOptionIndex;
            return `
              <button type="button" class="weaver-option-btn ${isRec ? "selected" : ""}" data-qid="${escapeHtml(q.id)}" data-opt="${escapeHtml(opt)}" data-oidx="${oIdx}">
                <span>${isRec ? "⭐ " : ""}${escapeHtml(opt)}</span>
              </button>
            `;
          }).join("");
        }

        // Update custom answer input with new recommended option
        const card = rerollBtn.closest(".weaver-question-card");
        const input = card?.querySelector(".weaver-custom-answer-input");
        if (input) {
          input.value = q.options[q.recommendedOptionIndex] || q.options[0] || "";
        }
      }
    } catch (err) {
      alert("Failed to reroll choices: " + err.message);
    } finally {
      rerollBtn.disabled = false;
      rerollBtn.innerHTML = originalHtml;
    }
    return;
  }

  // 1.5 Remove / dismiss a question
  const removeBtn = e.target.closest(".btn-weaver-remove-q");
  if (removeBtn) {
    const idx = parseInt(removeBtn.getAttribute("data-idx") || "0", 10);
    if (state.weaverInterview?.questions && idx >= 0 && idx < state.weaverInterview.questions.length) {
      state.weaverInterview.questions.splice(idx, 1);
      renderWeaverInterviewQuestions();
    }
    return;
  }

  // 2. Select option choice
  const optBtn = e.target.closest(".weaver-option-btn");
  if (!optBtn) return;
  const qid = optBtn.getAttribute("data-qid");
  const optText = optBtn.getAttribute("data-opt");
  const card = optBtn.closest(".weaver-question-card");
  if (!card) return;

  card.querySelectorAll(".weaver-option-btn").forEach((b) => b.classList.remove("selected"));
  optBtn.classList.add("selected");

  const input = card.querySelector(".weaver-custom-answer-input");
  if (input) {
    input.value = optText;
  }
});

// Sync custom text typing with option button highlight
el.weaverQuestionsList?.addEventListener("input", (e) => {
  const input = e.target.closest(".weaver-custom-answer-input");
  if (!input) return;
  const card = input.closest(".weaver-question-card");
  if (!card) return;
  const val = input.value.trim();

  // Highlight option if it matches typed text, otherwise remove all highlights
  card.querySelectorAll(".weaver-option-btn").forEach((b) => {
    const optText = b.getAttribute("data-opt")?.trim();
    if (optText && optText === val) {
      b.classList.add("selected");
    } else {
      b.classList.remove("selected");
    }
  });
});

// Vision Drag & Drop Handling
el.visionDropzone.addEventListener("click", () => el.visionFileInput.click());

["dragenter", "dragover"].forEach(eventName => {
  el.visionDropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    el.visionDropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(eventName => {
  el.visionDropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    el.visionDropzone.classList.remove("dragover");
  });
});

el.visionDropzone.addEventListener("drop", (e) => {
  const files = e.dataTransfer?.files;
  if (files && files[0]) {
    handleVisionImageUpload(files[0]);
  }
});

let batchVisionFiles = [];

el.visionFileInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length > 1) {
    handleBatchVisionUpload(files);
  } else if (files.length === 1) {
    batchVisionFiles = [];
    const statusEl = document.getElementById("vision-batch-status");
    if (statusEl) statusEl.classList.add("hidden");
    handleVisionImageUpload(files[0]);
  }
});

function handleBatchVisionUpload(files) {
  batchVisionFiles = files;
  const statusEl = document.getElementById("vision-batch-status");
  const countEl = document.getElementById("vision-batch-count");
  if (statusEl && countEl) {
    countEl.textContent = files.length;
    statusEl.classList.remove("hidden");
  }
  handleVisionImageUpload(files[0]);
  if (el.btnRunVision) {
    el.btnRunVision.innerHTML = `<span>👁️ Batch Scan (${files.length} Images) & Save to Library</span>`;
  }
}

function handleVisionImageUpload(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    state.visionImageBase64 = dataUrl;
    el.visionImgPreview.src = dataUrl;
    el.visionPreviewBox.classList.remove("hidden");
    // Also set avatar immediately
    state.character.avatar = dataUrl;
    el.avatarImg.src = dataUrl;
    el.avatarImg.style.display = "block";
    el.avatarPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// Button: Run Vision Scan
el.btnRunVision.addEventListener("click", async () => {
  if (!assertProviderConfigured()) return;

  if (batchVisionFiles.length > 1) {
    // Process Batch Vision Scan
    const btn = el.btnRunVision;
    btn.disabled = true;
    let completedCount = 0;
    try {
      const readAsB64 = (f) => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve({ name: f.name, imageBase64: r.result });
        r.onerror = reject;
        r.readAsDataURL(f);
      });

      btn.innerHTML = `<span class="spinner"></span> <span>Reading ${batchVisionFiles.length} images...</span>`;
      const imagesPayload = await Promise.all(batchVisionFiles.map(readAsB64));

      btn.innerHTML = `<span class="spinner"></span> <span>Batch scanning 1 / ${imagesPayload.length}...</span>`;
      const res = await apiPost("/api/scan-image/batch", {
        images: imagesPayload,
        provider: state.provider,
        promptHints: el.visionHints.value.trim(),
        nsfw: el.visionNsfw.checked,
        saveToLibrary: true,
      });

      if (res && res.results) {
        const successes = res.results.filter(r => r.success);
        if (successes.length > 0 && successes[0].result && successes[0].result.character) {
          state.character = { ...successes[0].result.character, avatar: imagesPayload[0].imageBase64 };
          state.activeCardId = successes[0].savedMeta?.id || null;
          updateActiveCardBadge();
          syncStateToUI();
        }
        await loadSavedCardsList();
        showIpcToast(`Batch vision scan completed! Created ${successes.length} cards in Library.`, "success");
        alert(`🎉 Batch scan complete! ${successes.length} / ${imagesPayload.length} character cards forged and saved to Library.`);
      }
    } catch (err) {
      alert("Batch vision scan failed: " + err.message);
    } finally {
      btn.disabled = false;
      batchVisionFiles = [];
      const statusEl = document.getElementById("vision-batch-status");
      if (statusEl) statusEl.classList.add("hidden");
      btn.innerHTML = `<span>👁️ Scan Image & Synthesize Card</span>`;
    }
    return;
  }

  if (!state.visionImageBase64) {
    alert("Please upload or drop an image to scan first!");
    return;
  }

  const btn = el.btnRunVision;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> <span>Scanning Image with Vision Model...</span>`;

  try {
    const payload = {
      imageBase64: state.visionImageBase64,
      promptHints: el.visionHints.value.trim(),
      nsfw: el.visionNsfw.checked,
      provider: state.provider
    };

    const res = await apiPost("/api/scan-image", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character, avatar: state.visionImageBase64 };
      state.activeCardId = null;
      updateActiveCardBadge();
      syncStateToUI();

      // Show forensic findings
      if (res.visual_profile) {
        el.visionFindingsBox.classList.remove("hidden");
        const vp = res.visual_profile;
        const ip = res.inferred_personality;
        el.visionFindingsText.innerHTML = `
          <strong>Appearance:</strong> ${vp.apparent_age || ''} ${vp.gender_presentation || ''}, ${vp.hair || ''}, ${vp.eyes || ''}.<br>
          <strong>Wardrobe:</strong> ${vp.clothing_attire || ''} (${vp.accessories_gear || ''})<br>
          <strong>Demeanor:</strong> ${vp.expression_demeanor || ''}<br>
          <strong>Inferred Archetype:</strong> ${ip?.archetype || ''} (${ip?.vibe || ''})<br>
          <strong>Contradiction:</strong> ${ip?.latent_conflict || ''}
        `;
      }

      recordSnapshot(`Vision Scan: ${state.character.name}`);
      alert(`👁️ Vision scan complete! Synthesized "${state.character.name}" directly from image.`);
    }
  } catch (err) {
    alert("Vision scan failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>👁️ Scan Image & Synthesize Card</span>`;
  }
});

// Enhancer Actions
async function runEnhance(mode, options = {}, statusMsg = "Enhancing...") {
  if (mode !== "audit_only" && !assertProviderConfigured()) return;

  syncUIToState();
  const btn = document.activeElement;
  const originalHtml = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>${statusMsg}</span>`;
  }

  try {
    const payload = {
      character: state.character,
      mode,
      options,
      provider: state.provider
    };

    const res = await apiPost("/api/enhance", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character };
      syncStateToUI();
      recordSnapshot(`Enhanced (${mode}): ${state.character.name}`);
      alert(`✨ Enhancement complete! ${res.changesSummary?.join(" ") || ""}`);
    }
  } catch (err) {
    alert("Enhancement failed: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

function getGlobalSteering() {
  return el.enhanceSteeringNotes?.value?.trim() || "";
}

function getEnhanceSearchOptions() {
  if (!el.enhanceWebSearch || !el.enhanceWebSearch.checked) {
    return {};
  }
  const query = el.enhanceSearchQuery?.value?.trim() || state.character.name || "";
  const includeHeadcanons = el.enhanceIncludeHeadcanons ? el.enhanceIncludeHeadcanons.checked : true;
  return {
    enableWebSearch: true,
    searchQuery: query,
    includeHeadcanons,
    retrievedLore: (state.enhanceRetrievedLoreQuery === query && state.enhanceRetrievedLore) ? state.enhanceRetrievedLore : undefined,
    searchProviderType: state.searchConfig?.provider || "duckduckgo",
    searchApiKey: state.searchConfig?.apiKey,
    searxngUrl: state.searchConfig?.searxngUrl,
  };
}

// Enhancer Web Search Toggle & Preview
el.enhanceWebSearch?.addEventListener("change", () => {
  el.boxEnhanceSearch?.classList.toggle("hidden", !el.enhanceWebSearch.checked);
  if (el.enhanceWebSearch.checked && !el.enhanceSearchQuery?.value?.trim()) {
    if (el.enhanceSearchQuery) {
      el.enhanceSearchQuery.value = state.character.name || "";
      el.enhanceSearchQuery.dataset.autoSync = "true";
    }
  }
});

el.enhanceSearchQuery?.addEventListener("input", () => {
  if (el.enhanceSearchQuery) el.enhanceSearchQuery.dataset.autoSync = "false";
});

el.btnEnhancePreviewSearch?.addEventListener("click", async () => {
  const q = el.enhanceSearchQuery?.value?.trim() || state.character.name || "";
  if (!q) {
    alert("Enter a character name or lore query to search!");
    return;
  }
  el.btnEnhancePreviewSearch.disabled = true;
  el.btnEnhancePreviewSearch.textContent = "...";
  try {
    const res = await apiPost("/api/search-lore", {
      query: q,
      providerType: state.searchConfig?.provider || "duckduckgo",
      apiKey: state.searchConfig?.apiKey,
      searxngUrl: state.searchConfig?.searxngUrl,
    });
    el.enhanceSearchLorePreview?.classList.remove("hidden");
    let previewHtml = `<strong>Found ${res.results?.length || 0} research & fan lore sources:</strong><br><br>`;
    if (res.canonLore) {
      previewHtml += `<strong>Canon Lore Highlights:</strong><br>${res.canonLore.slice(0, 300).replace(/\n/g, "<br>")}...<br><br>`;
    }
    if (res.fanHeadcanons) {
      previewHtml += `<strong>Headcanons & Dynamics:</strong><br>${res.fanHeadcanons.slice(0, 300).replace(/\n/g, "<br>")}...`;
    }
    if (!res.results || res.results.length === 0) {
      previewHtml += `<em>No results returned. Check query or search settings.</em>`;
    }
    if (el.enhanceSearchLorePreview) el.enhanceSearchLorePreview.innerHTML = previewHtml;
    state.enhanceRetrievedLore = res.condensedLore;
    state.enhanceRetrievedLoreQuery = q;
  } catch (err) {
    alert("Lore search failed: " + err.message);
  } finally {
    el.btnEnhancePreviewSearch.disabled = false;
    el.btnEnhancePreviewSearch.textContent = "🔎 Fetch";
  }
});

// Steering Directive UI hooks
el.btnClearSteering?.addEventListener("click", () => {
  if (el.enhanceSteeringNotes) el.enhanceSteeringNotes.value = "";
});

el.steeringChips?.addEventListener("click", (e) => {
  const chip = e.target.closest(".steering-chip");
  if (!chip) return;
  const steerText = chip.dataset.text;
  if (!steerText || !el.enhanceSteeringNotes) return;
  const current = el.enhanceSteeringNotes.value.trim();
  if (!current) {
    el.enhanceSteeringNotes.value = steerText;
  } else if (!current.includes(steerText)) {
    el.enhanceSteeringNotes.value = `${current}. ${steerText}`;
  }
});

// Expand / collapse drawer when clicking action card headers
document.querySelectorAll(".action-card").forEach((card) => {
  const header = card.querySelector(".action-card-header");
  const desc = card.querySelector(".action-card-desc");
  const toggle = (e) => {
    // Avoid toggling when clicking inside an input or button
    if (e.target.closest("input, select, textarea, button, label")) return;
    card.classList.toggle("expanded");
  };
  header?.addEventListener("click", toggle);
  desc?.addEventListener("click", toggle);
});

// Tone Preset Pills
el.tonePresetChips?.addEventListener("click", (e) => {
  const pill = e.target.closest(".preset-pill");
  if (!pill) return;
  const tone = pill.dataset.tone;
  if (tone && el.toneCustomInput) {
    el.toneCustomInput.value = tone;
    el.tonePresetChips.querySelectorAll(".preset-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
  }
});

// Steered Enhancement Button Listeners
el.btnRunAudit.addEventListener("click", () => runEnhance("audit_only", {}, "Auditing..."));

el.btnFullOverhaul.addEventListener("click", () => {
  const globalNotes = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  const statusMsg = searchOpts.enableWebSearch ? "Executing Steered Overhaul (with Web Lore)..." : "Executing Steered Overhaul...";
  runEnhance(
    "full_overhaul",
    { nsfw: true, steeringInstructions: globalNotes, ...searchOpts },
    statusMsg
  );
});

el.btnRunDeepen?.addEventListener("click", () => {
  const focusCbs = Array.from(document.querySelectorAll(".deepen-focus:checked"));
  const focusAreas = focusCbs.map((cb) => cb.value);
  const customHint = el.deepenCustomHint?.value?.trim() || "";
  const globalNotes = getGlobalSteering();
  const steeringInstructions = [globalNotes, customHint].filter(Boolean).join(". ");
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "deepen_persona",
    { nsfw: true, focusAreas, steeringInstructions, ...searchOpts },
    "Deepening Persona..."
  );
});

el.btnRunVoice?.addEventListener("click", () => {
  const selectedStyle = el.voiceRegisterSelect?.value || "";
  const voiceStyle = selectedStyle === "custom" ? "" : selectedStyle;
  const customScenario = el.voiceScenarioHint?.value?.trim() || "";
  const banRobot = el.voiceBanRobot?.checked !== false;
  const globalNotes = getGlobalSteering();
  const directives = [globalNotes, customScenario];
  if (banRobot) {
    directives.push("CRITICAL: Completely ban robotic Spock parodies, statistical jargon (e.g. 'statistical anomaly', 'mathematically unsound'), and thesaurus phrasing. Speak with natural human cadence.");
  }
  const steeringInstructions = directives.filter(Boolean).join(". ");
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "polish_voice",
    { voiceStyle, steeringInstructions, ...searchOpts },
    "Polishing Voice & Example Messages..."
  );
});

el.btnRunGreetings?.addEventListener("click", () => {
  const scenePrompt = el.greetingsSceneHint?.value?.trim() || "";
  const themes = [
    el.greetingTheme1?.value?.trim(),
    el.greetingTheme2?.value?.trim(),
    el.greetingTheme3?.value?.trim(),
  ].filter(Boolean);
  const globalNotes = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "punch_first_mes",
    { scenarioPrompt: scenePrompt, altGreetingThemes: themes, steeringInstructions: globalNotes, ...searchOpts },
    "Punching Up Starter & Greetings..."
  );
});

el.btnRunFormat?.addEventListener("click", () => {
  const targetFormat = el.formatTargetSelect?.value || "prose";
  const rawBudget = el.formatTokenBudget?.value?.trim();
  const targetTokenBudget = rawBudget ? parseInt(rawBudget, 10) : undefined;
  const steeringInstructions = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "format_optimize",
    { targetFormat, targetTokenBudget, steeringInstructions, ...searchOpts },
    "Compressing & Converting Format..."
  );
});

el.btnRunLorebook?.addEventListener("click", () => {
  const depth = el.lorebookDepthSelect?.value || "detailed";
  const topics = el.lorebookTopicsHint?.value?.trim() || "";
  const steeringInstructions = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "generate_lorebook",
    { lorebookDepth: depth, lorebookTopics: topics, steeringInstructions, ...searchOpts },
    "Building Steered Lorebook..."
  );
});

el.btnRunTone?.addEventListener("click", () => {
  const targetTone = el.toneCustomInput?.value?.trim() || "Cold, authoritative, intellectually rigorous";
  const steeringInstructions = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "tone_shift",
    { toneShift: targetTone, nsfw: true, steeringInstructions, ...searchOpts },
    "Calibrating Character Tone..."
  );
});

el.btnOpenSynthesizeSpine?.addEventListener("click", () => {
  openSynthesizeSpineModal();
});

// --- Agent Mode Co-Pilot Full Chat Implementation ---

let activeTargetedSelection = null;

function renderPinnedRules() {
  const rules = state.agentPinnedRules || [];
  if (el.agentPinnedCountBadge) el.agentPinnedCountBadge.textContent = String(rules.length);
  if (el.agentStudioPinnedCount) el.agentStudioPinnedCount.textContent = String(rules.length);

  const emptyHtml = `<span id="agent-pinned-empty-hint" style="font-size: 10px; color: var(--text-muted); font-style: italic;">No pinned rules yet. Pin persistent constraints like "Never apologize", "Keep dialogue under 2 sentences", or "Enforce gothic dialect".</span>`;
  const chipsHtml = rules.length === 0
    ? emptyHtml
    : rules
        .map(
          (r, idx) => `
          <span class="agent-pinned-chip">
            <span>${escapeHtml(r)}</span>
            <span class="agent-pinned-chip-remove" data-rule-index="${idx}" title="Unpin rule">×</span>
          </span>
        `
        )
        .join("");

  if (el.agentPinnedChips) el.agentPinnedChips.innerHTML = chipsHtml;
  if (el.agentStudioPinnedChips) el.agentStudioPinnedChips.innerHTML = chipsHtml;
}

function initTargetedDoctorSelection() {
  const fields = [
    { el: el.fieldDesc, name: "description" },
    { el: el.fieldPers, name: "personality" },
    { el: el.fieldScenario, name: "scenario" },
    { el: el.fieldFirstMes, name: "first_mes" },
    { el: el.fieldMesExample, name: "mes_example" },
    { el: el.fieldPostHistory, name: "post_history_instructions" },
  ];

  const pill = el.floatingDoctorPill;
  if (!pill) return;

  function checkSelection(e, fieldName, targetEl) {
    const text = targetEl.value.substring(targetEl.selectionStart, targetEl.selectionEnd).trim();

    if (text.length >= 8) {
      activeTargetedSelection = {
        field: fieldName,
        selectedText: text,
        start: targetEl.selectionStart,
        end: targetEl.selectionEnd,
        element: targetEl,
      };

      const rect = targetEl.getBoundingClientRect();
      pill.style.top = `${window.scrollY + rect.bottom - 36}px`;
      pill.style.left = `${window.scrollX + rect.right - 230}px`;
      pill.classList.remove("hidden");
    } else {
      setTimeout(() => {
        if (!activeTargetedSelection || targetEl.selectionStart === targetEl.selectionEnd) {
          pill.classList.add("hidden");
        }
      }, 250);
    }
  }

  fields.forEach(({ el: targetEl, name }) => {
    if (!targetEl) return;
    targetEl.addEventListener("mouseup", (e) => checkSelection(e, name, targetEl));
    targetEl.addEventListener("keyup", (e) => checkSelection(e, name, targetEl));
  });

  pill.addEventListener("click", () => {
    if (!activeTargetedSelection) return;
    pill.classList.add("hidden");

    // Switch to tab-agent
    document.querySelector('.nav-tab[data-tab="tab-agent"]')?.click();

    // Set scope to targeted field
    if (el.agentTargetScope) {
      el.agentTargetScope.value = activeTargetedSelection.field;
    }

    if (el.agentChatInput) {
      el.agentChatInput.value = `Doctor this selected snippet from ${activeTargetedSelection.field}: "${activeTargetedSelection.selectedText}". Refine it to be more natural, vivid, and punchy.`;
      el.agentChatInput.focus();
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (e.target !== pill && !pill.contains(e.target)) {
      pill.classList.add("hidden");
    }
  });
}

function runPrescriptionCheckup() {
  syncUIToState();
  const char = state.character;
  const issues = [];

  // Check 1: Thesaurus / Spock Jargon
  const persAndMes = `${char.personality || ""} ${char.mes_example || ""}`.toLowerCase();
  const roboticTerms = [
    "statistical anomaly",
    "mathematically unsound",
    "nutrient density",
    "altering my trajectory",
    "inefficiency of your chaos",
    "empirical evidence",
    "probability matrix",
    "computational",
    "cognitive faculty",
  ];
  const foundRobotic = roboticTerms.filter((t) => persAndMes.includes(t));
  if (foundRobotic.length > 0) {
    issues.push({
      id: "jargon",
      severity: "high",
      title: `Thesaurus / Spock Syndrome Detected (${foundRobotic.slice(0, 3).join(", ")})`,
      explanation: "Character dialogue or personality uses clinical pseudo-academic vocabulary for ordinary domestic actions, breaking conversational immersion.",
      prompt: `Purge all robotic, academic, or clinical jargon (such as ${foundRobotic.join(", ")}). Rewrite personality and dialogue examples so she speaks with natural contractions, razor wit, and realistic spoken cadence.`,
      buttonText: "🩺 Fix: Naturalize Spoken Cadence",
    });
  }

  // Check 2: {{user}} Puppeteering
  const greetings = `${char.first_mes || ""} ${(char.alternate_greetings || []).join(" ")}`;
  const puppeteerMatches = greetings.match(/{{user}}\s+(feels|thinks|gasps|whispers|steps back|shivers|nodded|replied|answers|sighs|realizes|hesitates)/gi);
  if (puppeteerMatches && puppeteerMatches.length > 0) {
    issues.push({
      id: "puppeteering",
      severity: "high",
      title: `{{user}} Puppeteering in Opening Messages (${puppeteerMatches.length} instances)`,
      explanation: "The character's greeting narrates {{user}}'s actions, feelings, or dialogue, violating player agency.",
      prompt: "Remove all instances of {{user}} puppeteering from first_mes and alternate_greetings. Keep third-person limited perspective strictly focused on {{char}}'s actions and speech.",
      buttonText: "🩺 Fix: Remove {{user}} Puppeteering",
    });
  }

  // Check 3: Token Bloat in Description
  const descTokens = estimateTokens(char.description || "");
  if (descTokens > 750) {
    issues.push({
      id: "token_bloat",
      severity: "medium",
      title: `Description Token Bloat (~${descTokens} tokens)`,
      explanation: "Character description exceeds 750 tokens with potential purple prose or redundant exposition.",
      prompt: `Optimize and condense description by ~30% from ${descTokens} tokens to ~450 tokens without sacrificing any core contradictions, physical tells, or sensory anchors.`,
      buttonText: "🩺 Fix: Compress Description (~30%)",
    });
  }

  // Check 4: Missing Spoken Dialogue Contractions
  if (char.first_mes && !/don't|can't|it's|won't|i'm|you're|didn't|doesn't/i.test(char.first_mes)) {
    issues.push({
      id: "no_contractions",
      severity: "medium",
      title: "Stiff / Formal Dialogue Cadence (No Contractions)",
      explanation: "Opening message has zero natural contractions (e.g. 'do not', 'cannot'), which can make characters sound like reading textbooks.",
      prompt: "Inject natural contractions (don't, can't, it's, won't) and brief reactive pauses into first_mes and dialogue examples to make her speech sound authentically spoken aloud.",
      buttonText: "🩺 Fix: Inject Natural Contractions",
    });
  }

  // Check 5: Interpersonal Friction & Central Contradiction
  if (char.personality && !/contradiction|friction|conflict|vulnerability|underneath|secretly|guard|tension/i.test(char.personality)) {
    issues.push({
      id: "friction",
      severity: "low",
      title: "Flat Character Tension (Low Interpersonal Friction)",
      explanation: "Personality lacks an explicit internal contradiction or emotional stake to sustain long-term roleplay.",
      prompt: "Heighten the central contradiction in her personality: give her a sharp internal tension between her public role/facade and a private vulnerability or craving.",
      buttonText: "🩺 Fix: Elevate Psychological Tension",
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "clean",
      severity: "low",
      title: "Clean Baseline Health",
      explanation: "No major clinical jargon or puppeteering detected. You can further polish sensory tells or amplify scene stakes.",
      prompt: "Add vivid sensory tells, involuntary micro-expressions, and physical mannerisms to personality and first message to make scenes hyper-vivid.",
      buttonText: "✨ Enhance Sensory Tells & Stakes",
    });
  }

  const checkupMessage = {
    role: "assistant",
    content: `### 🩺 Card Doctor Diagnostic Report for **${escapeHtml(char.name || "Character")}**\n\nI evaluated this card for narrative health, voice cadence, and macro integrity. Found **${issues.length} targeted recommendation${issues.length !== 1 ? "s" : ""}**:`,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    prescriptions: issues,
  };

  state.agentChatHistory.push(checkupMessage);
  renderAgentChatStream();
}

function renderAgentChatStream() {
  if (!el.agentChatStream && !el.agentStudioStream) return;

  // Persist agent chat to localStorage so it survives page reloads / restarts
  try {
    const toPersist = (state.agentChatHistory || []).filter(m => !m.isPending);
    localStorage.setItem("chargen_agent_chat_history", JSON.stringify(toPersist));
  } catch {}

  if (!state.agentChatHistory || state.agentChatHistory.length === 0) {
    const charName = state.character?.name || "your character";
    const emptyChatHtml = `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 12px; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">
          <span>🤖</span> <span>Agent Co-Pilot Ready</span>
        </div>
        <div style="color: var(--text-muted); line-height: 1.4;">
          I am your multi-turn character engineering agent. Tell me what to modify, critique, rewrite, or brainstorm for <strong style="color: var(--text-main);">${escapeHtml(charName)}</strong>.
          <div style="margin-top: 6px; color: var(--text-dim); font-size: 10px;">
            💡 <em>Tip: Click a directive chip above or highlight text in the editor to doctor specific snippets. Use "Review Diffs" to inspect Before/After changes before accepting!</em>
          </div>
        </div>
      </div>
    `;
    if (el.agentChatStream) el.agentChatStream.innerHTML = emptyChatHtml;
    if (el.agentStudioStream) {
      el.agentStudioStream.innerHTML = emptyChatHtml.replace(
        "Agent Co-Pilot Ready",
        "Agent Co-Pilot Studio Ready",
      );
      el.agentStudioStream.scrollTop = el.agentStudioStream.scrollHeight;
    }
    return;
  }

  const historyHtml = state.agentChatHistory
    .map((msg, index) => {
      const isUser = msg.role === "user";
      if (isUser) {
        return `
        <div style="align-self: flex-end; max-width: 85%; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
          <div style="font-size: 10px; color: var(--text-dim);">${escapeHtml(msg.time || "User")}</div>
          <div style="background: rgba(99, 102, 241, 0.18); border: 1px solid rgba(99, 102, 241, 0.4); color: var(--text-main); border-radius: 10px 10px 2px 10px; padding: 8px 12px; font-size: 12px; line-height: 1.4; word-break: break-word;">
            ${escapeHtml(msg.content)}
          </div>
        </div>
      `;
      }

      // 1. Proposed Changes Review Card (Granular Cherry-Pick Diffs)
      let proposalsHtml = "";
      if (msg.proposals && msg.proposals.length > 0) {
        const hasPending = msg.proposals.some((p) => p.status === "pending");
        proposalsHtml = `
        <div class="agent-proposal-card">
          <div class="agent-proposal-header">
            <span style="font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 4px;">
              <span>🎛️ Proposed Changes (${msg.proposals.length} field${msg.proposals.length > 1 ? "s" : ""})</span>
            </span>
            ${
              hasPending
                ? `
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-xs btn-success btn-accept-all-proposals" data-turn-idx="${index}" type="button">✓ Accept All</button>
                <button class="btn btn-xs btn-danger btn-discard-all-proposals" data-turn-idx="${index}" type="button">✕ Discard All</button>
              </div>
            `
                : `<span style="font-size: 10px; color: var(--text-dim);">Reviewed</span>`
            }
          </div>
          <div class="agent-diff-list">
            ${msg.proposals
              .map((prop, propIdx) => {
                const isPending = prop.status === "pending";
                const isAccepted = prop.status === "accepted";
                const beforeText = typeof prop.before === "string" ? prop.before : JSON.stringify(prop.before, null, 2);
                const afterText = typeof prop.after === "string" ? prop.after : JSON.stringify(prop.after, null, 2);
                const beforeTokens = estimateTokens(beforeText || "");
                const afterTokens = estimateTokens(afterText || "");
                const diffVal = afterTokens - beforeTokens;
                const tokenDiffBadge =
                  diffVal > 0
                    ? `<span style="color: #f59e0b; font-size: 10px; font-weight:600;">(+${diffVal} tok)</span>`
                    : diffVal < 0
                    ? `<span style="color: #10b981; font-size: 10px; font-weight:600;">(${diffVal} tok)</span>`
                    : `<span style="color: var(--text-dim); font-size: 10px;">(0 tok)</span>`;

                return `
                <div class="agent-diff-row status-${prop.status || "pending"}">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-weight: 700; color: var(--accent-purple); font-size: 11px;">
                        ${escapeHtml(prop.field.replace(/_/g, " ").toUpperCase())}
                      </span>
                      ${tokenDiffBadge}
                      <span style="font-size: 10px; color: var(--text-muted); font-style: italic;">
                        ${escapeHtml(prop.explanation || "")}
                      </span>
                    </div>
                    <div>
                      ${
                        isPending
                          ? `
                        <div style="display: flex; gap: 4px; align-items: center;">
                          <button class="btn btn-xs btn-open-diff-modal" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" style="background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); color: #38bdf8; font-weight: 700;" title="Inspect large full-screen side-by-side diff">🔍 Full Diff</button>
                          <button class="btn btn-xs btn-success btn-accept-field" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" title="Apply this field change to active card">✓ Accept</button>
                          <button class="btn btn-xs btn-danger btn-discard-field" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" title="Discard this field change">✕ Discard</button>
                        </div>
                      `
                          : isAccepted
                          ? `
                        <div style="display: flex; gap: 4px; align-items: center;">
                          <button class="btn btn-xs btn-open-diff-modal" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" style="background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); color: #38bdf8; font-weight: 700;" title="Inspect large full-screen side-by-side diff">🔍 Full Diff</button>
                          <span style="color: #10b981; font-weight: 700; font-size: 10px;">✓ Applied</span>
                        </div>
                      `
                          : `
                        <div style="display: flex; gap: 4px; align-items: center;">
                          <button class="btn btn-xs btn-open-diff-modal" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" style="background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); color: #38bdf8; font-weight: 700;" title="Inspect large full-screen side-by-side diff">🔍 Full Diff</button>
                          <span style="color: #ef4444; font-size: 10px;">✕ Discarded</span>
                        </div>
                      `
                      }
                    </div>
                  </div>

                  <div class="agent-diff-boxes">
                    <div class="agent-diff-box agent-diff-before" title="Original Content">
                      <div style="font-size: 9px; opacity: 0.7; margin-bottom: 2px;">BEFORE (${beforeTokens} tok):</div>
                      ${escapeHtml(beforeText || "(empty)")}
                    </div>
                    <div class="agent-diff-box agent-diff-after" title="Agent's Proposed Revision">
                      <div style="font-size: 9px; opacity: 0.7; margin-bottom: 2px;">AFTER (${afterTokens} tok):</div>
                      ${escapeHtml(afterText || "(empty)")}
                    </div>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `;
      }

      // 2. Creative Takes (A/B Choices)
      let takesHtml = "";
      if (msg.takes && msg.takes.length > 0) {
        takesHtml = `
        <div class="agent-takes-container">
          <div style="font-size: 10px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase;">
            🎲 Creative Alternatives (${msg.takes.length} Takes Generated):
          </div>
          ${msg.takes
            .map((take, takeIdx) => {
              const isSelected = take.status === "applied";
              return `
              <div class="agent-take-card ${isSelected ? "take-selected" : ""}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="background: rgba(99, 102, 241, 0.2); color: var(--accent-cyan); font-weight: 700; padding: 1px 6px; border-radius: 4px; font-size: 10px;">
                      Take ${escapeHtml(take.takeId)}: ${escapeHtml(take.title)}
                    </span>
                    <span style="font-size: 10px; color: var(--text-dim);">Target: ${escapeHtml(take.field)}</span>
                  </div>
                  <div>
                    ${
                      isSelected
                        ? `
                      <span style="color: #10b981; font-weight: 700; font-size: 10px;">✓ Chosen</span>
                    `
                        : `
                      <button class="btn btn-xs btn-primary btn-apply-take" data-turn-idx="${index}" data-take-idx="${takeIdx}" type="button">
                        ✓ Choose Take ${escapeHtml(take.takeId)}
                      </button>
                    `
                    }
                  </div>
                </div>
                ${
                  take.explanation
                    ? `<div style="font-size: 10px; color: var(--text-muted); font-style: italic; margin-bottom: 4px;">${escapeHtml(take.explanation)}</div>`
                    : ""
                }
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: 6px; font-family: monospace; font-size: 10px; max-height: 110px; overflow-y: auto; white-space: pre-wrap;">
                  ${escapeHtml(take.content)}
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
      }

      // 3. Prescription Checkup Box
      let prescriptionsHtml = "";
      if (msg.prescriptions && msg.prescriptions.length > 0) {
        prescriptionsHtml = `
        <div class="agent-prescription-box">
          <div style="font-weight: 700; color: #10b981; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>🩺 Doctor's Prescriptions</span>
          </div>
          ${msg.prescriptions
            .map(
              (p, pIdx) => `
            <div class="prescription-item">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #f8fafc; font-size: 11px;">${escapeHtml(p.title)}</div>
                <div style="color: var(--text-muted); font-size: 10px;">${escapeHtml(p.explanation)}</div>
              </div>
              <button class="btn btn-xs btn-success btn-prescription-fix" data-turn-idx="${index}" data-presc-idx="${pIdx}" type="button" style="white-space: nowrap;">
                ${escapeHtml(p.buttonText)}
              </button>
            </div>
          `
            )
            .join("")}
        </div>
      `;
      }

      // Auto-Applied Changes Tags (when review diffs is off)
      const changesHtml =
        !proposalsHtml && msg.changes && msg.changes.length > 0
          ? `
        <div style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 6px; display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 10px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase;">Auto-Applied Card Fields:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${msg.changes
              .map(
                (c) => `
              <span class="badge" title="${escapeHtml(c.explanation || "")}" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; font-size: 10px; padding: 2px 6px; border-radius: 4px; cursor: default;">
                ✓ ${escapeHtml(c.field.replace("_", " "))}
              </span>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : "";

      const undoButtonHtml = msg.snapshotBefore
        ? `
        <div style="margin-top: 6px; display: flex; justify-content: flex-end;">
          <button class="btn btn-xs btn-agent-revert-turn" data-index="${index}" type="button" style="font-size: 10px; padding: 2px 8px; color: var(--text-dim);" title="Revert card to before this edit">
            ↩️ Revert this turn
          </button>
        </div>
      `
        : "";

      return `
        <div style="align-self: flex-start; max-width: 92%; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
          <div style="font-size: 10px; color: var(--text-dim); display: flex; align-items: center; gap: 4px;">
            <span>🤖 Agent Co-Pilot</span>
            <span>•</span>
            <span>${escapeHtml(msg.time || "")}</span>
          </div>
          <div style="background: var(--bg-secondary); border: 1px solid ${msg.isPending ? 'var(--accent-purple, #a855f7)' : 'var(--border-color)'}; border-radius: 10px 10px 10px 2px; padding: 9px 12px; font-size: 12px; line-height: 1.4; color: var(--text-main); word-break: break-word; width: 100%;">
            <div style="white-space: pre-wrap;">${
              msg.isPending
                ? `<div style="display: flex; align-items: center; gap: 8px; color: var(--accent-purple, #c084fc); font-weight: 500;">
                    <span class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-top-color: #c084fc;"></span>
                    <span>Deliberating with local model & applying card updates...</span>
                   </div>`
                : escapeHtml(msg.content)
            }</div>
            ${prescriptionsHtml}
            ${takesHtml}
            ${proposalsHtml}
            ${changesHtml}
            ${undoButtonHtml}
          </div>
        </div>
      `;
    })
    .join("");

  if (el.agentChatStream) {
    el.agentChatStream.innerHTML = historyHtml;
    el.agentChatStream.scrollTop = el.agentChatStream.scrollHeight;
  }

  if (el.agentStudioStream) {
    if (!state.agentChatHistory || state.agentChatHistory.length === 0) {
      const charName = state.character?.name || "your character";
      el.agentStudioStream.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 18px; font-size: 13px;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 6px; font-size: 14px;">
            <span>🤖</span> <span>Agent Co-Pilot Studio Ready</span>
          </div>
          <div style="color: var(--text-muted); line-height: 1.5;">
            You are in the fullscreen studio workspace for <strong style="color: var(--text-main);">${escapeHtml(charName)}</strong>. The right-hand sidebar displays your character card in real time and updates automatically as changes are accepted.
            <div style="margin-top: 8px; color: var(--text-dim); font-size: 11px;">
              💡 <em>Use the sidebar tabs to inspect any field. Click "Ask Agent to Doctor This" to send that field straight to the agent!</em>
            </div>
          </div>
        </div>
      `;
    } else {
      el.agentStudioStream.innerHTML = historyHtml;
    }
    el.agentStudioStream.scrollTop = el.agentStudioStream.scrollHeight;
  }
}

let activeAgentAbortController = null;

function cancelAgentChatMessage() {
  if (activeAgentAbortController) {
    activeAgentAbortController.abort();
    activeAgentAbortController = null;
    showIpcToast("Agent generation canceled", "info");
  }
}

async function sendAgentChatMessage(customPrompt) {
  if (!assertProviderConfigured()) return;

  const isStudioOpen = el.modalAgentStudio && !el.modalAgentStudio.classList.contains("hidden");
  const prompt = (
    customPrompt ||
    (isStudioOpen ? el.agentStudioInput?.value : el.agentChatInput?.value) ||
    el.agentChatInput?.value ||
    el.agentStudioInput?.value ||
    ""
  ).trim();
  if (!prompt) return;
  const scope = isStudioOpen
    ? el.agentStudioScope?.value || "auto"
    : el.agentTargetScope?.value || "auto";
  let targetFields;
  if (scope === "advice_only") targetFields = [];
  else if (scope === "dialogue") targetFields = ["mes_example", "personality"];
  else if (scope === "description") targetFields = ["description"];
  else if (scope === "personality") targetFields = ["personality"];
  else if (scope === "first_mes") targetFields = ["first_mes", "alternate_greetings"];
  else if (scope === "scenario") targetFields = ["scenario"];
  else if (scope === "post_history") targetFields = ["post_history_instructions"];

  const enforceNatural = isStudioOpen
    ? (el.agentStudioEnforceNaturalVoice ? el.agentStudioEnforceNaturalVoice.checked : true)
    : (el.agentEnforceNaturalVoice ? el.agentEnforceNaturalVoice.checked : true);
  const reviewDiffs = isStudioOpen
    ? (el.agentStudioReviewDiffs ? el.agentStudioReviewDiffs.checked : true)
    : (el.agentReviewDiffs ? el.agentReviewDiffs.checked : true);
  const twoTakes = isStudioOpen
    ? (el.agentStudioTwoTakes ? el.agentStudioTwoTakes.checked : false)
    : (el.agentTwoTakes ? el.agentTwoTakes.checked : false);

  syncUIToState();

  const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.agentChatHistory.push({
    role: "user",
    content: prompt,
    time: nowTime,
  });

  if (el.agentChatInput) el.agentChatInput.value = "";
  if (el.agentStudioInput) el.agentStudioInput.value = "";

  const snapshotBefore = JSON.parse(JSON.stringify(state.character));

  // Toggle buttons: hide Send, show Cancel
  if (el.btnAgentSend) el.btnAgentSend.classList.add("hidden");
  if (el.btnAgentCancel) el.btnAgentCancel.classList.remove("hidden");
  if (el.btnAgentStudioSend) el.btnAgentStudioSend.classList.add("hidden");
  if (el.btnAgentStudioCancel) el.btnAgentStudioCancel.classList.remove("hidden");

  activeAgentAbortController = new AbortController();

  // Placeholder bubble
  const tempMsg = {
    role: "assistant",
    content: "Thinking & synthesizing...",
    time: nowTime,
    isPending: true,
  };
  state.agentChatHistory.push(tempMsg);
  renderAgentChatStream();

  const targetedPayload = activeTargetedSelection
    ? {
        field: activeTargetedSelection.field,
        selectedText: activeTargetedSelection.selectedText,
      }
    : undefined;

  // Clear targeted selection after sending
  activeTargetedSelection = null;
  el.floatingDoctorPill?.classList.add("hidden");

  const agentCharacter = {
    name: state.character.name,
    tags: state.character.tags,
    description: state.character.description,
    personality: state.character.personality,
    scenario: state.character.scenario,
    first_mes: state.character.first_mes,
    mes_example: state.character.mes_example,
    alternate_greetings: state.character.alternate_greetings,
    system_prompt: "",
    post_history_instructions: state.character.post_history_instructions,
    creator_notes: state.character.creator_notes,
  };

  try {
    const res = await apiPost("/api/agent/modify", {
      character: agentCharacter,
      userPrompt: prompt,
      targetFields,
      chatHistory: state.agentChatHistory.filter((m) => !m.isPending),
      provider: state.provider,
      enforceNaturalVoice: enforceNatural,
      pinnedDirectives: state.agentPinnedRules || [],
      twoTakes,
      targetedSelection: targetedPayload,
    }, activeAgentAbortController.signal);

    state.agentChatHistory = state.agentChatHistory.filter((m) => !m.isPending);

    const hasCardEdits = res.character && Object.keys(res.character).length > 0 && scope !== "advice_only";

    // Setup proposals for granular review
    let proposals = [];
    if (hasCardEdits && Array.isArray(res.changes) && res.changes.length > 0) {
      if (reviewDiffs) {
        // Granular review mode: keep proposals pending for user decision
        proposals = res.changes.map((c) => ({
          field: c.field,
          before: c.before,
          after: c.after,
          explanation: c.explanation,
          action: c.action,
          index: c.index,
          status: "pending",
        }));
      } else {
        // Auto-apply mode: apply immediately
        recordSnapshot(`Before Agent: ${prompt.substring(0, 20)}...`);
        state.character = {
          ...state.character,
          ...res.character,
        };
        syncStateToUI();
        recordSnapshot(`Agent Edit: ${prompt.substring(0, 20)}...`);
        notifyIpcActiveCard(state.character);
      }
    }

    // Creative Takes
    const takes = Array.isArray(res.takes) ? res.takes.map((t) => ({ ...t, status: "pending" })) : [];

    const responseTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    state.agentChatHistory.push({
      role: "assistant",
      content: res.agentMessage || "Done.",
      time: responseTime,
      changes: res.changes || [],
      proposals,
      takes,
      snapshotBefore: hasCardEdits && !reviewDiffs ? snapshotBefore : null,
    });

    renderAgentChatStream();
  } catch (err) {
    state.agentChatHistory = state.agentChatHistory.filter((m) => !m.isPending);
    if (err.name === "AbortError") {
      state.agentChatHistory.push({
        role: "assistant",
        content: "⏹️ *Agent generation stopped by user.*",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } else {
      console.error("Agent error:", err);
      state.agentChatHistory.push({
        role: "assistant",
        content: `❌ Error: ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
    renderAgentChatStream();
  } finally {
    activeAgentAbortController = null;
    if (el.btnAgentSend) el.btnAgentSend.classList.remove("hidden");
    if (el.btnAgentCancel) el.btnAgentCancel.classList.add("hidden");
    if (el.btnAgentStudioSend) el.btnAgentStudioSend.classList.remove("hidden");
    if (el.btnAgentStudioCancel) el.btnAgentStudioCancel.classList.add("hidden");
  }
}

async function runReimagine() {
  if (!assertProviderConfigured()) return;
  syncUIToState();
  if (!state.character?.name) {
    showIpcToast("Load or generate a character card first.", "error");
    return;
  }
  const button = el.btnRunReimagine;
  if (button) {
    button.disabled = true;
    button.textContent = "⏳ Agent is reimagining...";
  }
  try {
    const res = await apiPost("/api/agent/reimagine", {
      character: state.character,
      mode: reimagineMode,
      prompt: el.reimaginePrompt?.value || "",
      chatHistory: state.agentChatHistory.filter((m) => !m.isPending),
      provider: state.provider,
    });
    if (res.character && Object.keys(res.character).length) {
      recordSnapshot(`Before Reimagine: ${reimagineMode}`);
      state.character = { ...state.character, ...res.character };
      syncStateToUI();
      notifyIpcActiveCard(state.character);
    }
    if (el.reimagineResult) {
      el.reimagineResult.classList.remove("hidden");
      el.reimagineResult.innerHTML = `<strong>${escapeHtml(res.mode === "inspire" ? "Inspired direction" : "Redesign complete")}</strong><div>${escapeHtml(res.agentMessage || "The card was updated.")}</div>`;
    }
  } catch (err) {
    if (el.reimagineResult) {
      el.reimagineResult.classList.remove("hidden");
      el.reimagineResult.textContent = `❌ ${err.message}`;
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "✨ Reimagine Current Card";
    }
  }
}

document.querySelectorAll(".reimagine-mode").forEach((button) => {
  button.addEventListener("click", () => {
    reimagineMode = button.dataset.mode || "redesign";
    document.querySelectorAll(".reimagine-mode").forEach((b) => b.classList.toggle("active", b === button));
  });
});
el.btnRunReimagine?.addEventListener("click", runReimagine);

// ==========================================
// Lorebook Companion Creator Logic
// ==========================================
let companionRole = "guide";
let companionRelation = "stranger";

// Companion Role Chip Handlers
document.querySelectorAll(".companion-role-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    companionRole = chip.dataset.role || "guide";
    document.querySelectorAll(".companion-role-chip").forEach((c) => {
      c.classList.toggle("active", c === chip);
      if (c === chip) {
        c.style.borderColor = "var(--accent-purple)";
        c.style.background = "rgba(168, 85, 247, 0.2)";
        c.style.color = "#c084fc";
      } else {
        c.style.borderColor = "var(--border-main)";
        c.style.background = "var(--bg-card)";
        c.style.color = "var(--text-muted)";
      }
    });

    const customInp = document.getElementById("companion-custom-role-input");
    if (customInp) {
      customInp.classList.toggle("hidden", companionRole !== "custom");
      if (companionRole === "custom") customInp.focus();
    }
  });
});

// User Relation Chip Handlers
document.querySelectorAll(".companion-rel-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    companionRelation = chip.dataset.rel || "stranger";
    document.querySelectorAll(".companion-rel-chip").forEach((c) => {
      c.classList.toggle("active", c === chip);
      if (c === chip) {
        c.style.borderColor = "var(--accent-cyan)";
        c.style.background = "rgba(56, 189, 248, 0.2)";
        c.style.color = "#38bdf8";
      } else {
        c.style.borderColor = "var(--border-main)";
        c.style.background = "var(--bg-card)";
        c.style.color = "var(--text-muted)";
      }
    });

    const customInp = document.getElementById("companion-custom-rel-input");
    if (customInp) {
      customInp.classList.toggle("hidden", companionRelation !== "custom");
      if (companionRelation === "custom") customInp.focus();
    }
  });
});

// Load Active Card Lorebook
document.getElementById("btn-companion-use-active-lore")?.addEventListener("click", () => {
  const cb = state.character?.character_book;
  if (cb && Array.isArray(cb.entries) && cb.entries.length > 0) {
    const input = document.getElementById("companion-lorebook-input");
    if (input) {
      input.value = JSON.stringify(cb, null, 2);
      analyzeCompanionLorebook();
    }
  } else {
    alert("Currently active character does not have an embedded lorebook with entries.");
  }
});

// Upload Lorebook JSON file
document.getElementById("companion-lorebook-file")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const content = evt.target.result;
    const input = document.getElementById("companion-lorebook-input");
    if (input) {
      input.value = content;
      analyzeCompanionLorebook();
    }
  };
  reader.readAsText(file);
});

// Analyze Lorebook function
async function analyzeCompanionLorebook() {
  const input = document.getElementById("companion-lorebook-input");
  const badge = document.getElementById("companion-lorebook-badge");
  const preview = document.getElementById("companion-entities-preview");
  const text = input ? input.value.trim() : "";

  if (!text) {
    if (badge) badge.textContent = "Please enter or paste a lorebook first";
    return;
  }

  if (badge) badge.textContent = "Analyzing...";

  try {
    const res = await apiPost("/api/lorebook/analyze", { lorebook: text });
    if (res.summary) {
      const s = res.summary;
      if (badge) {
        badge.textContent = `✓ ${s.entryCount} entries detected (~${s.totalTokensApprox} tokens)`;
        badge.style.color = "var(--accent-green, #10b981)";
      }
      if (preview) {
        const entities = (s.factions || []).concat(s.locations || []).slice(0, 10);
        if (entities.length > 0) {
          preview.classList.remove("hidden");
          preview.innerHTML = entities
            .map(
              (ent) =>
                `<span style="font-size: 10px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe; border-radius: 10px; padding: 1px 8px;">${escapeHtml(
                  ent
                )}</span>`
            )
            .join("");
        } else {
          preview.classList.add("hidden");
        }
      }
    }
  } catch (err) {
    if (badge) {
      badge.textContent = "Failed to parse lorebook: " + err.message;
      badge.style.color = "#ef4444";
    }
  }
}

document.getElementById("btn-companion-analyze")?.addEventListener("click", analyzeCompanionLorebook);

// Forge Lorebook Companion
document.getElementById("btn-companion-forge")?.addEventListener("click", async () => {
  if (!assertProviderConfigured()) return;

  const loreInput = document.getElementById("companion-lorebook-input")?.value?.trim();
  if (!loreInput) {
    alert("Please provide or load a lorebook before forging a companion!");
    return;
  }

  const customRole = document.getElementById("companion-custom-role-input")?.value?.trim() || "";
  const customRel = document.getElementById("companion-custom-rel-input")?.value?.trim() || "";
  const gender = document.getElementById("companion-gender")?.value || "any";
  const nsfw = !!document.getElementById("companion-nsfw")?.checked;
  const tone = document.getElementById("companion-tone")?.value?.trim() || "Tactical, atmospheric, conversational";
  const steering = document.getElementById("companion-steering")?.value?.trim() || "";

  const btn = document.getElementById("btn-companion-forge");
  const origHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>Synthesizing Companion &amp; Embedding Lorebook...</span>`;
  }

  try {
    const payload = {
      lorebook: loreInput,
      companionRole,
      customRole: companionRole === "custom" ? customRole : undefined,
      userRelation: companionRelation,
      customRelation: companionRelation === "custom" ? customRel : undefined,
      companionGender: gender,
      tone,
      nsfw,
      steeringInstructions: steering,
      provider: state.provider,
    };

    const res = await apiPost("/api/lorebook/generate-companion", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character };
      state.activeCardId = null;
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`Forged Companion: ${state.character.name}`);
      const entryCount = state.character.character_book?.entries?.length || 0;
      alert(`🎉 Successfully forged Companion "${state.character.name}" with ${entryCount} embedded lorebook entries!`);
    }
  } catch (err) {
    alert("Companion generation failed: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
});
el.btnAgentImportCard?.addEventListener("click", () => el.fileImportInput?.click());

// Preset chips populate the chat input
document.querySelectorAll(".agent-preset-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const isStudioOpen = el.modalAgentStudio && !el.modalAgentStudio.classList.contains("hidden");
    const targetInput = isStudioOpen && el.agentStudioInput ? el.agentStudioInput : el.agentChatInput;
    if (targetInput) {
      targetInput.value = chip.dataset.wish || "";
      targetInput.focus();
    }
  });
});

// 1-Click Prescription Checkup Button
el.btnAgentPrescription?.addEventListener("click", () => {
  runPrescriptionCheckup();
});

// Pinned Rules Expand/Collapse Toggle
el.agentTogglePinned?.addEventListener("click", () => {
  const isHidden = el.agentPinnedContent?.classList.contains("hidden");
  if (isHidden) {
    el.agentPinnedContent?.classList.remove("hidden");
    if (el.agentPinnedChevron) el.agentPinnedChevron.textContent = "▲";
  } else {
    el.agentPinnedContent?.classList.add("hidden");
    if (el.agentPinnedChevron) el.agentPinnedChevron.textContent = "▼";
  }
});

// Add Pinned Rule
function handleAddPinnedRule() {
  const text = el.agentNewPinnedInput?.value.trim();
  if (!text) return;
  if (!state.agentPinnedRules) state.agentPinnedRules = [];
  if (!state.agentPinnedRules.includes(text)) {
    state.agentPinnedRules.push(text);
    localStorage.setItem("chargen_agent_pinned_rules", JSON.stringify(state.agentPinnedRules));
    renderPinnedRules();
  }
  if (el.agentNewPinnedInput) el.agentNewPinnedInput.value = "";
}

el.btnAddPinnedRule?.addEventListener("click", handleAddPinnedRule);
el.agentNewPinnedInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddPinnedRule();
  }
});

// Remove Pinned Rule via delegation
el.agentPinnedChips?.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".agent-pinned-chip-remove");
  if (!removeBtn) return;
  const idx = parseInt(removeBtn.dataset.ruleIndex, 10);
  if (state.agentPinnedRules && idx >= 0 && idx < state.agentPinnedRules.length) {
    state.agentPinnedRules.splice(idx, 1);
    localStorage.setItem("chargen_agent_pinned_rules", JSON.stringify(state.agentPinnedRules));
    renderPinnedRules();
  }
});

// Agent chat stream interactive clicks (Accept/Discard diffs, Choose Takes, Prescriptions, Revert)
let activeModalDiffTurnIdx = null;
let activeModalDiffPropIdx = null;

function openAgentDiffModal(turnIdx, propIdx) {
  const msg = state.agentChatHistory[turnIdx];
  const prop = msg?.proposals?.[propIdx];
  if (!prop) return;

  activeModalDiffTurnIdx = turnIdx;
  activeModalDiffPropIdx = propIdx;

  const modal = document.getElementById("modal-agent-field-diff");
  const title = document.getElementById("agent-diff-modal-title");
  const subtitle = document.getElementById("agent-diff-modal-subtitle");
  const expl = document.getElementById("agent-diff-modal-explanation");
  const beforeArea = document.getElementById("agent-diff-modal-before");
  const afterArea = document.getElementById("agent-diff-modal-after");
  const beforeTok = document.getElementById("agent-diff-before-tokens");
  const afterTok = document.getElementById("agent-diff-after-tokens");
  const statusTxt = document.getElementById("agent-diff-modal-status-text");
  const acceptBtn = document.getElementById("btn-agent-diff-modal-accept");
  const discardBtn = document.getElementById("btn-agent-diff-modal-discard");

  const fieldName = (prop.field || "").replace(/_/g, " ").toUpperCase();
  const bTokens = estimateTokens(prop.before || "");
  const aTokens = estimateTokens(prop.after || "");
  const diffTokens = aTokens - bTokens;

  if (title) title.textContent = `🔍 Diff Inspector: ${fieldName}`;
  if (subtitle) subtitle.textContent = `Comparing current ${fieldName} with proposed revision (${diffTokens >= 0 ? "+" : ""}${diffTokens} tokens)`;
  if (expl) {
    if (prop.explanation) {
      expl.textContent = `💡 ${prop.explanation}`;
      expl.style.display = "block";
    } else {
      expl.style.display = "none";
    }
  }
  if (beforeArea) beforeArea.value = prop.before || "(empty)";
  if (afterArea) afterArea.value = prop.after || "(empty)";
  if (beforeTok) beforeTok.textContent = bTokens;
  if (afterTok) afterTok.textContent = aTokens;

  if (prop.status === "accepted") {
    if (statusTxt) {
      statusTxt.textContent = "✓ This proposal has been accepted and applied to the card.";
      statusTxt.style.color = "#10b981";
    }
    if (acceptBtn) acceptBtn.style.display = "none";
    if (discardBtn) discardBtn.style.display = "none";
  } else if (prop.status === "discarded") {
    if (statusTxt) {
      statusTxt.textContent = "✕ This proposal was discarded.";
      statusTxt.style.color = "#ef4444";
    }
    if (acceptBtn) acceptBtn.style.display = "none";
    if (discardBtn) discardBtn.style.display = "none";
  } else {
    if (statusTxt) {
      statusTxt.textContent = "Pending author review.";
      statusTxt.style.color = "var(--text-muted)";
    }
    if (acceptBtn) acceptBtn.style.display = "inline-block";
    if (discardBtn) discardBtn.style.display = "inline-block";
  }

  if (modal) modal.classList.remove("hidden");
}

function closeAgentDiffModal() {
  const modal = document.getElementById("modal-agent-field-diff");
  if (modal) modal.classList.add("hidden");
  activeModalDiffTurnIdx = null;
  activeModalDiffPropIdx = null;
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("#btn-close-agent-diff-modal");
  if (target) closeAgentDiffModal();
});
async function copyAgentDiffText(text, label) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      if (!document.execCommand("copy")) throw new Error("Clipboard access unavailable");
      area.remove();
    }
    showIpcToast(`Copied ${label} text to clipboard`, "info");
  } catch (err) {
    showIpcToast(`Could not copy ${label} text: ${err.message}`, "error");
  }
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("#btn-agent-diff-copy-before, #btn-agent-diff-copy-after");
  if (!target) return;
  const id = target.id === "btn-agent-diff-copy-before" ? "agent-diff-modal-before" : "agent-diff-modal-after";
  const area = document.getElementById(id);
  if (area) copyAgentDiffText(area.value, target.id.endsWith("before") ? "BEFORE" : "AFTER");
});
function applyProposalToCharacter(prop) {
  if (!prop) return;
  if (prop.field === "alternate_greetings") {
    if (!Array.isArray(state.character.alternate_greetings)) {
      state.character.alternate_greetings = [];
    }
    const alts = state.character.alternate_greetings;
    if (prop.action === "add" || prop.before === "(none - newly added)") {
      const idx = prop.index !== undefined && prop.index >= 0 && prop.index <= alts.length ? prop.index : alts.length;
      alts.splice(idx, 0, prop.after);
    } else if (prop.action === "update") {
      const idx = prop.index !== undefined && prop.index >= 0 && prop.index < alts.length ? prop.index : alts.indexOf(prop.before);
      if (idx !== -1) alts[idx] = prop.after;
      else alts.push(prop.after);
    } else if (prop.action === "delete" || prop.after === "(deleted)") {
      const idx = prop.index !== undefined && prop.index >= 0 && prop.index < alts.length ? prop.index : alts.indexOf(prop.before);
      if (idx !== -1) alts.splice(idx, 1);
    } else if (Array.isArray(prop.after)) {
      state.character.alternate_greetings = prop.after;
    } else if (typeof prop.after === "string") {
      alts.push(prop.after);
    }
  } else {
    state.character[prop.field] = prop.after;
  }
}

function acceptActiveAgentDiff() {
  if (activeModalDiffTurnIdx !== null && activeModalDiffPropIdx !== null) {
    const msg = state.agentChatHistory[activeModalDiffTurnIdx];
    const prop = msg?.proposals?.[activeModalDiffPropIdx];
    if (prop && prop.status === "pending") {
      recordSnapshot(`Before Accept: ${prop.field}`);
      applyProposalToCharacter(prop);
      prop.status = "accepted";
      syncStateToUI();
      recordSnapshot(`Accepted Agent Edit: ${prop.field}`);
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
      showIpcToast(`✓ Applied ${prop.field} revision to card`, "success");
      closeAgentDiffModal();
    }
  }
}
function discardActiveAgentDiff() {
  if (activeModalDiffTurnIdx !== null && activeModalDiffPropIdx !== null) {
    const msg = state.agentChatHistory[activeModalDiffTurnIdx];
    const prop = msg?.proposals?.[activeModalDiffPropIdx];
    if (prop && prop.status === "pending") {
      prop.status = "discarded";
      renderAgentChatStream();
      closeAgentDiffModal();
    }
  }
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("#btn-agent-diff-modal-accept, #btn-agent-diff-modal-discard");
  if (!target) return;
  if (target.id === "btn-agent-diff-modal-accept") acceptActiveAgentDiff();
  else discardActiveAgentDiff();
});

function handleAgentStreamClick(e) {
  // Open Large Diff Modal
  const btnOpenDiff = e.target.closest(".btn-open-diff-modal") || e.target.closest(".agent-diff-box");
  if (btnOpenDiff) {
    const row = btnOpenDiff.closest(".agent-diff-row");
    const acceptBtn = row?.querySelector(".btn-accept-field") || row?.querySelector(".btn-open-diff-modal");
    if (acceptBtn) {
      const turnIdx = parseInt(acceptBtn.dataset.turnIdx, 10);
      const propIdx = parseInt(acceptBtn.dataset.propIdx, 10);
      openAgentDiffModal(turnIdx, propIdx);
      return;
    }
  }

  // 1. Accept Single Field Proposal
  const btnAcceptField = e.target.closest(".btn-accept-field");
  if (btnAcceptField) {
    const turnIdx = parseInt(btnAcceptField.dataset.turnIdx, 10);
    const propIdx = parseInt(btnAcceptField.dataset.propIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    const prop = msg?.proposals?.[propIdx];
    if (prop && prop.status === "pending") {
      recordSnapshot(`Before Accept: ${prop.field}`);
      applyProposalToCharacter(prop);
      prop.status = "accepted";
      syncStateToUI();
      recordSnapshot(`Accepted Agent Edit: ${prop.field}`);
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
    }
    return;
  }

  // 2. Discard Single Field Proposal
  const btnDiscardField = e.target.closest(".btn-discard-field");
  if (btnDiscardField) {
    const turnIdx = parseInt(btnDiscardField.dataset.turnIdx, 10);
    const propIdx = parseInt(btnDiscardField.dataset.propIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    const prop = msg?.proposals?.[propIdx];
    if (prop && prop.status === "pending") {
      prop.status = "discarded";
      renderAgentChatStream();
    }
    return;
  }

  // 3. Accept All Proposals
  const btnAcceptAll = e.target.closest(".btn-accept-all-proposals");
  if (btnAcceptAll) {
    const turnIdx = parseInt(btnAcceptAll.dataset.turnIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    if (msg?.proposals) {
      recordSnapshot("Before Accept All Proposals");
      msg.proposals.forEach((p) => {
        if (p.status === "pending") {
          applyProposalToCharacter(p);
          p.status = "accepted";
        }
      });
      syncStateToUI();
      recordSnapshot("Accepted All Agent Proposals");
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
    }
    return;
  }

  // 4. Discard All Proposals
  const btnDiscardAll = e.target.closest(".btn-discard-all-proposals");
  if (btnDiscardAll) {
    const turnIdx = parseInt(btnDiscardAll.dataset.turnIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    if (msg?.proposals) {
      msg.proposals.forEach((p) => {
        if (p.status === "pending") p.status = "discarded";
      });
      renderAgentChatStream();
    }
    return;
  }

  // 5. Choose Take A / Take B
  const btnApplyTake = e.target.closest(".btn-apply-take");
  if (btnApplyTake) {
    const turnIdx = parseInt(btnApplyTake.dataset.turnIdx, 10);
    const takeIdx = parseInt(btnApplyTake.dataset.takeIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    const take = msg?.takes?.[takeIdx];
    if (take) {
      recordSnapshot(`Before Choose Take ${take.takeId}`);
      state.character[take.field] = take.content;
      msg.takes.forEach((t) => (t.status = "unselected"));
      take.status = "applied";
      syncStateToUI();
      recordSnapshot(`Applied Take ${take.takeId} to ${take.field}`);
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
    }
    return;
  }

  // 6. Prescription 1-Click Action Fix
  const btnPrescFix = e.target.closest(".btn-prescription-fix");
  if (btnPrescFix) {
    const turnIdx = parseInt(btnPrescFix.dataset.turnIdx, 10);
    const prescIdx = parseInt(btnPrescFix.dataset.prescIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    const presc = msg?.prescriptions?.[prescIdx];
    if (presc && presc.prompt) {
      sendAgentChatMessage(presc.prompt);
    }
    return;
  }

  // 7. Full Turn Revert
  const revertBtn = e.target.closest(".btn-agent-revert-turn");
  if (revertBtn) {
    const idx = parseInt(revertBtn.dataset.index, 10);
    const msg = state.agentChatHistory[idx];
    if (msg && msg.snapshotBefore) {
      if (!confirm("Revert character card to before this edit was made?")) return;
      state.character = JSON.parse(JSON.stringify(msg.snapshotBefore));
      delete msg.snapshotBefore;
      msg.content += "\n\n*(Edit reverted)*";
      syncStateToUI();
      recordSnapshot("Reverted Agent Turn");
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
    }
    return;
  }
}

// Agent chat stream interactive clicks (Accept/Discard diffs, Choose Takes, Prescriptions, Revert)
el.agentChatStream?.addEventListener("click", handleAgentStreamClick);
el.agentStudioStream?.addEventListener("click", handleAgentStreamClick);

// Clear agent conversation
const clearAgentHistory = () => {
  if (state.agentChatHistory.length > 0 && !confirm("Clear agent chat history?")) return;
  state.agentChatHistory = [];
  renderAgentChatStream();
};
el.btnAgentClearChat?.addEventListener("click", clearAgentHistory);
el.btnAgentStudioClear?.addEventListener("click", clearAgentHistory);

// Enter key to send (Shift+Enter for newline)
el.agentChatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendAgentChatMessage();
  }
});
el.agentStudioInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendAgentChatMessage();
  }
});

// Agent Send & Cancel button clicks
el.btnAgentSend?.addEventListener("click", () => sendAgentChatMessage());
el.btnAgentStudioSend?.addEventListener("click", () => sendAgentChatMessage());
el.btnAgentCancel?.addEventListener("click", cancelAgentChatMessage);
el.btnAgentStudioCancel?.addEventListener("click", cancelAgentChatMessage);

// --- Fullscreen Agent Studio Modal & Collapsible Sidebar Implementation ---
let activeStudioField = "description";

function updateAgentStudioSidebar() {
  const c = state.character;
  if (!c) return;

  if (el.agentStudioCardBadge) {
    el.agentStudioCardBadge.textContent = c.name ? `[${c.name}]` : "";
  }

  // Update tabs count
  const alts = Array.isArray(c.alternate_greetings) ? c.alternate_greetings : [];
  if (el.agentStudioAltsCount) el.agentStudioAltsCount.textContent = String(alts.length);

  // Field label
  if (el.agentStudioActiveFieldLabel) {
    el.agentStudioActiveFieldLabel.textContent = activeStudioField.replace(/_/g, " ").toUpperCase();
  }

  // Tokens counter for current field
  if (activeStudioField === "alternate_greetings") {
    if (el.agentStudioFieldEditor) el.agentStudioFieldEditor.classList.add("hidden");
    if (el.agentStudioAltsContainer) {
      el.agentStudioAltsContainer.classList.remove("hidden");
      if (alts.length === 0) {
        el.agentStudioAltsContainer.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); font-style: italic; padding: 10px;">No alternate greetings yet. Use the agent to create some!</div>`;
      } else {
        el.agentStudioAltsContainer.innerHTML = alts
          .map(
            (alt, idx) => `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: var(--accent-purple); font-size: 10px;">GREETING #${idx + 1} (${estimateTokens(alt)} tok)</span>
                <button class="btn btn-ghost btn-xs btn-doctor-single-alt" data-index="${idx}" style="font-size: 10px; color: var(--accent-cyan);" type="button">✂️ Doctor</button>
              </div>
              <div style="font-size: 11px; color: var(--text-main); white-space: pre-wrap; font-family: monospace; max-height: 120px; overflow-y: auto;">${escapeHtml(alt)}</div>
            </div>
          `
          )
          .join("");
      }
    }
    const totalTokens = alts.reduce((sum, g) => sum + estimateTokens(g), 0);
    if (el.agentStudioSidebarTokens) el.agentStudioSidebarTokens.textContent = `${totalTokens} tok (total alts)`;
  } else {
    if (el.agentStudioAltsContainer) el.agentStudioAltsContainer.classList.add("hidden");
    if (el.agentStudioFieldEditor) {
      el.agentStudioFieldEditor.classList.remove("hidden");
      const val = c[activeStudioField];
      const textVal = typeof val === "string" ? val : Array.isArray(val) ? val.join(", ") : "";
      el.agentStudioFieldEditor.value = textVal;
      if (el.agentStudioSidebarTokens) {
        el.agentStudioSidebarTokens.textContent = `${estimateTokens(textVal)} tok`;
      }
    }
  }
}

function openAgentStudio() {
  if (!el.modalAgentStudio) return;
  syncUIToState();
  el.modalAgentStudio.classList.remove("hidden");
  renderAgentChatStream();
  renderPinnedRules();
  updateAgentStudioSidebar();
  if (el.agentStudioInput) {
    setTimeout(() => el.agentStudioInput.focus(), 80);
  }
}

function closeAgentStudio() {
  if (!el.modalAgentStudio) return;
  el.modalAgentStudio.classList.add("hidden");
  // Sync any manual edits made inside the studio field editor back to character and UI
  if (el.agentStudioFieldEditor && activeStudioField !== "alternate_greetings") {
    state.character[activeStudioField] = el.agentStudioFieldEditor.value;
    syncStateToUI();
  }
}

// Open Fullscreen Studio triggers
el.btnOpenAgentFullscreen?.addEventListener("click", openAgentStudio);
el.btnAgentExpandFullscreen?.addEventListener("click", openAgentStudio);
el.btnCloseAgentStudio?.addEventListener("click", closeAgentStudio);

// Studio Save Card button
el.btnAgentStudioSaveCard?.addEventListener("click", () => {
  if (el.agentStudioFieldEditor && activeStudioField !== "alternate_greetings") {
    state.character[activeStudioField] = el.agentStudioFieldEditor.value;
  }
  syncStateToUI();
  saveActiveCardToLibrary(false);
  showIpcToast("Character card successfully saved!", "success");
});

// Sidebar Collapse / Expand Toggle
let isSidebarHidden = false;
el.btnAgentStudioToggleSidebar?.addEventListener("click", () => {
  if (!el.agentStudioSidebar) return;
  isSidebarHidden = !isSidebarHidden;
  if (isSidebarHidden) {
    el.agentStudioSidebar.style.display = "none";
    if (el.agentStudioSidebarBtnText) el.agentStudioSidebarBtnText.textContent = "Show Card Sidebar";
  } else {
    el.agentStudioSidebar.style.display = "flex";
    if (el.agentStudioSidebarBtnText) el.agentStudioSidebarBtnText.textContent = "Hide Card Sidebar";
    updateAgentStudioSidebar();
  }
});

// Sidebar Tab switching
document.querySelectorAll(".agent-studio-tab").forEach((tab) => {
  tab.addEventListener("click", (e) => {
    document.querySelectorAll(".agent-studio-tab").forEach((t) => t.classList.remove("active"));
    const btn = e.currentTarget;
    btn.classList.add("active");
    activeStudioField = btn.dataset.field || "description";
    updateAgentStudioSidebar();
  });
});

// Doctor Field button from sidebar
el.btnAgentStudioDoctorField?.addEventListener("click", () => {
  const c = state.character;
  if (!c) return;
  const val = c[activeStudioField];
  const fieldLabel = activeStudioField.replace(/_/g, " ");
  if (el.agentStudioInput) {
    el.agentStudioInput.value = `Doctor the character's ${fieldLabel}. Refine it to be more natural, vivid, and punchy while maintaining her core essence.`;
    el.agentStudioInput.focus();
  }
});

// Doctor individual alternate greeting from sidebar
el.agentStudioAltsContainer?.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-doctor-single-alt");
  if (btn) {
    const idx = parseInt(btn.dataset.index || "0", 10);
    const alts = state.character.alternate_greetings || [];
    const targetAlt = alts[idx] || "";
    if (el.agentStudioInput) {
      el.agentStudioInput.value = `Refine alternate greeting #${idx + 1}: "${targetAlt}". Make dialogue cadence more spontaneous, emotional, and grounded.`;
      el.agentStudioInput.focus();
    }
  }
});

// Manual typing in studio field editor syncs live to state
el.agentStudioFieldEditor?.addEventListener("input", () => {
  if (activeStudioField && activeStudioField !== "alternate_greetings") {
    state.character[activeStudioField] = el.agentStudioFieldEditor.value;
    if (el.agentStudioSidebarTokens) {
      el.agentStudioSidebarTokens.textContent = `${estimateTokens(el.agentStudioFieldEditor.value)} tok`;
    }
    // Also update main editor if open in background
    syncStateToUI();
  }
});

// Studio 1-Click Prescription Checkup Button
el.btnAgentStudioPrescription?.addEventListener("click", () => {
  runPrescriptionCheckup();
});

// Studio Pinned Directives
function handleAddStudioPinnedRule() {
  const text = el.agentStudioPinnedInput?.value.trim();
  if (!text) return;
  if (!state.agentPinnedRules) state.agentPinnedRules = [];
  if (!state.agentPinnedRules.includes(text)) {
    state.agentPinnedRules.push(text);
    localStorage.setItem("chargen_agent_pinned_rules", JSON.stringify(state.agentPinnedRules));
    renderPinnedRules();
  }
  if (el.agentStudioPinnedInput) el.agentStudioPinnedInput.value = "";
}
el.btnAgentStudioAddPinned?.addEventListener("click", handleAddStudioPinnedRule);
el.agentStudioPinnedInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddStudioPinnedRule();
  }
});
el.agentStudioPinnedChips?.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".agent-pinned-chip-remove");
  if (!removeBtn) return;
  const idx = parseInt(removeBtn.dataset.ruleIndex || "0", 10);
  if (state.agentPinnedRules && idx >= 0 && idx < state.agentPinnedRules.length) {
    state.agentPinnedRules.splice(idx, 1);
    localStorage.setItem("chargen_agent_pinned_rules", JSON.stringify(state.agentPinnedRules));
    renderPinnedRules();
  }
});

// --- Custom Avatar Image Processing & Handlers ---
function processImageFileToPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      // If it's already a PNG data URL, preserve raw bytes directly
      if (file.type === "image/png" && typeof dataUrl === "string" && dataUrl.startsWith("data:image/png;base64,")) {
        return resolve(dataUrl);
      }
      // If JPG, WEBP, GIF, or other, render to canvas and convert cleanly to a PNG data URL
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to render image in browser"));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 400;
          canvas.height = img.naturalHeight || img.height || 400;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL("image/png");
          resolve(pngUrl);
        } catch (canvasErr) {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function handleAvatarImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/") && !file.name.match(/\.(png|jpe?g|webp|gif)$/i)) {
    alert("Please select a valid image file (PNG, JPG, WEBP, or GIF).");
    return;
  }

  try {
    const pngDataUrl = await processImageFileToPng(file);
    state.character.avatar = pngDataUrl;
    syncStateToUI();
    recordSnapshot(`Added custom avatar: ${file.name}`);
  } catch (err) {
    console.error("Failed to load avatar:", err);
    alert("Failed to load avatar image: " + err.message);
  }
}

// Avatar Container Click & Button triggers
el.avatarContainer?.addEventListener("click", (e) => {
  if (e.target.closest("#btn-remove-avatar")) return;
  el.avatarFileInput?.click();
});

el.btnUploadAvatar?.addEventListener("click", () => {
  el.avatarFileInput?.click();
});

el.avatarFileInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (file) {
    await handleAvatarImageFile(file);
  }
  el.avatarFileInput.value = "";
});

el.btnRemoveAvatar?.addEventListener("click", (e) => {
  e.stopPropagation();
  state.character.avatar = null;
  syncStateToUI();
  recordSnapshot("Removed custom avatar");
});

// Avatar Drag & Drop Cues & Drop Handling
if (el.avatarContainer) {
  ["dragenter", "dragover"].forEach((eventName) => {
    el.avatarContainer.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.avatarContainer.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    el.avatarContainer.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.avatarContainer.classList.remove("drag-over");
    });
  });

  el.avatarContainer.addEventListener("drop", async (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await handleAvatarImageFile(file);
    }
  });
}

// Global Drag & Drop safety to prevent browser navigating away on dropped files
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  if (e.target.closest("#avatar-container") || e.target.closest("#vision-dropzone")) {
    return;
  }
  e.preventDefault();
});

// Import Card
el.btnImportCard.addEventListener("click", () => el.fileImportInput.click());
el.fileImportInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/parse-card", {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Failed to parse card");
    const data = await res.json();
    if (data.character) {
      // Replace the previous draft rather than merging stale fields into an import.
      // This keeps Agent Mode from carrying oversized data from an earlier card.
      state.character = data.character;
      state.activeCardId = null;
      updateActiveCardBadge();
      if (data.avatarDataUrl) state.character.avatar = data.avatarDataUrl;
      syncStateToUI();
      recordSnapshot(`Imported: ${state.character.name}`);

      if (data.raw_system_prompt && data.raw_system_prompt.trim()) {
        state.pendingSystemPrompt = data.raw_system_prompt.trim();
        if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = state.pendingSystemPrompt;
        openIncorporateModal(state.pendingSystemPrompt);
      } else {
        alert(`📂 Successfully imported "${state.character.name}" (${data.format})!`);
      }
    }
  } catch (err) {
    alert("Import failed: " + err.message);
  } finally {
    el.fileImportInput.value = "";
  }
});

// --- AI Directive & System Prompt Incorporator ---

function showIncorporateStatus(msg, type = "info") {
  if (!el.incorporateStatusBox) return;
  el.incorporateStatusBox.classList.remove("hidden");
  const color = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "var(--accent-cyan)";
  el.incorporateStatusBox.style.borderColor = color;
  el.incorporateStatusBox.style.color = color;
  el.incorporateStatusBox.textContent = msg;
}

function openIncorporateModal(content) {
  if (!el.modalIncorporateSystem) return;
  if (el.modalIncPreview) el.modalIncPreview.textContent = content;
  if (el.modalIncGuidance) el.modalIncGuidance.value = "";
  const radioBoth = document.querySelector('input[name="modal-inc-target"][value="both"]');
  if (radioBoth) radioBoth.checked = true;
  el.modalIncorporateSystem.classList.remove("hidden");
}

async function executeIncorporate(content, target, guidance) {
  if (!assertProviderConfigured()) return;
  if (!content || !content.trim()) {
    alert("Please provide a system prompt or directives to incorporate.");
    return;
  }

  syncUIToState();

  const btn = el.btnRunIncorporate;
  const originalBtnHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; vertical-align:middle; margin-right:4px;"></span> Incorporating...`;
  }
  if (el.btnModalIncRun) {
    el.btnModalIncRun.disabled = true;
    el.btnModalIncRun.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; vertical-align:middle; margin-right:4px;"></span> Incorporating...`;
  }

  showIncorporateStatus(`🤖 AI is synthesizing content into ${target.replace("_", "-")}...`, "info");

  try {
    const res = await apiPost("/api/incorporate-prompt", {
      character: state.character,
      systemPromptContent: content,
      target,
      provider: state.provider,
      userGuidance: guidance || undefined,
    });

    if (res.character) {
      state.character = {
        ...state.character,
        ...res.character,
      };
      state.pendingSystemPrompt = null;
      if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
      syncStateToUI();
      recordSnapshot(`Incorporated directives into ${target}`);
      showIncorporateStatus(`✓ ${res.summary || "Directives incorporated successfully!"}`, "success");
      el.modalIncorporateSystem?.classList.add("hidden");
      alert(`✨ Directives successfully incorporated into ${target.replace("_", " ")}!`);
    }
  } catch (err) {
    console.error("Incorporation failed:", err);
    showIncorporateStatus(`⚠️ Incorporation failed: ${err.message}`, "error");
    alert(`Incorporation failed: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
    if (el.btnModalIncRun) {
      el.btnModalIncRun.disabled = false;
      el.btnModalIncRun.innerHTML = `<span>✨ Run AI Incorporation</span>`;
    }
  }
}

// In-Editor AI Incorporator Handlers
el.btnRunIncorporate?.addEventListener("click", async () => {
  const content = el.fieldSystemPrompt?.value?.trim() || "";
  const target = el.incorporateTarget?.value || "both";
  const guidance = el.incorporateGuidance?.value?.trim() || "";
  await executeIncorporate(content, target, guidance);
});

el.btnPlainMovePostHistory?.addEventListener("click", () => {
  const content = el.fieldSystemPrompt?.value?.trim() || "";
  if (!content) {
    alert("System prompt box is empty.");
    return;
  }
  if (!state.character.post_history_instructions) {
    state.character.post_history_instructions = content;
  } else if (!state.character.post_history_instructions.includes(content)) {
    state.character.post_history_instructions = `${state.character.post_history_instructions}\n\n${content}`;
  }
  state.pendingSystemPrompt = null;
  if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
  syncStateToUI();
  recordSnapshot("Plain moved system prompt to post-history");
  showIncorporateStatus("✓ Moved directly to Post-History Instructions (No AI).", "success");
});

// Modal Event Handlers
el.btnCloseIncModal?.addEventListener("click", () => {
  el.modalIncorporateSystem?.classList.add("hidden");
});

el.btnModalIncDiscard?.addEventListener("click", () => {
  state.pendingSystemPrompt = null;
  if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
  el.modalIncorporateSystem?.classList.add("hidden");
  recordSnapshot("Discarded legacy system prompt");
});

el.btnModalIncFallback?.addEventListener("click", () => {
  const content = state.pendingSystemPrompt || el.fieldSystemPrompt?.value?.trim() || "";
  if (content) {
    if (!state.character.post_history_instructions) {
      state.character.post_history_instructions = content;
    } else if (!state.character.post_history_instructions.includes(content)) {
      state.character.post_history_instructions = `${state.character.post_history_instructions}\n\n${content}`;
    }
  }
  state.pendingSystemPrompt = null;
  if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
  syncStateToUI();
  recordSnapshot("Moved system prompt to post-history (Fallback)");
  el.modalIncorporateSystem?.classList.add("hidden");
});

el.btnModalIncRun?.addEventListener("click", async () => {
  const content = state.pendingSystemPrompt || el.fieldSystemPrompt?.value?.trim() || "";
  const selectedTarget = (document.querySelector('input[name="modal-inc-target"]:checked'))?.value || "both";
  const guidance = el.modalIncGuidance?.value?.trim() || "";
  await executeIncorporate(content, selectedTarget, guidance);
});

// Export PNG Card (SillyTavern V2 & V3 Dual Embedded)
el.btnExportPng.addEventListener("click", async () => {
  syncUIToState();
  try {
    const res = await fetch("/api/export-png", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: state.character,
        avatarDataUrl: state.character.avatar || state.visionImageBase64
      })
    });
    if (!res.ok) throw new Error("PNG export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.character.name || "character"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Export failed: " + err.message);
  }
});

// Export .charx Card (Character Card V3 / Lumiverse XCHAR container format)
el.btnExportCharx?.addEventListener("click", async () => {
  syncUIToState();
  try {
    const res = await fetch("/api/export-charx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: state.character,
        avatarDataUrl: state.character.avatar || state.visionImageBase64
      })
    });
    if (!res.ok) throw new Error("CharX export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.character.name || "character"}.charx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("CharX export failed: " + err.message);
  }
});

// Export JSON Card
el.btnExportJson.addEventListener("click", () => {
  syncUIToState();
  const cardV2 = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: state.character.name,
      description: state.character.description,
      personality: state.character.personality,
      scenario: state.character.scenario,
      first_mes: state.character.first_mes,
      mes_example: state.character.mes_example,
      creator_notes: state.character.creator_notes,
      system_prompt: "", // Strictly empty so SillyTavern presets are preserved
      post_history_instructions: state.character.post_history_instructions,
      alternate_greetings: state.character.alternate_greetings,
      tags: state.character.tags,
      character_book: state.character.character_book,
      creator: "CharGen Harness",
      character_version: "1.0",
      extensions: state.character.extensions || {},
    }
  };
  const jsonStr = JSON.stringify(cardV2, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.character.name || "character"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Copy Character Prompt
el.btnCopyPrompt.addEventListener("click", () => {
  syncUIToState();
  const c = state.character;
  const promptText = `[Character: ${c.name}]
[Description:
${c.description}]

[Personality:
${c.personality}]

[Scenario:
${c.scenario}]

[First Message:
${c.first_mes}]

${c.mes_example ? `[Example Dialogues:\n${c.mes_example}]` : ""}`;

  navigator.clipboard.writeText(promptText);
  el.btnCopyPrompt.textContent = "✓ Copied Prompt!";
  setTimeout(() => el.btnCopyPrompt.textContent = "📋 Copy Character Prompt to Clipboard", 2000);
});

// Raw JSON View
el.btnViewRawJson.addEventListener("click", () => {
  syncUIToState();
  const cardV2 = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      ...state.character,
    }
  };
  el.rawJsonTextarea.value = JSON.stringify(cardV2, null, 2);
  el.modalJson.classList.remove("hidden");
});

el.btnCloseJson.addEventListener("click", () => el.modalJson.classList.add("hidden"));
el.btnCopyRawJson.addEventListener("click", () => {
  navigator.clipboard.writeText(el.rawJsonTextarea.value);
  el.btnCopyRawJson.textContent = "✓ Copied!";
  setTimeout(() => el.btnCopyRawJson.textContent = "Copy JSON", 1500);
});

// Settings Modal
el.btnOpenSettings.addEventListener("click", () => {
  openSettingsModal();
});

if (el.headerProviderBadge) {
  el.headerProviderBadge.addEventListener("click", () => {
    openSettingsModal();
  });
}

function openSettingsModal() {
  loadPromptProfilesUI();
  el.settingProviderType.value = state.provider.type || "none";
  el.settingApiKey.value = state.provider.apiKey || "";
  el.settingBaseUrl.value = state.provider.baseUrl || "";
  el.settingModelName.value = state.provider.model || "";
  el.settingTemperature.value = state.provider.temperature || 0.85;
  el.tempVal.textContent = state.provider.temperature || 0.85;

  if (state.searchConfig) {
    if (el.settingSearchProvider) el.settingSearchProvider.value = state.searchConfig.provider || "duckduckgo";
    if (el.settingSearchKey) el.settingSearchKey.value = state.searchConfig.apiKey || "";
    if (el.settingMcpCommand) el.settingMcpCommand.value = state.searchConfig.mcpCommand || "";
  }
  if (el.settingImgDefaultModel) {
    el.settingImgDefaultModel.value = state.imageConfig?.defaultTargetModel || "flux";
  }
  if (el.settingImgDefaultArtStyle) {
    el.settingImgDefaultArtStyle.value = state.imageConfig?.defaultArtStyle || "anime";
  }
  toggleSearchKeyField();
  toggleBaseUrlField();
  checkEnvKeyDetection();
  el.modalSettings.classList.remove("hidden");
}

function toggleSearchKeyField() {
  if (!el.settingSearchProvider || !el.groupSearchKey) return;
  const p = el.settingSearchProvider.value;
  if (p === "tavily" || p === "brave" || p === "searxng") {
    el.groupSearchKey.style.display = "block";
    el.labelSearchKey.textContent = p === "searxng" ? "SearXNG Instance URL" : "Search API Key";
    el.settingSearchKey.placeholder = p === "searxng" ? "e.g. http://localhost:8888" : "Enter API Key";
  } else {
    el.groupSearchKey.style.display = "none";
  }
}

if (el.settingSearchProvider) {
  el.settingSearchProvider.addEventListener("change", toggleSearchKeyField);
}

el.btnCloseSettings.addEventListener("click", () => el.modalSettings.classList.add("hidden"));

el.settingProviderType.addEventListener("change", () => {
  const pType = el.settingProviderType.value;
  toggleBaseUrlField();
  if (pType === "gemini") el.settingModelName.value = "gemini-2.5-flash";
  else if (pType === "anthropic") el.settingModelName.value = "claude-3-5-sonnet-20241022";
  else if (pType === "openrouter") el.settingModelName.value = "deepseek/deepseek-chat";
  else if (pType === "ollama") el.settingModelName.value = "llama3.2-vision";
  else if (pType === "llamacpp") el.settingModelName.value = "local-model";
  else if (pType === "openai") el.settingModelName.value = "gpt-4o-mini";
  else if (pType === "none") el.settingModelName.value = "";
  checkEnvKeyDetection();
});

el.settingTemperature.addEventListener("input", (e) => {
  el.tempVal.textContent = e.target.value;
});

function toggleBaseUrlField() {
  const pType = el.settingProviderType.value;
  if (pType === "openai" || pType === "ollama" || pType === "llamacpp") {
    el.groupBaseUrl.style.display = "block";
    if (pType === "llamacpp" && !el.settingBaseUrl.value) {
      el.settingBaseUrl.value = "http://127.0.0.1:8080/v1";
    } else if (pType === "ollama" && !el.settingBaseUrl.value) {
      el.settingBaseUrl.value = "http://localhost:11434/v1";
    }
  } else {
    el.groupBaseUrl.style.display = "none";
  }
}

function checkEnvKeyDetection() {
  const pType = el.settingProviderType.value;
  const envKeyPresent =
    (pType === "gemini" && state.envKeys.hasGemini) ||
    (pType === "openrouter" && state.envKeys.hasOpenRouter) ||
    (pType === "openai" && state.envKeys.hasOpenAI) ||
    (pType === "anthropic" && state.envKeys.hasAnthropic);

  el.settingEnvDetected.style.display = envKeyPresent ? "block" : "none";
}

el.btnSaveSettings.addEventListener("click", () => {
  state.provider.type = el.settingProviderType.value;
  state.provider.apiKey = el.settingApiKey.value.trim();
  state.provider.baseUrl = el.settingBaseUrl.value.trim();
  state.provider.model = el.settingModelName.value.trim();
  state.provider.temperature = parseFloat(el.settingTemperature.value);

  state.searchConfig = {
    provider: el.settingSearchProvider?.value || "duckduckgo",
    apiKey: el.settingSearchKey?.value.trim() || "",
    mcpCommand: el.settingMcpCommand?.value.trim() || ""
  };

  state.imageConfig = {
    defaultTargetModel: el.settingImgDefaultModel?.value || "flux",
    defaultArtStyle: el.settingImgDefaultArtStyle?.value || "anime",
  };

  localStorage.setItem("chargen_provider_config", JSON.stringify(state.provider));
  localStorage.setItem("chargen_search_config", JSON.stringify(state.searchConfig));
  localStorage.setItem("chargen_image_config", JSON.stringify(state.imageConfig));

  if (el.imgTargetModel) el.imgTargetModel.value = state.imageConfig.defaultTargetModel;
  if (el.imgArtStyle) el.imgArtStyle.value = state.imageConfig.defaultArtStyle;

  updateProviderBadge();
  el.modalSettings.classList.add("hidden");
  alert("Settings saved!");
});

// Load Saved Settings & Check Environment Keys
async function initApp() {
  const saved = localStorage.getItem("chargen_provider_config");
  if (saved) {
    try {
      state.provider = { ...state.provider, ...JSON.parse(saved) };
    } catch {}
  }

  const savedSearch = localStorage.getItem("chargen_search_config");
  if (savedSearch) {
    try {
      state.searchConfig = JSON.parse(savedSearch);
    } catch {}
  }

  const savedImage = localStorage.getItem("chargen_image_config");
  if (savedImage) {
    try {
      state.imageConfig = { ...state.imageConfig, ...JSON.parse(savedImage) };
    } catch {}
  }
  if (el.imgTargetModel && state.imageConfig?.defaultTargetModel) {
    el.imgTargetModel.value = state.imageConfig.defaultTargetModel;
  }
  if (el.imgArtStyle && state.imageConfig?.defaultArtStyle) {
    el.imgArtStyle.value = state.imageConfig.defaultArtStyle;
  }

  // Fetch env keys
  try {
    const res = await fetch("/api/env-keys");
    if (res.ok) {
      state.envKeys = await res.json();
    }
  } catch {}

  await loadPromptProfilesUI();

  // If the user previously selected a prompt profile in browser localStorage, restore and sync it
  const savedPromptProfile = localStorage.getItem("chargen_active_prompt_profile");
  if (savedPromptProfile && currentPromptConfig && currentPromptConfig.id !== savedPromptProfile) {
    try {
      const pRes = await fetch("/api/prompts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: savedPromptProfile })
      });
      if (pRes.ok) {
        await loadPromptProfilesUI();
      }
    } catch (e) {
      console.warn("Failed restoring saved prompt profile:", e);
    }
  }

  await fetchLibrary();
  await fetchHouseholds();
  await refreshImageQueue();
  initComfyUIClient();
  initIpcWebSocket();
  updateProviderBadge();
  updateActiveCardBadge();
  updateLlmCacheBadge();

  document.getElementById("btn-toggle-llm-cache")?.addEventListener("click", async () => {
    try {
      const stats = await apiGet("/api/llm/cache");
      const nextState = !stats.enabled;
      await apiPost("/api/llm/cache/toggle", { enabled: nextState });
      await updateLlmCacheBadge();
      showIpcToast(`LLM Response Cache turned ${nextState ? "ON (instant replay active)" : "OFF"}`, "info");
    } catch (e) {
      alert("Failed toggling LLM cache: " + e.message);
    }
  });

  document.getElementById("btn-toggle-llm-cache")?.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    if (confirm("Clear all cached LLM responses from disk? Next runs will re-fetch from API.")) {
      try {
        const res = await apiPost("/api/llm/cache/clear", {});
        await updateLlmCacheBadge();
        showIpcToast(`Cleared ${res.cleared || 0} cached responses from disk`, "info");
      } catch (err) {
        alert("Failed clearing LLM cache: " + err.message);
      }
    }
  });
  try {
    const savedPinned = localStorage.getItem("chargen_agent_pinned_rules");
    if (savedPinned) state.agentPinnedRules = JSON.parse(savedPinned);
  } catch {}
  renderPinnedRules();
  try {
    const savedChat = localStorage.getItem("chargen_agent_chat_history");
    if (savedChat) state.agentChatHistory = JSON.parse(savedChat);
  } catch {}
  initTargetedDoctorSelection();
  renderAgentChatStream();
  initEraForgeUI();
  renderThemePills();
  syncStateToUI();
  recordSnapshot("Initial State");
  checkAutosaveAvailability();
}

// Prompt Configuration UI & Management
let currentPromptConfig = null;

async function loadPromptProfilesUI() {
  try {
    const res = await fetch("/api/prompts");
    if (!res.ok) return;
    const data = await res.json();
    currentPromptConfig = data.config;

    // Populate profile select in settings modal
    if (el.settingPromptProfile) {
      el.settingPromptProfile.innerHTML = "";
      data.profiles.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        const icon = p.id === "local_maledom_bdsm" ? "⛓️ " : p.id === "local_playable" ? "⚡ " : p.isPrivate ? "🔒 " : "🌐 ";
        opt.textContent = `${icon}${p.name}`;
        if (p.id === data.activeProfile) opt.selected = true;
        el.settingPromptProfile.appendChild(opt);
      });
    }

    // Populate Header Dropdown Selector
    if (el.headerPromptSelect) {
      el.headerPromptSelect.innerHTML = "";
      data.profiles.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        const icon = p.id === "local_maledom_bdsm" ? "⛓️ " : p.id === "local_playable" ? "⚡ " : p.isPrivate ? "🔒 " : "🌐 ";
        opt.textContent = `${icon}${p.name}`;
        if (p.id === data.activeProfile) opt.selected = true;
        el.headerPromptSelect.appendChild(opt);
      });

      const activeObj = data.profiles.find(p => p.id === data.activeProfile);
      const isPriv = activeObj?.isPrivate;
      const isBdsm = activeObj?.id === "local_maledom_bdsm";
      const isLocal = activeObj?.id === "local_playable" || isBdsm;
      el.headerPromptSelect.style.borderColor = isBdsm ? "#ec4899" : isLocal ? "var(--accent-cyan)" : isPriv ? "#10b981" : "var(--accent-purple)";
      el.headerPromptSelect.style.color = isBdsm ? "#f472b6" : isLocal ? "var(--accent-cyan)" : isPriv ? "#34d399" : "var(--accent-purple)";
      el.headerPromptSelect.style.background = isBdsm ? "rgba(236, 72, 153, 0.15)" : isLocal ? "rgba(6, 182, 212, 0.15)" : isPriv ? "rgba(16, 185, 129, 0.15)" : "rgba(168, 85, 247, 0.15)";
    }

    // Update Header Badge (if present)
    if (el.headerPromptBadge) {
      const activeObj = data.profiles.find(p => p.id === data.activeProfile);
      const isPriv = activeObj?.isPrivate;
      const isBdsm = activeObj?.id === "local_maledom_bdsm";
      const isLocal = activeObj?.id === "local_playable" || isBdsm;
      const icon = isBdsm ? "⛓️ " : isLocal ? "⚡ " : isPriv ? "🔒 " : "🧠 ";
      el.headerPromptBadge.textContent = `${icon}${activeObj?.name || "Default"}`;
      el.headerPromptBadge.style.borderColor = isBdsm ? "#ec4899" : isLocal ? "var(--accent-cyan)" : isPriv ? "#10b981" : "var(--accent-purple)";
      el.headerPromptBadge.style.color = isBdsm ? "#f472b6" : isLocal ? "var(--accent-cyan)" : isPriv ? "#34d399" : "var(--accent-purple)";
      el.headerPromptBadge.style.background = isBdsm ? "rgba(236, 72, 153, 0.15)" : isLocal ? "rgba(6, 182, 212, 0.15)" : isPriv ? "rgba(16, 185, 129, 0.15)" : "rgba(168, 85, 247, 0.15)";
    }

    // Update Private Badge in modal
    if (el.badgePromptPrivate) {
      const activeObj = data.profiles.find(p => p.id === data.activeProfile);
      el.badgePromptPrivate.style.display = activeObj?.isPrivate ? "inline-block" : "none";
    }

    // Populate Template Edit Textareas
    if (data.config) {
      if (el.promptEditSystem) el.promptEditSystem.value = data.config.systemPrompt || "";
      if (el.promptEditSpine) el.promptEditSpine.value = data.config.spineSynthesis?.instructions || "";
      if (el.promptEditDesc) el.promptEditDesc.value = data.config.fieldRenderers?.description?.proseGuidance || "";
      if (el.promptEditPers) el.promptEditPers.value = data.config.fieldRenderers?.personality?.guidance || "";
      if (el.promptEditScenario) el.promptEditScenario.value = data.config.fieldRenderers?.scenarioAndFirstMes?.scenarioRule || "";
      if (el.promptEditFirstmes) el.promptEditFirstmes.value = data.config.fieldRenderers?.scenarioAndFirstMes?.firstMesRule || "";
      if (el.promptEditAlichat) el.promptEditAlichat.value = data.config.fieldRenderers?.aliChatAndAlts?.aliChatRule || "";
    }
  } catch (err) {
    console.warn("Failed to load prompt configuration:", err);
  }
}

if (el.headerPromptBadge) {
  el.headerPromptBadge.addEventListener("click", () => {
    openSettingsModal();
  });
}

if (el.headerPromptSelect) {
  el.headerPromptSelect.addEventListener("change", async (e) => {
    const profileId = e.target.value;
    try {
      const res = await fetch("/api/prompts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });
      if (res.ok) {
        localStorage.setItem("chargen_active_prompt_profile", profileId);
        await loadPromptProfilesUI();
        showIpcToast(`Switched active prompt preset to: ${profileId}`, "success");
      }
    } catch (err) {
      alert("Error switching prompt profile: " + err.message);
    }
  });
}

if (el.btnHeaderEditPrompt) {
  el.btnHeaderEditPrompt.addEventListener("click", () => {
    openSettingsModal();
    const profileEl = document.getElementById("setting-prompt-profile");
    if (profileEl) {
      profileEl.scrollIntoView({ behavior: "smooth", block: "center" });
      profileEl.classList.add("pulse-highlight");
      setTimeout(() => profileEl.classList.remove("pulse-highlight"), 2000);
    }
    const details = profileEl?.closest(".form-group")?.nextElementSibling;
    if (details && details.tagName === "DETAILS") {
      details.open = true;
    }
  });
}

if (el.settingPromptProfile) {
  el.settingPromptProfile.addEventListener("change", async (e) => {
    const profileId = e.target.value;
    try {
      const res = await fetch("/api/prompts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });
      if (res.ok) {
        localStorage.setItem("chargen_active_prompt_profile", profileId);
        await loadPromptProfilesUI();
      }
    } catch (err) {
      alert("Error switching prompt profile: " + err.message);
    }
  });
}

if (el.btnSaveCustomPrompts) {
  el.btnSaveCustomPrompts.addEventListener("click", async () => {
    const customConfig = {
      name: "Custom Overrides",
      systemPrompt: el.promptEditSystem?.value || "",
      spineSynthesis: {
        systemDirective: currentPromptConfig?.spineSynthesis?.systemDirective || "You are an elite psychometric character architect.",
        instructions: el.promptEditSpine?.value || "",
        schemaInstructions: currentPromptConfig?.spineSynthesis?.schemaInstructions || ""
      },
      fieldRenderers: {
        description: {
          proseGuidance: el.promptEditDesc?.value || "",
          taggedBundleGuidance: currentPromptConfig?.fieldRenderers?.description?.taggedBundleGuidance || ""
        },
        personality: {
          guidance: el.promptEditPers?.value || ""
        },
        scenarioAndFirstMes: {
          guidance: "Write the present scenario and opening first message.",
          scenarioRule: el.promptEditScenario?.value || "",
          firstMesRule: el.promptEditFirstmes?.value || ""
        },
        aliChatAndAlts: {
          guidance: "Write example messages (<START>) and alternate greetings.",
          aliChatRule: el.promptEditAlichat?.value || "",
          altGreetingsRule: currentPromptConfig?.fieldRenderers?.aliChatAndAlts?.altGreetingsRule || ""
        }
      }
    };

    try {
      const res = await fetch("/api/prompts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: customConfig })
      });
      if (res.ok) {
        await loadPromptProfilesUI();
        alert("✓ Custom prompt template saved into private configuration (git-ignored)!");
      }
    } catch (err) {
      alert("Error saving custom prompt: " + err.message);
    }
  });
}

if (el.btnResetPrompts) {
  el.btnResetPrompts.addEventListener("click", async () => {
    if (!confirm("Reset prompts to default open profile?")) return;
    try {
      const res = await fetch("/api/prompts/reset", { method: "POST" });
      if (res.ok) {
        await loadPromptProfilesUI();
        alert("✓ Prompt profile reset to default!");
      }
    } catch (err) {
      alert("Error resetting prompt: " + err.message);
    }
  });
}

// ==========================================
// Card Library & Multi-Deck Management
// ==========================================

function updateActiveCardBadge() {
  if (state.activeCardId) {
    const card = state.savedCards.find((c) => c.id === state.activeCardId);
    const cardName = card ? card.name : (state.character.name || state.activeCardId);
    if (el.activeCardPill) {
      el.activeCardPill.style.display = "flex";
      if (el.activeCardNameLabel) el.activeCardNameLabel.textContent = cardName;
    }
    if (el.btnSaveToLibrary) {
      el.btnSaveToLibrary.innerHTML = `💾 Update Card`;
      el.btnSaveToLibrary.title = `Update "${cardName}" in your Card Library`;
    }
    if (el.btnSaveAsNewCard) {
      el.btnSaveAsNewCard.style.display = "inline-block";
    }
  } else {
    if (el.activeCardPill) {
      el.activeCardPill.style.display = "none";
    }
    if (el.btnSaveToLibrary) {
      el.btnSaveToLibrary.innerHTML = `💾 Save Card`;
      el.btnSaveToLibrary.title = `Save this character into your local library`;
    }
    if (el.btnSaveAsNewCard) {
      el.btnSaveAsNewCard.style.display = "none";
    }
  }
}

function unlinkActiveCard() {
  state.activeCardId = null;
  updateActiveCardBadge();
  renderLibraryGrid();
}

async function fetchLibrary() {
  try {
    const res = await apiGet("/api/cards");
    state.savedCards = res.cards || [];
    if (el.libraryCountBadge) {
      el.libraryCountBadge.textContent = state.savedCards.length;
    }
    updateActiveCardBadge();
    renderLibraryGrid();
  } catch (err) {
    console.warn("Failed fetching library:", err);
  }
}

function renderLibraryGrid() {
  if (!el.libraryCardsContainer) return;
  const filter = (el.librarySearchInput?.value || "").toLowerCase().trim();
  const filtered = state.savedCards.filter((card) => {
    if (!filter) return true;
    const nameMatch = (card.name || "").toLowerCase().includes(filter);
    const tagMatch = (card.tags || []).some((t) => t.toLowerCase().includes(filter));
    return nameMatch || tagMatch;
  });

  if (filtered.length === 0) {
    el.libraryCardsContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">
        ${state.savedCards.length === 0 ? "No saved character cards in your deck yet. Click 'Save Active Card' to store your first card!" : "No cards match your filter query."}
      </div>
    `;
    return;
  }

  el.libraryCardsContainer.innerHTML = filtered.map((c) => {
    const isBs = c.score === 0;
    const scoreColor = isBs ? "#ef4444" : c.score >= 80 ? "#10b981" : "#f59e0b";
    const scoreText = isBs ? "BS / 100" : `${c.score} / 100`;
    const avatarHtml = c.avatarBase64
      ? `<img src="${c.avatarBase64}" alt="${escapeHtml(c.name)}">`
      : `<span style="font-size: 20px; color: var(--text-dim);">👤</span>`;
    const tagsText = (c.tags || []).join(", ") || "No tags";
    const isActive = state.activeCardId === c.id;

    return `
      <div class="deck-card" data-id="${c.id}" style="${isActive ? 'border-color: var(--accent-cyan); box-shadow: 0 0 10px rgba(6, 182, 212, 0.25);' : ''}">
        <div class="deck-card-top">
          <div class="deck-card-avatar">
            ${avatarHtml}
          </div>
          <div class="deck-card-info">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
              <div class="deck-card-title" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
              ${isActive ? `<span style="background: rgba(6, 182, 212, 0.2); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">ACTIVE</span>` : ''}
            </div>
            <div class="deck-card-meta">
              <span style="color: ${scoreColor}; font-weight: 700;">${scoreText}</span>
              <span>•</span>
              <span>${c.tokenCount} tokens</span>
            </div>
            <div class="deck-card-tags" title="${escapeHtml(tagsText)}">${escapeHtml(tagsText)}</div>
          </div>
        </div>
        <div class="deck-card-actions">
          <button class="btn btn-sm ${isActive ? 'btn-success' : 'btn-primary'} btn-load-card" data-id="${c.id}" style="flex: 1;" type="button">
            ${isActive ? '✓ Active (Reload)' : '📂 Load'}
          </button>
          <button class="btn btn-sm btn-dup-card" data-id="${c.id}" title="Duplicate as variant" type="button">
            📋 Dup
          </button>
          <button class="btn btn-sm btn-danger btn-del-card" data-id="${c.id}" title="Delete card" type="button">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function loadCardIntoWorkspace(id) {
  try {
    const record = await apiGet(`/api/cards/${id}`);
    if (!record || !record.character) throw new Error("Invalid card record");

    state.character = record.character;
    state.activeCardId = record.id;
    if (record.avatarBase64) {
      state.character.avatar = record.avatarBase64;
    }
    syncStateToUI();
    updateActiveCardBadge();
    notifyIpcActiveCard(state.character);
    recordSnapshot(`Loaded: ${record.character.name}`);
    el.modalCardLibrary?.classList.add("hidden");
  } catch (err) {
    alert("Failed loading card: " + err.message);
  }
}

async function saveActiveCardToLibrary(forceNew = false) {
  syncUIToState();
  if (!state.character.name?.trim()) {
    alert("Please give the character a name before saving!");
    return;
  }
  try {
    const targetId = forceNew ? undefined : (state.activeCardId || undefined);
    const meta = await apiPost("/api/cards", {
      character: state.character,
      avatarBase64: state.character.avatar,
      id: targetId,
    });
    state.activeCardId = meta.id;
    // Update local card list directly without re-reading the entire card deck from disk
    const existingIdx = state.savedCards.findIndex((c) => c.id === meta.id);
    if (existingIdx !== -1) {
      state.savedCards[existingIdx] = meta;
    } else {
      state.savedCards.unshift(meta);
    }
    if (el.libraryCountBadge) {
      el.libraryCountBadge.textContent = state.savedCards.length;
    }
    renderLibraryGrid();
    updateActiveCardBadge();
    notifyIpcActiveCard(state.character);
    recordSnapshot(`${forceNew ? "Saved as New" : "Saved to Library"}: ${meta.name}`);
    alert(`💾 Successfully ${forceNew ? "saved new card" : "updated"} "${meta.name}" in your Card Library!`);
  } catch (err) {
    alert("Failed saving card: " + err.message);
  }
}

async function duplicateCardInLibrary(id) {
  try {
    await apiPost(`/api/cards/${id}/duplicate`, { suffix: "(Variant / AU)" });
    await fetchLibrary();
  await fetchHouseholds();
  } catch (err) {
    alert("Failed duplicating card: " + err.message);
  }
}

async function deleteCardInLibrary(id) {
  if (!confirm("Are you sure you want to delete this saved card?")) return;
  try {
    await apiDelete(`/api/cards/${id}`);
    if (state.activeCardId === id) {
      state.activeCardId = null;
      updateActiveCardBadge();
    }
    await fetchLibrary();
  await fetchHouseholds();
  } catch (err) {
    alert("Failed deleting card: " + err.message);
  }
}

function createNewBlankCard() {
  if (!confirm("Start a new blank character card? Make sure your current card is saved to library!")) return;
  state.character = {
    id: "char_" + Math.random().toString(36).substring(2, 10),
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
    character_book: { name: "", entries: [] },
  };
  state.activeCardId = null;
  updateActiveCardBadge();
  syncStateToUI();
  recordSnapshot("New Blank Card");
  el.modalCardLibrary?.classList.add("hidden");
}

// Library Event Listeners
el.btnOpenLibrary?.addEventListener("click", () => {
  el.modalCardLibrary?.classList.remove("hidden");
  fetchLibrary();
});
el.btnCloseLibrary?.addEventListener("click", () => el.modalCardLibrary?.classList.add("hidden"));
el.btnCloseLibraryFooter?.addEventListener("click", () => el.modalCardLibrary?.classList.add("hidden"));
el.librarySearchInput?.addEventListener("input", renderLibraryGrid);
el.btnLibSaveCurrent?.addEventListener("click", () => saveActiveCardToLibrary(false));
el.btnSaveToLibrary?.addEventListener("click", () => saveActiveCardToLibrary(false));
el.btnSaveAsNewCard?.addEventListener("click", () => saveActiveCardToLibrary(true));
el.btnUnlinkCard?.addEventListener("click", unlinkActiveCard);
el.btnLibNewBlank?.addEventListener("click", createNewBlankCard);
el.btnNewCard?.addEventListener("click", createNewBlankCard);

el.libraryCardsContainer?.addEventListener("click", (e) => {
  const loadBtn = e.target.closest(".btn-load-card");
  if (loadBtn) {
    loadCardIntoWorkspace(loadBtn.dataset.id);
    return;
  }
  const dupBtn = e.target.closest(".btn-dup-card");
  if (dupBtn) {
    duplicateCardInLibrary(dupBtn.dataset.id);
    return;
  }
  const delBtn = e.target.closest(".btn-del-card");
  if (delBtn) {
    deleteCardInLibrary(delBtn.dataset.id);
    return;
  }
});

// ==========================================
// Custom Household & Court Binder Engine
// ==========================================

let activeHousehold = null;
let savedHouseholdsList = [];

async function fetchHouseholds() {
  try {
    const res = await apiGet("/api/households");
    savedHouseholdsList = res.households || [];
    if (el.householdsCountBadge) {
      el.householdsCountBadge.textContent = savedHouseholdsList.length;
    }
    renderHouseholdList();
  } catch (err) {
    console.warn("Failed fetching households:", err);
  }
}

function renderHouseholdList() {
  if (!el.householdListContainer) return;
  if (!savedHouseholdsList.length) {
    el.householdListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 24px 8px; font-size: 11px;">
        No binders created yet.<br>Click "➕ New Binder" above!
      </div>
    `;
    return;
  }

  el.householdListContainer.innerHTML = savedHouseholdsList.map(h => {
    const isSelected = activeHousehold && activeHousehold.id === h.id;
    return `
      <div class="hh-sidebar-item ${isSelected ? 'active' : ''}" data-id="${escapeHtml(h.id)}"
           style="padding: 8px 10px; border-radius: 6px; cursor: pointer; border: 1px solid ${isSelected ? '#ec4899' : 'var(--border-color)'}; background: ${isSelected ? 'rgba(236,72,153,0.12)' : 'var(--bg-primary)'}; transition: all 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 11px; color: ${isSelected ? '#f472b6' : 'var(--text-main)'};">${escapeHtml(h.name)}</strong>
          <span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; background: rgba(236,72,153,0.2); color: #f472b6;">${h.memberCount} members</span>
        </div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
          🏷️ ${escapeHtml(h.category_label || 'Household')}
        </div>
      </div>
    `;
  }).join("");

  el.householdListContainer.querySelectorAll(".hh-sidebar-item").forEach(item => {
    item.addEventListener("click", () => selectHousehold(item.dataset.id));
  });
}

async function selectHousehold(id) {
  try {
    const res = await apiGet(`/api/households/${id}`);
    if (res.household) {
      activeHousehold = res.household;
      renderHouseholdDetails();
      renderHouseholdList();
    }
  } catch (err) {
    alert("Failed loading household: " + err.message);
  }
}

function renderHouseholdDetails() {
  if (!activeHousehold) {
    el.householdEmptyState?.classList.remove("hidden");
    el.householdEditorView?.classList.add("hidden");
    return;
  }
  el.householdEmptyState?.classList.add("hidden");
  el.householdEditorView?.classList.remove("hidden");

  // Populate inputs
  if (el.hhInputName) el.hhInputName.value = activeHousehold.name || "";
  if (el.hhInputCategory) el.hhInputCategory.value = activeHousehold.category_label || "";
  if (el.hhInputUserTitle) el.hhInputUserTitle.value = activeHousehold.user_title || "";
  if (el.hhInputLore) el.hhInputLore.value = activeHousehold.shared_lore || "";
  if (el.hhInputRules) el.hhInputRules.value = (activeHousehold.rules_and_etiquette || []).join("\n");
  if (el.hhRosterCount) el.hhRosterCount.textContent = `(${activeHousehold.members?.length || 0} members)`;

  // Populate Add Member select from library cards
  if (el.hhAddCardSelect) {
    el.hhAddCardSelect.innerHTML = `<option value="">-- Add Character from Library --</option>` +
      state.savedCards.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  }

  // Render members roster
  renderMembersTable();
}

function renderMembersTable() {
  if (!el.hhMembersTableContainer || !activeHousehold) return;
  const members = activeHousehold.members || [];
  if (members.length === 0) {
    el.hhMembersTableContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 16px; font-size: 11px;">
        No characters assigned to this household yet. Select a character from your library above!
      </div>
    `;
    return;
  }

  el.hhMembersTableContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${members.map((m, idx) => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 14px;">👤</span>
              <strong style="font-size: 11px; color: var(--accent-cyan);">${escapeHtml(m.card_name)}</strong>
              <span style="font-size: 9px; color: var(--text-muted);">(ID: ${escapeHtml(m.card_id)})</span>
            </div>
            <button class="btn btn-xs btn-remove-member" data-index="${idx}" style="color: #f87171; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.1);">✕ Remove</button>
          </div>
          <div style="display: flex; gap: 6px;">
            <div style="flex: 1.5;">
              <label style="font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 2px;">Standing / Hierarchy</label>
              <input type="text" class="form-input member-standing" data-index="${idx}" value="${escapeHtml(m.standing || '')}" placeholder="e.g. Senior Wife, Defiant Ward, Master Alchemist" style="font-size: 10px; padding: 2px 6px;">
            </div>
            <div style="flex: 2;">
              <label style="font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 2px;">Role & Status</label>
              <input type="text" class="form-input member-role" data-index="${idx}" value="${escapeHtml(m.household_role || '')}" placeholder="e.g. Household Logistics, Guard, Companion" style="font-size: 10px; padding: 2px 6px;">
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <div style="flex: 1;">
              <label style="font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 2px;">Attitude to {{user}}</label>
              <input type="text" class="form-input member-att-user" data-index="${idx}" value="${escapeHtml(m.attitude_to_user || '')}" placeholder="e.g. Tsundere pride melting over his knee, fiercely obedient" style="font-size: 10px; padding: 2px 6px;">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 2px;">Attitude to Co-Members</label>
              <input type="text" class="form-input member-att-peers" data-index="${idx}" value="${escapeHtml(m.attitude_to_peers || '')}" placeholder="e.g. Competitive with younger consorts, protective" style="font-size: 10px; padding: 2px 6px;">
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  // Attach input listeners to update activeHousehold memory
  el.hhMembersTableContainer.querySelectorAll(".member-standing").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (activeHousehold.members[idx]) activeHousehold.members[idx].standing = e.target.value;
    });
  });
  el.hhMembersTableContainer.querySelectorAll(".member-role").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (activeHousehold.members[idx]) activeHousehold.members[idx].household_role = e.target.value;
    });
  });
  el.hhMembersTableContainer.querySelectorAll(".member-att-user").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (activeHousehold.members[idx]) activeHousehold.members[idx].attitude_to_user = e.target.value;
    });
  });
  el.hhMembersTableContainer.querySelectorAll(".member-att-peers").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (activeHousehold.members[idx]) activeHousehold.members[idx].attitude_to_peers = e.target.value;
    });
  });
  el.hhMembersTableContainer.querySelectorAll(".btn-remove-member").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      activeHousehold.members.splice(idx, 1);
      renderMembersTable();
      if (el.hhRosterCount) el.hhRosterCount.textContent = `(${activeHousehold.members.length} members)`;
    });
  });
}

// Household Event Listeners
el.btnOpenHouseholds?.addEventListener("click", () => {
  el.modalHouseholds?.classList.remove("hidden");
  fetchHouseholds();
  fetchLibrary();
});
el.btnCloseHouseholds?.addEventListener("click", () => el.modalHouseholds?.classList.add("hidden"));
el.btnCloseHouseholdsFooter?.addEventListener("click", () => el.modalHouseholds?.classList.add("hidden"));

el.btnCreateHousehold?.addEventListener("click", () => {
  const name = prompt("Enter a name for the new Household / Court Binder:", "Solar Sovereign Household");
  if (!name || !name.trim()) return;
  activeHousehold = {
    id: "",
    name: name.trim(),
    category_label: "Imperial Court / Household",
    user_title: "Master / Sovereign",
    description: "",
    shared_lore: "",
    rules_and_etiquette: [],
    members: [],
  };
  renderHouseholdDetails();
  saveCurrentHouseholdMeta();
});

async function saveCurrentHouseholdMeta() {
  if (!activeHousehold) return;
  activeHousehold.name = el.hhInputName?.value?.trim() || activeHousehold.name || "Untitled Household";
  activeHousehold.category_label = el.hhInputCategory?.value?.trim() || "Household / Court";
  activeHousehold.user_title = el.hhInputUserTitle?.value?.trim() || "{{user}}";
  activeHousehold.shared_lore = el.hhInputLore?.value?.trim() || "";
  activeHousehold.rules_and_etiquette = (el.hhInputRules?.value || "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  try {
    const res = await apiPost("/api/households", activeHousehold);
    if (res.household) {
      activeHousehold = res.household;
      await fetchHouseholds();
      renderHouseholdDetails();
      showIpcToast(`Saved household "${activeHousehold.name}"`, "success");
    }
  } catch (err) {
    alert("Failed saving household: " + err.message);
  }
}

el.btnSaveHouseholdMeta?.addEventListener("click", saveCurrentHouseholdMeta);

el.btnDeleteHousehold?.addEventListener("click", async () => {
  if (!activeHousehold || !activeHousehold.id) return;
  if (!confirm(`Delete binder "${activeHousehold.name}"? (Individual character cards will NOT be deleted).`)) return;
  try {
    await apiDelete(`/api/households/${activeHousehold.id}`);
    activeHousehold = null;
    await fetchHouseholds();
    renderHouseholdDetails();
    showIpcToast("Household binder deleted", "info");
  } catch (err) {
    alert("Failed deleting household: " + err.message);
  }
});

el.btnHhAddMember?.addEventListener("click", () => {
  if (!activeHousehold) return;
  const cardId = el.hhAddCardSelect?.value;
  if (!cardId) {
    alert("Please select a character card from the dropdown!");
    return;
  }
  const card = state.savedCards.find(c => c.id === cardId);
  if (!card) return;

  if (activeHousehold.members.some(m => m.card_id === cardId)) {
    alert(`${card.name} is already in this household!`);
    return;
  }

  activeHousehold.members.push({
    card_id: card.id,
    card_name: card.name,
    household_role: "Companion",
    standing: "Standard Member",
    attitude_to_user: "Devoted and responsive to {{user}}'s presence",
    attitude_to_peers: "Courteous dynamic with co-members"
  });

  renderMembersTable();
  if (el.hhRosterCount) el.hhRosterCount.textContent = `(${activeHousehold.members.length} members)`;
  el.hhAddCardSelect.value = "";
  saveCurrentHouseholdMeta();
});

// Group Encounter Generator
el.btnHhGenEncounter?.addEventListener("click", async () => {
  if (!activeHousehold || !activeHousehold.members?.length) {
    alert("Please add at least 1-2 character companions to this household first!");
    return;
  }
  const btn = el.btnHhGenEncounter;
  btn.disabled = true;
  btn.textContent = "⏳ Synthesizing Scene...";

  try {
    const goal = el.hhEncounterGoal?.value?.trim() || "";
    const saveAlt = Boolean(el.hhEncounterSaveAlt?.checked);

    const res = await apiPost(`/api/households/${activeHousehold.id}/encounter`, {
      householdId: activeHousehold.id,
      scenarioGoal: goal,
      saveToAlternateGreetings: saveAlt,
      provider: state.provider
    });

    if (res.encounter) {
      el.hhEncounterOutputBox?.classList.remove("hidden");
      if (el.hhEncounterTitle) el.hhEncounterTitle.textContent = `✨ ${res.encounter.title}`;
      if (el.hhEncounterScenario) el.hhEncounterScenario.textContent = res.encounter.scenario;
      if (el.hhEncounterText) el.hhEncounterText.textContent = res.encounter.first_mes;

      if (saveAlt && res.encounter.savedToCards?.length) {
        showIpcToast(`Group encounter attached to ${res.encounter.savedToCards.length} companion cards as alternate greetings!`, "success");
        await fetchLibrary();
  await fetchHouseholds();
      }
    }
  } catch (err) {
    alert("Failed generating group encounter: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ Synthesize Group Scene";
  }
});

el.btnHhCopyEncounter?.addEventListener("click", () => {
  const text = el.hhEncounterText?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text);
  el.btnHhCopyEncounter.textContent = "✓ Copied!";
  setTimeout(() => el.btnHhCopyEncounter.textContent = "📋 Copy Text", 1500);
});


// ==========================================
// Revision History & Visual Diff Engine
// ==========================================

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function computeWordDiff(strOld, strNew) {
  if (!strOld && !strNew) return "";
  if (!strOld) return `<span class="diff-ins">${escapeHtml(strNew)}</span>`;
  if (!strNew) return `<span class="diff-del">${escapeHtml(strOld)}</span>`;

  const words1 = strOld.split(/(\s+|[.,!?;:"'()\[\]{}]+)/).filter(Boolean);
  const words2 = strNew.split(/(\s+|[.,!?;:"'()\[\]{}]+)/).filter(Boolean);

  const m = words1.length;
  const n = words2.length;

  if (m * n > 400000) {
    return fastLineDiff(strOld, strNew);
  }

  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m, j = n;
  const result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      result.push({ type: "eq", text: words1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "ins", text: words2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.push({ type: "del", text: words1[i - 1] });
      i--;
    }
  }

  result.reverse();

  let html = "";
  for (const part of result) {
    if (part.type === "eq") {
      html += escapeHtml(part.text);
    } else if (part.type === "ins") {
      html += `<span class="diff-ins">${escapeHtml(part.text)}</span>`;
    } else if (part.type === "del") {
      html += `<span class="diff-del">${escapeHtml(part.text)}</span>`;
    }
  }
  return html;
}

function fastLineDiff(strOld, strNew) {
  const linesOld = strOld.split("\n");
  const linesNew = strNew.split("\n");
  let html = "";
  let i = 0, j = 0;
  while (i < linesOld.length || j < linesNew.length) {
    if (i < linesOld.length && j < linesNew.length && linesOld[i] === linesNew[j]) {
      html += escapeHtml(linesOld[i]) + "\n";
      i++; j++;
    } else if (j < linesNew.length && (!linesOld.includes(linesNew[j]) || i >= linesOld.length)) {
      html += `<span class="diff-ins">${escapeHtml(linesNew[j])}</span>\n`;
      j++;
    } else if (i < linesOld.length) {
      html += `<span class="diff-del">${escapeHtml(linesOld[i])}</span>\n`;
      i++;
    } else {
      break;
    }
  }
  return html;
}

function recordSnapshot(label = "Card Update") {
  syncUIToState();
  const tokens = parseInt(el.tokenTotalNum?.textContent || "0", 10) || 0;
  const score = parseInt(el.cardScoreNum?.textContent || "0", 10) || 0;

  const snapshot = {
    id: "snap_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    label,
    timestamp: Date.now(),
    character: JSON.parse(JSON.stringify(state.character)),
    tokenCount: tokens,
    score: score,
  };

  state.history.unshift(snapshot);
  if (state.history.length > 25) {
    state.history.pop();
  }
  if (el.historyCountBadge) {
    el.historyCountBadge.textContent = state.history.length;
  }
}

function renderHistoryDiffModal() {
  if (!el.diffSnapshotList) return;

  if (state.history.length === 0) {
    recordSnapshot("Current Workspace");
  }

  el.diffSnapshotList.innerHTML = state.history.map((snap, idx) => {
    const isSelected = idx === state.selectedDiffIndex;
    const timeStr = new Date(snap.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `
      <div class="diff-snapshot-item ${isSelected ? "active" : ""}" data-index="${idx}">
        <div class="diff-snapshot-title">${escapeHtml(snap.label)}</div>
        <div class="diff-snapshot-meta">
          <span>${timeStr}</span> • <span>${snap.tokenCount} tokens</span>
        </div>
      </div>
    `;
  }).join("");

  updateDiffView();
}

function formatDiffFieldValue(val, field) {
  if (field === "alternate_greetings") {
    if (!Array.isArray(val)) {
      if (typeof val === "string" && val.trim()) val = [val.trim()];
      else return "(no alternate greetings)";
    }
    if (val.length === 0) return "(no alternate greetings)";
    return val
      .map((g, idx) => `=== Greeting #${idx + 1} ===\n${(g || "").trim()}`)
      .join("\n\n");
  }
  if (Array.isArray(val)) {
    return val.join("\n");
  }
  return (val || "").toString().trim();
}

function updateDiffView() {
  if (!el.diffViewContent) return;
  const snap = state.history[state.selectedDiffIndex];
  if (!snap) {
    el.diffViewContent.innerHTML = "No snapshot selected.";
    return;
  }

  syncUIToState();
  const currentVal = formatDiffFieldValue(state.character[state.selectedDiffField], state.selectedDiffField);
  const snapVal = formatDiffFieldValue(snap.character?.[state.selectedDiffField], state.selectedDiffField);

  const currentTokens = parseInt(el.tokenTotalNum?.textContent || "0", 10) || 0;
  const tokenDelta = currentTokens - snap.tokenCount;
  const deltaStr = tokenDelta >= 0 ? `+${tokenDelta}` : `${tokenDelta}`;

  if (el.diffCompareTitle) {
    el.diffCompareTitle.textContent = `Comparing "${snap.label}" → Active Workspace`;
  }
  if (el.diffDeltaBadge) {
    el.diffDeltaBadge.textContent = `(${deltaStr} tokens | Snapshot: ${snap.score} / 100)`;
  }

  if (snapVal === currentVal) {
    el.diffViewContent.innerHTML = `<span style="color: var(--text-dim);">(No differences in ${state.selectedDiffField})</span>\n\n${escapeHtml(currentVal)}`;
  } else {
    const diffHtml = computeWordDiff(snapVal, currentVal);
    el.diffViewContent.innerHTML = diffHtml;
  }
}

function restoreSelectedSnapshot() {
  const snap = state.history[state.selectedDiffIndex];
  if (!snap) return;
  if (!confirm(`Restore character card to revision "${snap.label}"?`)) return;

  state.character = JSON.parse(JSON.stringify(snap.character));
  syncStateToUI();
  recordSnapshot(`Restored: ${snap.label}`);
  el.modalHistoryDiff?.classList.add("hidden");
  alert(`⏪ Successfully restored revision "${snap.label}"!`);
}

// History & Diff Event Listeners
el.btnOpenHistory?.addEventListener("click", () => {
  el.modalHistoryDiff?.classList.remove("hidden");
  renderHistoryDiffModal();
});
el.btnCloseHistory?.addEventListener("click", () => el.modalHistoryDiff?.classList.add("hidden"));
el.btnCloseHistoryFooter?.addEventListener("click", () => el.modalHistoryDiff?.classList.add("hidden"));
el.btnDiffRestore?.addEventListener("click", restoreSelectedSnapshot);

el.diffSnapshotList?.addEventListener("click", (e) => {
  const item = e.target.closest(".diff-snapshot-item");
  if (!item) return;
  state.selectedDiffIndex = parseInt(item.dataset.index, 10);
  document.querySelectorAll(".diff-snapshot-item").forEach((node) => node.classList.remove("active"));
  item.classList.add("active");
  updateDiffView();
});

document.querySelectorAll(".diff-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.selectedDiffField = tab.dataset.field;
    document.querySelectorAll(".diff-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    updateDiffView();
  });
});


// ==========================================
// Scenario Matrix & Branching Starters
// ==========================================

async function runScenarioMatrix() {
  if (!assertProviderConfigured()) return;
  syncUIToState();
  if (!state.character.name && !state.character.description) {
    alert("Please spark or define a character first before generating scenario branches!");
    return;
  }

  el.modalScenarioMatrix?.classList.remove("hidden");
  if (el.matrixLoading) el.matrixLoading.classList.remove("hidden");
  if (el.matrixPackagesContainer) el.matrixPackagesContainer.innerHTML = "";

  try {
    const customSteering = [
      getGlobalSteering(),
      el.matrixCustomSteering?.value?.trim()
    ].filter(Boolean).join(". ");
    const searchOptions = getEnhanceSearchOptions();

    const res = await apiPost("/api/scenario-matrix", {
      character: state.character,
      provider: state.provider,
      customSteering,
      searchOptions,
    });

    state.scenarioMatrix = res;
    renderScenarioMatrixUI(res.packages || []);
  } catch (err) {
    alert("Scenario Matrix generation failed: " + err.message);
  } finally {
    if (el.matrixLoading) el.matrixLoading.classList.add("hidden");
  }
}

function renderScenarioMatrixUI(packages) {
  if (!el.matrixPackagesContainer) return;
  if (!packages || packages.length === 0) {
    el.matrixPackagesContainer.innerHTML = "<div style='grid-column: 1/-1; text-align: center; color: var(--text-dim);'>No packages generated.</div>";
    return;
  }

  const icons = {
    canon: "🏛️",
    crisis: "🚨",
    intimacy: "🌙",
    interrogation: "🔒",
  };

  el.matrixPackagesContainer.innerHTML = packages.map((pkg, idx) => {
    const icon = icons[pkg.id] || "🎭";
    const altsCount = (pkg.alternate_greetings || []).length;
    return `
      <div class="scenario-pkg-card" data-index="${idx}">
        <div class="scenario-pkg-header">
          <div class="scenario-pkg-title">${icon} ${escapeHtml(pkg.title)}</div>
          <span class="scenario-pkg-vibe">${escapeHtml(pkg.vibe)}</span>
        </div>
        <div style="font-size: 11px; font-weight: 600; color: var(--text-dim); margin-top: 4px;">Opening Message Preview:</div>
        <div class="scenario-pkg-body">
          ${escapeHtml(pkg.first_mes).replace(/\\n/g, "<br>")}
        </div>
        <div style="font-size: 10px; color: var(--text-dim); display: flex; justify-content: space-between;">
          <span>Includes scenario + ${altsCount} alternate greetings</span>
        </div>
        <button class="btn btn-sm btn-primary btn-apply-scenario" data-index="${idx}" style="margin-top: 6px; width: 100%; justify-content: center;" type="button">
          ✨ Apply This Scenario to Card
        </button>
      </div>
    `;
  }).join("");
}

function applyScenarioPackage(index) {
  const pkg = state.scenarioMatrix?.packages?.[index];
  if (!pkg) return;

  state.character.scenario = pkg.scenario;
  state.character.first_mes = pkg.first_mes;
  if (Array.isArray(pkg.alternate_greetings) && pkg.alternate_greetings.length > 0) {
    state.character.alternate_greetings = pkg.alternate_greetings;
  }

  syncStateToUI();
  recordSnapshot(`Applied Branch: ${pkg.title}`);
  el.modalScenarioMatrix?.classList.add("hidden");
  alert(`✨ Applied "${pkg.title}"! Scenario, First Message, and Alternate Greetings updated.`);
}

// Scenario Matrix Listeners
el.btnGenerateMatrix?.addEventListener("click", runScenarioMatrix);
el.btnCloseMatrix?.addEventListener("click", () => el.modalScenarioMatrix?.classList.add("hidden"));
el.btnCloseMatrixFooter?.addEventListener("click", () => el.modalScenarioMatrix?.classList.add("hidden"));

el.matrixPackagesContainer?.addEventListener("click", (e) => {
  const applyBtn = e.target.closest(".btn-apply-scenario");
  if (!applyBtn) return;
  const idx = parseInt(applyBtn.dataset.index, 10);
  applyScenarioPackage(idx);
});

// -------------------------------------------------------------
// Image Prompt Generator & Offline Queue Engine
// -------------------------------------------------------------

function switchImgModalTab(tabId) {
  el.tabBtnImgGen?.classList.toggle("active", tabId === "img-tab-gen");
  el.tabBtnImgQueue?.classList.toggle("active", tabId === "img-tab-queue");
  el.tabBtnImgComfy?.classList.toggle("active", tabId === "img-tab-comfy");

  if (el.imgTabGen) el.imgTabGen.style.display = tabId === "img-tab-gen" ? "block" : "none";
  if (el.imgTabQueue) el.imgTabQueue.style.display = tabId === "img-tab-queue" ? "block" : "none";
  if (el.imgTabComfy) el.imgTabComfy.style.display = tabId === "img-tab-comfy" ? "block" : "none";

  if (tabId === "img-tab-queue") {
    refreshImageQueue();
  }
}

function openImagePromptsModal(defaultTab = "img-tab-gen") {
  if (el.imgTargetCharName) {
    el.imgTargetCharName.textContent = state.character.name ? `"${state.character.name}"` : "(Unnamed Character)";
  }
  el.modalImagePrompts?.classList.remove("hidden");
  switchImgModalTab(defaultTab);
}

function closeImagePromptsModal() {
  el.modalImagePrompts?.classList.add("hidden");
  // Defensive restore: Ensure active workspace tab is visible
  const activeTab = document.querySelector(".nav-tabs > .nav-tab[data-tab].active") || document.querySelector(".nav-tabs > .nav-tab[data-tab]");
  if (activeTab && activeTab.dataset.tab) {
    activeTab.classList.add("active");
    const targetEl = document.getElementById(activeTab.dataset.tab);
    if (targetEl) targetEl.classList.remove("hidden");
  }
}

async function refreshImageQueue() {
  try {
    const res = await fetch("/api/image-prompts/queue");
    if (!res.ok) return;
    const data = await res.json();
    state.imageQueue = Array.isArray(data.queue) ? data.queue : [];
    updateImageQueueBadges();
    renderImageQueue();
  } catch (err) {
    console.warn("Failed to refresh image queue:", err);
  }
}

function updateImageQueueBadges() {
  const count = state.imageQueue.length;
  if (el.imageQueueCountBadge) el.imageQueueCountBadge.textContent = count.toString();
  if (el.imgQueueTabCount) el.imgQueueTabCount.textContent = count.toString();
}

let pendingVisualIdentityCallback = null;

function hasVisualIdentity(char) {
  if (!char) return false;
  const vi = char.extensions?.visual_identity || char.data?.extensions?.visual_identity;
  if (!vi) return false;
  if (Array.isArray(vi.tags) && vi.tags.length > 0) return true;
  if (typeof vi.tags === "string" && vi.tags.trim()) return true;
  if (vi.hair?.trim() || vi.features?.trim() || vi.clothing?.trim() || vi.age?.trim()) return true;
  return false;
}

function syncVisualFieldsToTags() {
  const parts = [
    el.viGender?.value.trim(),
    el.viAge?.value.trim() ? el.viAge.value.split(",")[0].trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_") : "",
    el.viHair?.value.trim(),
    el.viEyes?.value.trim(),
    el.viFeatures?.value.trim(),
    el.viBuild?.value.trim(),
    el.viClothing?.value.trim(),
  ].filter(Boolean);

  const tags = parts.flatMap((p) =>
    p.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
  ).filter(Boolean);

  const uniqueTags = Array.from(new Set(tags));
  if (el.viTags) {
    el.viTags.value = uniqueTags.join(", ");
  }
}

async function fetchAndPopulateVisualIdentity(forceReextract = false) {
  syncUIToState();
  const char = state.character;
  const existingVI = !forceReextract ? (char.extensions?.visual_identity || char.data?.extensions?.visual_identity) : null;

  if (el.viCharName) {
    el.viCharName.textContent = char.name || "Unnamed Character";
  }

  if (existingVI && !forceReextract) {
    if (el.viGender) el.viGender.value = existingVI.gender || "1girl";
    if (el.viAge) el.viAge.value = existingVI.age || "";
    if (el.viHair) el.viHair.value = existingVI.hair || "";
    if (el.viEyes) el.viEyes.value = existingVI.eyes || "";
    if (el.viFeatures) el.viFeatures.value = existingVI.features || "";
    if (el.viBuild) el.viBuild.value = existingVI.build || "";
    if (el.viClothing) el.viClothing.value = existingVI.clothing || "";
    if (el.viTags) {
      el.viTags.value = Array.isArray(existingVI.tags)
        ? existingVI.tags.join(", ")
        : (existingVI.tags || "");
    }
    if (el.viLoading) el.viLoading.style.display = "none";
    if (el.viContent) el.viContent.style.display = "block";
    return;
  }

  // Need extraction via AI
  if (el.viLoading) el.viLoading.style.display = "block";
  if (el.viContent) el.viContent.style.display = "none";

  try {
    const res = await fetch("/api/image-prompts/extract-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: char,
        provider: state.provider,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const vi = data.visualIdentity || {};

    if (el.viGender) el.viGender.value = vi.gender || "1girl";
    if (el.viAge) el.viAge.value = vi.age || "";
    if (el.viHair) el.viHair.value = vi.hair || "";
    if (el.viEyes) el.viEyes.value = vi.eyes || "";
    if (el.viFeatures) el.viFeatures.value = vi.features || "";
    if (el.viBuild) el.viBuild.value = vi.build || "";
    if (el.viClothing) el.viClothing.value = vi.clothing || "";
    if (el.viTags) {
      el.viTags.value = Array.isArray(vi.tags)
        ? vi.tags.join(", ")
        : (vi.tags || "");
    }
  } catch (err) {
    console.warn("Visual tag extraction failed, using default values:", err);
    if (el.viGender) el.viGender.value = "1girl";
    if (el.viAge) el.viAge.value = "Adult";
    if (el.viHair) el.viHair.value = "";
    if (el.viEyes) el.viEyes.value = "";
    if (el.viFeatures) el.viFeatures.value = "";
    if (el.viBuild) el.viBuild.value = "";
    if (el.viClothing) el.viClothing.value = "";
    if (el.viTags) el.viTags.value = "1girl, solo";
  } finally {
    if (el.viLoading) el.viLoading.style.display = "none";
    if (el.viContent) el.viContent.style.display = "block";
  }
}

function ensureVisualIdentityElements() {
  const ids = [
    "modal-visual-identity", "btn-close-visual-identity", "vi-loading", "vi-content",
    "vi-char-name", "btn-vi-reextract", "vi-gender", "vi-age", "vi-hair",
    "vi-eyes", "vi-features", "vi-build", "vi-clothing", "vi-tags",
    "btn-vi-sync-tags", "btn-vi-save", "btn-vi-save-text", "btn-vi-cancel",
  ];
  for (const id of ids) {
    const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!el[key]) el[key] = document.getElementById(id);
  }
}

function openVisualIdentityModal(onConfirmCallback = null) {
  ensureVisualIdentityElements();
  pendingVisualIdentityCallback = onConfirmCallback;
  if (el.btnViSaveText) {
    el.btnViSaveText.textContent = onConfirmCallback
      ? "💾 Save & Proceed to Generate"
      : "💾 Save Visual Identity";
  }
  if (el.modalVisualIdentity) {
    el.modalVisualIdentity.classList.remove("hidden");
  }
  fetchAndPopulateVisualIdentity(false);
}

function closeVisualIdentityModal() {
  ensureVisualIdentityElements();
  if (el.modalVisualIdentity) {
    el.modalVisualIdentity.classList.add("hidden");
  }
  pendingVisualIdentityCallback = null;
}

async function handleSaveVisualIdentity() {
  ensureVisualIdentityElements();
  const rawTags = (el.viTags?.value || "")
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);

  const viData = {
    gender: el.viGender?.value.trim() || "1girl",
    age: el.viAge?.value.trim() || "",
    hair: el.viHair?.value.trim() || "",
    eyes: el.viEyes?.value.trim() || "",
    features: el.viFeatures?.value.trim() || "",
    build: el.viBuild?.value.trim() || "",
    clothing: el.viClothing?.value.trim() || "",
    tags: rawTags,
  };

  if (!state.character.extensions) state.character.extensions = {};
  state.character.extensions.visual_identity = viData;

  if (!state.character.data) state.character.data = {};
  if (!state.character.data.extensions) state.character.data.extensions = {};
  state.character.data.extensions.visual_identity = viData;

  // Persist to card library or notify IPC
  if (state.activeCardId) {
    saveActiveCardToLibrary(false).catch((err) => console.warn("Card save error:", err));
  } else {
    notifyIpcActiveCard(state.character);
  }

  showIpcToast("✓ Visual Identity & Danbooru tags locked into character card!", "success");

  const cb = pendingVisualIdentityCallback;
  closeVisualIdentityModal();
  if (typeof cb === "function") {
    cb();
  }
}

// ==========================================
// Spine Synthesis Modal (Retroactive Authoring Spine)
// ==========================================
function openSynthesizeSpineModal() {
  if (!state.character || !state.character.name) {
    alert("No active character loaded. Please create or load a character first.");
    return;
  }
  if (!assertProviderConfigured()) return;

  if (el.spineTargetCharName) el.spineTargetCharName.textContent = state.character.name;
  if (el.spineOriginalConcept) el.spineOriginalConcept.value = "";
  if (el.spineOriginalStoryArc) el.spineOriginalStoryArc.value = "";
  if (el.spineGenre) el.spineGenre.value = "Fantasy";
  if (el.spineEra) el.spineEra.value = "";
  if (el.spineThemes) el.spineThemes.value = (state.selectedThemes || []).join(", ");
  if (el.spineTone) el.spineTone.value = "Atmospheric, psychologically nuanced";
  if (el.spineIntensity) el.spineIntensity.value = "balanced";
  if (el.spineBotMode) el.spineBotMode.value = state.botMode || "single";
  if (el.spineNsfw) el.spineNsfw.checked = true;

  if (el.modalSynthesizeSpine) el.modalSynthesizeSpine.classList.remove("hidden");
  if (el.spineLoading) el.spineLoading.style.display = "none";
}

function closeSynthesizeSpineModal() {
  if (el.modalSynthesizeSpine) el.modalSynthesizeSpine.classList.add("hidden");
}

async function handleSynthesizeSpine() {
  if (!assertProviderConfigured()) return;
  if (!state.character || !state.character.name) return;

  const originalConcept = el.spineOriginalConcept?.value?.trim() || undefined;
  const originalStoryArc = el.spineOriginalStoryArc?.value?.trim() || undefined;

  if (!originalConcept && !originalStoryArc) {
    if (!confirm("No original concept or story arc provided. The AI will infer from the card fields only. Continue?")) {
      return;
    }
  }

  if (el.spineLoading) el.spineLoading.style.display = "block";
  if (el.btnSpineSynthesize) {
    el.btnSpineSynthesize.disabled = true;
    el.btnSpineSynthesize.innerHTML = "<span class='spinner'></span> <span>Synthesizing...</span>";
  }

  try {
    const payload = {
      character: state.character,
      originalConcept,
      originalStoryArc,
      genre: el.spineGenre?.value || "Fantasy",
      themes: (el.spineThemes?.value || "").split(",").map(t => t.trim()).filter(Boolean),
      tone: el.spineTone?.value || "Atmospheric, psychologically nuanced",
      nsfw: el.spineNsfw?.checked ?? true,
      intensity: el.spineIntensity?.value || "balanced",
      era: el.spineEra?.value?.trim() || undefined,
      botMode: el.spineBotMode?.value || "single",
      provider: state.provider
    };

    const res = await apiPost("/api/spine/synthesize", payload);
    
    if (res.character && res.spine) {
      state.character = { ...state.character, ...res.character };
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`Synthesized Spine: ${state.character.name}`);
      
      // Enable Regenerate with Spine button
      if (el.btnRunGreetingsSpine) {
        el.btnRunGreetingsSpine.disabled = false;
        el.btnRunGreetingsSpine.style.opacity = "1";
        el.btnRunGreetingsSpine.style.cursor = "pointer";
        el.btnRunGreetingsSpine.title = "Regenerate alternate greetings using stored spine and story arc";
      }
      
      showIpcToast("✅ Authoring Spine synthesized & attached! Ready for 'Regenerate with Spine' mode.", "success");
      closeSynthesizeSpineModal();
    } else {
      throw new Error("No character or spine returned");
    }
  } catch (err) {
    alert("❌ Spine synthesis failed: " + (err.message || err));
  } finally {
    if (el.spineLoading) el.spineLoading.style.display = "none";
    if (el.btnSpineSynthesize) {
      el.btnSpineSynthesize.disabled = false;
      el.btnSpineSynthesize.innerHTML = "<span>🧬 Synthesize & Attach Spine</span>";
    }
  }
}

// ==========================================
// Regenerate Greetings with Spine Modal
// ==========================================
function openRegenGreetingsSpineModal() {
  if (!state.character || !state.character.name) {
    alert("No active character loaded. Please create or load a character first.");
    return;
  }
  if (!assertProviderConfigured()) return;

  const hasSpine = !!(state.character.extensions && state.character.extensions["chargenui:authoringSpine"]);
  if (!hasSpine) {
    alert("No Authoring Spine found. Please use 'Synthesize Spine' first or create a new character via Spark/Weaver.");
    return;
  }

  if (el.regenTargetCharName) el.regenTargetCharName.textContent = state.character.name;
  if (el.regenStoryArc) el.regenStoryArc.value = "";
  if (el.regenMinAlts) el.regenMinAlts.value = "6";
  if (el.regenSteering) el.regenSteering.value = "";

  if (el.modalRegenGreetingsSpine) el.modalRegenGreetingsSpine.classList.remove("hidden");
  if (el.regenLoading) el.regenLoading.style.display = "none";
}

function closeRegenGreetingsSpineModal() {
  if (el.modalRegenGreetingsSpine) el.modalRegenGreetingsSpine.classList.add("hidden");
}

async function handleRegenerateGreetingsSpine() {
  if (!assertProviderConfigured()) return;
  if (!state.character || !state.character.name) return;

  const hasSpine = !!(state.character.extensions && state.character.extensions["chargenui:authoringSpine"]);
  if (!hasSpine) {
    alert("No Authoring Spine found. Please use 'Synthesize Spine' first.");
    return;
  }

  const storyArc = el.regenStoryArc?.value?.trim() || undefined;
  const minAltGreetings = parseInt(el.regenMinAlts?.value || "6", 10);
  const steeringInstructions = el.regenSteering?.value?.trim() || undefined;

  if (el.regenLoading) el.regenLoading.style.display = "block";
  if (el.btnRegenExecute) {
    el.btnRegenExecute.disabled = true;
    el.btnRegenExecute.innerHTML = "<span class='spinner'></span> <span>Regenerating...</span>";
  }

  try {
    const payload = {
      character: state.character,
      options: {
        scenarioPrompt: "",
        steeringInstructions,
        minAltGreetings: Math.max(1, minAltGreetings),
        ...(storyArc ? { storyArcOverride: storyArc } : {}),
      },
      provider: state.provider,
      mode: "regenerate_with_spine",
    };

    const res = await apiPost("/api/enhance", payload);
    
    if (res.character && res.character.alternate_greetings) {
      state.character = { ...state.character, ...res.character };
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`Regenerated ${res.character.alternate_greetings.length} Greetings with Spine: ${state.character.name}`);
      
      showIpcToast(`✅ Regenerated ${res.character.alternate_greetings.length} arc-aware greetings!`, "success");
      closeRegenGreetingsSpineModal();
    } else {
      throw new Error("No greetings returned from regeneration");
    }
  } catch (err) {
    alert("❌ Regeneration failed: " + (err.message || err));
  } finally {
    if (el.regenLoading) el.regenLoading.style.display = "none";
    if (el.btnRegenExecute) {
      el.btnRegenExecute.disabled = false;
      el.btnRegenExecute.innerHTML = "<span>🧬 Regenerate Greetings with Spine</span>";
    }
  }
}

// ==========================================
// Image Prompt Generation
// ==========================================
async function handleGenerateImagePrompt() {
  if (!el.btnDoGenImgPrompt) return;
  syncUIToState();

  if (!hasVisualIdentity(state.character)) {
    openVisualIdentityModal(() => handleGenerateImagePrompt());
    return;
  }

  const originalText = el.btnDoGenImgPrompt.innerHTML;
  el.btnDoGenImgPrompt.disabled = true;
  el.btnDoGenImgPrompt.innerHTML = "<span>⏳ Synthesizing Diffusion Prompt...</span>";

  try {
    const imagePurpose = el.imgPurposeGreeting?.checked
      ? "greeting"
      : el.imgPurposeScenario?.checked
      ? "scenario_avatar"
      : "avatar";
    const reqBody = {
      character: state.character,
      characterId: state.activeCardId || undefined,
      imagePurpose,
      targetModel: el.imgTargetModel?.value || "flux",
      portraitIntent: el.imgPortraitIntent?.value || "standard_avatar",
      artStyle: el.imgArtStyle?.value || "anime",
      shotType: el.imgShotType?.value || (imagePurpose === "greeting" ? "action_scene" : "card_portrait"),
      aspectRatio: el.imgAspectRatio?.value || "2:3",
      customSteering: el.imgCustomSteering?.value.trim() || undefined,
      nsfw: !!el.imgNsfwCheck?.checked,
      provider: state.provider,
    };

    const res = await fetch("/api/image-prompts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Generation failed" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const result = data.result;
    state.lastGeneratedImagePrompt = result;

    if (el.imgOutPositive) el.imgOutPositive.value = result.positivePrompt;
    if (el.imgOutNegative) el.imgOutNegative.value = result.negativePrompt;

    if (el.imgOutSettingsBadges) {
      const intentLabel =
        result.portraitIntent === "casual"
          ? "Casual Attire"
          : result.portraitIntent === "action"
          ? "Action Stance"
          : result.portraitIntent === "sensual_kink"
          ? "Sensual / Kink"
          : "Normal Avatar";

      const purposeBadge =
        result.imagePurpose === "greeting"
          ? `<span class="badge" style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe;">💬 Greeting Scene</span>`
          : result.imagePurpose === "scenario_avatar"
          ? `<span class="badge" style="background: rgba(244, 63, 94, 0.2); border: 1px solid rgba(244, 63, 94, 0.4); color: #fda4af;">🔥 Unfiltered Scenario Avatar</span>`
          : `<span class="badge" style="background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #93c5fd;">👤 Character Profile Avatar</span>`;

      el.imgOutSettingsBadges.innerHTML = `
        <span class="img-badge img-badge-${result.targetModel}">${result.targetModel.toUpperCase()}</span>
        ${purposeBadge}
        <span class="badge" style="background: rgba(147, 51, 234, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc;">
          ✨ ${intentLabel}
        </span>
        <span class="badge" style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #93c5fd;">
          📐 ${result.dimensions.width}×${result.dimensions.height} (${result.aspectRatio})
        </span>
        <span class="badge" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7;">
          ⚙️ Sampler: ${result.recommendedSettings.sampler}
        </span>
        <span class="badge" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fcd34d;">
          🔢 Steps: ${result.recommendedSettings.steps} | CFG: ${result.recommendedSettings.cfg}
        </span>
      `;
    }

    if (el.imgGenOutputContainer) {
      el.imgGenOutputContainer.style.display = "block";
    }
  } catch (err) {
    alert("❌ Image prompt generation failed: " + (err.message || err));
  } finally {
    el.btnDoGenImgPrompt.disabled = false;
    el.btnDoGenImgPrompt.innerHTML = originalText;
  }
}

async function handleQueueGreetingImage(customGreetingText, label = "Greeting Scene", imagePurpose = "greeting", greetingIndex = 0) {
  syncUIToState();
  if (!hasVisualIdentity(state.character)) {
    openVisualIdentityModal(() => handleQueueGreetingImage(customGreetingText, label, imagePurpose, greetingIndex));
    return;
  }
  const greeting = customGreetingText || state.character.first_mes || "";
  try {
    const isBg = imagePurpose === "greeting_bg";
    const steering = isBg
      ? `Atmospheric environmental landscape or room architecture backdrop for chat wallpaper during this greeting encounter:\n${greeting.slice(0, 600)}`
      : `Scene illustration depicting the opening greeting encounter:\n${greeting.slice(0, 600)}`;

    const targetModel = state.imageConfig?.defaultTargetModel || el.imgTargetModel?.value || "flux";
    const artStyle = state.imageConfig?.defaultArtStyle || el.imgArtStyle?.value || "anime";

    const reqBody = {
      character: state.character,
      characterId: state.activeCardId || undefined,
      imagePurpose,
      greetingText: greeting || undefined,
      targetModel,
      portraitIntent: "standard_avatar",
      artStyle,
      shotType: isBg ? "action_scene" : "action_scene",
      aspectRatio: "16:9",
      customSteering: greeting ? steering : undefined,
      nsfw: true,
      provider: state.provider,
    };

    const res = await fetch("/api/image-prompts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Generation failed" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const result = data.result;
    result.greetingIndex = greetingIndex;
    state.lastGeneratedImagePrompt = result;

    // Enqueue
    const qRes = await fetch("/api/image-prompts/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });

    if (!qRes.ok) throw new Error("Failed to add to queue");
    await refreshImageQueue();
    showIpcToast(`✓ Generated and queued ${label} prompt!`, "success");
  } catch (err) {
    alert(`Failed to queue ${label} image: ${err.message || err}`);
  }
}

async function handleAddLastPromptToQueue() {
  if (!state.lastGeneratedImagePrompt) {
    alert("Please generate a prompt first!");
    return;
  }

  const itemPayload = {
    ...state.lastGeneratedImagePrompt,
    imagePurpose:
      state.lastGeneratedImagePrompt.imagePurpose ||
      (el.imgPurposeGreeting?.checked
        ? "greeting"
        : el.imgPurposeScenario?.checked
        ? "scenario_avatar"
        : "avatar"),
    positivePrompt: el.imgOutPositive ? el.imgOutPositive.value : state.lastGeneratedImagePrompt.positivePrompt,
    negativePrompt: el.imgOutNegative ? el.imgOutNegative.value : state.lastGeneratedImagePrompt.negativePrompt,
  };

  try {
    const res = await fetch("/api/image-prompts/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await refreshImageQueue();
    switchImgModalTab("img-tab-queue");
  } catch (err) {
    alert("Failed to add prompt to queue: " + (err.message || err));
  }
}

async function handleQuickDispatchPrompt() {
  if (!state.lastGeneratedImagePrompt) {
    alert("Generate an image prompt first!");
    return;
  }
  const itemPayload = {
    ...state.lastGeneratedImagePrompt,
    characterName: state.character.name || "Untitled Character",
    characterId: state.character.id || state.character.name || "",
    imagePurpose:
      state.lastGeneratedImagePrompt.imagePurpose ||
      (el.imgPurposeGreetingBg?.checked
        ? "greeting_bg"
        : el.imgPurposeGreeting?.checked
        ? "greeting"
        : el.imgPurposeScenario?.checked
        ? "scenario_avatar"
        : "avatar"),
    positivePrompt: el.imgOutPositive ? el.imgOutPositive.value : state.lastGeneratedImagePrompt.positivePrompt,
    negativePrompt: el.imgOutNegative ? el.imgOutNegative.value : state.lastGeneratedImagePrompt.negativePrompt,
  };

  try {
    const res = await fetch("/api/image-prompts/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    await refreshImageQueue();
    switchImgModalTab("img-tab-comfy");
    await handleDispatchComfyBatch(data.item ? [data.item.id] : undefined);
  } catch (err) {
    alert("Failed to queue & dispatch: " + (err.message || err));
  }
}

function renderImageQueue() {
  if (!el.imgQueueListContainer) return;

  const searchQuery = el.imgQueueSearch ? el.imgQueueSearch.value.trim().toLowerCase() : "";
  const filterStatus = el.imgQueueFilterStatus ? el.imgQueueFilterStatus.value : "all";

  const filtered = state.imageQueue.filter((item) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (searchQuery) {
      const matchName = (item.characterName || "").toLowerCase().includes(searchQuery);
      const matchModel = (item.targetModel || "").toLowerCase().includes(searchQuery);
      const matchPos = (item.positivePrompt || "").toLowerCase().includes(searchQuery);
      if (!matchName && !matchModel && !matchPos) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    el.imgQueueListContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-dim); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-sm);">
        <div style="font-size: 28px; margin-bottom: 8px;">🖼️</div>
        <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Prompt Queue is Empty</div>
        <div style="font-size: 11px; max-width: 420px; margin: 0 auto 12px; line-height: 1.4;">
          Forge character cards, generate diffusion prompts for each, and queue them up here. Once queued, you can turn off your LLM to free VRAM and batch-generate all images in ComfyUI!
        </div>
        <button class="btn btn-sm btn-primary" onclick="switchImgModalTab('img-tab-gen')" type="button">
          🎨 Generate Prompt for Active Card
        </button>
      </div>
    `;
    return;
  }

  el.imgQueueListContainer.innerHTML = filtered
    .map((item) => {
      const isDone = item.status === "completed";
      const badgeClass = `img-badge-${item.targetModel || "flux"}`;
      const statusLabel = isDone ? "COMPLETED" : "QUEUED";
      const statusBg = isDone ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)";
      const statusColor = isDone ? "#34d399" : "#fbbf24";
      const isGreeting = item.imagePurpose === "greeting";
      const isScenario = item.imagePurpose === "scenario_avatar";
      const purposeBadge = isGreeting
        ? `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.3);">💬 GREETING</span>`
        : isScenario
        ? `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3);">🔥 SCENARIO AVATAR</span>`
        : `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3);">👤 AVATAR</span>`;

      const createdStr = new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const itemId = item.id || item.name;
      const charName = item.characterName || item.name || "Prompt";
      const modelName = (item.targetModel || "flux").toLowerCase();
      const promptText = item.prompt || item.positivePrompt || (item.params && item.params.positive) || "";
      const negText = item.negativePrompt || (item.params && item.params.negative) || "";
      const hasNeg = !!negText;
      const attachedImage = item.greetingDataUrl || item.avatarDataUrl;

      return `
      <div class="img-queue-card ${isDone ? "completed" : "queued"}" data-id="${itemId}">
        <!-- Card Top Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 13px; color: #fff;">${escapeHtml(charName)}</strong>
            ${purposeBadge}
            <span class="img-badge img-badge-${modelName}">${modelName.toUpperCase()}</span>
            <span style="font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: ${statusBg}; color: ${statusColor};">
              ${statusLabel}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-send-item-comfy" data-id="${itemId}" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7; font-weight: 700; padding: 2px 8px; font-size: 11px;" type="button" title="Dispatch this prompt to ComfyUI">
              ⚡ ComfyUI
            </button>
            <button class="btn btn-sm btn-primary btn-copy-item-pos" data-id="${itemId}" style="font-weight: 700; padding: 2px 8px; font-size: 11px;" type="button">
              📋 Copy Prompt
            </button>
            <button class="btn btn-sm btn-toggle-item-status" data-id="${itemId}" data-current="${item.status}" style="padding: 2px 8px; font-size: 11px;" type="button">
              ${isDone ? "🔄 Re-queue" : "✅ Done"}
            </button>
            <label class="btn btn-sm" style="padding: 2px 8px; font-size: 11px; cursor: pointer; margin: 0;" title="Attach generated image from ComfyUI to this character">
              🖼️ Attach Image
              <input type="file" class="queue-attach-file-input" data-id="${itemId}" data-purpose="${item.imagePurpose || 'avatar'}" accept="image/png,image/jpeg,image/webp" style="display: none;">
            </label>
            <button class="btn btn-sm btn-danger btn-delete-queue-item" data-id="${itemId}" style="padding: 2px 6px; font-size: 11px;" type="button" title="Delete from queue">
              ✕
            </button>
          </div>
        </div>

        <!-- Image Prompt Box -->
        <textarea class="form-textarea queue-item-pos" data-id="${itemId}" style="min-height: 60px; font-size: 11px; font-family: monospace;">${escapeHtml(promptText)}</textarea>

        <!-- Optional Negative Prompt if present -->
        ${
          hasNeg
            ? `
          <details style="font-size: 10px; color: var(--text-dim);">
            <summary style="cursor: pointer; margin-bottom: 4px;">Negative Prompt (Optional)</summary>
            <div style="display: flex; gap: 4px; align-items: center;">
              <textarea class="form-textarea queue-item-neg" data-id="${itemId}" style="min-height: 36px; font-size: 10px; font-family: monospace; flex: 1;">${escapeHtml(negText)}</textarea>
              <button class="btn btn-sm btn-copy-item-neg" data-id="${itemId}" style="padding: 2px 6px; font-size: 10px;" type="button">📋</button>
            </div>
          </details>
        `
            : ""
        }

        <!-- Attached Image Thumbnail Preview -->
        ${
          attachedImage
            ? `
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--border-color);">
          <img src="${attachedImage}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15);" alt="Generated preview">
          <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
            <div style="font-size: 11px; font-weight: 600; color: #34d399;">✓ Image Attached (${isGreeting ? "Greeting Scene" : isScenario ? "Scenario Profile Avatar" : "Card Avatar"})</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn btn-sm btn-apply-as-avatar" data-id="${item.id}" style="font-size: 10px; padding: 2px 6px;" type="button">👤 Set as Avatar</button>
              <button class="btn btn-sm btn-apply-as-greeting" data-id="${item.id}" style="font-size: 10px; padding: 2px 6px;" type="button">💬 Set as Greeting Scene</button>
              <button class="btn btn-sm btn-apply-as-chat-bg" data-id="${item.id}" style="font-size: 10px; padding: 2px 6px;" type="button">🌄 Set as Chat Background</button>
              <a href="${attachedImage}" download="${escapeHtml(item.characterName)}_${item.imagePurpose || 'image'}.png" class="btn btn-sm" style="font-size: 10px; padding: 2px 6px; text-decoration: none;">📥 Download</a>
            </div>
          </div>
        </div>
        `
            : ""
        }
      </div>
      `;
    })
    .join("");
}

// Image Prompt Modal Listeners
el.btnGenImgPrompt?.addEventListener("click", () => openImagePromptsModal("img-tab-gen"));
el.btnOpenImageQueue?.addEventListener("click", () => openImagePromptsModal("img-tab-queue"));
el.btnCloseImagePrompts?.addEventListener("click", closeImagePromptsModal);

el.tabBtnImgGen?.addEventListener("click", () => switchImgModalTab("img-tab-gen"));
el.tabBtnImgQueue?.addEventListener("click", () => switchImgModalTab("img-tab-queue"));
el.tabBtnImgComfy?.addEventListener("click", () => switchImgModalTab("img-tab-comfy"));

el.btnDoGenImgPrompt?.addEventListener("click", handleGenerateImagePrompt);
el.btnOpenVisualIdentity?.addEventListener("click", () => openVisualIdentityModal(null));
el.btnAddToImgQueue?.addEventListener("click", handleAddLastPromptToQueue);
el.btnQuickDispatchComfy?.addEventListener("click", handleQuickDispatchPrompt);

// Visual Identity Modal Listeners
el.btnViSyncTags?.addEventListener("click", syncVisualFieldsToTags);
el.btnViReextract?.addEventListener("click", () => fetchAndPopulateVisualIdentity(true));
el.btnViSave?.addEventListener("click", handleSaveVisualIdentity);
el.btnViCancel?.addEventListener("click", closeVisualIdentityModal);
el.btnCloseVisualIdentity?.addEventListener("click", closeVisualIdentityModal);
document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "#btn-close-visual-identity, #btn-vi-cancel, #btn-vi-save, #btn-vi-sync-tags, #btn-vi-reextract",
  );
  if (!target) return;
  if (target.id === "btn-vi-save") handleSaveVisualIdentity();
  else if (target.id === "btn-vi-sync-tags") syncVisualFieldsToTags();
  else if (target.id === "btn-vi-reextract") fetchAndPopulateVisualIdentity(true);
  else closeVisualIdentityModal();
});

// Spine Synthesis Modal Listeners
el.btnSpineSynthesize?.addEventListener("click", handleSynthesizeSpine);
el.btnSpineCancel?.addEventListener("click", closeSynthesizeSpineModal);
el.btnCloseSynthesizeSpine?.addEventListener("click", closeSynthesizeSpineModal);
document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "#btn-close-synthesize-spine, #btn-spine-cancel, #btn-spine-synthesize",
  );
  if (!target) return;
  if (target.id === "btn-spine-synthesize") handleSynthesizeSpine();
  else closeSynthesizeSpineModal();
});

// Regenerate Greetings with Spine Modal Listeners
el.btnRegenExecute?.addEventListener("click", handleRegenerateGreetingsSpine);
el.btnRegenCancel?.addEventListener("click", closeRegenGreetingsSpineModal);
el.btnCloseRegenGreetingsSpine?.addEventListener("click", closeRegenGreetingsSpineModal);
document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "#btn-close-regen-greetings-spine, #btn-regen-cancel, #btn-regen-execute",
  );
  if (!target) return;
  if (target.id === "btn-regen-execute") handleRegenerateGreetingsSpine();
  else closeRegenGreetingsSpineModal();
});

// Regenerate with Spine Button (in Generate tab) - opens modal
el.btnRunGreetingsSpine?.addEventListener("click", () => {
  openRegenGreetingsSpineModal();
});

// Improve Greetings Button (in Enhancer tab) - improves first_mes + alternate_greetings
el.btnImproveGreetings?.addEventListener("click", () => {
  if (!state.character || !state.character.name) {
    alert("No active character loaded. Please create or load a character first.");
    return;
  }
  if (!assertProviderConfigured()) return;

  const currentAlts = state.character.alternate_greetings || [];
  if (currentAlts.length === 0) {
    alert("No alternate greetings to improve. Use 'Punch Greetings' first or create a new character.");
    return;
  }

  // Open the Punch Greetings drawer and trigger the improve mode
  const drawer = document.getElementById("act-punch-first-mes");
  if (drawer) drawer.classList.add("open");
  
  runEnhance(
    "improve_greetings",
    { 
      scenarioPrompt: "", 
      steeringInstructions: getGlobalSteering(), 
      ...getEnhanceSearchOptions() 
    },
    "Improving Greetings (First Mes + Alts)..."
  );
});

// Open Spine Synthesis Modal from Generate tab
el.btnOpenSynthesizeSpineGenerate?.addEventListener("click", () => {
  openSynthesizeSpineModal();
});

// Gallery Listeners
el.btnGalleryUpload?.addEventListener("click", () => el.galleryFileInput?.click());
el.btnGalleryClearAll?.addEventListener("click", clearAllGalleryImages);
el.btnGalleryGenPrompt?.addEventListener("click", () => openImagePromptsModal("img-tab-gen"));

el.galleryFileInput?.addEventListener("change", (e) => {
  if (e.target.files?.length) {
    addImagesToGallery(e.target.files);
    e.target.value = "";
  }
});

el.galleryDropzone?.addEventListener("click", () => el.galleryFileInput?.click());

el.galleryDropzone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  el.galleryDropzone.style.borderColor = "var(--accent-cyan)";
  el.galleryDropzone.style.background = "rgba(56, 189, 248, 0.08)";
});

el.galleryDropzone?.addEventListener("dragleave", (e) => {
  e.preventDefault();
  el.galleryDropzone.style.borderColor = "rgba(168, 85, 247, 0.35)";
  el.galleryDropzone.style.background = "rgba(168, 85, 247, 0.04)";
});

el.galleryDropzone?.addEventListener("drop", (e) => {
  e.preventDefault();
  el.galleryDropzone.style.borderColor = "rgba(168, 85, 247, 0.35)";
  el.galleryDropzone.style.background = "rgba(168, 85, 247, 0.04)";
  if (e.dataTransfer?.files?.length) {
    addImagesToGallery(e.dataTransfer.files);
  }
});

// Lightbox Listeners
document.addEventListener("click", (e) => {
  if (e.target.closest("#btn-close-lightbox")) {
    closeGalleryLightbox();
    return;
  }
  const modal = document.getElementById("modal-gallery-lightbox");
  if (modal && e.target === modal) closeGalleryLightbox();
});

// Copy Buttons in Generator Tab
el.btnCopyPosPrompt?.addEventListener("click", () => {
  if (el.imgOutPositive) {
    navigator.clipboard.writeText(el.imgOutPositive.value);
    const orig = el.btnCopyPosPrompt.textContent;
    el.btnCopyPosPrompt.textContent = "✓ Copied!";
    setTimeout(() => (el.btnCopyPosPrompt.textContent = orig), 1500);
  }
});

const btnToggleNeg = document.getElementById("btn-toggle-show-negative");
const negWrapper = document.getElementById("img-negative-wrapper");
btnToggleNeg?.addEventListener("click", () => {
  if (negWrapper) {
    const isHidden = negWrapper.style.display === "none";
    negWrapper.style.display = isHidden ? "block" : "none";
    btnToggleNeg.textContent = isHidden ? "- Hide Negative Prompt" : "+ Show Negative Prompt";
  }
});

el.btnCopyNegPrompt?.addEventListener("click", () => {
  if (el.imgOutNegative) {
    navigator.clipboard.writeText(el.imgOutNegative.value);
    const orig = el.btnCopyNegPrompt.textContent;
    el.btnCopyNegPrompt.textContent = "✓ Copied!";
    setTimeout(() => (el.btnCopyNegPrompt.textContent = orig), 1500);
  }
});

el.btnCopyComfySnippet?.addEventListener("click", () => {
  if (state.lastGeneratedImagePrompt?.comfyUiSnippet) {
    navigator.clipboard.writeText(state.lastGeneratedImagePrompt.comfyUiSnippet);
    const orig = el.btnCopyComfySnippet.textContent;
    el.btnCopyComfySnippet.textContent = "✓ Copied Payload!";
    setTimeout(() => (el.btnCopyComfySnippet.textContent = orig), 1500);
  }
});

// Queue Action Bar Listeners
el.imgQueueSearch?.addEventListener("input", renderImageQueue);
el.imgQueueFilterStatus?.addEventListener("change", renderImageQueue);

el.btnQueueCopyAll?.addEventListener("click", () => {
  const unfinished = state.imageQueue.filter((i) => i.status !== "completed");
  const listToCopy = unfinished.length > 0 ? unfinished : state.imageQueue;
  if (listToCopy.length === 0) {
    alert("No prompts in queue to copy!");
    return;
  }

  const combined = listToCopy
    .map((item, idx) => {
      return `[${idx + 1}] ${item.characterName} (${item.targetModel.toUpperCase()} | ${item.dimensions.width}x${item.dimensions.height})\nPOSITIVE:\n${item.positivePrompt}\n\nNEGATIVE:\n${item.negativePrompt}\n----------------------------------------`;
    })
    .join("\n\n");

  navigator.clipboard.writeText(combined);
  alert(`✓ Copied ${listToCopy.length} character image prompts to clipboard!`);
});

el.btnQueueExportJson?.addEventListener("click", () => {
  window.location.href = "/api/image-prompts/export?format=json";
});

el.btnQueueExportText?.addEventListener("click", () => {
  window.location.href = "/api/image-prompts/export?format=text";
});

el.btnQueueClearDone?.addEventListener("click", async () => {
  if (!confirm("Remove all completed prompts from the queue?")) return;
  try {
    const res = await fetch("/api/image-prompts/queue?completedOnly=true", { method: "DELETE" });
    if (res.ok) await refreshImageQueue();
  } catch (err) {
    alert("Failed to clear completed prompts: " + err);
  }
});

el.btnQueueClearAll?.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear the entire image prompt queue?")) return;
  try {
    const res = await fetch("/api/image-prompts/queue", { method: "DELETE" });
    if (res.ok) await refreshImageQueue();
  } catch (err) {
    alert("Failed to clear queue: " + err);
  }
});

// Delegated Queue Item Events (Copy, Status, Delete, Edit, Attach Image)
el.imgQueueListContainer?.addEventListener("click", async (e) => {
  const btnCopyPos = e.target.closest(".btn-copy-item-pos");
  if (btnCopyPos) {
    const id = btnCopyPos.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    if (item) {
      navigator.clipboard.writeText(item.positivePrompt);
      btnCopyPos.textContent = "✓ Copied!";
      setTimeout(() => (btnCopyPos.textContent = "📋 Copy"), 1200);
    }
    return;
  }

  const btnCopyNeg = e.target.closest(".btn-copy-item-neg");
  if (btnCopyNeg) {
    const id = btnCopyNeg.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    if (item) {
      navigator.clipboard.writeText(item.negativePrompt);
      btnCopyNeg.textContent = "✓ Copied!";
      setTimeout(() => (btnCopyNeg.textContent = "📋 Copy"), 1200);
    }
    return;
  }

  const btnCopyComfy = e.target.closest(".btn-copy-item-comfy");
  if (btnCopyComfy) {
    const id = btnCopyComfy.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    if (item) {
      const snippet = [
        `# ComfyUI Payload: ${item.characterName} (${item.targetModel.toUpperCase()})`,
        `# ${item.dimensions.width}x${item.dimensions.height} | Sampler: ${item.recommendedSettings.sampler} | Steps: ${item.recommendedSettings.steps} | CFG: ${item.recommendedSettings.cfg}`,
        `[POSITIVE]`,
        item.positivePrompt,
        `[NEGATIVE]`,
        item.negativePrompt,
      ].join("\n");
      navigator.clipboard.writeText(snippet);
      btnCopyComfy.textContent = "✓ Copied!";
      setTimeout(() => (btnCopyComfy.textContent = "📋 Copy ComfyUI"), 1200);
    }
    return;
  }

  const btnToggleStatus = e.target.closest(".btn-toggle-item-status");
  if (btnToggleStatus) {
    const id = btnToggleStatus.dataset.id;
    const current = btnToggleStatus.dataset.current;
    const nextStatus = current === "completed" ? "queued" : "completed";
    try {
      await fetch(`/api/image-prompts/queue/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshImageQueue();
    } catch (err) {
      alert("Failed to update status: " + err);
    }
    return;
  }

  const btnDelete = e.target.closest(".btn-delete-queue-item");
  if (btnDelete) {
    const id = btnDelete.dataset.id;
    try {
      await fetch(`/api/image-prompts/queue/${id}`, { method: "DELETE" });
      await refreshImageQueue();
    } catch (err) {
      alert("Failed to delete item: " + err);
    }
    return;
  }

  const btnSendComfy = e.target.closest(".btn-send-item-comfy");
  if (btnSendComfy) {
    const id = btnSendComfy.dataset.id;
    await handleDispatchComfyBatch([id]);
    return;
  }

  const btnApplyAvatar = e.target.closest(".btn-apply-as-avatar");
  if (btnApplyAvatar) {
    const id = btnApplyAvatar.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    const dataUrl = item?.avatarDataUrl || item?.greetingDataUrl;
    if (dataUrl) {
      state.character.avatar = dataUrl;
      syncStateToUI();
      if (item.characterId) {
        await fetch(`/api/image-prompts/queue/${id}/attach-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarDataUrl: dataUrl, imageType: "avatar", updateSavedCard: true }),
        });
      }
      alert(`✓ Set image as active avatar for ${state.character.name || "character"}!`);
    }
    return;
  }

  const btnApplyGreeting = e.target.closest(".btn-apply-as-greeting");
  if (btnApplyGreeting) {
    const id = btnApplyGreeting.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    const dataUrl = item?.greetingDataUrl || item?.avatarDataUrl || item?.greetingBgDataUrl;
    if (dataUrl) {
      if (!state.character.data) state.character.data = {};
      if (!state.character.data.extensions) state.character.data.extensions = {};
      if (!state.character.extensions) state.character.extensions = {};
      if (!Array.isArray(state.character.extensions.gallery)) state.character.extensions.gallery = [];

      const gIdx = typeof item.greetingIndex === "number" ? item.greetingIndex : 0;
      const galNum = state.character.extensions.gallery.length + 1;
      const galleryTag = `![Gallery image](gallery://image-${galNum})`;

      if (!state.character.extensions.gallery.some((g) => g.dataUrl === dataUrl)) {
        state.character.extensions.gallery.push({
          id: `gal_${Date.now()}`,
          name: gIdx > 0 ? `Alt Greeting #${gIdx} Scene` : "Greeting Scene",
          dataUrl,
          type: "scene",
          greetingIndex: gIdx,
          createdAt: new Date().toISOString(),
        });
      }

      if (gIdx === 0) {
        state.character.data.extensions.greeting_image = dataUrl;
        state.character.greeting_image = dataUrl;
        if (state.character.first_mes && !state.character.first_mes.includes("gallery://image-")) {
          state.character.first_mes = state.character.first_mes.trimEnd() + "\n\n" + galleryTag;
          if (el.fieldFirstMes) el.fieldFirstMes.value = state.character.first_mes;
        }
      } else {
        const altIdx = gIdx - 1;
        if (!Array.isArray(state.character.alternate_greetings)) {
          state.character.alternate_greetings = [];
        }
        if (state.character.alternate_greetings[altIdx] !== undefined) {
          if (!state.character.alternate_greetings[altIdx].includes("gallery://image-")) {
            state.character.alternate_greetings[altIdx] = state.character.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
          }
        }
        if (state.character.data) {
          if (!Array.isArray(state.character.data.alternate_greetings)) {
            state.character.data.alternate_greetings = [];
          }
          if (state.character.data.alternate_greetings[altIdx] !== undefined) {
            if (!state.character.data.alternate_greetings[altIdx].includes("gallery://image-")) {
              state.character.data.alternate_greetings[altIdx] = state.character.data.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
            }
          }
        }
        renderAltGreetings();
      }

      if (item.characterId) {
        await fetch(`/api/image-prompts/queue/${id}/attach-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarDataUrl: dataUrl, imageType: "greeting", updateSavedCard: true }),
        });
      }
      alert(gIdx > 0 ? `✓ Saved image as Scene for Alternate Greeting #${gIdx}!` : `✓ Saved image as Greeting Scene for ${state.character.name || "character"}!`);
    }
    return;
  }

  const btnApplyChatBg = e.target.closest(".btn-apply-as-chat-bg");
  if (btnApplyChatBg) {
    const id = btnApplyChatBg.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    const dataUrl = item?.greetingBgDataUrl || item?.greetingDataUrl || item?.avatarDataUrl;
    if (dataUrl) {
      if (!state.character.data) state.character.data = {};
      if (!state.character.data.extensions) state.character.data.extensions = {};
      state.character.data.extensions.chat_background = dataUrl;
      state.character.chat_background = dataUrl;
      if (item.characterId) {
        await fetch(`/api/image-prompts/queue/${id}/attach-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarDataUrl: dataUrl, imageType: "greeting_bg", updateSavedCard: true }),
        });
      }
      alert(`✓ Saved image as Chat Background for ${state.character.name || "character"}!`);
    }
    return;
  }
});

// Update prompt text on change
el.imgQueueListContainer?.addEventListener("change", async (e) => {
  const target = e.target;
  if (target.classList.contains("queue-item-pos")) {
    const id = target.dataset.id;
    await fetch(`/api/image-prompts/queue/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positivePrompt: target.value }),
    });
  } else if (target.classList.contains("queue-item-neg")) {
    const id = target.dataset.id;
    await fetch(`/api/image-prompts/queue/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ negativePrompt: target.value }),
    });
  } else if (target.classList.contains("queue-attach-file-input")) {
    const id = target.dataset.id;
    const purpose = target.dataset.purpose || "avatar";
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === "string") {
        try {
          const res = await fetch(`/api/image-prompts/queue/${id}/attach-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarDataUrl: dataUrl, updateSavedCard: true, imageType: purpose }),
          });
          if (res.ok) {
            const queueItem = state.imageQueue.find((i) => i.id === id);
            if (queueItem && state.character.name === queueItem.characterName && purpose === "avatar") {
              state.character.avatar = dataUrl;
              syncStateToUI();
            }
            await refreshImageQueue();
            if (typeof refreshSavedCards === "function") {
              await refreshSavedCards();
            }
            alert(`✓ Generated image attached as ${purpose === "greeting" ? "Greeting Scene" : "Avatar"} and saved to library card!`);
          }
        } catch (err) {
          alert("Failed to attach image: " + err);
        }
      }
    };
    reader.readAsDataURL(file);
  }
});

// -------------------------------------------------------------
// ComfyUI Direct Client & Workflow Dispatcher
// -------------------------------------------------------------

state.comfy = {
  socket: localStorage.getItem("chargen_comfyclient_socket") || "/tmp/comfyclient.sock",
};

function initComfyUIClient() {
  if (el.comfyServerUrl) {
    el.comfyServerUrl.value = state.comfy.socket;
    el.comfyServerUrl.addEventListener("change", () => {
      state.comfy.socket = el.comfyServerUrl.value.trim() || "/tmp/comfyclient.sock";
      localStorage.setItem("chargen_comfyclient_socket", state.comfy.socket);
    });
  }

  el.btnTestComfyConn?.addEventListener("click", testComfyConnection);
  el.btnComfyRunAll?.addEventListener("click", () => handleDispatchComfyBatch());
}

async function testComfyConnection() {
  const socket = el.comfyServerUrl?.value.trim() || "/tmp/comfyclient.sock";
  if (el.comfyStatusBadge) {
    el.comfyStatusBadge.textContent = "⏳ Checking...";
    el.comfyStatusBadge.style.color = "#fbbf24";
  }

  try {
    const res = await fetch(`/api/comfyui/status?socket=${encodeURIComponent(socket)}`);
    const data = await res.json();
    if (data.ok) {
      if (el.comfyStatusBadge) {
        el.comfyStatusBadge.textContent = "🟢 Socket Active";
        el.comfyStatusBadge.style.background = "rgba(16, 185, 129, 0.2)";
        el.comfyStatusBadge.style.color = "#34d399";
      }
    } else {
      if (el.comfyStatusBadge) {
        el.comfyStatusBadge.textContent = "🔴 Not Found (" + socket + ")";
        el.comfyStatusBadge.style.background = "rgba(239, 68, 68, 0.2)";
        el.comfyStatusBadge.style.color = "#f87171";
      }
    }
  } catch (err) {
    if (el.comfyStatusBadge) {
      el.comfyStatusBadge.textContent = "🔴 Error: " + err.message;
      el.comfyStatusBadge.style.color = "#f87171";
    }
  }
}

function logComfyProgress(text) {
  if (!el.comfyProgressLines) return;
  if (el.comfyProgressConsole) el.comfyProgressConsole.style.display = "block";
  const div = document.createElement("div");
  div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  el.comfyProgressLines.appendChild(div);
  el.comfyProgressConsole.scrollTop = el.comfyProgressConsole.scrollHeight;
}

async function handleDispatchComfyBatch(queueItemIds) {
  const targetItems = queueItemIds && queueItemIds.length > 0
    ? state.imageQueue.filter((i) => queueItemIds.includes(i.id))
    : state.imageQueue;

  const count = targetItems.length || state.imageQueue.length;
  if (count === 0 && (!queueItemIds || queueItemIds.length === 0)) {
    alert("The prompt queue is empty. Generate prompts first in the Prompt Generator tab!");
    switchImgModalTab("img-tab-gen");
    return;
  }

  const promptName = queueItemIds && queueItemIds.length === 1 ? queueItemIds[0] : null;
  const originalText = el.btnComfyRunAll ? el.btnComfyRunAll.innerHTML : "";
  if (el.btnComfyRunAll) {
    el.btnComfyRunAll.disabled = true;
    el.btnComfyRunAll.innerHTML = "<span>⏳ Dispatching to ComfyClient...</span>";
  }

  logComfyProgress(promptName ? `Dispatching prompt '${promptName}' to ComfyClient...` : `Dispatching all ${count} prompt(s) to ComfyClient...`);

  try {
    const res = await fetch("/api/comfyui/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promptName: promptName || undefined,
        runAll: !promptName,
        items: targetItems.length > 0 ? targetItems : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      logComfyProgress(`ComfyClient offline: ${data.error || "Socket not responding"}`);
      alert(
        `⚡ All prompts are ready in the queue (data/image_prompt_queue.json)!\n\n` +
        `ComfyClient is currently offline.\nTo generate your images:\n` +
        `1. Start ComfyClient in your terminal: ./comfyclient/run.sh\n` +
        `2. ComfyClient will load the prompts with your configured workflow & models and automatically return generated images back here!`
      );
      return;
    }

    logComfyProgress(`✓ ComfyClient accepted run command! Status: Queued in ComfyClient.`);
    showIpcToast(`🚀 Successfully queued prompt(s) in ComfyClient!`, "success");
    await refreshImageQueue();
  } catch (err) {
    logComfyProgress(`✗ Failed: ${err.message}`);
    alert(`⚡ Prompts are saved in data/image_prompt_queue.json.\nStart ComfyClient (./comfyclient/run.sh) to generate.`);
  } finally {
    if (el.btnComfyRunAll) {
      el.btnComfyRunAll.disabled = false;
      el.btnComfyRunAll.innerHTML = originalText;
    }
  }
}

async function handleExportComfyBatchJson() {
  if (!state.comfy.workflow) {
    alert("Please paste or load your ComfyUI workflow JSON first!");
    return;
  }

  const posNodeId = el.comfyPosNodeSelect?.value;
  if (!posNodeId) {
    alert("Please select the Positive Prompt Node first!");
    return;
  }

  const payload = {
    workflow: state.comfy.workflow,
    positiveNodeId: posNodeId,
    negativeNodeId: el.comfyNegNodeSelect?.value || undefined,
    randomizeSeed: !!el.comfyRandomizeSeedCheck?.checked,
  };

  try {
    const res = await fetch("/api/comfyui/export-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comfyui_batch_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Failed to export batch JSON: " + err.message);
  }
}

// ==================== Inter-Process Communication (IPC) ====================
let ipcWs = null;
let ipcReconnectTimer = null;

function showIpcToast(message, type = "info") {
  const container = document.getElementById("ipc-toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `ipc-toast ${type}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 14px;">${type === "success" ? "🎉" : type === "warning" ? "⚠️" : "💡"}</span>
      <span>${escapeHtml(message)}</span>
    </div>
    <span style="cursor: pointer; opacity: 0.7; font-size: 14px; margin-left: 8px;" onclick="this.parentElement.remove()">✕</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50%)";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function initIpcWebSocket() {
  if (ipcWs && (ipcWs.readyState === WebSocket.OPEN || ipcWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${location.host}/api/ipc/ws`;

  try {
    ipcWs = new WebSocket(wsUrl);

    ipcWs.onopen = () => {
      console.log("⚡ CharGen IPC WebSocket connected to:", wsUrl);
      const badge = document.getElementById("header-ipc-badge");
      if (badge) {
        badge.innerHTML = "⚡ IPC Online";
        badge.style.background = "rgba(16, 185, 129, 0.15)";
        badge.style.borderColor = "#10b981";
        badge.style.color = "#34d399";
        badge.title = "Connected to CharGen IPC Server. External QML / Desktop apps can sync characters and submit ideas in real-time.";
      }

      if (state.character && state.character.name) {
        notifyIpcActiveCard(state.character);
      }
    };

    ipcWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIpcMessage(msg);
      } catch (err) {
        console.warn("Error parsing IPC WebSocket frame:", err);
      }
    };

    ipcWs.onclose = () => {
      const badge = document.getElementById("header-ipc-badge");
      if (badge) {
        badge.innerHTML = "⚡ IPC Offline";
        badge.style.background = "rgba(107, 114, 128, 0.15)";
        badge.style.borderColor = "#6b7280";
        badge.style.color = "#9ca3af";
        badge.title = "IPC WebSocket disconnected. Reconnecting...";
      }
      clearTimeout(ipcReconnectTimer);
      ipcReconnectTimer = setTimeout(initIpcWebSocket, 3000);
    };

    ipcWs.onerror = () => {
      // Disconnection handled in onclose
    };
  } catch (err) {
    console.warn("Failed to create IPC WebSocket:", err);
  }
}

function notifyIpcActiveCard(character) {
  if (ipcWs && ipcWs.readyState === WebSocket.OPEN && character) {
    try {
      ipcWs.send(JSON.stringify({
        action: "set_active_card",
        payload: { character }
      }));
    } catch (e) {
      console.warn("Failed to notify IPC server of active card:", e);
    }
  }
}

function handleIpcMessage(msg) {
  const { type, payload } = msg;

  if (type === "idea:received" && payload?.idea) {
    const { idea } = payload;
    const label = idea.archetype || idea.characterName || (idea.concept.length > 50 ? idea.concept.slice(0, 47) + "..." : idea.concept);
    showIpcToast(`💡 Idea received from ${idea.suggestedBy || "Idea Suggester"}: "${label}"`, "info");

    // Populate Spark Concept textarea with full sauce
    if (el.genConcept) {
      el.genConcept.value = idea.concept;
      el.genConcept.classList.add("pulse-highlight");
      setTimeout(() => el.genConcept?.classList.remove("pulse-highlight"), 2000);
    }

    // Populate Genre if provided
    if (idea.genre && el.genGenre) {
      const gLower = idea.genre.toLowerCase();
      let matched = false;
      for (const opt of el.genGenre.options) {
        if (opt.value.toLowerCase().includes(gLower) || gLower.includes(opt.value.toLowerCase())) {
          el.genGenre.value = opt.value;
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Add custom option if not matched
        const newOpt = document.createElement("option");
        newOpt.value = idea.genre;
        newOpt.textContent = idea.genre;
        el.genGenre.appendChild(newOpt);
        el.genGenre.value = idea.genre;
      }
      el.genGenre.classList.add("pulse-highlight");
      setTimeout(() => el.genGenre?.classList.remove("pulse-highlight"), 2000);
    }

    // Populate Story Arc if provided
    if (idea.storyArc && el.genStoryArc) {
      el.genStoryArc.value = idea.storyArc;
      el.genStoryArc.classList.add("pulse-highlight");
      setTimeout(() => el.genStoryArc?.classList.remove("pulse-highlight"), 2000);
    }

    // Populate Era input if provided
    if (idea.era && el.genEra) {
      el.genEra.value = idea.era;
      el.genEra.classList.add("pulse-highlight");
      setTimeout(() => el.genEra?.classList.remove("pulse-highlight"), 2000);
      updateEraDossierPreview(idea.eraData || idea.era);
    } else {
      updateEraDossierPreview(null);
    }

    // Populate suggested themes
    if (Array.isArray(idea.themes) && idea.themes.length > 0) {
      idea.themes.forEach((t) => {
        if (!state.selectedThemes.includes(t)) {
          state.selectedThemes.push(t);
        }
      });
      renderThemePills();
    }

    // Switch to Spark tab (tab-generate / tab-spark)
    const sparkTab = document.querySelector('.nav-tab[data-tab="tab-spark"]') || document.querySelector('.nav-tab[data-tab="tab-generate"]');
    if (sparkTab) sparkTab.click();
  }

  if (type === "character:generated" && payload?.character) {
    const char = payload.character;
    state.character = { ...state.character, ...char };
    syncStateToUI();
    updateActiveCardBadge();
    recordSnapshot(`Generated from Idea: ${char.name}`);
    showIpcToast(`Auto-generated character "${char.name}"!`, "success");

    // Switch to Manual Editor tab
    const manualTab = document.querySelector('.nav-tab[data-tab="tab-manual"]');
    if (manualTab) manualTab.click();
  }

  if (type === "character:changed" && payload?.character) {
    console.log("IPC: Active character updated remotely:", payload.character.name);
  }

  if (type === "image:attached" && payload) {
    const { imageType, imageDataUrl, greetingIndex } = payload;
    const gIdx = typeof greetingIndex === "number" ? greetingIndex : 0;

    if (imageType === "greeting") {
      if (!state.character.data) state.character.data = {};
      if (!state.character.data.extensions) state.character.data.extensions = {};
      if (gIdx === 0) {
        state.character.data.extensions.greeting_image = imageDataUrl;
        state.character.greeting_image = imageDataUrl;
      }

      if (!state.character.extensions) state.character.extensions = {};
      if (!Array.isArray(state.character.extensions.gallery)) state.character.extensions.gallery = [];
      const galNum = state.character.extensions.gallery.length + 1;
      const galleryTag = `![Gallery image](gallery://image-${galNum})`;

      if (!state.character.extensions.gallery.some((g) => g.dataUrl === imageDataUrl)) {
        state.character.extensions.gallery.push({
          id: `gal_${Date.now()}`,
          name: gIdx > 0 ? `Alt Greeting #${gIdx} Scene` : "Greeting Scene",
          dataUrl: imageDataUrl,
          type: "scene",
          greetingIndex: gIdx,
          createdAt: new Date().toISOString(),
        });
      }

      if (gIdx === 0) {
        if (state.character.first_mes && !state.character.first_mes.includes("gallery://image-")) {
          state.character.first_mes = state.character.first_mes.trimEnd() + "\n\n" + galleryTag;
          if (el.fieldFirstMes) el.fieldFirstMes.value = state.character.first_mes;
        }
        showIpcToast("✓ Greeting scene image attached to character starter!", "success");
      } else {
        const altIdx = gIdx - 1;
        if (!Array.isArray(state.character.alternate_greetings)) {
          state.character.alternate_greetings = [];
        }
        if (state.character.alternate_greetings[altIdx] !== undefined) {
          if (!state.character.alternate_greetings[altIdx].includes("gallery://image-")) {
            state.character.alternate_greetings[altIdx] = state.character.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
          }
        }
        if (state.character.data) {
          if (!Array.isArray(state.character.data.alternate_greetings)) {
            state.character.data.alternate_greetings = [];
          }
          if (state.character.data.alternate_greetings[altIdx] !== undefined) {
            if (!state.character.data.alternate_greetings[altIdx].includes("gallery://image-")) {
              state.character.data.alternate_greetings[altIdx] = state.character.data.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
            }
          }
        }
        renderAltGreetings();
        showIpcToast(`✓ Greeting scene image attached to Alternate Greeting #${gIdx}!`, "success");
      }
    } else if (imageType === "avatar") {
      state.character.avatar = imageDataUrl;
      showIpcToast("✓ Avatar image attached to active character!", "success");
    } else if (imageType === "greeting_bg") {
      if (!state.character.data) state.character.data = {};
      if (!state.character.data.extensions) state.character.data.extensions = {};
      state.character.data.extensions.chat_background = imageDataUrl;
      state.character.chat_background = imageDataUrl;

      if (!state.character.extensions) state.character.extensions = {};
      if (!Array.isArray(state.character.extensions.gallery)) state.character.extensions.gallery = [];
      if (!state.character.extensions.gallery.some((g) => g.dataUrl === imageDataUrl)) {
        state.character.extensions.gallery.push({
          id: `gal_${Date.now()}`,
          name: "Chat Background",
          dataUrl: imageDataUrl,
          type: "background",
          isBackground: true,
          createdAt: new Date().toISOString(),
        });
      }

      showIpcToast("✓ Chat background attached!", "success");
    }
    syncStateToUI();
    if (typeof refreshImageQueue === "function") {
      refreshImageQueue();
    }
    if (typeof refreshSavedCards === "function") {
      refreshSavedCards();
    }
  }
}

// ============================================================================
// Era Forge: Agent-Assisted Worldbuilding & Drop-in Extension Manager
// ============================================================================

let activeEraPair = null;
let activePreviewVariant = "polygyny"; // "polygyny" | "monogamy"
let activeEraCompliance = null;

async function loadInstalledExtensions() {
  const container = document.getElementById("installed-extensions-list");
  if (!container) return;
  try {
    const res = await fetch("/api/eras/extensions");
    if (!res.ok) throw new Error("Failed to load extensions");
    const data = await res.json();
    const files = data.files || [];

    if (files.length === 0) {
      container.innerHTML = `
        <div style="font-size: 11px; color: var(--text-dim); padding: 4px;">
          No custom extension packs found in <code>data/eras_extensions/</code>. Forge an era pair above to create one!
        </div>`;
      return;
    }

    container.innerHTML = files.map(f => {
      const isExtUser = Boolean(f.isExternalUser);
      const tagBadge = isExtUser
        ? `<span style="font-size: 9px; padding: 1px 4px; border-radius: 3px; background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); margin-left: 4px;">User AppData</span>`
        : `<span style="font-size: 9px; padding: 1px 4px; border-radius: 3px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); margin-left: 4px;">Project</span>`;
      return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 11px;">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;">
          <span style="font-weight: 700; color: var(--accent-cyan);">📄 ${escapeHtml(f.filename)}</span>
          ${tagBadge}
          <span style="color: var(--text-dim); margin-left: 6px;">(${f.eraCount} era${f.eraCount === 1 ? "" : "s"} · ${(f.sizeBytes / 1024).toFixed(1)} KB)</span>
          <div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis;">
            ${(f.eras || []).map(e => escapeHtml(e.name || e.id)).join(" · ")}
          </div>
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="btn btn-sm btn-delete-extension" data-filename="${escapeHtml(f.filename)}" data-destination="${isExtUser ? 'local_user' : 'project_data'}" style="font-size: 10px; padding: 2px 6px; color: #f87171;" title="Delete this extension pack">🗑️</button>
        </div>
      </div>
    `;
    }).join("");

    container.querySelectorAll(".btn-delete-extension").forEach(btn => {
      btn.addEventListener("click", async () => {
        const fn = btn.dataset.filename;
        const dest = btn.dataset.destination || "project_data";
        if (!confirm(`Delete extension pack "${fn}" (${dest === "local_user" ? "User AppData" : "Project"})?`)) return;
        try {
          const delRes = await fetch(`/api/eras/extensions/${encodeURIComponent(fn)}?destination=${encodeURIComponent(dest)}`, { method: "DELETE" });
          if (delRes.ok) {
            showIpcToast(`Deleted ${fn}`, "info");
            await loadInstalledExtensions();
            await loadEraCatalogStats();
          }
        } catch (err) {
          showIpcToast(`Failed to delete: ${err.message}`, "error");
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div style="font-size: 11px; color: #f87171;">Failed to load extensions: ${err.message}</div>`;
  }
}

function renderActiveEraCard() {
  if (!activeEraPair) return;
  const era = activePreviewVariant === "monogamy" ? activeEraPair.monogamy : activeEraPair.polygyny;
  const report = activeEraCompliance?.[activePreviewVariant];

  const titleEl = document.getElementById("era-preview-title");
  const spanEl = document.getElementById("era-preview-span");
  const regionEl = document.getElementById("era-preview-region");
  const aestheticEl = document.getElementById("era-preview-aesthetic");
  const techEl = document.getElementById("era-preview-tech");
  const socialEl = document.getElementById("era-preview-social");
  const titlesEl = document.getElementById("era-preview-titles");
  const tagsEl = document.getElementById("era-preview-tags");
  const badgeSummaryEl = document.getElementById("era-compliance-badge-summary");

  if (titleEl) titleEl.textContent = era?.name || "Unnamed Era";
  if (spanEl) spanEl.textContent = era?.span || "Temporal Span Undefined";
  if (regionEl) regionEl.textContent = era?.region || "Setting Region";
  if (aestheticEl) aestheticEl.textContent = era?.aesthetic || "";
  if (techEl) techEl.textContent = era?.tech || "";
  if (socialEl) socialEl.textContent = era?.social_codes || "";

  if (titlesEl) {
    const titles = Array.isArray(era?.titles) ? era.titles : [];
    titlesEl.innerHTML = titles.map(t => `<span style="background: rgba(99, 102, 241, 0.2); color: #c7d2fe; padding: 2px 6px; border-radius: 3px; font-size: 10px;">👤 ${escapeHtml(t)}</span>`).join("");
  }

  if (tagsEl) {
    const tags = Array.isArray(era?.tags) ? era.tags : [];
    tagsEl.innerHTML = tags.map(t => `<span style="background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-color); padding: 1px 5px; border-radius: 3px; font-size: 10px;">#${escapeHtml(t)}</span>`).join("");
  }

  // Update Era Architecture & Quality Checklist
  if (report) {
    const p = report.pillars || {};
    const renderCheck = (id, text, passed) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `${text}: <span style="font-weight:700; color: ${passed ? '#4ade80' : '#f87171'};">${passed ? '✓ PASS' : '✗ WARN'}</span>`;
      }
    };

    renderCheck("pillar-check-dual", "⚔️ Dual-Format Pair", Boolean(p.dualFormat));
    renderCheck("pillar-check-depth", "🏰 Setting & Aesthetic Depth", Boolean(p.settingDepth ?? p.zeroIntruder ?? true));
    renderCheck("pillar-check-social", "📜 Social Codes & Dynamic", Boolean(p.socialStructure ?? p.domesticOrder ?? true));
    renderCheck("pillar-check-richness", "📚 Rich Names & Archetypes", Boolean(p.contentRichness));

    if (badgeSummaryEl) {
      const isOk = report.compliant && report.score >= 80;
      badgeSummaryEl.style.background = isOk ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)";
      badgeSummaryEl.style.color = isOk ? "#4ade80" : "#facc15";
      badgeSummaryEl.style.borderColor = isOk ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)";
      badgeSummaryEl.textContent = `🛡️ ${report.score}% Compliant`;
    }

    const issuesEl = document.getElementById("era-compliance-issues");
    if (issuesEl) {
      const allNotes = [...(report.issues || []).map(i => `⚠️ Issue: ${i}`), ...(report.warnings || []).map(w => `💡 Tip: ${w}`)];
      issuesEl.innerHTML = allNotes.map(n => `<div>${escapeHtml(n)}</div>`).join("");
    }
  }
}

function initEraForgeUI() {
  const promptInput = document.getElementById("era-agent-prompt");
  const autocompleteEl = document.getElementById("era-agent-autocomplete");
  const filenameInput = document.getElementById("era-extension-filename");
  const btnGenerate = document.getElementById("btn-era-agent-generate");
  const feedEl = document.getElementById("era-agent-feed");
  const msgBodyEl = document.getElementById("era-agent-message-body");
  const toolContainerEl = document.getElementById("era-tool-calls-container");
  const previewSection = document.getElementById("era-preview-section");
  const btnPoly = document.getElementById("btn-preview-poly");
  const btnMono = document.getElementById("btn-preview-mono");
  const btnSave = document.getElementById("btn-save-era-extension");
  const btnTest = document.getElementById("btn-test-era-spark");
  const btnCopyJson = document.getElementById("btn-copy-era-json");
  const btnRefresh = document.getElementById("btn-refresh-extensions");
  let activeAgentRunId = null;
  let agentCancelRequested = false;

  // Era & Category Autocomplete trigger (era: <query> for specific setting, erac: <query> for category)
  if (promptInput && autocompleteEl) {
    let debounceTimer = null;
    const hideAutocomplete = () => {
      autocompleteEl.classList.add("hidden");
      autocompleteEl.innerHTML = "";
    };

    promptInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const text = promptInput.value;
      const matchErac = /(?:^|\s)erac:\s*([^\s]*)$/i.exec(text);
      const matchEra = /(?:^|\s)era:\s*([^\s]*)$/i.exec(text);
      if (!matchErac && !matchEra) {
        hideAutocomplete();
        return;
      }

      const isCategory = Boolean(matchErac);
      const searchQuery = isCategory ? (matchErac[1] || "") : (matchEra[1] || "");
      const marker = isCategory ? "erac:" : "era:";

      debounceTimer = setTimeout(async () => {
        try {
          if (isCategory) {
            const res = await apiGet(`/api/eras/categories?q=${encodeURIComponent(searchQuery)}`);
            const categories = res?.categories || [];
            if (!categories.length) {
              hideAutocomplete();
              return;
            }
            autocompleteEl.innerHTML = categories.slice(0, 8).map(c => `
              <div class="era-ac-item" data-id="${escapeHtml(c.name)}" style="padding: 6px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); font-size: 11px;">
                <div>
                  <span style="font-weight: 600; color: var(--text-main);">📁 ${escapeHtml(c.name)}</span>
                  <span style="color: var(--text-muted); font-size: 10px; margin-left: 6px;">(${c.count} settings)</span>
                </div>
                <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(16, 185, 129, 0.2); color: #34d399;">
                  Category
                </span>
              </div>
            `).join("");
          } else {
            const res = await apiGet(`/api/eras/search?q=${encodeURIComponent(searchQuery)}`);
            const results = res?.results || [];
            if (!results.length) {
              hideAutocomplete();
              return;
            }
            autocompleteEl.innerHTML = results.slice(0, 8).map(era => `
              <div class="era-ac-item" data-id="${escapeHtml(era.id)}" style="padding: 6px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); font-size: 11px;">
                <div>
                  <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(era.name)}</span>
                  <span style="color: var(--text-muted); font-size: 10px; margin-left: 6px;">(${escapeHtml(era.region || era.category || "Era")})</span>
                </div>
                <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: ${era.is_extension ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.2)'}; color: ${era.is_extension ? '#c084fc' : '#93c5fd'};">
                  ${era.is_extension ? 'Extension' : 'Core'}
                </span>
              </div>
            `).join("");
          }
          autocompleteEl.classList.remove("hidden");

          autocompleteEl.querySelectorAll(".era-ac-item").forEach(item => {
            item.addEventListener("mouseenter", () => { item.style.background = "var(--bg-hover, rgba(255,255,255,0.06))"; });
            item.addEventListener("mouseleave", () => { item.style.background = "transparent"; });
            item.addEventListener("click", () => {
              const selectedValue = item.dataset.id;
              const currentVal = promptInput.value;
              const idx = currentVal.toLowerCase().lastIndexOf(marker);
              if (idx >= 0) {
                const before = currentVal.substring(0, idx + marker.length);
                promptInput.value = before + " " + selectedValue + " ";
              }
              hideAutocomplete();
              promptInput.focus();
            });
          });
        } catch {
          hideAutocomplete();
        }
      }, 150);
    });

    document.addEventListener("click", (e) => {
      if (!autocompleteEl.contains(e.target) && e.target !== promptInput) {
        hideAutocomplete();
      }
    });
  }

  if (promptInput) {
    promptInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && activeAgentRunId) {
        event.preventDefault();
        const instruction = promptInput.value.trim();
        if (!instruction) return;
        await fetch("/api/eras/agent/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: activeAgentRunId, instruction }),
        }).catch(() => {});
        promptInput.value = "";
        showIpcToast("Instruction queued for the next agent step.", "info");
      }
    });
  }

  // Preset chips click
  document.querySelectorAll(".era-preset-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const concept = chip.dataset.concept;
      if (promptInput && concept) {
        promptInput.value = concept;
        promptInput.focus();
      }
    });
  });

  // Switch between Polygyny and Monogamy previews
  if (btnPoly && btnMono) {
    btnPoly.addEventListener("click", () => {
      activePreviewVariant = "polygyny";
      btnPoly.classList.add("active");
      btnMono.classList.remove("active");
      renderActiveEraCard();
    });

    btnMono.addEventListener("click", () => {
      activePreviewVariant = "monogamy";
      btnMono.classList.add("active");
      btnPoly.classList.remove("active");
      renderActiveEraCard();
    });
  }

  // Refresh extensions list
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      loadInstalledExtensions();
    });
  }

  // Copy JSON
  if (btnCopyJson) {
    btnCopyJson.addEventListener("click", () => {
      if (!activeEraPair) return;
      const json = JSON.stringify(activeEraPair, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        showIpcToast("Copied era pair JSON to clipboard!", "success");
      });
    });
  }

  // Save to extension file
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      if (!activeEraPair) return;
      const fn = filenameInput?.value?.trim() || "custom_eras.json";
      const destSelect = document.getElementById("era-save-destination");
      const destination = destSelect?.value || "project_data";
      try {
        btnSave.disabled = true;
        btnSave.textContent = "Saving...";
        const res = await fetch("/api/eras/extensions/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fn,
            destination,
            content: {
              [activeEraPair.polygyny.id]: activeEraPair.polygyny,
              [activeEraPair.monogamy.id]: activeEraPair.monogamy,
            },
          }),
        });

        if (!res.ok) throw new Error("Failed to save extension");
        const data = await res.json();
        const targetLabel = destination === "local_user" ? "user data folder (~/.local or AppData)" : `data/eras_extensions/${fn}`;
        showIpcToast(`Saved era pair to ${targetLabel}!`, "success");
        await loadInstalledExtensions();
        await loadEraCatalogStats();
      } catch (err) {
        showIpcToast(`Error saving: ${err.message}`, "error");
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = "💾 Save to Extensions Folder";
      }
    });
  }

  // Test Spark Character in Era
  if (btnTest) {
    btnTest.addEventListener("click", () => {
      if (!activeEraPair) return;
      const era = activePreviewVariant === "monogamy" ? activeEraPair.monogamy : activeEraPair.polygyny;
      // Switch to Spark tab
      const sparkTab = document.querySelector('.nav-tab[data-tab="tab-generate"]');
      if (sparkTab) sparkTab.click();

      // Pre-fill concept and set era
      const conceptInput = document.getElementById("char-concept");
      if (conceptInput) {
        const archetype = era.titles?.[0] || "Beloved Bride";
        conceptInput.value = `${archetype} living in seclusion with {{user}} in ${era.name}`;
      }

      // Set era in state
      state.selectedEra = era;
      if (el.selectedEraPill) {
        el.selectedEraPill.classList.remove("hidden");
        if (el.selectedEraPillName) el.selectedEraPillName.textContent = era.short_name || era.name;
      }

      showIpcToast(`Selected era "${era.short_name || era.name}" for character spark!`, "info");
    });
  }

  // Generate Era Pair via Agent
  if (btnGenerate) {
    btnGenerate.addEventListener("click", async () => {
      if (activeAgentRunId) {
        agentCancelRequested = true;
        await fetch("/api/eras/agent/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: activeAgentRunId }),
        }).catch(() => {});
        btnGenerate.innerHTML = `<span>⏳ Cancelling...</span>`;
        return;
      }
      const prompt = promptInput?.value?.trim();
      if (!prompt) {
        showIpcToast("Please describe the era setting you want to forge.", "warning");
        return;
      }

      const filename = filenameInput?.value?.trim() || "my_fantasy_eras.json";

      try {
        activeAgentRunId = crypto.randomUUID();
        agentCancelRequested = false;
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = `<span>🛑 Cancel Agent</span>`;
        if (feedEl) feedEl.classList.remove("hidden");
        if (msgBodyEl) msgBodyEl.textContent = "Agent is inspecting worldbuilding rules and crafting paired eras...";
        if (toolContainerEl) toolContainerEl.innerHTML = `<span style="color:var(--accent-cyan); font-size:10px;">🔧 Running 5-Pillars Era Architect...</span>`;

        const res = await fetch("/api/eras/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userPrompt: prompt,
            provider: state.provider,
            currentEraPair: activeEraPair,
            activeFilename: filename,
            runId: activeAgentRunId,
          }),
        });

        if (!res.ok) throw new Error(`Agent request failed: ${res.statusText}`);
        const data = await res.json();

        // Update Agent Feed
        if (msgBodyEl) msgBodyEl.textContent = data.agentMessage || "Era pair synthesized successfully.";
        if (toolContainerEl) {
          const tools = data.toolCallsExecuted || [];
          toolContainerEl.innerHTML = tools.map(t => `
            <span style="background: rgba(99, 102, 241, 0.25); color: #a5b4fc; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">
              ⚡ ${escapeHtml(t.tool)}: ${escapeHtml(t.resultSummary)}
            </span>
          `).join("");
        }

        if (!agentCancelRequested && data.eraPair) {
          activeEraPair = data.eraPair;
          activeEraCompliance = data.complianceReports;
          if (previewSection) previewSection.classList.remove("hidden");
          renderActiveEraCard();
          showIpcToast(`Successfully forged "${data.eraPair.polygyny.name}"!`, "success");
        } else if (!agentCancelRequested) {
          showIpcToast("Agent provided worldbuilding guidance. See response feed.", "info");
        }

        if (data.savedFile) {
          showIpcToast(`Directly saved ${data.savedFile.count} eras to ${data.savedFile.filename}!`, "success");
          await loadInstalledExtensions();
          await loadEraCatalogStats();
        }
      } catch (err) {
        if (!agentCancelRequested) showIpcToast(`Era forge failed: ${err.message}`, "error");
        if (msgBodyEl) msgBodyEl.textContent = `Error: ${err.message}`;
      } finally {
        activeAgentRunId = null;
        agentCancelRequested = false;
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = `<span>⚡ Forge Era Pair</span>`;
      }
    });
  }
}

// --- Autosave Engine & Creator Notes Rich Preview ---
let autosaveDebounceTimer = null;
let lastAutosavedHash = "";

function computeCharacterHash(char) {
  if (!char) return "";
  return JSON.stringify({
    name: char.name,
    desc: char.description,
    pers: char.personality,
    scen: char.scenario,
    first: char.first_mes,
    mes: char.mes_example,
    post: char.post_history_instructions,
    notes: char.creator_notes,
    alts: char.alternate_greetings,
    tags: char.tags,
  });
}

function scheduleCardAutosave() {
  if (autosaveDebounceTimer) clearTimeout(autosaveDebounceTimer);
  autosaveDebounceTimer = setTimeout(async () => {
    try {
      if (!state.character || !state.character.name) return;
      const currentHash = computeCharacterHash(state.character);
      if (currentHash === lastAutosavedHash) return;

      const res = await fetch("/api/cards/autosave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: state.character,
          avatarBase64: state.avatarBase64 || undefined,
        }),
      });
      if (res.ok) {
        lastAutosavedHash = currentHash;
        checkAutosaveAvailability();
      }
    } catch (e) {
      console.warn("Autosave draft failed:", e);
    }
  }, 1000);
}

async function checkAutosaveAvailability() {
  try {
    const res = await fetch("/api/cards/autosave");
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.draft && data.draft.character) {
      const draftChar = data.draft.character;
      const currentHash = computeCharacterHash(state.character);
      const draftHash = computeCharacterHash(draftChar);
      if (draftHash !== currentHash && el.btnRestoreAutosave) {
        el.btnRestoreAutosave.style.display = "inline-flex";
        el.btnRestoreAutosave.title = `Recover autosaved draft for "${draftChar.name || "Unnamed"}"`;
        el.btnRestoreAutosave.onclick = () => {
          if (confirm(`Restore autosaved card draft for "${draftChar.name || "Unnamed"}"? Current unsaved edits will be replaced.`)) {
            state.character = JSON.parse(JSON.stringify(draftChar));
            if (data.draft.avatarBase64) {
              state.avatarBase64 = data.draft.avatarBase64;
              if (el.charAvatar) el.charAvatar.src = state.avatarBase64;
            }
            syncStateToUI();
            showIpcToast(`Restored autosave draft for ${draftChar.name || "character"}!`, "success");
            el.btnRestoreAutosave.style.display = "none";
          }
        };
        return;
      }
    }
    if (el.btnRestoreAutosave) {
      el.btnRestoreAutosave.style.display = "none";
    }
  } catch (e) {
    console.warn("Check autosave failed:", e);
  }
}

// Bind Creator Notes Rich Preview Modal
if (el.btnPreviewCreatorNotes && el.modalCreatorNotes) {
  el.btnPreviewCreatorNotes.addEventListener("click", () => {
    const rawNotes = (el.fieldCreatorNotes && el.fieldCreatorNotes.value) || (state.character && state.character.creator_notes) || "";
    if (el.creatorNotesPreviewContainer) {
      if (!rawNotes.trim()) {
        el.creatorNotesPreviewContainer.innerHTML = `<div style="color:var(--text-dim); font-style:italic;">Creator notes are empty. Type author notes, concept overview, or HTML tags in the editor to preview them here.</div>`;
      } else {
        // Safe innerHTML rendering container for creator notes
        el.creatorNotesPreviewContainer.innerHTML = rawNotes;
      }
    }
    el.modalCreatorNotes.classList.remove("hidden");
  });

  const closeCreatorNotes = () => el.modalCreatorNotes.classList.add("hidden");
  if (el.btnCloseCreatorNotesModal) el.btnCloseCreatorNotesModal.addEventListener("click", closeCreatorNotes);
  if (el.btnCloseCreatorNotesModal2) el.btnCloseCreatorNotesModal2.addEventListener("click", closeCreatorNotes);
}

// Initialize Application on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
