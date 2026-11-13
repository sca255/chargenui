import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5
import QtQuick.Dialogs 6.5

ApplicationWindow {
    id: root
    width: 1320
    height: 860
    minimumWidth: 1050
    minimumHeight: 700
    visible: true
    title: "CharGen Idea Forge — Local Character Concept Studio"
    color: "#090d16"

    // Active Idea State
    property var activeIdea: ({
        "name": "",
        "title": "",
        "tagline": "",
        "tags": [],
        "archetype": "",
        "intensity": "mild",
        "central_contradiction": "",
        "reaction_gradient": {
            "wont": "",
            "craves": "",
            "neutral": "",
            "will": "",
            "trust_gate": ""
        },
        "vocal_idiolect": "",
        "premise": "",
        "source": ""
    })

    // Dramatic Stakes Dial: "off", "any", "mild", "medium", "heavy"
    property string selectedIntensity: "off"

    // Power Dynamic & Correction Dial (with Off switch): "off", "any:r", "any:ai", "mild", "correction", "heavy"
    property string selectedCorrectionTier: "off"

    // Historical Era & Timeline: "off", "timeless_fantasy", or historical era IDs
    property string selectedEra: "off"
    property var historicalErasList: []
    onSelectedEraChanged: {
        if (typeof backend !== "undefined" && backend) {
            backend.currentEra = root.selectedEra;
        }
    }

    // Bot Generation Mode: "single", "multi_character", "rpg_world"
    property string selectedBotMode: "single"
    // Agentic Era Autocomplete State (active in both Character and Era Agent modes)
    property bool agenticEraModeActive: root.currentTab === 2
    property var agenticEraAutocompleteItems: []
    property string agenticEraAutocompleteQuery: ""
    property bool agenticEraAutocompleteActive: agenticEraModeActive && agenticEraAutocompleteItems.length > 0

    // Agentic Era Autocomplete Handlers (supports 'era:', 'eram:' for poly, 'eras:' for solo, and 'erac:' for categories)
    function triggerAgenticEraAutocomplete(query) {
        if (!agenticEraModeActive) {
            agenticEraAutocomplete.hide();
            return;
        }
        var eracToken = /(?:^|\s)erac:\s*([^\s]*)$/i.exec(query || "");
        var eramToken = /(?:^|\s)eram:\s*([^\s]*)$/i.exec(query || "");
        var erasToken = /(?:^|\s)eras:\s*([^\s]*)$/i.exec(query || "");
        var eraToken = /(?:^|\s)era:\s*([^\s]*)$/i.exec(query || "");
        if (eracToken) {
            var catQuery = eracToken[1] || "";
            if (typeof backend !== "undefined" && backend && backend.searchEraCategoriesForAutocomplete) {
                agenticEraAutocomplete.updateItems(
                    backend.searchEraCategoriesForAutocomplete(catQuery, 8),
                    catQuery
                );
            } else {
                agenticEraAutocomplete.hide();
            }
        } else if (eramToken) {
            var searchQueryM = eramToken[1] || "";
            if (typeof backend !== "undefined" && backend) {
                agenticEraAutocomplete.updateItems(
                    backend.searchErasForAutocomplete(searchQueryM, 8, "poly"),
                    searchQueryM
                );
            } else {
                agenticEraAutocomplete.hide();
            }
        } else if (erasToken) {
            var searchQueryS = erasToken[1] || "";
            if (typeof backend !== "undefined" && backend) {
                agenticEraAutocomplete.updateItems(
                    backend.searchErasForAutocomplete(searchQueryS, 8, "mono"),
                    searchQueryS
                );
            } else {
                agenticEraAutocomplete.hide();
            }
        } else if (eraToken) {
            var searchQuery = eraToken[1] || "";
            if (typeof backend !== "undefined" && backend) {
                agenticEraAutocomplete.updateItems(
                    backend.searchErasForAutocomplete(searchQuery, 8, "all"),
                    searchQuery
                );
            } else {
                agenticEraAutocomplete.hide();
            }
        } else {
            agenticEraAutocomplete.hide();
        }
    }

    function insertAgenticEraIntoMessage(eraId) {
        var lower = agentMsgInput.text.toLowerCase();
        var markers = ["erac:", "eram:", "eras:", "era:"];
        var bestMarker = "";
        var bestIdx = -1;
        for (var i = 0; i < markers.length; i++) {
            var m = markers[i];
            var idx = lower.lastIndexOf(m);
            if (idx > bestIdx) {
                bestIdx = idx;
                bestMarker = m;
            }
        }
        if (bestIdx >= 0) {
            var before = agentMsgInput.text.substring(0, bestIdx + bestMarker.length);
            agentMsgInput.text = before + " " + eraId + " ";
            agentMsgInput.cursorPosition = agentMsgInput.text.length;
        } else if (typeof backend !== "undefined" && backend) {
            backend.insertEraIntoAgenticMessage(eraId);
        }
        agenticEraAutocomplete.hide();
    }

    function onAgentEraAutocompleteInsert(eraId) {
        insertAgenticEraIntoMessage(eraId);
    }

    function clearAgenticEraAutocomplete() {
        agenticEraAutocomplete.hide();
        agenticEraAutocompleteItems = [];
        agenticEraAutocompleteQuery = "";
    }

    onAgenticEraModeActiveChanged: {
        if (!agenticEraModeActive) {
            clearAgenticEraAutocomplete();
        }
    }

    // CharGenUI IPC Bridge State
    property string charGenStatusText: "CharGenUI :3333 (Standby)"
    property bool isCharGenOnline: false
    property bool autoGenerateOnSend: false

    // Tab Navigation & Workflow State
    property int currentTab: 0 // 0 = Studio Forge, 1 = Natural Language AI, 2 = AI Agent, 3 = Grimoire & Queue
    property string currentAgentMode: "character" // "character" | "era"
    property var naturalIdea: null
    property string nlAttachedVisionImage: ""
    onNlAttachedVisionImageChanged: {
        if (!nlAttachedVisionImage || nlAttachedVisionImage.length === 0) {
            nlAttachedVisionImageNotes = "";
        }
    }
    property string nlAttachedVisionImageNotes: ""
    property string agentAttachedVisionImage: ""
    onAgentAttachedVisionImageChanged: {
        if (!agentAttachedVisionImage || agentAttachedVisionImage.length === 0) {
            agentAttachedVisionImageNotes = "";
        }
    }
    property string agentAttachedVisionImageNotes: ""
    property string previewZoomImageUrl: ""
    property var agentIdea: null
    property var prevAgentIdea: null
    property bool showAgentDiffView: false
    property var agentEraPair: null
    property var prevAgentEraPair: null
    property bool showEraDiffView: false
    property string agentEraVariant: "polygyny" // "polygyny" | "monogamy"
    property var agentEraCompliance: null
    property var eraToolSteps: []
    property bool isGenerating: false
    property string selectedFocusMode: "off"
    property bool isEditingPremise: false
    property string activeScenarioHook: ""
    property bool isGeneratingScenario: false
    property string activeStoryArc: ""
    property bool isGeneratingStoryArc: false

    // Grimoire & Sequential Dispatch Queue State
    property var grimoireList: []
    property var queueData: ({ "queue": [], "active_id": null, "active_item": null })
    property string grimoireFilter: "all" // "all", "keeper", "4star", "refine", "discard", "queued"
    property string grimoireSearch: ""

    function refreshGrimoire() {
        if (typeof backend !== "undefined" && backend) {
            try {
                var raw = backend.getGrimoireJson();
                root.grimoireList = JSON.parse(raw);
            } catch(e) {
                root.grimoireList = [];
            }
        }
    }

    function refreshDispatchQueue() {
        if (typeof backend !== "undefined" && backend) {
            try {
                var raw = backend.getDispatchQueueJson();
                root.queueData = JSON.parse(raw);
            } catch(e) {
                root.queueData = { "queue": [], "active_id": null, "active_item": null };
            }
        }
    }

    function getFilteredGrimoire() {
        if (!root.grimoireList || !Array.isArray(root.grimoireList)) return [];
        var res = [];
        var q = (root.grimoireSearch || "").toLowerCase().trim();
        for (var i = 0; i < root.grimoireList.length; i++) {
            var item = root.grimoireList[i];
            var charObj = item.character || {};
            var triage = item.triage || "inbox";
            var rating = item.rating || 0;

            if (root.grimoireFilter === "keeper" && triage !== "keeper") continue;
            if (root.grimoireFilter === "refine" && triage !== "refine") continue;
            if (root.grimoireFilter === "discard" && triage !== "discard") continue;
            if (root.grimoireFilter === "4star" && rating < 4) continue;
            if (root.grimoireFilter === "queued" && item.queue_status !== "queued" && item.queue_status !== "active") continue;

            if (q.length > 0) {
                var tagsStr = (charObj.tags && Array.isArray(charObj.tags)) ? charObj.tags.join(" ") : "";
                var searchBlob = ((charObj.name || "") + " " + (charObj.title || "") + " " + (charObj.tagline || "") + " " + (charObj.archetype || "") + " " + (charObj.premise || "") + " " + tagsStr).toLowerCase();
                if (searchBlob.indexOf(q) === -1) continue;
            }

            res.push(item);
        }
        return res;
    }

    ListModel {
        id: agentMessagesModel
    }

    function refreshAgentChat() {
        if (typeof backend !== "undefined" && backend) {
            try {
                var raw = backend.getAgentChatHistoryJson();
                var list = JSON.parse(raw);
                agentMessagesModel.clear();
                for (var i = 0; i < list.length; i++) {
                    agentMessagesModel.append({
                        "role": list[i].role,
                        "content": list[i].content
                    });
                }
                if (typeof agentChatListView !== "undefined" && agentChatListView && agentChatListView.count > 0) {
                    agentChatListView.positionViewAtEnd();
                }
            } catch(e) {
                console.error("Failed to refresh agent chat: " + e);
            }
        }
    }

    function sendAgentChatMessage(msg) {
        if ((!msg || msg.trim().length === 0) && (!root.agentAttachedVisionImage || root.agentAttachedVisionImage.length === 0)) return;
        if (root.isGenerating) return;
        if (typeof backend !== "undefined" && backend) {
            var temp = (typeof agentTempSlider !== "undefined" && agentTempSlider) ? agentTempSlider.value : 0.85;
            var media = root.agentAttachedVisionImage || "";
            if (root.agentAttachedVisionImageNotes && root.agentAttachedVisionImageNotes.trim().length > 0) {
                var notesText = "[VISUAL SEED DETAILS & CONTEXT]:\n" + root.agentAttachedVisionImageNotes.trim();
                msg = msg ? (msg + "\n\n" + notesText) : notesText;
            }
            backend.sendAgentMessage(msg ? msg.trim() : "", temp, media);
            root.agentAttachedVisionImage = "";
            root.agentAttachedVisionImageNotes = "";
        }
    }

    // Component / Slot Locks
    property bool lockName: false
    property bool lockArchetype: false
    property bool lockModality: false
    property bool lockVoice: false
    readonly property bool anyLockActive: lockName || lockArchetype || lockModality || lockVoice

    function getActiveLocks() {
        return {
            "name": root.lockName,
            "archetype": root.lockArchetype,
            "modality": root.lockModality,
            "vocal": root.lockVoice
        };
    }

    property string endpointStatusText: "Checking local LLM..."
    property bool isEndpointOnline: false
    property var historyList: []
    property string toastText: ""

    // Connections to Python Backend
    Connections {
        target: backend

        function onGenerationStarted() {
            root.isGenerating = true;
        }

        function onGenerationFinished(success, errorMsg) {
            root.isGenerating = false;
            root.isGeneratingScenario = false;
            root.isGeneratingStoryArc = false;
            if (!success && errorMsg) {
                root.toastText = "⚠️ " + errorMsg;
                toastAnim.restart();
            }
        }

        function onIsGeneratingChanged(val) {
            root.isGenerating = val;
            if (!val) {
                root.isGeneratingScenario = false;
                root.isGeneratingStoryArc = false;
            }
        }

        function onIdeaReceived(ideaJson) {
            root.isGenerating = false;
            root.isGeneratingScenario = false;
            root.isGeneratingStoryArc = false;
            try {
                root.activeIdea = JSON.parse(ideaJson);
                root.isEditingPremise = false;
                root.activeScenarioHook = "";
                root.activeStoryArc = (root.activeIdea && (root.activeIdea.story_arc || root.activeIdea.storyArc)) ? (root.activeIdea.story_arc || root.activeIdea.storyArc) : "";
            } catch(e) {
                console.error("Failed to parse idea JSON: " + e);
            }
        }

        function onNaturalIdeaReceived(ideaJson) {
            root.isGenerating = false;
            root.isGeneratingScenario = false;
            root.isGeneratingStoryArc = false;
            try {
                root.naturalIdea = JSON.parse(ideaJson);
                root.isEditingPremise = false;
                root.activeScenarioHook = "";
                root.activeStoryArc = (root.naturalIdea && (root.naturalIdea.story_arc || root.naturalIdea.storyArc)) ? (root.naturalIdea.story_arc || root.naturalIdea.storyArc) : "";
                if (root.naturalIdea && root.naturalIdea.origin_prompt) {
                    nlPromptArea.text = root.naturalIdea.origin_prompt;
                }
            } catch(e) {
                console.error("Failed to parse natural idea JSON: " + e);
            }
        }

        function onAgentMessageReceived(agentMsg, charJson) {
            root.isGenerating = false;
            root.isGeneratingScenario = false;
            try {
                var parsed = JSON.parse(charJson);
                if (parsed && (parsed.name || parsed.premise)) {
                    if (root.agentIdea) {
                        root.prevAgentIdea = JSON.parse(JSON.stringify(root.agentIdea));
                    }
                    root.agentIdea = parsed;
                }
                root.isEditingPremise = false;
                root.activeScenarioHook = "";
            } catch(e) {
                console.error("Failed to parse agent character JSON: " + e);
            }
            refreshAgentChat();
        }

        function onEraAgentMessageReceived(agentMsg, eraJson, compJson) {
            try {
                if (eraJson && eraJson !== "{}") {
                    var parsedEra = JSON.parse(eraJson);
                    if (root.agentEraPair) {
                        root.prevAgentEraPair = JSON.parse(JSON.stringify(root.agentEraPair));
                    }
                    root.agentEraPair = parsedEra;
                }
                if (compJson && compJson !== "{}") {
                    root.agentEraCompliance = JSON.parse(compJson);
                }
            } catch(e) {
                console.error("Failed to parse era agent JSON: " + e);
            }
            refreshAgentChat();
        }

        function onEraToolStepsChanged() {
            try {
                root.eraToolSteps = JSON.parse(backend.eraToolStepsJson);
            } catch(e) {
                root.eraToolSteps = [];
            }
        }

        function onAgentChatReset() {
            agentMessagesModel.clear();
            root.agentIdea = null;
            root.prevAgentIdea = null;
            root.showAgentDiffView = false;
            root.agentEraPair = null;
            root.prevAgentEraPair = null;
            root.showEraDiffView = false;
            root.agentEraCompliance = null;
            root.eraToolSteps = [];
            root.activeScenarioHook = "";
        }

        function onAgentChatHistoryChanged() {
            refreshAgentChat();
        }

        function onHistoricalErasUpdated() {
            root.refreshHistoricalEras();
        }

        function onScenarioHookReceived(hook) {
            root.isGenerating = false;
            root.isGeneratingScenario = false;
            root.activeScenarioHook = hook;
            root.toastText = "⚡ Opening scenario starter generated!";
            toastAnim.restart();
        }

        function onStoryArcReceived(arc) {
            root.isGenerating = false;
            root.isGeneratingStoryArc = false;
            root.activeStoryArc = arc;
            if (root.activeIdea) root.activeIdea.story_arc = arc;
            if (root.naturalIdea) root.naturalIdea.story_arc = arc;
            if (root.agentIdea) root.agentIdea.story_arc = arc;
            root.toastText = "⚡ Story Arc trajectory drafted!";
            toastAnim.restart();
        }

        function onStatusChanged(status, isOnline) {
            root.endpointStatusText = status;
            root.isEndpointOnline = isOnline;
        }

        function onCharGenStatusChanged(isOnline, status) {
            root.isCharGenOnline = isOnline;
            root.charGenStatusText = status;
        }

        function onHistoryUpdated() {
            refreshHistory();
        }

        function onGrimoireUpdated() {
            refreshGrimoire();
        }

        function onDispatchQueueUpdated() {
            refreshDispatchQueue();
        }

        function onBatchProgress(curr, total, statusText) {
            root.toastText = "🎲 Batch Forge: " + curr + "/" + total + " — " + statusText;
            toastAnim.restart();
        }

        function onToast(msg) {
            root.toastText = msg;
            toastAnim.restart();
        }
    }

    Component.onCompleted: {
        refreshHistory();
        refreshAgentChat();
        restoreAgentActiveState();
        loadHistoricalEras();
        refreshGrimoire();
        refreshDispatchQueue();
        if (typeof backend !== "undefined" && backend) {
            backend.checkCharGenConnection();
        }
    }

    function restoreAgentActiveState() {
        if (typeof backend !== "undefined" && backend) {
            try {
                // Restore era pair if saved from previous session
                var eraRaw = backend.getActiveAgentEraPairJson();
                if (eraRaw && eraRaw !== "{}") {
                    root.agentEraPair = JSON.parse(eraRaw);
                }
                // Restore character if saved
                var charRaw = backend.getActiveAgentCharacterJson();
                if (charRaw && charRaw !== "{}") {
                    root.agentIdea = JSON.parse(charRaw);
                }
                // Restore tool steps if any
                if (backend.eraToolStepsJson) {
                    root.eraToolSteps = JSON.parse(backend.eraToolStepsJson);
                }
            } catch(e) {
                console.error("Failed restoring agent active state: " + e);
            }
        }
    }

    // Called by EraPickerModal after saving/deleting a custom era
    function refreshHistoricalEras() { loadHistoricalEras(); }

    function loadHistoricalEras() {
        if (typeof backend !== "undefined" && backend) {
            try {
                var raw = backend.getHistoricalErasJson();
                root.historicalErasList = JSON.parse(raw);
            } catch(e) {
                console.error("Failed to load historical eras: " + e);
            }
        }
    }

    function getEraData(eraId) {
        if (!eraId || eraId === "off") return null;
        if (root.historicalErasList) {
            for (var i = 0; i < root.historicalErasList.length; i++) {
                if (root.historicalErasList[i].id === eraId) {
                    return root.historicalErasList[i];
                }
            }
        }
        // Fallback: check currently staged agent era pair
        if (root.agentEraPair) {
            if (root.agentEraPair.polygyny && root.agentEraPair.polygyny.id === eraId) {
                return root.agentEraPair.polygyny;
            }
            if (root.agentEraPair.monogamy && root.agentEraPair.monogamy.id === eraId) {
                return root.agentEraPair.monogamy;
            }
        }
        // Fallback: query backend directly if newly created
        if (typeof backend !== "undefined" && backend && backend.getEraByIdJson) {
            try {
                var jsonStr = backend.getEraByIdJson(eraId);
                if (jsonStr && jsonStr !== "{}") {
                    var parsed = JSON.parse(jsonStr);
                    if (parsed && parsed.id) return parsed;
                }
            } catch(e) {}
        }
        return null;
    }

    function isUserEra(eraId) {
        var data = getEraData(eraId);
        return data && (data.is_user_era === true || (data.id && data.id.indexOf("user_") === 0));
    }

    function getHistoricalOnlyEras() {
        var list = [];
        if (!root.historicalErasList) return list;
        for (var i = 0; i < root.historicalErasList.length; i++) {
            var item = root.historicalErasList[i];
            if (item.id !== "off" && item.id !== "timeless_fantasy") {
                list.push(item);
            }
        }
        return list;
    }

    function isFantasyEra(val) {
        if (!val || val === "off") return false;
        if (val === "timeless_fantasy") return true;
        var data = getEraData(val);
        return data && (data.category === "Fantasy");
    }

    function eraTitle(val) {
        if (!val || val === "off") return "🚫 Off (Unconstrained)";
        var data = getEraData(val);
        if (data) return data.name;
        if (val === "timeless_fantasy") return "🌌 Timeless High Fantasy";
        return val;
    }

    function eraColor(val) {
        if (!val || val === "off") return "#64748b";
        if (isFantasyEra(val)) return "#c084fc";
        if (isUserEra(val)) return "#10b981";
        return "#f59e0b";
    }

    function eraBadgeLabel(val) {
        if (!val || val === "off") return "🚫 Off";
        if (isFantasyEra(val)) return "🌌 Fantasy";
        if (isUserEra(val)) return "✏️ User Era";
        return "🏛️ Historic";
    }

    function refreshHistory() {
        try {
            if (typeof backend !== "undefined" && backend) {
                var raw = backend.getHistoryJson();
                root.historyList = JSON.parse(raw);
            }
        } catch(e) {
            root.historyList = [];
        }
    }

    // Helper to check if URL or path is a video
    function isVideoUrl(url) {
        if (!url) return false;
        var lower = url.toLowerCase();
        return lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".webm") ||
               lower.endsWith(".mov") || lower.endsWith(".avi") || lower.endsWith(".m4v") || lower.endsWith(".flv");
    }

    // Helper to resolve client-side random intensity when "any" is selected
    function getEffectiveIntensity() {
        if (root.selectedIntensity === "any") {
            var tiers = ["mild", "medium", "heavy"];
            return tiers[Math.floor(Math.random() * tiers.length)];
        }
        return root.selectedIntensity;
    }

    // Helper for intensity label
    function intensityTitle(val) {
        if (val === "off") return "🚫 Off (Disabled)";
        if (val === "mild") return "🌸 Low Stakes / Cozy";
        if (val === "medium") return "⚖️ Moderate Stakes";
        if (val === "heavy") return "🔥 High Stakes";
        return "✨ Any: Random (1 of 3)";
    }

    function intensityColor(val) {
        if (val === "off") return "#64748b";
        if (val === "mild") return "#f472b6";
        if (val === "medium") return "#c084fc";
        if (val === "heavy") return "#f87171";
        return "#818cf8";
    }

    // Helper for power dynamic & correction tier
    function correctionTitle(val) {
        if (val === "any:r" || val === "any_r") return "🎲 Any: Random (1 of 3)";
        if (val === "any:ai" || val === "any_ai") return "✨ Any: AI Choice (No Prompt)";
        if (val === "mild") return "🌸 Mild";
        if (val === "correction" || val === "medium") return "⚖️ Correction";
        if (val === "heavy") return "🔥 Heavy";
        return "🚫 Off (Disabled)";
    }

    function correctionColor(val) {
        if (val === "any:r" || val === "any_r") return "#38bdf8";
        if (val === "any:ai" || val === "any_ai") return "#a78bfa";
        if (val === "mild") return "#f472b6";
        if (val === "correction" || val === "medium") return "#c084fc";
        if (val === "heavy") return "#ef4444";
        return "#64748b";
    }

    // Main Layout
    ColumnLayout {
        anchors.fill: parent
        width: parent.width
        height: parent.height
        x: 0
        y: 0
        spacing: 0

        // ==========================================
        // HEADER BAR
        // ==========================================
        Rectangle {
            Layout.fillWidth: true
            Layout.alignment: Qt.AlignTop
            implicitHeight: headerFlow.implicitHeight + 16
            color: "#111827"
            border.color: "#1f2937"
            border.width: 1

            Flow {
                id: headerFlow
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 16
                anchors.topMargin: 8
                anchors.bottomMargin: 8
                spacing: 12

                // App Brand
                RowLayout {
                    spacing: 10
                    height: 36
                    Rectangle {
                        width: 32
                        height: 32
                        radius: 8
                        color: "#7c3aed"
                        Text {
                            anchors.centerIn: parent
                            text: "✨"
                            font.pixelSize: 16
                        }
                    }
                    ColumnLayout {
                        spacing: 1
                        Text {
                            text: "CharGen Idea Forge"
                            font.bold: true
                            font.pixelSize: 14
                            color: "#f8fafc"
                        }
                        Text {
                            text: "Uncensored Idea Pipeline"
                            font.pixelSize: 10
                            color: "#94a3b8"
                        }
                    }
                }

                // ==========================================
                // TAB SWITCHER
                // ==========================================
                RowLayout {
                    spacing: 6
                    height: 36

                    // Tab 0: Studio Forge
                    Rectangle {
                        height: 36
                        radius: 8
                        implicitWidth: tabStudioTxt.implicitWidth + 24
                        color: root.currentTab === 0 ? "#7c3aed" : (tabStudioMa.containsMouse ? "#1e293b" : "#111827")
                        border.color: root.currentTab === 0 ? "#c084fc" : "#334155"
                        border.width: root.currentTab === 0 ? 2 : 1

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "⚙️"; font.pixelSize: 13 }
                            Text {
                                id: tabStudioTxt
                                text: "Studio Forge"
                                font.bold: root.currentTab === 0
                                font.pixelSize: 12
                                color: root.currentTab === 0 ? "#ffffff" : "#94a3b8"
                            }
                        }
                        MouseArea {
                            id: tabStudioMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.currentTab = 0
                        }
                    }

                    // Tab 1: Natural Language AI
                    Rectangle {
                        height: 36
                        radius: 8
                        implicitWidth: tabNlTxt.implicitWidth + 24
                        color: root.currentTab === 1 ? "#7c3aed" : (tabNlMa.containsMouse ? "#1e293b" : "#111827")
                        border.color: root.currentTab === 1 ? "#c084fc" : "#334155"
                        border.width: root.currentTab === 1 ? 2 : 1

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "💡"; font.pixelSize: 13 }
                            Text {
                                id: tabNlTxt
                                text: "Natural Language AI"
                                font.bold: root.currentTab === 1
                                font.pixelSize: 12
                                color: root.currentTab === 1 ? "#ffffff" : "#94a3b8"
                            }
                        }
                        MouseArea {
                            id: tabNlMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.currentTab = 1
                        }
                    }

                    // Tab 2: AI Agent
                    Rectangle {
                        height: 36
                        radius: 8
                        implicitWidth: tabAgentTxt.implicitWidth + 24
                        color: root.currentTab === 2 ? "#7c3aed" : (tabAgentMa.containsMouse ? "#1e293b" : "#111827")
                        border.color: root.currentTab === 2 ? "#c084fc" : "#334155"
                        border.width: root.currentTab === 2 ? 2 : 1

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "🤖"; font.pixelSize: 13 }
                            Text {
                                id: tabAgentTxt
                                text: "AI Agent"
                                font.bold: root.currentTab === 2
                                font.pixelSize: 12
                                color: root.currentTab === 2 ? "#ffffff" : "#94a3b8"
                            }
                        }
                        MouseArea {
                            id: tabAgentMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.currentTab = 2
                        }
                    }

                    // Tab 3: Idea Grimoire & Dispatch Queue
                    Rectangle {
                        height: 36
                        radius: 8
                        implicitWidth: tabGrimTxt.implicitWidth + (root.queueData && root.queueData.queue && root.queueData.queue.length > 0 ? 54 : 34)
                        color: root.currentTab === 3 ? "#7c3aed" : (tabGrimMa.containsMouse ? "#1e293b" : "#111827")
                        border.color: root.currentTab === 3 ? "#c084fc" : "#334155"
                        border.width: root.currentTab === 3 ? 2 : 1

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "📖"; font.pixelSize: 13 }
                            Text {
                                id: tabGrimTxt
                                text: "Idea Grimoire"
                                font.bold: root.currentTab === 3
                                font.pixelSize: 12
                                color: root.currentTab === 3 ? "#ffffff" : "#94a3b8"
                            }
                            // Queue badge
                            Rectangle {
                                visible: root.queueData && root.queueData.queue && root.queueData.queue.length > 0
                                height: 18
                                width: Math.max(18, qBadgeTxt.implicitWidth + 8)
                                radius: 9
                                color: "#10b981"
                                Text {
                                    id: qBadgeTxt
                                    anchors.centerIn: parent
                                    text: (root.queueData && root.queueData.queue) ? root.queueData.queue.length : ""
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: "#ffffff"
                                }
                            }
                        }
                        MouseArea {
                            id: tabGrimMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.currentTab = 3
                        }
                    }

                    // Households & Court Binders Button
                    Rectangle {
                        height: 36
                        radius: 8
                        implicitWidth: tabHhTxt.implicitWidth + 28
                        color: hhMa.containsMouse ? "#831843" : "#500724"
                        border.color: "#db2777"
                        border.width: 1

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "👑"; font.pixelSize: 13 }
                            Text {
                                id: tabHhTxt
                                text: "Households & Courts"
                                font.bold: true
                                font.pixelSize: 12
                                color: "#fbcfe8"
                            }
                        }
                        MouseArea {
                            id: hhMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: householdModal.openModal()
                        }
                    }
                }

                // Right Status Pills Group
                RowLayout {
                    spacing: 8
                    height: 36

                    // Endpoint Status Pill
                    Rectangle {
                        height: 32
                        radius: 16
                        color: root.isEndpointOnline ? "#064e3b" : "#3f1a1a"
                        border.color: root.isEndpointOnline ? "#059669" : "#dc2626"
                        border.width: 1
                        implicitWidth: Math.min(statusRow.implicitWidth + 20, 270)

                        RowLayout {
                            id: statusRow
                            anchors.fill: parent
                            anchors.leftMargin: 10
                            anchors.rightMargin: 10
                            spacing: 6

                            Rectangle {
                                width: 8
                                height: 8
                                radius: 4
                                color: root.isEndpointOnline ? "#10b981" : "#ef4444"
                            }
                            Text {
                                text: root.endpointStatusText
                                font.pixelSize: 11
                                font.bold: true
                                color: root.isEndpointOnline ? "#a7f3d0" : "#fca5a5"
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                        }

                        ToolTip.visible: endpointMa.containsMouse
                        ToolTip.text: root.endpointStatusText + " (Click to re-check)"
                        ToolTip.delay: 300

                        MouseArea {
                            id: endpointMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (typeof backend !== "undefined" && backend) backend.checkConnection()
                        }
                    }

                    // CharGenUI IPC Status Pill
                    Rectangle {
                        height: 32
                        radius: 16
                        color: root.isCharGenOnline ? "#064e3b" : "#1e293b"
                        border.color: root.isCharGenOnline ? "#059669" : "#475569"
                        border.width: 1
                        implicitWidth: Math.min(chargenStatusRow.implicitWidth + 20, 200)

                        RowLayout {
                            id: chargenStatusRow
                            anchors.fill: parent
                            anchors.leftMargin: 10
                            anchors.rightMargin: 10
                            spacing: 6

                            Rectangle {
                                width: 8
                                height: 8
                                radius: 4
                                color: root.isCharGenOnline ? "#10b981" : "#64748b"
                            }
                            Text {
                                text: root.charGenStatusText
                                font.pixelSize: 11
                                font.bold: true
                                color: root.isCharGenOnline ? "#a7f3d0" : "#cbd5e1"
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                        }

                        ToolTip.visible: chargenMa.containsMouse
                        ToolTip.text: root.charGenStatusText + " (Click to re-check)"
                        ToolTip.delay: 300

                        MouseArea {
                            id: chargenMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (typeof backend !== "undefined" && backend) backend.checkCharGenConnection()
                        }
                    }
                }
            }
        }

        // ==========================================
        // ==========================================
        // MAIN WORKSPACE (SPLIT VIEW)
        // ==========================================
        RowLayout {
            id: studioWorkspaceView
            visible: root.currentTab === 0
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignTop
            Layout.minimumHeight: 0
            spacing: 0

            // ------------------------------------------
            // LEFT COLUMN: CONTROLS & GENERATOR
            // ------------------------------------------
            Rectangle {
                Layout.preferredWidth: 430
                Layout.fillHeight: true
                color: "#0f172a"
                border.color: "#1e293b"
                border.width: 1

                ScrollView {
                    anchors.fill: parent
                    contentWidth: availableWidth
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16
                        anchors.margins: 18

                        // Header
                        Text {
                            text: "Character Generator Setup"
                            font.bold: true
                            font.pixelSize: 15
                            color: "#f8fafc"
                        }

                        // Bot Generation Mode Selector: Solo, Multi-Character Cast, RPG World / GM
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Text {
                                text: "BOT GENERATION MODE"
                                font.bold: true
                                font.pixelSize: 11
                                color: root.selectedBotMode === "multi_character" ? "#c084fc" : root.selectedBotMode === "rpg_world" ? "#34d399" : "#38bdf8"
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // 1. Solo Character
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedBotMode === "single" ? "#2563eb" : "#0f172a"
                                    border.color: root.selectedBotMode === "single" ? "#38bdf8" : "#1e293b"
                                    border.width: root.selectedBotMode === "single" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "👤 Solo"
                                        font.bold: root.selectedBotMode === "single"
                                        font.pixelSize: 10
                                        color: root.selectedBotMode === "single" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedBotMode = "single"
                                    }
                                }

                                // 2. Multi-Character Cast / Duo / Household
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedBotMode === "multi_character" ? "#7c3aed" : "#0f172a"
                                    border.color: root.selectedBotMode === "multi_character" ? "#c084fc" : "#1e293b"
                                    border.width: root.selectedBotMode === "multi_character" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "👥 Multi (1 Card)"
                                        font.bold: root.selectedBotMode === "multi_character"
                                        font.pixelSize: 10
                                        color: root.selectedBotMode === "multi_character" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedBotMode = "multi_character"
                                    }
                                }

                                // 3. Separate Characters / Group Chat Cast
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedBotMode === "group_chat_cast" ? "#be185d" : "#0f172a"
                                    border.color: root.selectedBotMode === "group_chat_cast" ? "#f472b6" : "#1e293b"
                                    border.width: root.selectedBotMode === "group_chat_cast" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "👑 Group Chat (N Cards)"
                                        font.bold: root.selectedBotMode === "group_chat_cast"
                                        font.pixelSize: 10
                                        color: root.selectedBotMode === "group_chat_cast" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedBotMode = "group_chat_cast"
                                    }
                                }

                                // 4. RPG World / GM
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedBotMode === "rpg_world" ? "#059669" : "#0f172a"
                                    border.color: root.selectedBotMode === "rpg_world" ? "#34d399" : "#1e293b"
                                    border.width: root.selectedBotMode === "rpg_world" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🗺️ RPG World"
                                        font.bold: root.selectedBotMode === "rpg_world"
                                        font.pixelSize: 10
                                        color: root.selectedBotMode === "rpg_world" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedBotMode = "rpg_world"
                                    }
                                }
                            }
                        }

                        // ==========================================
                        // FEATURE 2A: POWER DYNAMIC & CORRECTION DIAL (WITH OFF SWITCH)
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "⚡ DYNAMIC & CORRECTION DIAL"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.correctionColor(root.selectedCorrectionTier)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.correctionTitle(root.selectedCorrectionTier)
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.correctionColor(root.selectedCorrectionTier)
                                }
                            }

                            // Row 1: Mode & Any Selectors
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Option 1: Off Switch
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedCorrectionTier === "off" ? "#334155" : "#0f172a"
                                    border.color: root.selectedCorrectionTier === "off" ? "#94a3b8" : "#1e293b"
                                    border.width: root.selectedCorrectionTier === "off" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🚫 Off"
                                        font.bold: root.selectedCorrectionTier === "off"
                                        font.pixelSize: 10
                                        color: root.selectedCorrectionTier === "off" ? "#ffffff" : "#64748b"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "off"
                                    }
                                }

                                // Option 2: Any:R (Random 1 of 3)
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r") ? "#0369a1" : "#082f49"
                                    border.color: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r") ? "#38bdf8" : "#0c4a6e"
                                    border.width: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r") ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🎲 Any:R"
                                        font.bold: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r")
                                        font.pixelSize: 10
                                        color: (root.selectedCorrectionTier === "any:r" || root.selectedCorrectionTier === "any_r") ? "#ffffff" : "#7dd3fc"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "any:r"
                                    }
                                }

                                // Option 3: Any:AI (AI Choice / No Prompt)
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai") ? "#4c1d95" : "#2e1065"
                                    border.color: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai") ? "#a78bfa" : "#3b0764"
                                    border.width: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai") ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "✨ Any:AI"
                                        font.bold: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai")
                                        font.pixelSize: 10
                                        color: (root.selectedCorrectionTier === "any:ai" || root.selectedCorrectionTier === "any_ai") ? "#ffffff" : "#d8b4fe"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "any:ai"
                                    }
                                }
                            }

                            // Row 2: Explicit Tiers
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Option 4: Mild
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedCorrectionTier === "mild" ? "#831843" : "#2a0826"
                                    border.color: root.selectedCorrectionTier === "mild" ? "#f472b6" : "#4c0519"
                                    border.width: root.selectedCorrectionTier === "mild" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🌸 Mild"
                                        font.bold: root.selectedCorrectionTier === "mild"
                                        font.pixelSize: 10
                                        color: root.selectedCorrectionTier === "mild" ? "#ffffff" : "#fbcfe8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "mild"
                                    }
                                }

                                // Option 5: Correction
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium") ? "#581c87" : "#1c0b38"
                                    border.color: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium") ? "#c084fc" : "#4c1d95"
                                    border.width: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium") ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "⚖️ Correction"
                                        font.bold: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium")
                                        font.pixelSize: 10
                                        color: (root.selectedCorrectionTier === "correction" || root.selectedCorrectionTier === "medium") ? "#ffffff" : "#e9d5ff"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "correction"
                                    }
                                }

                                // Option 6: Heavy
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedCorrectionTier === "heavy" ? "#7f1d1d" : "#300808"
                                    border.color: root.selectedCorrectionTier === "heavy" ? "#ef4444" : "#991b1b"
                                    border.width: root.selectedCorrectionTier === "heavy" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🔥 Heavy"
                                        font.bold: root.selectedCorrectionTier === "heavy"
                                        font.pixelSize: 10
                                        color: root.selectedCorrectionTier === "heavy" ? "#ffffff" : "#fca5a5"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedCorrectionTier = "heavy"
                                    }
                                }
                            }
                        }

                        // ==========================================
                        // FEATURE 2B: DRAMATIC & EMOTIONAL STAKES DIAL
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🎭 DRAMATIC & EMOTIONAL STAKES"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.intensityColor(root.selectedIntensity)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.intensityTitle(root.selectedIntensity)
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.intensityColor(root.selectedIntensity)
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Option 0: Off
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "off" ? "#334155" : "#1e293b"
                                    border.color: root.selectedIntensity === "off" ? "#94a3b8" : "#475569"
                                    border.width: root.selectedIntensity === "off" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🚫 Off"
                                        font.bold: root.selectedIntensity === "off"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "off" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "off"
                                    }
                                }

                                // Option 1: Any
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "any" ? "#312e81" : "#1e1b4b"
                                    border.color: root.selectedIntensity === "any" ? "#818cf8" : "#3730a3"
                                    border.width: root.selectedIntensity === "any" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "✨ Any"
                                        font.bold: root.selectedIntensity === "any"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "any" ? "#ffffff" : "#c7d2fe"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "any"
                                    }
                                }

                                // Option 2: Low Stakes
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "mild" ? "#831843" : "#2a0826"
                                    border.color: root.selectedIntensity === "mild" ? "#f472b6" : "#4c0519"
                                    border.width: root.selectedIntensity === "mild" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🌸 Low"
                                        font.bold: root.selectedIntensity === "mild"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "mild" ? "#ffffff" : "#fbcfe8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "mild"
                                    }
                                }

                                // Option 3: Med
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "medium" ? "#581c87" : "#1c0b38"
                                    border.color: root.selectedIntensity === "medium" ? "#c084fc" : "#4c1d95"
                                    border.width: root.selectedIntensity === "medium" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "⚖️ Med"
                                        font.bold: root.selectedIntensity === "medium"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "medium" ? "#ffffff" : "#e9d5ff"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "medium"
                                    }
                                }

                                // Option 4: High Stakes
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedIntensity === "heavy" ? "#7f1d1d" : "#300808"
                                    border.color: root.selectedIntensity === "heavy" ? "#ef4444" : "#991b1b"
                                    border.width: root.selectedIntensity === "heavy" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🔥 High"
                                        font.bold: root.selectedIntensity === "heavy"
                                        font.pixelSize: 10
                                        color: root.selectedIntensity === "heavy" ? "#ffffff" : "#fca5a5"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedIntensity = "heavy"
                                    }
                                }
                            }
                        }

                        // Local LLM Endpoint Config
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "llama-server API Endpoint (Saved in config.json)"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Default: :5001"
                                    font.pixelSize: 10
                                    color: "#a78bfa"
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                TextField {
                                    id: endpointField
                                    Layout.fillWidth: true
                                    text: (typeof backend !== "undefined" && backend && backend.endpointUrl) ? backend.endpointUrl : "http://localhost:5001/v1"
                                    placeholderText: "e.g. http://localhost:5001/v1 or :8080/v1"
                                    color: "#f8fafc"
                                    background: Rectangle {
                                        color: "#1e293b"
                                        radius: 6
                                        border.color: endpointField.activeFocus ? "#8b5cf6" : "#334155"
                                    }
                                    onEditingFinished: if (typeof backend !== "undefined" && backend) backend.updateEndpoint(text)
                                }

                                Button {
                                    id: saveEndpointBtn
                                    width: 60
                                    height: endpointField.height
                                    background: Rectangle {
                                        radius: 6
                                        color: saveEndpointBtn.hovered ? "#4f46e5" : "#4338ca"
                                    }
                                    contentItem: Text {
                                        anchors.centerIn: parent
                                        text: "Save"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                    }
                                    onClicked: if (typeof backend !== "undefined" && backend) backend.updateEndpoint(endpointField.text)
                                }
                            }
                        }

                        // CharGenUI IPC Bridge Config
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "CharGenUI IPC Bridge (:3333)"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.isCharGenOnline ? "Connected" : "Standby"
                                    font.pixelSize: 10
                                    color: root.isCharGenOnline ? "#10b981" : "#94a3b8"
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                TextField {
                                    id: chargenUrlField
                                    Layout.fillWidth: true
                                    text: (typeof backend !== "undefined" && backend && backend.charGenUrl) ? backend.charGenUrl : "http://localhost:3333"
                                    placeholderText: "http://localhost:3333"
                                    color: "#f8fafc"
                                    background: Rectangle {
                                        color: "#1e293b"
                                        radius: 6
                                        border.color: chargenUrlField.activeFocus ? "#10b981" : "#334155"
                                    }
                                    onEditingFinished: if (typeof backend !== "undefined" && backend) backend.updateCharGenUrl(text)
                                }

                                Button {
                                    id: saveChargenBtn
                                    width: 70
                                    height: chargenUrlField.height
                                    background: Rectangle {
                                        radius: 6
                                        color: saveChargenBtn.hovered ? "#059669" : "#047857"
                                    }
                                    contentItem: Text {
                                        anchors.centerIn: parent
                                        text: "Connect"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                    }
                                    onClicked: if (typeof backend !== "undefined" && backend) backend.updateCharGenUrl(chargenUrlField.text)
                                }
                            }
                        }

                        // Genre Dropdown
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "Genre / Setting"
                                font.pixelSize: 12
                                color: "#94a3b8"
                            }

                            ComboBox {
                                id: genreCombo
                                Layout.fillWidth: true
                                model: [
                                    "Modern Domestic / Slice of Life",
                                    "Victorian / Gothic Romance",
                                    "Dark Fantasy / Kingdom",
                                    "Frontier / Cabin Homesteader",
                                    "Sci-Fi / Space Opera",
                                    "Cyberpunk / Gritty Underworld"
                                ]
                                currentIndex: 0
                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 6
                                    border.color: "#334155"
                                }
                            }
                        }

                        // ==========================================
                        // FEATURE: HISTORIC TIME & FANTASY TIME SELECTOR
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "⏳ ERA & HISTORICAL TIMELINE"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.eraColor(root.selectedEra)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.eraBadgeLabel(root.selectedEra)
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.eraColor(root.selectedEra)
                                }
                            }

                            // 4-Button Mode Selector: Off | Timeless Fantasy | Historic | User Eras
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // 1. Off Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.selectedEra === "off" ? "#334155" : "#0f172a"
                                    border.color: root.selectedEra === "off" ? "#94a3b8" : "#1e293b"
                                    border.width: root.selectedEra === "off" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🚫 Off"
                                        font.bold: root.selectedEra === "off"
                                        font.pixelSize: 10
                                        color: root.selectedEra === "off" ? "#ffffff" : "#64748b"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedEra = "off"
                                    }
                                }

                                // 2. Fantasy Eras Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.isFantasyEra(root.selectedEra) ? "#581c87" : "#1e1b4b"
                                    border.color: root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#4338ca"
                                    border.width: root.isFantasyEra(root.selectedEra) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🌌 Fantasy"
                                        font.bold: root.isFantasyEra(root.selectedEra)
                                        font.pixelSize: 10
                                        color: root.isFantasyEra(root.selectedEra) ? "#ffffff" : "#c084fc"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            if (!root.isFantasyEra(root.selectedEra)) {
                                                root.selectedEra = "timeless_fantasy";
                                            }
                                            eraPickerModal.openModal("Fantasy", "");
                                        }
                                    }
                                }

                                // 3. Historic Eras Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#b45309" : "#451a03"
                                    border.color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#f59e0b" : "#78350f"
                                    border.width: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🏛️ Historic"
                                        font.bold: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra))
                                        font.pixelSize: 10
                                        color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#ffffff" : "#fcd34d"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            if (root.selectedEra === "off" || root.isFantasyEra(root.selectedEra) || root.isUserEra(root.selectedEra)) {
                                                root.selectedEra = "medieval_high_plantagenet";
                                            }
                                            eraPickerModal.openModal("Medieval", "");
                                        }
                                    }
                                }

                                // 4. User Eras Button (4th Selector)
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.isUserEra(root.selectedEra) ? "#065f46" : "#064e3b"
                                    border.color: root.isUserEra(root.selectedEra) ? "#34d399" : "#047857"
                                    border.width: root.isUserEra(root.selectedEra) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "✏️ User Eras"
                                        font.bold: root.isUserEra(root.selectedEra)
                                        font.pixelSize: 10
                                        color: root.isUserEra(root.selectedEra) ? "#ffffff" : "#a7f3d0"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            eraPickerModal.openModal("User Eras", "", true);
                                        }
                                    }
                                }
                            }

                            // Dedicated Era Search / Discovery Trigger Button
                            Rectangle {
                                Layout.fillWidth: true
                                height: 32
                                radius: 6
                                color: browseMouseForge.containsMouse ? "#1e293b" : "#090d16"
                                border.color: root.isUserEra(root.selectedEra) ? "#10b981" : (root.isFantasyEra(root.selectedEra) ? "#a855f7" : "#f59e0b")
                                border.width: 1

                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text {
                                        text: "🔍"
                                        font.pixelSize: 11
                                    }
                                    Text {
                                        text: root.selectedEra === "off" ? "Browse & Search 90+ Eras (Historical & Fantasy)..." : ("Search / Change Era (" + (root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).short_name : "Era") + ")")
                                        font.pixelSize: 11
                                        font.bold: true
                                        color: root.isUserEra(root.selectedEra) ? "#34d399" : (root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#fcd34d")
                                        elide: Text.ElideRight
                                    }
                                }

                                MouseArea {
                                    id: browseMouseForge
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (root.isUserEra(root.selectedEra)) {
                                            eraPickerModal.openModal("User Eras", "", true);
                                        } else if (root.isFantasyEra(root.selectedEra)) {
                                            eraPickerModal.openModal("Fantasy", "");
                                        } else {
                                            eraPickerModal.openModal("All", "");
                                        }
                                    }
                                }
                            }

                            // Detailed Era Dossier Preview Card
                            Rectangle {
                                Layout.fillWidth: true
                                implicitHeight: eraDossierCol.implicitHeight + 16
                                radius: 8
                                visible: root.selectedEra !== "off"
                                color: root.isUserEra(root.selectedEra) ? "#022c22" : (root.isFantasyEra(root.selectedEra) ? "#240a34" : "#1c1408")
                                border.color: root.isUserEra(root.selectedEra) ? "#10b981" : (root.isFantasyEra(root.selectedEra) ? "#a855f7" : "#b45309")
                                border.width: 1

                                ColumnLayout {
                                    id: eraDossierCol
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 4

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).name : "HISTORIC ERA"
                                            font.bold: true
                                            font.pixelSize: 10
                                            color: root.isUserEra(root.selectedEra) ? "#34d399" : (root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#fbbf24")
                                            elide: Text.ElideRight
                                        }
                                        Rectangle {
                                            height: 18
                                            width: spanDossierTxt.contentWidth + 8
                                            radius: 4
                                            color: "#0f172a"
                                            border.color: "#334155"
                                            Text {
                                                id: spanDossierTxt
                                                anchors.centerIn: parent
                                                text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).span : ""
                                                font.pixelSize: 9
                                                color: "#cbd5e1"
                                            }
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).aesthetic : ""
                                        font.pixelSize: 10
                                        color: "#cbd5e1"
                                        wrapMode: Text.WordWrap
                                        maximumLineCount: 3
                                        elide: Text.ElideRight
                                    }

                                    // Tech & Etiquette Highlights
                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2
                                        visible: root.getEraData(root.selectedEra) !== null

                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? ("⚙️ Tech/Magic: " + root.getEraData(root.selectedEra).tech) : ""
                                            font.pixelSize: 9
                                            color: "#94a3b8"
                                            wrapMode: Text.WordWrap
                                            maximumLineCount: 2
                                            elide: Text.ElideRight
                                        }

                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? ("📜 Social & Hierarchy: " + root.getEraData(root.selectedEra).social_codes) : ""
                                            font.pixelSize: 9
                                            color: "#94a3b8"
                                            wrapMode: Text.WordWrap
                                            maximumLineCount: 2
                                            elide: Text.ElideRight
                                        }
                                    }
                                }
                            }
                        }

                        // Relationship Dynamic
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "Relationship Dynamic"
                                font.pixelSize: 12
                                color: "#94a3b8"
                            }

                            TextField {
                                id: dynamicInput
                                Layout.fillWidth: true
                                text: "Domestic Discipline & Brat Taming"
                                placeholderText: "e.g. Brat Taming, Arranged Marriage, Overworked Surrender"
                                color: "#f8fafc"
                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 6
                                    border.color: dynamicInput.activeFocus ? "#8b5cf6" : "#334155"
                                }
                            }
                        }

                        // Kinks & Tropes
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "Key Tropes / Kinks (Comma-separated)"
                                font.pixelSize: 12
                                color: "#94a3b8"
                            }

                            TextField {
                                id: tropesInput
                                Layout.fillWidth: true
                                text: "Brat / Brat Tamer, Domestic Discipline, Spanking, Married Couple, Loving & Possessive"
                                placeholderText: "e.g. Spanking, Rope Bondage, Blindfold, Aftercare"
                                color: "#f8fafc"
                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 6
                                    border.color: tropesInput.activeFocus ? "#8b5cf6" : "#334155"
                                }
                            }

                            // Quick Trope / Kink Add Pills
                            Flow {
                                Layout.fillWidth: true
                                spacing: 4
                                Repeater {
                                    model: [
                                        "+ Brat Taming",
                                        "+ Over-the-Knee",
                                        "+ Corner Time",
                                        "+ Shibari Restraint",
                                        "+ Praise Kink",
                                        "+ Forced Apology",
                                        "+ Hair-Stroking Aftercare",
                                        "+ Ice Queen / Defiant"
                                    ]
                                    Rectangle {
                                        height: 20
                                        radius: 10
                                        implicitWidth: quickTropeTxt.implicitWidth + 12
                                        color: quickTropeMa.containsMouse ? "#374151" : "#1e293b"
                                        border.color: quickTropeMa.containsMouse ? "#a855f7" : "#334155"
                                        border.width: 1
                                        Text {
                                            id: quickTropeTxt
                                            anchors.centerIn: parent
                                            text: modelData
                                            font.pixelSize: 10
                                            color: quickTropeMa.containsMouse ? "#f3e8ff" : "#94a3b8"
                                        }
                                        MouseArea {
                                            id: quickTropeMa
                                            anchors.fill: parent
                                            hoverEnabled: true
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                var tag = modelData.replace("+ ", "").trim();
                                                var current = tropesInput.text.trim();
                                                if (!current) {
                                                    tropesInput.text = tag;
                                                } else if (current.indexOf(tag) === -1) {
                                                    tropesInput.text = current + ", " + tag;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Custom Inspiration
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "Custom Idea Seed / Write-in Details (Optional)"
                                font.pixelSize: 12
                                color: "#94a3b8"
                            }

                            ScrollView {
                                id: seedAreaScroll
                                Layout.fillWidth: true
                                implicitHeight: 70
                                clip: true

                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 6
                                    border.color: seedArea.activeFocus ? "#8b5cf6" : "#334155"
                                }

                                ScrollBar.vertical: ScrollBar {
                                    policy: ScrollBar.AsNeeded
                                    contentItem: Rectangle {
                                        implicitWidth: 4
                                        radius: 2
                                        color: "#64748b"
                                    }
                                }

                                TextArea {
                                    id: seedArea
                                    width: seedAreaScroll.availableWidth
                                    wrapMode: TextArea.Wrap
                                    placeholderText: ""
                                    color: "#f8fafc"
                                    selectByMouse: true
                                    leftPadding: 8
                                    rightPadding: 8
                                    topPadding: 6
                                    bottomPadding: 6
                                    background: null
                                    // Custom placeholder: Basic style's built-in PlaceholderText causes a width binding loop inside ScrollView
                                    Text {
                                        x: parent.leftPadding
                                        y: parent.topPadding
                                        width: parent.width - parent.leftPadding - parent.rightPadding
                                        text: root.selectedBotMode === "multi_character"
                                            ? "e.g. Inquisitor duo bound by blood oath, one ruthless one empathetic..."
                                            : root.selectedBotMode === "rpg_world"
                                            ? "e.g. Flooded gothic kingdom ruled by merchant guilds and ancient sea cults..."
                                            : "e.g. Wife who gets bratty when cooking dinner, pregnant with second child..."
                                        color: "#64748b"
                                        font: parent.font
                                        wrapMode: Text.Wrap
                                        visible: !parent.length && !parent.preeditText
                                    }
                                }
                            }
                        }

                        // Creative Tone / Focus Mode
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "Creative Tone / Focus Mode"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.selectedFocusMode === "off" ? "OFF" : root.selectedFocusMode.toUpperCase()
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: root.selectedFocusMode === "off" ? "#64748b" : "#c084fc"
                                }
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 5
                                Repeater {
                                    model: [
                                        { id: "off", label: "🚫 Off" },
                                        { id: "psychometric", label: "🧠 Psychometric" },
                                        { id: "domestic", label: "🏡 Domestic" },
                                        { id: "reluctant", label: "⛓️ Reluctant" },
                                        { id: "slowburn", label: "🕯️ Slow-Burn" },
                                        { id: "scene_hook", label: "⚡ Scene Hook" }
                                    ]
                                    Rectangle {
                                        height: 24
                                        radius: 6
                                        implicitWidth: focusChipTxt.implicitWidth + 14
                                        color: root.selectedFocusMode === modelData.id ? "#581c87" : "#1e293b"
                                        border.color: root.selectedFocusMode === modelData.id ? "#c084fc" : "#334155"
                                        border.width: root.selectedFocusMode === modelData.id ? 2 : 1
                                        Text {
                                            id: focusChipTxt
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: root.selectedFocusMode === modelData.id
                                            color: root.selectedFocusMode === modelData.id ? "#f3e8ff" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedFocusMode = modelData.id
                                        }
                                    }
                                }
                            }
                        }

                        // Temperature Slider
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "Creativity (Temperature)"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: tempSlider.value.toFixed(2)
                                    font.bold: true
                                    font.pixelSize: 12
                                    color: "#a78bfa"
                                }
                            }

                            Slider {
                                id: tempSlider
                                Layout.fillWidth: true
                                from: 0.4
                                to: 1.2
                                value: 0.85
                                stepSize: 0.05
                            }
                        }

                        // ==========================================
                        // FEATURE 3: COMPONENT LOCKS CONTROL BOX
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🔒 COMPONENT LOCKS (KEEP & REROLL)"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.anyLockActive ? "#fbbf24" : "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Unlock All"
                                    font.pixelSize: 10
                                    color: "#f87171"
                                    visible: root.anyLockActive
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockName = false;
                                            root.lockArchetype = false;
                                            root.lockModality = false;
                                            root.lockVoice = false;
                                            if (typeof backend !== "undefined" && backend) backend.toast("🔓 All component locks cleared.");
                                        }
                                    }
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 5

                                // Lock Name Toggle
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.lockName ? "#78350f" : "#1e293b"
                                    border.color: root.lockName ? "#f59e0b" : "#334155"
                                    border.width: root.lockName ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: root.lockName ? "🔒 Name" : "🔓 Name"
                                        font.bold: root.lockName
                                        font.pixelSize: 11
                                        color: root.lockName ? "#fef3c7" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockName = !root.lockName;
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast(root.lockName ? "🔒 Locked Name: '" + (root.activeIdea.name || "") + "'" : "🔓 Unlocked Name");
                                            }
                                        }
                                    }
                                }

                                // Lock Archetype Toggle
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.lockArchetype ? "#78350f" : "#1e293b"
                                    border.color: root.lockArchetype ? "#f59e0b" : "#334155"
                                    border.width: root.lockArchetype ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: root.lockArchetype ? "🔒 Arch" : "🔓 Arch"
                                        font.bold: root.lockArchetype
                                        font.pixelSize: 11
                                        color: root.lockArchetype ? "#fef3c7" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockArchetype = !root.lockArchetype;
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast(root.lockArchetype ? "🔒 Locked Archetype & Title" : "🔓 Unlocked Archetype");
                                            }
                                        }
                                    }
                                }

                                // Lock Dynamic / Modality Toggle
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.lockModality ? "#78350f" : "#1e293b"
                                    border.color: root.lockModality ? "#f59e0b" : "#334155"
                                    border.width: root.lockModality ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: root.lockModality ? "🔒 Dynamic" : "🔓 Dynamic"
                                        font.bold: root.lockModality
                                        font.pixelSize: 11
                                        color: root.lockModality ? "#fef3c7" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockModality = !root.lockModality;
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast(root.lockModality ? "🔒 Locked Disciplinary Dynamic & Kinks" : "🔓 Unlocked Dynamic");
                                            }
                                        }
                                    }
                                }

                                // Lock Voice Toggle
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.lockVoice ? "#78350f" : "#1e293b"
                                    border.color: root.lockVoice ? "#f59e0b" : "#334155"
                                    border.width: root.lockVoice ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: root.lockVoice ? "🔒 Voice" : "🔓 Voice"
                                        font.bold: root.lockVoice
                                        font.pixelSize: 11
                                        color: root.lockVoice ? "#fef3c7" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            root.lockVoice = !root.lockVoice;
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.toast(root.lockVoice ? "🔒 Locked Vocal Style & Contradiction" : "🔓 Unlocked Voice");
                                            }
                                        }
                                    }
                                }
                            }

                            // Dedicated Reroll Unlocked Slots Button (appears prominently when any lock active)
                            Button {
                                id: rerollLockedBtn
                                Layout.fillWidth: true
                                height: 42
                                visible: root.anyLockActive
                                enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)
                                background: Rectangle {
                                    radius: 8
                                    color: rerollLockedBtn.hovered ? "#92400e" : "#78350f"
                                    border.color: "#f59e0b"
                                    border.width: 2
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text {
                                        text: "🎲"
                                        font.pixelSize: 14
                                    }
                                    Text {
                                        text: "Reroll Unlocked Slots (Keep Locked)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#fef3c7"
                                    }
                                }
                                onClicked: {
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.rerollIdea(
                                            JSON.stringify(root.activeIdea),
                                            JSON.stringify(root.getActiveLocks()),
                                            genreCombo.currentText,
                                            dynamicInput.text,
                                            seedArea.text,
                                            root.getEffectiveIntensity(),
                                            root.selectedCorrectionTier,
                                            root.selectedEra
                                        );
                                    }
                                }
                            }
                        }

                        Item { height: 4 }

                        // Generate Buttons
                        Button {
                            id: genBtn
                            Layout.fillWidth: true
                            height: 44
                            enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)

                            background: Rectangle {
                                radius: 8
                                gradient: Gradient {
                                    GradientStop { position: 0.0; color: genBtn.hovered ? "#9333ea" : "#7c3aed" }
                                    GradientStop { position: 1.0; color: genBtn.hovered ? "#7e22ce" : "#6d28d9" }
                                }
                                border.color: "#c084fc"
                                border.width: 1
                            }

                            contentItem: RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text {
                                    text: (root.isGenerating || (typeof backend !== "undefined" && backend && backend.isGenerating)) ? "⏳ Synthesizing Idea..." : "✨ Generate via llama-server (:5001)"
                                    font.bold: true
                                    font.pixelSize: 13
                                    color: "#ffffff"
                                }
                            }

                            onClicked: {
                                var tropesList = tropesInput.text.split(",").map(function(s){ return s.trim(); });
                                if (typeof backend !== "undefined" && backend) {
                                    if (root.selectedBotMode === "group_chat_cast") {
                                        var p = seedArea.text.trim() || (genreCombo.currentText + " - " + dynamicInput.text);
                                        backend.generateGroupChatCast(
                                            p,
                                            3,
                                            genreCombo.currentText,
                                            root.getEffectiveIntensity(),
                                            root.selectedCorrectionTier,
                                            root.selectedEra
                                        );
                                    } else {
                                        backend.generateIdea(
                                            genreCombo.currentText,
                                            dynamicInput.text,
                                            JSON.stringify(tropesList),
                                            seedArea.text,
                                            tempSlider.value,
                                            root.getEffectiveIntensity(),
                                            JSON.stringify(root.getActiveLocks()),
                                            JSON.stringify(root.activeIdea),
                                            root.selectedFocusMode,
                                            root.selectedCorrectionTier,
                                            root.selectedEra,
                                            root.selectedBotMode
                                        );
                                    }
                                }
                            }
                        }

                        // Batch Forge (x3 / x5) Buttons
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Button {
                                id: batch3Btn
                                Layout.fillWidth: true
                                height: 38
                                enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)
                                background: Rectangle {
                                    radius: 8
                                    color: batch3Btn.hovered ? "#4338ca" : "#3730a3"
                                    border.color: "#818cf8"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 4
                                    Text { text: "🎲"; font.pixelSize: 12 }
                                    Text {
                                        text: "Batch Forge (x3)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#e0e7ff"
                                    }
                                }
                                onClicked: {
                                    var tropesList = tropesInput.text.split(",").map(function(s){ return s.trim(); });
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.generateBatch(
                                            3,
                                            genreCombo.currentText,
                                            dynamicInput.text,
                                            JSON.stringify(tropesList),
                                            seedArea.text,
                                            tempSlider.value,
                                            root.selectedIntensity,
                                            JSON.stringify(root.getActiveLocks()),
                                            JSON.stringify(root.activeIdea),
                                            root.selectedFocusMode,
                                            root.selectedCorrectionTier,
                                            root.selectedEra
                                        );
                                    }
                                }
                            }

                            Button {
                                id: batch5Btn
                                Layout.fillWidth: true
                                height: 38
                                enabled: !root.isGenerating && !(typeof backend !== "undefined" && backend && backend.isGenerating)
                                background: Rectangle {
                                    radius: 8
                                    color: batch5Btn.hovered ? "#5b21b6" : "#4c1d95"
                                    border.color: "#a78bfa"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 4
                                    Text { text: "🎲"; font.pixelSize: 12 }
                                    Text {
                                        text: "Batch Forge (x5)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ede9fe"
                                    }
                                }
                                onClicked: {
                                    var tropesList = tropesInput.text.split(",").map(function(s){ return s.trim(); });
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.generateBatch(
                                            5,
                                            genreCombo.currentText,
                                            dynamicInput.text,
                                            JSON.stringify(tropesList),
                                            seedArea.text,
                                            tempSlider.value,
                                            root.selectedIntensity,
                                            JSON.stringify(root.getActiveLocks()),
                                            JSON.stringify(root.activeIdea),
                                            root.selectedFocusMode,
                                            root.selectedCorrectionTier,
                                            root.selectedEra
                                        );
                                    }
                                }
                            }
                        }

                        // Procedural buttons hidden per user preference

                        Item { height: 16 }
                    }
                }
            }

            // ------------------------------------------
            // RIGHT COLUMN: CHARACTER PITCH CARD DISPLAY
            // ------------------------------------------
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#0b0f19"

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 0

                    // Top Action Bar
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: topActionBarFlow.implicitHeight + 16
                        color: "#131b2e"
                        border.color: "#1e293b"
                        border.width: 1

                        Flow {
                            id: topActionBarFlow
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 8

                            Text {
                                text: "PITCH CARD PREVIEW"
                                font.bold: true
                                font.pixelSize: 11
                                color: "#64748b"
                                height: 34
                                verticalAlignment: Text.AlignVCenter
                            }

                            // Send to CharGenUI via Server-Side IPC Bridge
                            Button {
                                id: pushIpcBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    gradient: Gradient {
                                        GradientStop { position: 0.0; color: pushIpcBtn.hovered ? "#4f46e5" : "#4338ca" }
                                        GradientStop { position: 1.0; color: pushIpcBtn.hovered ? "#059669" : "#047857" }
                                    }
                                    border.color: "#34d399"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text {
                                        text: "🚀"
                                        font.pixelSize: 13
                                    }
                                    Text {
                                        text: "Send to CharGenUI (:3333)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                        var ideaCopy = Object.assign({}, root.activeIdea);
                                        if (root.activeStoryArc) {
                                            ideaCopy.story_arc = root.activeStoryArc;
                                        }
                                        if (!ideaCopy.era && root.selectedEra !== "off" && root.getEraData(root.selectedEra)) {
                                            ideaCopy.era = root.getEraData(root.selectedEra).name;
                                        }
                                        backend.pushToCharGenUI(
                                            JSON.stringify(ideaCopy),
                                            root.autoGenerateOnSend
                                        );
                                    }
                                }
                            }

                            // Enqueue for CharGenUI Button
                            Button {
                                id: enqueueStudioBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    color: enqueueStudioBtn.hovered ? "#065f46" : "#064e3b"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "📥"; font.pixelSize: 12 }
                                    Text {
                                        text: "Enqueue"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ecfdf5"
                                    }
                                }
                                onClicked: {
                                    if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                        var raw = JSON.stringify(root.activeIdea);
                                        var id = backend.addToGrimoire(raw, "studio");
                                        if (id) backend.enqueueGrimoireItem(id);
                                    }
                                }
                            }

                            // Concept Variance Button
                            Button {
                                id: varianceStudioBtn
                                height: 34
                                visible: Boolean(root.activeIdea && root.activeIdea.name)
                                background: Rectangle {
                                    radius: 6
                                    color: varianceStudioBtn.hovered ? "#9333ea" : "#7c3aed"
                                    border.color: "#c084fc"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "🎲"; font.pixelSize: 12 }
                                    Text {
                                        text: "Variance..."
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.activeIdea) {
                                        var ideaCopy = Object.assign({}, root.activeIdea);
                                        if (root.activeStoryArc) {
                                            ideaCopy.story_arc = root.activeStoryArc;
                                        }
                                        varianceModal.openWithCharacter(ideaCopy);
                                    }
                                }
                            }

                            // Tweak / Modify Aspect Button
                            Button {
                                id: tweakStudioBtn
                                height: 34
                                visible: Boolean(root.activeIdea && root.activeIdea.name)
                                background: Rectangle {
                                    radius: 6
                                    color: tweakStudioBtn.hovered ? "#d97706" : "#b45309"
                                    border.color: "#f59e0b"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "✏️"; font.pixelSize: 12 }
                                    Text {
                                        text: "Tweak Aspect..."
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.activeIdea) {
                                        var ideaCopy = Object.assign({}, root.activeIdea);
                                        if (root.activeStoryArc) {
                                            ideaCopy.story_arc = root.activeStoryArc;
                                        }
                                        tweakModal.openWithCharacter(ideaCopy);
                                    }
                                }
                            }

                            // Auto-Forge Toggle Pill
                            Rectangle {
                                height: 34
                                radius: 6
                                color: root.autoGenerateOnSend ? "#78350f" : "#1e293b"
                                border.color: root.autoGenerateOnSend ? "#f59e0b" : "#334155"
                                border.width: root.autoGenerateOnSend ? 2 : 1
                                implicitWidth: autoGenText.implicitWidth + 20

                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text {
                                        text: root.autoGenerateOnSend ? "⚡" : "⚙️"
                                        font.pixelSize: 11
                                    }
                                    Text {
                                        id: autoGenText
                                        text: root.autoGenerateOnSend ? "Auto-Forge: ON" : "Auto-Forge: OFF"
                                        font.pixelSize: 11
                                        font.bold: root.autoGenerateOnSend
                                        color: root.autoGenerateOnSend ? "#fef3c7" : "#94a3b8"
                                    }
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        root.autoGenerateOnSend = !root.autoGenerateOnSend;
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.toast(root.autoGenerateOnSend ? "⚡ Auto-Forge ON: CharGenUI will generate card immediately!" : "⚙️ Auto-Forge OFF: CharGenUI will populate Spark generator.");
                                        }
                                    }
                                }
                            }

                            // Refine in Agent Mode Button
                            Button {
                                id: refineAgentBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    color: refineAgentBtn.hovered ? "#6d28d9" : "#5b21b6"
                                    border.color: "#8b5cf6"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text { text: "🤖"; font.pixelSize: 12 }
                                    Text {
                                        text: "Send to AI Agent"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                        backend.primeAgentWithCharacter(JSON.stringify(root.activeIdea));
                                        root.currentTab = 2;
                                    }
                                }
                            }

                            Button {
                                id: copyPremiseBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    color: copyPremiseBtn.hovered ? "#059669" : "#10b981"
                                }
                                contentItem: Text {
                                    anchors.centerIn: parent
                                    text: "📋 Copy Premise"
                                    font.bold: true
                                    font.pixelSize: 12
                                    color: "#ffffff"
                                }
                                onClicked: {
                                    if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                        var sauce = backend.formatConceptSauce(JSON.stringify(root.activeIdea));
                                        backend.copyToClipboard(sauce || root.activeIdea.premise || "");
                                    }
                                }
                            }

                            // Save Button
                            Button {
                                id: saveBtn
                                height: 34
                                background: Rectangle {
                                    radius: 6
                                    color: saveBtn.hovered ? "#374151" : "#1f2937"
                                    border.color: "#4b5563"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    anchors.centerIn: parent
                                    text: "⭐ Save Concept"
                                    font.pixelSize: 12
                                    color: "#f3f4f6"
                                }
                                onClicked: {
                                    backend.saveToHistory(JSON.stringify(root.activeIdea));
                                }
                            }
                        }
                    }

                    // Empty State Placeholder (when no idea active)
                    Item {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        visible: !root.activeIdea || !root.activeIdea.name

                        ColumnLayout {
                            anchors.centerIn: parent
                            spacing: 14
                            width: Math.min(parent.width - 60, 480)

                            Text {
                                text: "✨"
                                font.pixelSize: 42
                                Layout.alignment: Qt.AlignHCenter
                            }
                            Text {
                                Layout.alignment: Qt.AlignHCenter
                                text: "No Character Concept Loaded"
                                font.bold: true
                                font.pixelSize: 18
                                color: "#f8fafc"
                            }
                            Text {
                                Layout.fillWidth: true
                                horizontalAlignment: Text.AlignHCenter
                                wrapMode: Text.Wrap
                                text: "Configure your setting, tropes, and seed on the left, then click '✨ Generate via llama-server (:5001)' to synthesize an uncensored roleplay character dossier."
                                font.pixelSize: 12
                                color: "#94a3b8"
                                lineHeight: 1.4
                            }
                        }
                    }

                    // Pitch Card Body
                    ScrollView {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        contentWidth: availableWidth
                        clip: true
                        visible: Boolean(root.activeIdea && root.activeIdea.name)

                        ColumnLayout {
                            width: parent.width - 40
                            anchors.horizontalCenter: parent.horizontalCenter
                            spacing: 18
                            anchors.topMargin: 20
                            anchors.bottomMargin: 30

                            // Name & Archetype Banner
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 12
                                color: "#161f36"
                                border.color: "#312e81"
                                border.width: 1
                                implicitHeight: bannerCol.implicitHeight + 36

                                ColumnLayout {
                                    id: bannerCol
                                    anchors.fill: parent
                                    anchors.margins: 18
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 12

                                        Text {
                                            text: root.activeIdea.name || "Custom Character"
                                            font.bold: true
                                            font.pixelSize: 26
                                            color: "#f8fafc"
                                        }

                                        // Bot Mode Badge
                                        Rectangle {
                                            visible: Boolean(root.activeIdea.bot_mode && root.activeIdea.bot_mode !== "single")
                                            radius: 12
                                            height: 24
                                            implicitWidth: modeBadgeLabel.implicitWidth + 14
                                            color: root.activeIdea.bot_mode === "multi_character" ? "#581c87" : "#065f46"
                                            border.color: root.activeIdea.bot_mode === "multi_character" ? "#c084fc" : "#34d399"
                                            border.width: 1
                                            Text {
                                                id: modeBadgeLabel
                                                anchors.centerIn: parent
                                                text: root.activeIdea.bot_mode === "multi_character" ? "👥 Multi-Cast" : "🗺️ RPG World"
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: "#ffffff"
                                            }
                                        }

                                        // Lock Name Badge Button
                                        Rectangle {
                                            radius: 12
                                            height: 24
                                            implicitWidth: lockNameLabel.implicitWidth + 14
                                            color: root.lockName ? "#78350f" : "#1e293b"
                                            border.color: root.lockName ? "#f59e0b" : "#475569"
                                            border.width: 1
                                            Text {
                                                id: lockNameLabel
                                                anchors.centerIn: parent
                                                text: root.lockName ? "🔒 Name Locked" : "🔓 Lock Name"
                                                font.pixelSize: 10
                                                font.bold: root.lockName
                                                color: root.lockName ? "#fef3c7" : "#94a3b8"
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: root.lockName = !root.lockName
                                            }
                                        }

                                        // Age Badge
                                        Rectangle {
                                            visible: Boolean(root.activeIdea.age)
                                            radius: 6
                                            height: 24
                                            implicitWidth: ageBadgeLabel.implicitWidth + 14
                                            color: "#1e293b"
                                            border.color: "#38bdf8"
                                            border.width: 1
                                            Text {
                                                id: ageBadgeLabel
                                                anchors.centerIn: parent
                                                text: "🎂 " + (root.activeIdea.age || "")
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: "#38bdf8"
                                            }
                                        }

                                        // Source Label
                                        Rectangle {
                                            radius: 6
                                            height: 24
                                            implicitWidth: sourceLabel.implicitWidth + 14
                                            color: "#1e1b4b"
                                            border.color: "#6366f1"
                                            border.width: 1
                                            Text {
                                                id: sourceLabel
                                                anchors.centerIn: parent
                                                text: root.activeIdea.source || "Generated Concept"
                                                font.pixelSize: 10
                                                color: "#c7d2fe"
                                            }
                                        }

                                        // Intensity Tier Badge
                                        Rectangle {
                                            radius: 6
                                            height: 24
                                            implicitWidth: intensityBadgeLabel.implicitWidth + 14
                                            color: root.activeIdea.intensity === "mild" ? "#4c0519" :
                                                   root.activeIdea.intensity === "heavy" ? "#450a0a" : "#2e1065"
                                            border.color: root.activeIdea.intensity === "mild" ? "#f472b6" :
                                                          root.activeIdea.intensity === "heavy" ? "#ef4444" : "#c084fc"
                                            border.width: 1
                                            Text {
                                                id: intensityBadgeLabel
                                                anchors.centerIn: parent
                                                text: root.intensityTitle(root.activeIdea.intensity || root.selectedIntensity)
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: root.intensityColor(root.activeIdea.intensity || root.selectedIntensity)
                                            }
                                        }

                                        Item { Layout.fillWidth: true }
                                    }

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 8

                                        Text {
                                            text: root.activeIdea.title || "The Roleplay Concept"
                                            font.bold: true
                                            font.pixelSize: 15
                                            color: "#c084fc"
                                        }

                                        // Lock Archetype Badge Button
                                        Rectangle {
                                            radius: 10
                                            height: 20
                                            implicitWidth: lockArchLabel.implicitWidth + 12
                                            color: root.lockArchetype ? "#78350f" : "#1e293b"
                                            border.color: root.lockArchetype ? "#f59e0b" : "#475569"
                                            border.width: 1
                                            Text {
                                                id: lockArchLabel
                                                anchors.centerIn: parent
                                                text: root.lockArchetype ? "🔒 Arch Locked" : "🔓 Lock Archetype"
                                                font.pixelSize: 9
                                                font.bold: root.lockArchetype
                                                color: root.lockArchetype ? "#fef3c7" : "#94a3b8"
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: root.lockArchetype = !root.lockArchetype
                                            }
                                        }
                                    }

                                    Text {
                                        text: "“" + (root.activeIdea.tagline || "") + "”"
                                        font.italic: true
                                        font.pixelSize: 13
                                        color: "#94a3b8"
                                        visible: Boolean(root.activeIdea.tagline)
                                    }

                                    // Tags Flow
                                    Flow {
                                        Layout.fillWidth: true
                                        spacing: 6
                                        Repeater {
                                            model: root.activeIdea.tags || []
                                            Rectangle {
                                                height: 22
                                                radius: 4
                                                color: "#1e293b"
                                                implicitWidth: tagText.implicitWidth + 12
                                                Text {
                                                    id: tagText
                                                    anchors.centerIn: parent
                                                    text: modelData
                                                    font.pixelSize: 10
                                                    color: "#38bdf8"
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // The Premise Box (Ready to copy / edit)
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: root.isEditingPremise ? "#10b981" : "#059669"
                                border.width: root.isEditingPremise ? 2 : 1
                                implicitHeight: premiseCol.implicitHeight + 32

                                ColumnLayout {
                                    id: premiseCol
                                    anchors.fill: parent
                                    anchors.margins: 16
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            text: root.isEditingPremise ? "✏️ EDITING PLAYABLE CONCEPT" : "💡 PLAYABLE CONCEPT (PASTE DIRECTLY INTO CHARGEN UI)"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#34d399"
                                        }
                                        Item { Layout.fillWidth: true }

                                        Rectangle {
                                            radius: 6
                                            height: 24
                                            implicitWidth: editPremiseBtnTxt.implicitWidth + 14
                                            color: root.isEditingPremise ? "#065f46" : "#1f2937"
                                            border.color: root.isEditingPremise ? "#10b981" : "#4b5563"
                                            border.width: 1

                                            Text {
                                                id: editPremiseBtnTxt
                                                anchors.centerIn: parent
                                                text: root.isEditingPremise ? "💾 Save Changes" : "✏️ Edit Premise"
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: root.isEditingPremise ? "#ecfdf5" : "#cbd5e1"
                                            }

                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: {
                                                    if (root.isEditingPremise) {
                                                        if (root.activeIdea) {
                                                            root.activeIdea.premise = premiseEditArea.text;
                                                        }
                                                        root.isEditingPremise = false;
                                                        if (typeof backend !== "undefined" && backend) {
                                                            backend.toast("💾 Saved premise edits to current concept!");
                                                        }
                                                    } else {
                                                        premiseEditArea.text = (root.activeIdea && root.activeIdea.premise) ? root.activeIdea.premise : "";
                                                        root.isEditingPremise = true;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Static Display View
                                    Text {
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                        visible: !root.isEditingPremise
                                        text: root.activeIdea.premise || ""
                                        font.pixelSize: 13
                                        lineHeight: 1.4
                                        color: "#f3f4f6"
                                        font.family: "monospace"
                                    }

                                    // In-Place Editable View
                                    TextArea {
                                        id: premiseEditArea
                                        Layout.fillWidth: true
                                        implicitHeight: 180
                                        wrapMode: TextArea.Wrap
                                        visible: root.isEditingPremise
                                        text: root.activeIdea.premise || ""
                                        font.pixelSize: 13
                                        color: "#ffffff"
                                        font.family: "monospace"
                                        background: Rectangle {
                                            color: "#0f172a"
                                            radius: 6
                                            border.color: "#10b981"
                                            border.width: 1
                                        }
                                    }
                                }
                            }

                            // Central Contradiction Box
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: "#8b5cf6"
                                border.width: 1
                                implicitHeight: contraCol.implicitHeight + 28

                                ColumnLayout {
                                    id: contraCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 6

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            text: "⚡ CENTRAL CONTRADICTION (THE INTERNAL WAR)"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#c084fc"
                                        }
                                        Item { Layout.fillWidth: true }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                        text: root.activeIdea.central_contradiction || "Unspecified"
                                        font.pixelSize: 13
                                        lineHeight: 1.35
                                        color: "#e2e8f0"
                                    }
                                }
                            }

                            // Reaction Gradient Preview
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: root.lockModality ? "#f59e0b" : "#374151"
                                border.width: root.lockModality ? 2 : 1
                                implicitHeight: gradCol.implicitHeight + 28

                                ColumnLayout {
                                    id: gradCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 10

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            text: "🎯 CALIBRATED REACTION GRADIENT & DISCIPLINARY CRAVING"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#38bdf8"
                                        }
                                        Item { Layout.fillWidth: true }

                                        // Lock Dynamic / Modality Button
                                        Rectangle {
                                            radius: 10
                                            height: 20
                                            implicitWidth: lockModalityLabel.implicitWidth + 12
                                            color: root.lockModality ? "#78350f" : "#1e293b"
                                            border.color: root.lockModality ? "#f59e0b" : "#475569"
                                            border.width: 1
                                            Text {
                                                id: lockModalityLabel
                                                anchors.centerIn: parent
                                                text: root.lockModality ? "🔒 Dynamic Locked" : "🔓 Lock Dynamic"
                                                font.pixelSize: 9
                                                font.bold: root.lockModality
                                                color: root.lockModality ? "#fef3c7" : "#94a3b8"
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: root.lockModality = !root.lockModality
                                            }
                                        }
                                    }

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 6

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#7f1d1d"; Text { anchors.centerIn: parent; text: "WON'T"; font.bold: true; font.pixelSize: 10; color: "#fca5a5" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.wont) ? root.activeIdea.reaction_gradient.wont : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                        }

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#831843"; Text { anchors.centerIn: parent; text: "CRAVES"; font.bold: true; font.pixelSize: 10; color: "#f9a8d4" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.craves) ? root.activeIdea.reaction_gradient.craves : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                        }

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#1e293b"; Text { anchors.centerIn: parent; text: "NEUTRAL"; font.bold: true; font.pixelSize: 10; color: "#94a3b8" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.neutral) ? root.activeIdea.reaction_gradient.neutral : "-"; font.pixelSize: 12; color: "#94a3b8" }
                                        }

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#064e3b"; Text { anchors.centerIn: parent; text: "WILL"; font.bold: true; font.pixelSize: 10; color: "#6ee7b7" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.will) ? root.activeIdea.reaction_gradient.will : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                        }

                                        RowLayout {
                                            spacing: 8
                                            Rectangle { width: 80; height: 22; radius: 4; color: "#312e81"; Text { anchors.centerIn: parent; text: "TRUST GATE"; font.bold: true; font.pixelSize: 10; color: "#a5b4fc" } }
                                            Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.activeIdea.reaction_gradient && root.activeIdea.reaction_gradient.trust_gate) ? root.activeIdea.reaction_gradient.trust_gate : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                        }
                                    }
                                }
                            }

                            // Vocal Cadence Box
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: root.lockVoice ? "#f59e0b" : "#374151"
                                border.width: root.lockVoice ? 2 : 1
                                implicitHeight: voiceCol.implicitHeight + 28

                                ColumnLayout {
                                    id: voiceCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 6

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            text: "🗣️ VOCAL IDIOLECT & SPEECH CADENCE"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#fbbf24"
                                        }
                                        Item { Layout.fillWidth: true }

                                        // Lock Voice Button
                                        Rectangle {
                                            radius: 10
                                            height: 20
                                            implicitWidth: lockVoiceLabel.implicitWidth + 12
                                            color: root.lockVoice ? "#78350f" : "#1e293b"
                                            border.color: root.lockVoice ? "#f59e0b" : "#475569"
                                            border.width: 1
                                            Text {
                                                id: lockVoiceLabel
                                                anchors.centerIn: parent
                                                text: root.lockVoice ? "🔒 Voice Locked" : "🔓 Lock Voice"
                                                font.pixelSize: 9
                                                font.bold: root.lockVoice
                                                color: root.lockVoice ? "#fef3c7" : "#94a3b8"
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: root.lockVoice = !root.lockVoice
                                            }
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                        text: root.activeIdea.vocal_idiolect || "Standard natural speech."
                                        font.pixelSize: 12
                                        color: "#e2e8f0"
                                    }
                                }
                            }

                            // ==========================================
                            // STORY ARC & NARRATIVE TRAJECTORY
                            // ==========================================
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#0f172a"
                                border.color: root.activeStoryArc ? "#38bdf8" : "#334155"
                                border.width: 1
                                implicitHeight: storyArcCol.implicitHeight + 28

                                ColumnLayout {
                                    id: storyArcCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 8
                                        Text {
                                            text: "📖 STORY ARC & NARRATIVE TRAJECTORY"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#38bdf8"
                                        }
                                        Item { Layout.fillWidth: true }

                                        Button {
                                            height: 24
                                            implicitWidth: 140
                                            enabled: !root.isGenerating
                                            background: Rectangle {
                                                radius: 4
                                                color: parent.hovered ? "#0369a1" : "#075985"
                                                border.color: "#38bdf8"
                                            }
                                            contentItem: Text {
                                                anchors.centerIn: parent
                                                text: root.isGeneratingStoryArc ? "⏳ Drafting Arc..." : "⚡ Draft Story Arc"
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: "#e0f2fe"
                                            }
                                            onClicked: {
                                                if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                                    root.isGeneratingStoryArc = true;
                                                    backend.generateStoryArc(JSON.stringify(root.activeIdea), storyHintInput.text.trim(), String(parseInt(minArcsInput.text) || 3));
                                                }
                                            }
                                        }

                                        Button {
                                            visible: Boolean(root.activeStoryArc)
                                            height: 24
                                            implicitWidth: 80
                                            background: Rectangle {
                                                radius: 4
                                                color: parent.hovered ? "#374151" : "#1e293b"
                                                border.color: "#6b7280"
                                            }
                                            contentItem: Text {
                                                anchors.centerIn: parent
                                                text: "📋 Copy"
                                                font.pixelSize: 10
                                                color: "#e2e8f0"
                                            }
                                            onClicked: {
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.copyToClipboard(root.activeStoryArc);
                                                }
                                            }
                                        }
                                    }

                                    // Optional Rough Story Reference Input
                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 6
                                        TextField {
                                            id: storyHintInput
                                            Layout.fillWidth: true
                                            placeholderText: "Optional rough story direction or plot beat (e.g. 'forced marriage to former rival, escalating tensions')"
                                            font.pixelSize: 11
                                            color: "#f1f5f9"
                                            placeholderTextColor: "#64748b"
                                            background: Rectangle {
                                                color: "#020617"
                                                radius: 4
                                                border.color: storyHintInput.activeFocus ? "#38bdf8" : "#1e293b"
                                            }
                                        }
                                        // Min Acts input
                                        RowLayout {
                                            spacing: 4
                                            Text {
                                                text: "Acts:"
                                                font.pixelSize: 10
                                                color: "#64748b"
                                                verticalAlignment: Text.AlignVCenter
                                            }
                                            Rectangle {
                                                width: 44; height: 28; radius: 4
                                                color: "#0f172a"
                                                border.color: minArcsInput.activeFocus ? "#38bdf8" : "#334155"
                                                border.width: 1
                                                TextInput {
                                                    id: minArcsInput
                                                    anchors.centerIn: parent
                                                    text: "3"
                                                    font.pixelSize: 12
                                                    color: "#e0f2fe"
                                                    inputMethodHints: Qt.ImhDigitsOnly
                                                    validator: IntValidator { bottom: 1; top: 100 }
                                                    width: parent.width - 8
                                                    horizontalAlignment: TextInput.AlignHCenter
                                                }
                                            }
                                        }
                                        Button {
                                            text: "Clear"
                                            height: 28
                                            visible: Boolean(storyHintInput.text)
                                            background: Rectangle {
                                                radius: 4
                                                color: "#1e293b"
                                            }
                                            contentItem: Text {
                                                text: "✕"
                                                color: "#94a3b8"
                                                anchors.centerIn: parent
                                                font.pixelSize: 11
                                            }
                                            onClicked: storyHintInput.text = ""
                                        }
                                    }

                                    ScrollView {
                                        Layout.fillWidth: true
                                        height: 120
                                        clip: true
                                        TextArea {
                                            wrapMode: Text.Wrap
                                            text: root.activeStoryArc
                                            placeholderText: "Structured Story Arc (Act I Setup -> Act II Complication -> Act III Climax / Turning Point)... Click 'Draft Story Arc' or type custom narrative trajectory here."
                                            font.pixelSize: 12
                                            color: "#e0f2fe"
                                            placeholderTextColor: "#64748b"
                                            background: Rectangle {
                                                color: "#090d16"
                                                radius: 6
                                                border.color: "#1e293b"
                                            }
                                            onTextChanged: {
                                                root.activeStoryArc = text;
                                                if (root.activeIdea) root.activeIdea.story_arc = text;
                                            }
                                        }
                                    }
                                }
                            }

                            // ==========================================
                            // SCENARIO STARTER HOOK (FIRST MESSAGE)
                            // ==========================================
                            Rectangle {
                                Layout.fillWidth: true
                                radius: 10
                                color: "#111827"
                                border.color: root.activeScenarioHook ? "#f59e0b" : "#374151"
                                border.width: 1
                                implicitHeight: scenarioCol.implicitHeight + 28

                                ColumnLayout {
                                    id: scenarioCol
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 8
                                        Text {
                                            text: "⚡ OPENING SCENARIO STARTER (FIRST MESSAGE HOOK)"
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#fbbf24"
                                        }
                                        Item { Layout.fillWidth: true }

                                        Button {
                                            height: 24
                                            implicitWidth: 150
                                            enabled: !root.isGenerating
                                            background: Rectangle {
                                                radius: 4
                                                color: parent.hovered ? "#92400e" : "#78350f"
                                                border.color: "#f59e0b"
                                            }
                                            contentItem: Text {
                                                anchors.centerIn: parent
                                                text: root.isGeneratingScenario ? "⏳ Drafting Scene..." : "⚡ Generate Hook"
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: "#fef3c7"
                                            }
                                            onClicked: {
                                                if (root.activeIdea && typeof backend !== "undefined" && backend) {
                                                    root.isGeneratingScenario = true;
                                                    backend.generateScenarioHook(JSON.stringify(root.activeIdea));
                                                }
                                            }
                                        }

                                        Button {
                                            visible: Boolean(root.activeScenarioHook)
                                            height: 24
                                            implicitWidth: 90
                                            background: Rectangle {
                                                radius: 4
                                                color: parent.hovered ? "#374151" : "#1e293b"
                                                border.color: "#6b7280"
                                            }
                                            contentItem: Text {
                                                anchors.centerIn: parent
                                                text: "📋 Copy Hook"
                                                font.pixelSize: 10
                                                color: "#e2e8f0"
                                            }
                                            onClicked: {
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.copyToClipboard(root.activeScenarioHook);
                                                }
                                            }
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                        visible: Boolean(root.activeScenarioHook)
                                        text: root.activeScenarioHook
                                        font.pixelSize: 12
                                        lineHeight: 1.4
                                        color: "#fed7aa"
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        visible: !root.activeScenarioHook
                                        text: "Generate an atmospheric opening roleplay starter with active domestic friction, tactile setting details, and direct dialogue."
                                        font.pixelSize: 11
                                        color: "#6b7280"
                                        font.italic: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ==========================================
        // NATURAL LANGUAGE AI BRAINSTORMER VIEW (TAB 1)
        // ==========================================
        RowLayout {
            id: naturalLanguageWorkspaceView
            visible: root.currentTab === 1
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignTop
            Layout.minimumHeight: 0
            spacing: 0

            // ------------------------------------------
            // LEFT COLUMN: NATURAL LANGUAGE PROMPT INPUT & CONTROLS
            // ------------------------------------------
            Rectangle {
                Layout.preferredWidth: 460
                Layout.fillHeight: true
                color: "#0f172a"
                border.color: "#1e293b"
                border.width: 1

                ScrollView {
                    anchors.fill: parent
                    contentWidth: availableWidth
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16
                        anchors.margins: 18

                        // Section Banner
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                spacing: 8
                                Rectangle {
                                    width: 28
                                    height: 28
                                    radius: 6
                                    color: "#7c3aed"
                                    Text { anchors.centerIn: parent; text: "💬"; font.pixelSize: 14 }
                                }
                                Text {
                                    text: "Freeform AI Prompt Studio"
                                    font.bold: true
                                    font.pixelSize: 15
                                    color: "#f8fafc"
                                }
                            }
                            Text {
                                text: "Type any messy idea, character quote, trope, or dynamic in plain English. The AI will forge it into a full psychometric dossier."
                                font.pixelSize: 11
                                color: "#94a3b8"
                                wrapMode: Text.Wrap
                                Layout.fillWidth: true
                            }
                        }

                        // Main Natural Language Input Area
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "DESCRIBE YOUR CHARACTER IN NATURAL LANGUAGE"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#c084fc"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Clear"
                                    font.pixelSize: 10
                                    color: "#f87171"
                                    visible: nlPromptArea.text.length > 0
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: nlPromptArea.text = ""
                                    }
                                }
                            }

                            // Vision / Portrait Attachment Dropzone
                            Rectangle {
                                id: nlVisionDropzone
                                Layout.fillWidth: true
                                implicitHeight: root.nlAttachedVisionImage ? 76 : 42
                                radius: 8
                                color: nlVisionDropArea.containsDrag ? "#3b0764" : (root.nlAttachedVisionImage ? "#1e1b4b" : "#1e293b")
                                border.color: root.nlAttachedVisionImage ? "#a855f7" : (nlVisionDropArea.containsDrag ? "#c084fc" : "#334155")
                                border.width: root.nlAttachedVisionImage ? 1.5 : 1

                                DropArea {
                                    id: nlVisionDropArea
                                    anchors.fill: parent
                                    onDropped: function(drop) {
                                        if (drop.hasUrls && drop.urls.length > 0) {
                                            root.nlAttachedVisionImage = drop.urls[0];
                                        }
                                    }
                                }

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.margins: 6
                                    spacing: 10

                                    // Preview thumbnail or icon
                                    Rectangle {
                                        id: nlThumbBox
                                        width: root.nlAttachedVisionImage ? 64 : 28
                                        height: root.nlAttachedVisionImage ? 64 : 28
                                        radius: 6
                                        color: "#0f172a"
                                        clip: true
                                        border.color: nlThumbMa.containsMouse ? "#c084fc" : (root.nlAttachedVisionImage ? "#a855f7" : "#334155")
                                        border.width: nlThumbMa.containsMouse ? 2 : 1

                                        Image {
                                            anchors.fill: parent
                                            source: root.nlAttachedVisionImage
                                            fillMode: Image.PreserveAspectCrop
                                            visible: root.nlAttachedVisionImage.length > 0
                                        }

                                        // Hover zoom icon indicator
                                        Rectangle {
                                            anchors.fill: parent
                                            color: "#80000000"
                                            visible: root.nlAttachedVisionImage.length > 0 && nlThumbMa.containsMouse
                                            Text {
                                                anchors.centerIn: parent
                                                text: "🔍"
                                                font.pixelSize: 16
                                            }
                                        }

                                        Text {
                                            anchors.centerIn: parent
                                            text: "📷"
                                            font.pixelSize: 14
                                            visible: !root.nlAttachedVisionImage
                                        }

                                        MouseArea {
                                            id: nlThumbMa
                                            anchors.fill: parent
                                            hoverEnabled: true
                                            cursorShape: root.nlAttachedVisionImage ? Qt.PointingHandCursor : Qt.ArrowCursor
                                            onClicked: {
                                                if (root.nlAttachedVisionImage) {
                                                    root.previewZoomImageUrl = root.nlAttachedVisionImage;
                                                }
                                            }
                                        }
                                    }

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2

                                        RowLayout {
                                            spacing: 6
                                            Text {
                                                text: root.nlAttachedVisionImage ? (root.isVideoUrl(root.nlAttachedVisionImage) ? "🎬 Video Seed Attached (4 Frames)" : "👁️ Visual Seed Attached") : "Attach Media / Video Reference (Drop or Paste)"
                                                font.bold: true
                                                font.pixelSize: 11
                                                color: root.nlAttachedVisionImage ? "#c084fc" : "#e2e8f0"
                                            }
                                        }

                                        Text {
                                            text: root.nlAttachedVisionImage ? (root.nlAttachedVisionImage.split("/").pop()) : "Drag & drop art/video here, paste with Ctrl+V, or browse"
                                            font.pixelSize: 10
                                            color: root.nlAttachedVisionImage ? "#38bdf8" : "#94a3b8"
                                            elide: Text.ElideMiddle
                                            Layout.fillWidth: true
                                        }
                                    }

                                    // Paste from clipboard button
                                    Button {
                                        text: "📋 Paste"
                                        implicitHeight: 28
                                        background: Rectangle {
                                            radius: 6
                                            color: parent.hovered ? "#475569" : "#334155"
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            color: "#f8fafc"
                                            font.pixelSize: 10
                                            font.bold: true
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                var p = backend.pasteMediaFromClipboard();
                                                if (p && p.length > 0) {
                                                    root.nlAttachedVisionImage = p;
                                                    root.toastText = "📋 Pasted media from clipboard!";
                                                    toastAnim.restart();
                                                } else {
                                                    root.toastText = "⚠️ No image or video in clipboard.";
                                                    toastAnim.restart();
                                                }
                                            }
                                        }
                                    }

                                    // Browse button
                                    Button {
                                        text: root.nlAttachedVisionImage ? "Change" : "Browse"
                                        implicitHeight: 28
                                        background: Rectangle {
                                            radius: 6
                                            color: parent.hovered ? "#475569" : "#334155"
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            color: "#f8fafc"
                                            font.pixelSize: 10
                                            font.bold: true
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                        onClicked: nlVisionFileDialog.open()
                                    }

                                    // Remove button if attached
                                    Button {
                                        text: "✕"
                                        visible: root.nlAttachedVisionImage.length > 0
                                        implicitHeight: 28
                                        implicitWidth: 28
                                        background: Rectangle {
                                            radius: 6
                                            color: parent.hovered ? "#991b1b" : "#7f1d1d"
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            color: "#fecaca"
                                            font.pixelSize: 11
                                            font.bold: true
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                        onClicked: {
                                            root.nlAttachedVisionImage = "";
                                            root.nlAttachedVisionImageNotes = "";
                                        }
                                    }
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    z: -1
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: if (!root.nlAttachedVisionImage) nlVisionFileDialog.open()
                                }
                            }

                            ScrollView {
                                id: nlPromptScroll
                                Layout.fillWidth: true
                                implicitHeight: 130
                                clip: true

                                background: Rectangle {
                                    color: "#1e293b"
                                    radius: 8
                                    border.color: nlPromptArea.activeFocus ? "#a855f7" : "#334155"
                                    border.width: 1
                                }

                                ScrollBar.vertical: ScrollBar {
                                    policy: ScrollBar.AsNeeded
                                    contentItem: Rectangle {
                                        implicitWidth: 4
                                        radius: 2
                                        color: "#64748b"
                                    }
                                }

                                TextArea {
                                    id: nlPromptArea
                                    width: nlPromptScroll.availableWidth
                                    wrapMode: TextArea.Wrap
                                    placeholderText: ""
                                    font.pixelSize: 12
                                    color: "#f8fafc"
                                    selectByMouse: true
                                    leftPadding: 10
                                    rightPadding: 10
                                    topPadding: 8
                                    bottomPadding: 8
                                    background: null
                                    // Custom placeholder: Basic style's built-in PlaceholderText causes a width binding loop inside ScrollView
                                    Text {
                                        x: parent.leftPadding
                                        y: parent.topPadding
                                        width: parent.width - parent.leftPadding - parent.rightPadding
                                        text: root.selectedBotMode === "multi_character"
                                            ? "Describe your multi-character cast / duo / household...\ne.g. Two rival inquisitor partners bound by a blood contract: one ruthless and methodical, the other empathetic and reckless, hunting heretics while hiding their own forbidden pact."
                                            : root.selectedBotMode === "rpg_world"
                                            ? "Describe your RPG world / Game Master setting...\ne.g. The Sunken Citadel of Oakhaven: A flooded gothic kingdom ruled by competing merchant factions, ancient sea cults, and drowned automatons. High-stakes survival and political intrigue."
                                            : "Tell the AI anything... e.g.:\n- A tired elven knight who acts strict on patrol but secretly leaves sweets on my pillow and gets flustered when teased.\n- An overworked surgeon wife who refuses to rest until her husband physically drags her to bed and gives her strict orders."
                                        color: "#64748b"
                                        font: parent.font
                                        wrapMode: Text.Wrap
                                        visible: !parent.length && !parent.preeditText
                                    }
                                }
                            }
                        }

                        // Bot Generation Mode Selector for Natural Language AI
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Text {
                                text: "BOT GENERATION MODE"
                                font.bold: true
                                font.pixelSize: 11
                                color: root.selectedBotMode === "multi_character" ? "#c084fc" : root.selectedBotMode === "rpg_world" ? "#34d399" : "#38bdf8"
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // 1. Solo Character
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedBotMode === "single" ? "#2563eb" : "#0f172a"
                                    border.color: root.selectedBotMode === "single" ? "#38bdf8" : "#1e293b"
                                    border.width: root.selectedBotMode === "single" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "👤 Solo"
                                        font.bold: root.selectedBotMode === "single"
                                        font.pixelSize: 10
                                        color: root.selectedBotMode === "single" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedBotMode = "single"
                                    }
                                }

                                // 2. Multi-Character Cast / Duo / Household
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedBotMode === "multi_character" ? "#7c3aed" : "#0f172a"
                                    border.color: root.selectedBotMode === "multi_character" ? "#c084fc" : "#1e293b"
                                    border.width: root.selectedBotMode === "multi_character" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "👥 Multi (1 Card)"
                                        font.bold: root.selectedBotMode === "multi_character"
                                        font.pixelSize: 10
                                        color: root.selectedBotMode === "multi_character" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedBotMode = "multi_character"
                                    }
                                }

                                // 3. Separate Characters / Group Chat Cast
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedBotMode === "group_chat_cast" ? "#be185d" : "#0f172a"
                                    border.color: root.selectedBotMode === "group_chat_cast" ? "#f472b6" : "#1e293b"
                                    border.width: root.selectedBotMode === "group_chat_cast" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "👑 Group Chat (N Cards)"
                                        font.bold: root.selectedBotMode === "group_chat_cast"
                                        font.pixelSize: 10
                                        color: root.selectedBotMode === "group_chat_cast" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedBotMode = "group_chat_cast"
                                    }
                                }

                                // 4. RPG World / GM
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 30
                                    radius: 6
                                    color: root.selectedBotMode === "rpg_world" ? "#059669" : "#0f172a"
                                    border.color: root.selectedBotMode === "rpg_world" ? "#34d399" : "#1e293b"
                                    border.width: root.selectedBotMode === "rpg_world" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🗺️ RPG World"
                                        font.bold: root.selectedBotMode === "rpg_world"
                                        font.pixelSize: 10
                                        color: root.selectedBotMode === "rpg_world" ? "#ffffff" : "#94a3b8"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedBotMode = "rpg_world"
                                    }
                                }
                            }
                        }

                        // Quick Inspiration Starters
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Text {
                                text: "✨ INSPIRATION SEEDS (CLICK TO AUTO-FILL)"
                                font.bold: true
                                font.pixelSize: 10
                                color: "#94a3b8"
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 5

                                Repeater {
                                    model: [
                                        { label: "🌸 Flustered Knight", text: "A proud, serious knight lady who acts rigid on duty, but secretly has a massive sweet tooth, leaves honey cakes on my desk, and stammers when I praise her." },
                                        { label: "📚 Grumpy Scholar", text: "A haughty, sleep-deprived academy researcher wife who buries herself in archives, but gets clingy and defenseless whenever thunder storms roll in." },
                                        { label: "🏡 Workaholic Doctor", text: "An overworked surgeon wife of four years who refuses to take a day off until her husband physically drags her to bed and gives her strict resting orders." },
                                        { label: "🚀 Cynical Smuggler", text: "A sharp-tongued space smuggler who claims our marriage is just a tax evasion contract, but bought an absurdly expensive hyperdrive part for my ship." },
                                        { label: "👑 Disgraced Noble", text: "An aristocratic daughter of a fallen rival house married to me in an arranged truce; acts icy and haughty to disguise that she's touch-starved." },
                                        { label: "🍫 Pastry Chef Brat", text: "Perfectionist patisserie owner who manages her kitchen like an army general, but intentionally burns toast at home so her husband will put her over his knee." }
                                    ]

                                    Rectangle {
                                        height: 24
                                        radius: 12
                                        implicitWidth: chipLabel.implicitWidth + 14
                                        color: chipMa.containsMouse ? "#374151" : "#1e293b"
                                        border.color: chipMa.containsMouse ? "#c084fc" : "#334155"
                                        border.width: 1

                                        Text {
                                            id: chipLabel
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: chipMa.containsMouse ? "#f3e8ff" : "#cbd5e1"
                                        }

                                        MouseArea {
                                            id: chipMa
                                            anchors.fill: parent
                                            hoverEnabled: true
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: nlPromptArea.text = modelData.text
                                        }
                                    }
                                }
                            }
                        }

                        // Creative Focus Mode
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "Creative Tone / Focus Mode"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.selectedFocusMode === "off" ? "OFF" : root.selectedFocusMode.toUpperCase()
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: root.selectedFocusMode === "off" ? "#64748b" : "#c084fc"
                                }
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 5
                                Repeater {
                                    model: [
                                        { id: "off", label: "🚫 Off" },
                                        { id: "psychometric", label: "🧠 Psychometric" },
                                        { id: "domestic", label: "🏡 Domestic" },
                                        { id: "reluctant", label: "⛓️ Reluctant" },
                                        { id: "slowburn", label: "🕯️ Slow-Burn" },
                                        { id: "scene_hook", label: "⚡ Scene Hook" }
                                    ]
                                    Rectangle {
                                        height: 24
                                        radius: 6
                                        implicitWidth: focusChipTxt2.implicitWidth + 14
                                        color: root.selectedFocusMode === modelData.id ? "#581c87" : "#1e293b"
                                        border.color: root.selectedFocusMode === modelData.id ? "#c084fc" : "#334155"
                                        border.width: root.selectedFocusMode === modelData.id ? 2 : 1
                                        Text {
                                            id: focusChipTxt2
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: root.selectedFocusMode === modelData.id
                                            color: root.selectedFocusMode === modelData.id ? "#f3e8ff" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedFocusMode = modelData.id
                                        }
                                    }
                                }
                            }
                        }

                        // Power Dynamic & Correction Dial (With Off switch)
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "⚡ Dynamic & Correction Dial"
                                    font.pixelSize: 11
                                    font.bold: true
                                    color: root.correctionColor(root.selectedCorrectionTier)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.correctionTitle(root.selectedCorrectionTier)
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: root.correctionColor(root.selectedCorrectionTier)
                                }
                            }

                            // Row 1: Mode & Any Selectors
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Repeater {
                                    model: [
                                        { id: "off", label: "🚫 Off" },
                                        { id: "any:r", label: "🎲 Any:R" },
                                        { id: "any:ai", label: "✨ Any:AI" }
                                    ]

                                    Rectangle {
                                        Layout.fillWidth: true
                                        height: 28
                                        radius: 6
                                        color: {
                                            var active = (root.selectedCorrectionTier === modelData.id);
                                            if (active) {
                                                if (modelData.id === "off") return "#334155";
                                                if (modelData.id === "any:r") return "#0369a1";
                                                if (modelData.id === "any:ai") return "#4c1d95";
                                            }
                                            if (modelData.id === "off") return "#0f172a";
                                            if (modelData.id === "any:r") return "#082f49";
                                            if (modelData.id === "any:ai") return "#2e1065";
                                            return "#1e293b";
                                        }
                                        border.color: {
                                            var active = (root.selectedCorrectionTier === modelData.id);
                                            if (active) {
                                                if (modelData.id === "off") return "#94a3b8";
                                                if (modelData.id === "any:r") return "#38bdf8";
                                                if (modelData.id === "any:ai") return "#a78bfa";
                                            }
                                            if (modelData.id === "off") return "#1e293b";
                                            if (modelData.id === "any:r") return "#0c4a6e";
                                            if (modelData.id === "any:ai") return "#3b0764";
                                            return "#334155";
                                        }
                                        border.width: (root.selectedCorrectionTier === modelData.id) ? 2 : 1

                                        Text {
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: root.selectedCorrectionTier === modelData.id
                                            color: {
                                                if (root.selectedCorrectionTier === modelData.id) return "#ffffff";
                                                if (modelData.id === "off") return "#64748b";
                                                if (modelData.id === "any:r") return "#7dd3fc";
                                                if (modelData.id === "any:ai") return "#d8b4fe";
                                                return "#94a3b8";
                                            }
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedCorrectionTier = modelData.id
                                        }
                                    }
                                }
                            }

                            // Row 2: Specific Tiers
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Repeater {
                                    model: [
                                        { id: "mild", label: "🌸 Mild" },
                                        { id: "correction", label: "⚖️ Correction" },
                                        { id: "heavy", label: "🔥 Heavy" }
                                    ]

                                    Rectangle {
                                        Layout.fillWidth: true
                                        height: 28
                                        radius: 6
                                        color: {
                                            var active = (root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium");
                                            if (active) {
                                                if (modelData.id === "mild") return "#831843";
                                                if (modelData.id === "correction") return "#581c87";
                                                if (modelData.id === "heavy") return "#7f1d1d";
                                            }
                                            return "#1e293b";
                                        }
                                        border.color: {
                                            var active = (root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium");
                                            if (active) {
                                                if (modelData.id === "mild") return "#f472b6";
                                                if (modelData.id === "correction") return "#c084fc";
                                                if (modelData.id === "heavy") return "#ef4444";
                                            }
                                            return "#334155";
                                        }
                                        border.width: ((root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium")) ? 2 : 1

                                        Text {
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: (root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium")
                                            color: ((root.selectedCorrectionTier === modelData.id) || (modelData.id === "correction" && root.selectedCorrectionTier === "medium")) ? "#ffffff" : "#94a3b8"
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedCorrectionTier = modelData.id
                                        }
                                    }
                                }
                            }
                        }

                        // Dramatic & Emotional Stakes Dial
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🎭 Dramatic Stakes Dial"
                                    font.pixelSize: 11
                                    font.bold: true
                                    color: root.intensityColor(root.selectedIntensity)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.intensityTitle(root.selectedIntensity)
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: root.intensityColor(root.selectedIntensity)
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Repeater {
                                    model: [
                                        { id: "off", label: "🚫 Off" },
                                        { id: "any", label: "✨ Any" },
                                        { id: "mild", label: "🌸 Mild" },
                                        { id: "medium", label: "⚖️ Med" },
                                        { id: "heavy", label: "🔥 High" }
                                    ]

                                    Rectangle {
                                        Layout.fillWidth: true
                                        height: 28
                                        radius: 6
                                        color: root.selectedIntensity === modelData.id ? "#4c1d95" : "#1e293b"
                                        border.color: root.selectedIntensity === modelData.id ? "#a78bfa" : "#334155"
                                        border.width: root.selectedIntensity === modelData.id ? 2 : 1

                                        Text {
                                            anchors.centerIn: parent
                                            text: modelData.label
                                            font.pixelSize: 10
                                            font.bold: root.selectedIntensity === modelData.id
                                            color: root.selectedIntensity === modelData.id ? "#ffffff" : "#94a3b8"
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: root.selectedIntensity = modelData.id
                                        }
                                    }
                                }
                            }
                        }

                        // ==========================================
                        // FEATURE: HISTORIC TIME & FANTASY TIME SELECTOR (NATURAL LANGUAGE)
                        // ==========================================
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "⏳ Era & Historical Timeline"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: root.eraColor(root.selectedEra)
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: root.eraBadgeLabel(root.selectedEra)
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.eraColor(root.selectedEra)
                                }
                            }

                            // 4-Button Mode Selector: Off | Timeless Fantasy | Historic | User Eras
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // 1. Off Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.selectedEra === "off" ? "#334155" : "#0f172a"
                                    border.color: root.selectedEra === "off" ? "#94a3b8" : "#1e293b"
                                    border.width: root.selectedEra === "off" ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🚫 Off"
                                        font.bold: root.selectedEra === "off"
                                        font.pixelSize: 10
                                        color: root.selectedEra === "off" ? "#ffffff" : "#64748b"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.selectedEra = "off"
                                    }
                                }

                                // 2. Fantasy Eras Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.isFantasyEra(root.selectedEra) ? "#581c87" : "#1e1b4b"
                                    border.color: root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#4338ca"
                                    border.width: root.isFantasyEra(root.selectedEra) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🌌 Fantasy"
                                        font.bold: root.isFantasyEra(root.selectedEra)
                                        font.pixelSize: 10
                                        color: root.isFantasyEra(root.selectedEra) ? "#ffffff" : "#c084fc"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            if (!root.isFantasyEra(root.selectedEra)) {
                                                root.selectedEra = "timeless_fantasy";
                                            }
                                            eraPickerModal.openModal("Fantasy", "");
                                        }
                                    }
                                }

                                // 3. Historic Eras Button
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#b45309" : "#451a03"
                                    border.color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#f59e0b" : "#78350f"
                                    border.width: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "🏛️ Historic"
                                        font.bold: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra))
                                        font.pixelSize: 10
                                        color: (root.selectedEra !== "off" && !root.isFantasyEra(root.selectedEra) && !root.isUserEra(root.selectedEra)) ? "#ffffff" : "#fcd34d"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            if (root.selectedEra === "off" || root.isFantasyEra(root.selectedEra) || root.isUserEra(root.selectedEra)) {
                                                root.selectedEra = "medieval_high_plantagenet";
                                            }
                                            eraPickerModal.openModal("Medieval", "");
                                        }
                                    }
                                }

                                // 4. User Eras Button (4th Selector)
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 28
                                    radius: 6
                                    color: root.isUserEra(root.selectedEra) ? "#065f46" : "#064e3b"
                                    border.color: root.isUserEra(root.selectedEra) ? "#34d399" : "#047857"
                                    border.width: root.isUserEra(root.selectedEra) ? 2 : 1
                                    Text {
                                        anchors.centerIn: parent
                                        text: "✏️ User Eras"
                                        font.bold: root.isUserEra(root.selectedEra)
                                        font.pixelSize: 10
                                        color: root.isUserEra(root.selectedEra) ? "#ffffff" : "#a7f3d0"
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            eraPickerModal.openModal("User Eras", "", true);
                                        }
                                    }
                                }
                            }

                            // Dedicated Era Search / Discovery Trigger Button
                            Rectangle {
                                Layout.fillWidth: true
                                height: 32
                                radius: 6
                                color: browseMouseNl.containsMouse ? "#1e293b" : "#090d16"
                                border.color: root.isUserEra(root.selectedEra) ? "#10b981" : (root.isFantasyEra(root.selectedEra) ? "#a855f7" : "#f59e0b")
                                border.width: 1

                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text {
                                        text: "🔍"
                                        font.pixelSize: 11
                                    }
                                    Text {
                                        text: root.selectedEra === "off" ? "Browse & Search 90+ Eras (Historical & Fantasy)..." : ("Search / Change Era (" + (root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).short_name : "Era") + ")")
                                        font.pixelSize: 11
                                        font.bold: true
                                        color: root.isUserEra(root.selectedEra) ? "#34d399" : (root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#fcd34d")
                                        elide: Text.ElideRight
                                    }
                                }

                                MouseArea {
                                    id: browseMouseNl
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (root.isUserEra(root.selectedEra)) {
                                            eraPickerModal.openModal("User Eras", "", true);
                                        } else if (root.isFantasyEra(root.selectedEra)) {
                                            eraPickerModal.openModal("Fantasy", "");
                                        } else {
                                            eraPickerModal.openModal("All", "");
                                        }
                                    }
                                }
                            }

                            // Detailed Era Dossier Preview Card
                            Rectangle {
                                Layout.fillWidth: true
                                implicitHeight: nlEraDossierCol.implicitHeight + 16
                                radius: 8
                                visible: root.selectedEra !== "off"
                                color: root.isUserEra(root.selectedEra) ? "#022c22" : (root.isFantasyEra(root.selectedEra) ? "#240a34" : "#1c1408")
                                border.color: root.isUserEra(root.selectedEra) ? "#10b981" : (root.isFantasyEra(root.selectedEra) ? "#a855f7" : "#b45309")
                                border.width: 1

                                ColumnLayout {
                                    id: nlEraDossierCol
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 4

                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).name : "HISTORIC ERA"
                                            font.bold: true
                                            font.pixelSize: 10
                                            color: root.isUserEra(root.selectedEra) ? "#34d399" : (root.isFantasyEra(root.selectedEra) ? "#c084fc" : "#fbbf24")
                                            elide: Text.ElideRight
                                        }
                                        Rectangle {
                                            height: 18
                                            width: nlSpanDossierTxt.contentWidth + 8
                                            radius: 4
                                            color: "#0f172a"
                                            border.color: "#334155"
                                            Text {
                                                id: nlSpanDossierTxt
                                                anchors.centerIn: parent
                                                text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).span : ""
                                                font.pixelSize: 9
                                                color: "#cbd5e1"
                                            }
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        text: root.getEraData(root.selectedEra) ? root.getEraData(root.selectedEra).aesthetic : ""
                                        font.pixelSize: 10
                                        color: "#cbd5e1"
                                        wrapMode: Text.WordWrap
                                        maximumLineCount: 3
                                        elide: Text.ElideRight
                                    }

                                    // Tech & Etiquette Highlights
                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2
                                        visible: root.getEraData(root.selectedEra) !== null

                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? ("⚙️ Tech/Magic: " + root.getEraData(root.selectedEra).tech) : ""
                                            font.pixelSize: 9
                                            color: "#94a3b8"
                                            wrapMode: Text.WordWrap
                                            maximumLineCount: 2
                                            elide: Text.ElideRight
                                        }

                                        Text {
                                            Layout.fillWidth: true
                                            text: root.getEraData(root.selectedEra) ? ("📜 Social & Hierarchy: " + root.getEraData(root.selectedEra).social_codes) : ""
                                            font.pixelSize: 9
                                            color: "#94a3b8"
                                            wrapMode: Text.WordWrap
                                            maximumLineCount: 2
                                            elide: Text.ElideRight
                                        }
                                    }
                                }
                            }
                        }

                        // Creativity (Temperature) Slider
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "Creativity (Temperature)"
                                    font.pixelSize: 12
                                    color: "#94a3b8"
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: nlTempSlider.value.toFixed(2)
                                    font.bold: true
                                    font.pixelSize: 12
                                    color: "#a78bfa"
                                }
                            }

                            Slider {
                                id: nlTempSlider
                                Layout.fillWidth: true
                                from: 0.4
                                to: 1.2
                                value: 0.85
                                stepSize: 0.05
                            }
                        }

                        Item { height: 4 }

                        // Forge Button
                        Button {
                            id: nlForgeBtn
                            Layout.fillWidth: true
                            height: 48
                            enabled: !root.isGenerating && (nlPromptArea.text.trim().length > 0 || root.nlAttachedVisionImage.length > 0)

                            background: Rectangle {
                                radius: 8
                                gradient: Gradient {
                                    GradientStop { position: 0.0; color: nlForgeBtn.hovered ? "#9333ea" : "#7c3aed" }
                                    GradientStop { position: 1.0; color: nlForgeBtn.hovered ? "#7e22ce" : "#6d28d9" }
                                }
                                border.color: "#c084fc"
                                border.width: 1
                            }

                            contentItem: RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text {
                                    text: root.isGenerating ? "⏳ Forging Concept from Prompt & Vision..." : (root.nlAttachedVisionImage ? "👁️ Forge Concept from Vision & Prompt (:5001)" : "🧠 Forge Concept with AI (:5001)")
                                    font.bold: true
                                    font.pixelSize: 13
                                    color: "#ffffff"
                                }
                            }

                            onClicked: {
                                if (typeof backend !== "undefined" && backend) {
                                    if (root.selectedBotMode === "group_chat_cast") {
                                        backend.generateGroupChatCast(
                                            nlPromptArea.text.trim(),
                                            3,
                                            "Fantasy",
                                            root.getEffectiveIntensity(),
                                            root.selectedCorrectionTier,
                                            root.selectedEra
                                        );
                                    } else {
                                        if (root.nlAttachedVisionImage && root.nlAttachedVisionImage.length > 0) {
                                            backend.brainstormNaturalLanguageWithVision(
                                                nlPromptArea.text.trim(),
                                                root.nlAttachedVisionImage,
                                                root.selectedFocusMode,
                                                root.getEffectiveIntensity(),
                                                nlTempSlider.value,
                                                root.selectedCorrectionTier,
                                                root.selectedEra,
                                                root.selectedBotMode,
                                                root.nlAttachedVisionImageNotes.trim()
                                            );
                                        } else {
                                            backend.brainstormNaturalLanguage(
                                                nlPromptArea.text.trim(),
                                                root.selectedFocusMode,
                                                root.getEffectiveIntensity(),
                                                nlTempSlider.value,
                                                root.selectedCorrectionTier,
                                                root.selectedEra,
                                                root.selectedBotMode
                                            );
                                        }
                                    }
                                }
                            }
                        }

                        Item { height: 16 }
                    }
                }
            }

            // ------------------------------------------
            // RIGHT COLUMN: LIVE CONCEPT DOSSIER
            // ------------------------------------------
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#0b0f19"

                // Empty State
                Rectangle {
                    anchors.centerIn: parent
                    width: 480
                    implicitHeight: emptyCol.implicitHeight + 40
                    radius: 12
                    color: "#111827"
                    border.color: "#1f2937"
                    border.width: 1
                    visible: root.naturalIdea === null

                    ColumnLayout {
                        id: emptyCol
                        anchors.centerIn: parent
                        spacing: 12
                        width: parent.width - 40

                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "💡"
                            font.pixelSize: 42
                        }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "No Concept Forged Yet"
                            font.bold: true
                            font.pixelSize: 18
                            color: "#f8fafc"
                        }
                        Text {
                            Layout.fillWidth: true
                            horizontalAlignment: Text.AlignHCenter
                            wrapMode: Text.Wrap
                            text: "Type any freeform character thought, trope, or relationship dynamic in the box on the left (or click an inspiration seed) and hit 'Forge Concept with AI' to see a full psychological dossier generated here!"
                            font.pixelSize: 12
                            color: "#94a3b8"
                            lineHeight: 1.4
                        }
                    }
                }

                // Populated Concept Dossier
                ScrollView {
                    anchors.fill: parent
                    contentWidth: availableWidth
                    clip: true
                    visible: root.naturalIdea !== null

                    ColumnLayout {
                        width: parent.width
                        spacing: 16
                        anchors.margins: 24

                        // Top Action Bar
                        Flow {
                            Layout.fillWidth: true
                            spacing: 10

                            // Send to CharGenUI Button
                            Button {
                                height: 38
                                implicitWidth: pushBtnContent2.implicitWidth + 24
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#059669" : "#047857"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: pushBtnContent2
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "🚀"; font.pixelSize: 14 }
                                    Text {
                                        text: "Send to CharGenUI (:3333)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                        var ideaCopy = Object.assign({}, root.naturalIdea);
                                        if (root.activeStoryArc) {
                                            ideaCopy.story_arc = root.activeStoryArc;
                                        }
                                        if (!ideaCopy.era && root.selectedEra !== "off" && root.getEraData(root.selectedEra)) {
                                            ideaCopy.era = root.getEraData(root.selectedEra).name;
                                        }
                                        backend.pushToCharGenUI(
                                            JSON.stringify(ideaCopy),
                                            root.autoGenerateOnSend
                                        );
                                    }
                                }
                            }

                            // Enqueue for CharGenUI Button
                            Button {
                                id: enqueueNlBtn
                                height: 38
                                background: Rectangle {
                                    radius: 8
                                    color: enqueueNlBtn.hovered ? "#065f46" : "#064e3b"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "📥"; font.pixelSize: 12 }
                                    Text { text: "Enqueue"; font.bold: true; font.pixelSize: 11; color: "#ecfdf5" }
                                }
                                onClicked: {
                                    if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                        var raw = JSON.stringify(root.naturalIdea);
                                        var id = backend.addToGrimoire(raw, "natural_language", nlPromptArea.text.trim());
                                        if (id) backend.enqueueGrimoireItem(id);
                                    }
                                }
                            }

                            // Concept Variance Button
                            Button {
                                id: varianceNlBtn
                                height: 38
                                visible: Boolean(root.naturalIdea && root.naturalIdea.name)
                                background: Rectangle {
                                    radius: 8
                                    color: varianceNlBtn.hovered ? "#9333ea" : "#7c3aed"
                                    border.color: "#c084fc"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "🎲"; font.pixelSize: 12 }
                                    Text { text: "Variance..."; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                }
                                onClicked: {
                                    if (root.naturalIdea) {
                                        var ideaCopy = Object.assign({}, root.naturalIdea);
                                        if (root.activeStoryArc) {
                                            ideaCopy.story_arc = root.activeStoryArc;
                                        }
                                        if (nlPromptArea.text.trim()) {
                                            ideaCopy.origin_prompt = nlPromptArea.text.trim();
                                        }
                                        varianceModal.openWithCharacter(ideaCopy);
                                    }
                                }
                            }

                            // Tweak / Modify Aspect Button
                            Button {
                                id: tweakNlBtn
                                height: 38
                                visible: Boolean(root.naturalIdea && root.naturalIdea.name)
                                background: Rectangle {
                                    radius: 8
                                    color: tweakNlBtn.hovered ? "#d97706" : "#b45309"
                                    border.color: "#f59e0b"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "✏️"; font.pixelSize: 12 }
                                    Text { text: "Tweak Aspect..."; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                }
                                onClicked: {
                                    if (root.naturalIdea) {
                                        var ideaCopy = Object.assign({}, root.naturalIdea);
                                        if (root.activeStoryArc) {
                                            ideaCopy.story_arc = root.activeStoryArc;
                                        }
                                        if (nlPromptArea.text.trim()) {
                                            ideaCopy.origin_prompt = nlPromptArea.text.trim();
                                        }
                                        tweakModal.openWithCharacter(ideaCopy);
                                    }
                                }
                            }

                            // Send to Studio Forge Button
                            Button {
                                height: 38
                                implicitWidth: studioLoadContent.implicitWidth + 20
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#4338ca" : "#3730a3"
                                    border.color: "#818cf8"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: studioLoadContent
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "📥"; font.pixelSize: 14 }
                                    Text {
                                        text: "Load into Studio (Lock & Reroll)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                        root.activeIdea = root.naturalIdea;
                                        root.currentTab = 0;
                                        backend.toast("📥 Concept loaded into Studio Forge! Locks and slot-reroll active.");
                                    }
                                }
                            }

                            // Copy Concept Button
                            Button {
                                height: 38
                                implicitWidth: copyBtnContent2.implicitWidth + 20
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#334155" : "#1e293b"
                                    border.color: "#475569"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: copyBtnContent2
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "📋"; font.pixelSize: 14 }
                                    Text {
                                        text: "Copy Concept (Sauce)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#cbd5e1"
                                    }
                                }
                                onClicked: {
                                    if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                        var sauce = backend.formatConceptSauce(JSON.stringify(root.naturalIdea));
                                        backend.copyToClipboard(sauce || root.naturalIdea.premise || "");
                                    }
                                }
                            }

                            Item { Layout.fillWidth: true }
                        }

                        // Character Identity Card
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 12
                            color: "#111827"
                            border.color: "#1f2937"
                            border.width: 1
                            implicitHeight: charHeaderCol2.implicitHeight + 36

                            ColumnLayout {
                                id: charHeaderCol2
                                anchors.fill: parent
                                anchors.margins: 18
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 12

                                    Text {
                                        text: (root.naturalIdea && root.naturalIdea.name) ? root.naturalIdea.name : "Custom Character"
                                        font.bold: true
                                        font.pixelSize: 26
                                        color: "#f8fafc"
                                    }

                                    // Age Badge
                                    Rectangle {
                                        visible: Boolean(root.naturalIdea && root.naturalIdea.age)
                                        radius: 6
                                        height: 24
                                        implicitWidth: ageBadgeLabel2.implicitWidth + 14
                                        color: "#1e293b"
                                        border.color: "#38bdf8"
                                        border.width: 1
                                        Text {
                                            id: ageBadgeLabel2
                                            anchors.centerIn: parent
                                            text: "🎂 " + (root.naturalIdea ? (root.naturalIdea.age || "") : "")
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: "#38bdf8"
                                        }
                                    }

                                    // Source Label
                                    Rectangle {
                                        radius: 6
                                        height: 24
                                        implicitWidth: sourceLabel2.implicitWidth + 14
                                        color: "#1e1b4b"
                                        border.color: "#6366f1"
                                        border.width: 1
                                        Text {
                                            id: sourceLabel2
                                            anchors.centerIn: parent
                                            text: (root.naturalIdea && root.naturalIdea.source) ? root.naturalIdea.source : "Natural Language Forge"
                                            font.pixelSize: 10
                                            color: "#c7d2fe"
                                        }
                                    }

                                    // Intensity Badge
                                    Rectangle {
                                        radius: 6
                                        height: 24
                                        implicitWidth: intensityBadgeLabel2.implicitWidth + 14
                                        color: root.naturalIdea && root.naturalIdea.intensity === "mild" ? "#4c0519" :
                                               root.naturalIdea && root.naturalIdea.intensity === "heavy" ? "#450a0a" : "#2e1065"
                                        border.color: root.naturalIdea && root.naturalIdea.intensity === "mild" ? "#f472b6" :
                                                      root.naturalIdea && root.naturalIdea.intensity === "heavy" ? "#ef4444" : "#c084fc"
                                        border.width: 1
                                        Text {
                                            id: intensityBadgeLabel2
                                            anchors.centerIn: parent
                                            text: root.naturalIdea ? root.intensityTitle(root.naturalIdea.intensity || root.selectedIntensity) : ""
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: root.naturalIdea ? root.intensityColor(root.naturalIdea.intensity || root.selectedIntensity) : "#c084fc"
                                        }
                                    }

                                    Item { Layout.fillWidth: true }
                                }

                                Text {
                                    text: (root.naturalIdea && root.naturalIdea.title) ? root.naturalIdea.title : "The Roleplay Concept"
                                    font.bold: true
                                    font.pixelSize: 15
                                    color: "#c084fc"
                                }

                                Text {
                                    text: "“" + (root.naturalIdea && root.naturalIdea.tagline ? root.naturalIdea.tagline : "") + "”"
                                    font.italic: true
                                    font.pixelSize: 13
                                    color: "#94a3b8"
                                    visible: Boolean(root.naturalIdea && root.naturalIdea.tagline)
                                }

                                // Tags Flow
                                Flow {
                                    Layout.fillWidth: true
                                    spacing: 6
                                    Repeater {
                                        model: (root.naturalIdea && root.naturalIdea.tags) ? root.naturalIdea.tags : []
                                        Rectangle {
                                            height: 22
                                            radius: 4
                                            color: "#1e293b"
                                            implicitWidth: tagText2.implicitWidth + 12
                                            Text {
                                                id: tagText2
                                                anchors.centerIn: parent
                                                text: modelData
                                                font.pixelSize: 10
                                                color: "#38bdf8"
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // AI Brainstorm Notes Box
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#f59e0b"
                            border.width: 1
                            visible: Boolean(root.naturalIdea && root.naturalIdea.brainstorm_notes)
                            implicitHeight: notesCol.implicitHeight + 28

                            ColumnLayout {
                                id: notesCol
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 6

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "💡 AI DESIGNER COMMENTARY & ROLEPLAY GUIDE"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#fbbf24"
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.naturalIdea && root.naturalIdea.brainstorm_notes) ? root.naturalIdea.brainstorm_notes : ""
                                    font.pixelSize: 12
                                    lineHeight: 1.35
                                    color: "#fef3c7"
                                }
                            }
                        }

                        // The Premise Box (Playable Concept)
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#10b981"
                            border.width: 1
                            implicitHeight: premiseCol2.implicitHeight + 32

                            ColumnLayout {
                                id: premiseCol2
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "💡 PLAYABLE CONCEPT (PASTE DIRECTLY INTO CHARGEN UI)"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#34d399"
                                    }
                                    Item { Layout.fillWidth: true }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.naturalIdea && root.naturalIdea.premise) ? root.naturalIdea.premise : ""
                                    font.pixelSize: 13
                                    lineHeight: 1.4
                                    color: "#f3f4f6"
                                    font.family: "monospace"
                                }
                            }
                        }

                        // Central Contradiction Box
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#8b5cf6"
                            border.width: 1
                            implicitHeight: contraCol2.implicitHeight + 28

                            ColumnLayout {
                                id: contraCol2
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 6

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "⚡ CENTRAL CONTRADICTION (THE INTERNAL WAR)"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#c084fc"
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.naturalIdea && root.naturalIdea.central_contradiction) ? root.naturalIdea.central_contradiction : "Unspecified"
                                    font.pixelSize: 13
                                    lineHeight: 1.35
                                    color: "#e2e8f0"
                                }
                            }
                        }

                        // Reaction Gradient Preview
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#38bdf8"
                            border.width: 1
                            implicitHeight: gradCol2.implicitHeight + 28

                            ColumnLayout {
                                id: gradCol2
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 10

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "🎯 CALIBRATED REACTION GRADIENT"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#38bdf8"
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 6

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#7f1d1d"; Text { anchors.centerIn: parent; text: "WON'T"; font.bold: true; font.pixelSize: 10; color: "#fca5a5" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.wont) ? root.naturalIdea.reaction_gradient.wont : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                    }

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#831843"; Text { anchors.centerIn: parent; text: "CRAVES"; font.bold: true; font.pixelSize: 10; color: "#f9a8d4" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.craves) ? root.naturalIdea.reaction_gradient.craves : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                    }

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#1e293b"; Text { anchors.centerIn: parent; text: "NEUTRAL"; font.bold: true; font.pixelSize: 10; color: "#94a3b8" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.neutral) ? root.naturalIdea.reaction_gradient.neutral : "-"; font.pixelSize: 12; color: "#94a3b8" }
                                    }

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#064e3b"; Text { anchors.centerIn: parent; text: "WILL"; font.bold: true; font.pixelSize: 10; color: "#6ee7b7" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.will) ? root.naturalIdea.reaction_gradient.will : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                    }

                                    RowLayout {
                                        spacing: 8
                                        Rectangle { width: 80; height: 22; radius: 4; color: "#312e81"; Text { anchors.centerIn: parent; text: "TRUST GATE"; font.bold: true; font.pixelSize: 10; color: "#a5b4fc" } }
                                        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; text: (root.naturalIdea && root.naturalIdea.reaction_gradient && root.naturalIdea.reaction_gradient.trust_gate) ? root.naturalIdea.reaction_gradient.trust_gate : "-"; font.pixelSize: 12; color: "#cbd5e1" }
                                    }
                                }
                            }
                        }

                        // Vocal Cadence Box
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#fbbf24"
                            border.width: 1
                            implicitHeight: voiceCol2.implicitHeight + 28

                            ColumnLayout {
                                id: voiceCol2
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 6

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "🗣️ VOCAL IDIOLECT & SPEECH CADENCE"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#fbbf24"
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.naturalIdea && root.naturalIdea.vocal_idiolect) ? root.naturalIdea.vocal_idiolect : "Standard natural speech."
                                    font.pixelSize: 12
                                    color: "#e2e8f0"
                                }
                            }
                        }

                        // Story Arc Trajectory Card (Tab 1 Natural Language)
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#0f172a"
                            border.color: root.activeStoryArc ? "#38bdf8" : "#334155"
                            border.width: 1
                            implicitHeight: storyArcCol2.implicitHeight + 28

                            ColumnLayout {
                                id: storyArcCol2
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 8
                                    Text {
                                        text: "📖 STORY ARC & NARRATIVE TRAJECTORY"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#38bdf8"
                                    }
                                    Item { Layout.fillWidth: true }

                                    Button {
                                        height: 24
                                        implicitWidth: 140
                                        enabled: !root.isGenerating
                                        background: Rectangle {
                                            radius: 4
                                            color: parent.hovered ? "#0369a1" : "#075985"
                                            border.color: "#38bdf8"
                                        }
                                        contentItem: Text {
                                            anchors.centerIn: parent
                                            text: root.isGeneratingStoryArc ? "⏳ Drafting Arc..." : "⚡ Draft Story Arc"
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: "#e0f2fe"
                                        }
                                        onClicked: {
                                            if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                                root.isGeneratingStoryArc = true;
                                                backend.generateStoryArc(JSON.stringify(root.naturalIdea), storyHintInputNl.text.trim(), String(parseInt(minArcsInputNl.text) || 3));
                                            }
                                        }
                                    }

                                    Button {
                                        visible: Boolean(root.activeStoryArc)
                                        height: 24
                                        implicitWidth: 80
                                        background: Rectangle {
                                            radius: 4
                                            color: parent.hovered ? "#374151" : "#1e293b"
                                            border.color: "#6b7280"
                                        }
                                        contentItem: Text {
                                            anchors.centerIn: parent
                                            text: "📋 Copy"
                                            font.pixelSize: 10
                                            color: "#e2e8f0"
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.copyToClipboard(root.activeStoryArc);
                                            }
                                        }
                                    }
                                }

                                // Optional Rough Story Reference Input
                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 6
                                    TextField {
                                        id: storyHintInputNl
                                        Layout.fillWidth: true
                                        placeholderText: "Optional rough story direction or plot beat (e.g. 'forced marriage to former rival, escalating tensions')"
                                        font.pixelSize: 11
                                        color: "#f1f5f9"
                                        placeholderTextColor: "#64748b"
                                        background: Rectangle {
                                            color: "#020617"
                                            radius: 4
                                            border.color: storyHintInputNl.activeFocus ? "#38bdf8" : "#1e293b"
                                        }
                                    }
                                    // Min Acts input
                                    RowLayout {
                                        spacing: 4
                                        Text {
                                            text: "Acts:"
                                            font.pixelSize: 10
                                            color: "#64748b"
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                        Rectangle {
                                            width: 44; height: 28; radius: 4
                                            color: "#0f172a"
                                            border.color: minArcsInputNl.activeFocus ? "#38bdf8" : "#334155"
                                            border.width: 1
                                            TextInput {
                                                id: minArcsInputNl
                                                anchors.centerIn: parent
                                                text: "3"
                                                font.pixelSize: 12
                                                color: "#e0f2fe"
                                                inputMethodHints: Qt.ImhDigitsOnly
                                                validator: IntValidator { bottom: 1; top: 100 }
                                                width: parent.width - 8
                                                horizontalAlignment: TextInput.AlignHCenter
                                            }
                                        }
                                    }
                                    Button {
                                        text: "Clear"
                                        height: 28
                                        visible: Boolean(storyHintInputNl.text)
                                        background: Rectangle {
                                            radius: 4
                                            color: "#1e293b"
                                        }
                                        contentItem: Text {
                                            text: "✕"
                                            color: "#94a3b8"
                                            anchors.centerIn: parent
                                            font.pixelSize: 11
                                        }
                                        onClicked: storyHintInputNl.text = ""
                                    }
                                }

                                ScrollView {
                                    Layout.fillWidth: true
                                    height: 120
                                    clip: true
                                    TextArea {
                                        wrapMode: Text.Wrap
                                        text: root.activeStoryArc
                                        placeholderText: "Structured Story Arc (Act I Setup -> Act II Complication -> Act III Climax / Turning Point)... Click 'Draft Story Arc' or type custom narrative trajectory here."
                                        font.pixelSize: 12
                                        color: "#e0f2fe"
                                        placeholderTextColor: "#64748b"
                                        background: Rectangle {
                                            color: "#090d16"
                                            radius: 6
                                            border.color: "#1e293b"
                                        }
                                        onTextChanged: {
                                            root.activeStoryArc = text;
                                            if (root.naturalIdea) root.naturalIdea.story_arc = text;
                                        }
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    visible: !root.activeStoryArc
                                    text: "Draft a rough narrative story arc to gear greetings and scenario toward a directed roleplay trajectory."
                                    font.pixelSize: 11
                                    color: "#64748b"
                                    font.italic: true
                                }
                            }
                        }

                        // Scenario Starter Hook Card
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: root.activeScenarioHook ? "#f59e0b" : "#374151"
                            border.width: 1
                            implicitHeight: scenarioCol2.implicitHeight + 28

                            ColumnLayout {
                                id: scenarioCol2
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 8
                                    Text {
                                        text: "⚡ OPENING SCENARIO STARTER (FIRST MESSAGE HOOK)"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#fbbf24"
                                    }
                                    Item { Layout.fillWidth: true }

                                    Button {
                                        height: 24
                                        implicitWidth: 150
                                        enabled: !root.isGenerating
                                        background: Rectangle {
                                            radius: 4
                                            color: parent.hovered ? "#92400e" : "#78350f"
                                            border.color: "#f59e0b"
                                        }
                                        contentItem: Text {
                                            anchors.centerIn: parent
                                            text: root.isGeneratingScenario ? "⏳ Drafting Scene..." : "⚡ Generate Hook"
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: "#fef3c7"
                                        }
                                        onClicked: {
                                            if (root.naturalIdea && typeof backend !== "undefined" && backend) {
                                                root.isGeneratingScenario = true;
                                                backend.generateScenarioHook(JSON.stringify(root.naturalIdea));
                                            }
                                        }
                                    }

                                    Button {
                                        visible: Boolean(root.activeScenarioHook)
                                        height: 24
                                        implicitWidth: 90
                                        background: Rectangle {
                                            radius: 4
                                            color: parent.hovered ? "#374151" : "#1e293b"
                                            border.color: "#6b7280"
                                        }
                                        contentItem: Text {
                                            anchors.centerIn: parent
                                            text: "📋 Copy Hook"
                                            font.pixelSize: 10
                                            color: "#e2e8f0"
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.copyToClipboard(root.activeScenarioHook);
                                            }
                                        }
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    visible: Boolean(root.activeScenarioHook)
                                    text: root.activeScenarioHook
                                    font.pixelSize: 12
                                    lineHeight: 1.4
                                    color: "#fed7aa"
                                }

                                Text {
                                    Layout.fillWidth: true
                                    visible: !root.activeScenarioHook
                                    text: "Click 'Generate Hook' to draft an atmospheric opening scene starter from this concept."
                                    font.pixelSize: 11
                                    color: "#6b7280"
                                    font.italic: true
                                }
                            }
                        }
                    }
                }
            }
        }


        // ==========================================
        // DEDICATED AI AGENT WORKSPACE VIEW (TAB 2)
        // ==========================================
        RowLayout {
            id: aiAgentWorkspaceView
            visible: root.currentTab === 2
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignTop
            Layout.minimumHeight: 0
            spacing: 0

            // ------------------------------------------
            // LEFT COLUMN: AI AGENT CHAT & STEERING
            // ------------------------------------------
            Rectangle {
                Layout.preferredWidth: 490
                Layout.fillHeight: true
                color: "#0f172a"
                border.color: "#1e293b"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8
                    anchors.margins: 12

                    // 1. Top Agent Header
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10

                        Rectangle {
                            width: 32
                            height: 32
                            radius: 8
                            color: root.currentAgentMode === "era" ? "#7c3aed" : "#6366f1"
                            Text {
                                anchors.centerIn: parent
                                text: root.currentAgentMode === "era" ? "📜" : "🤖"
                                font.pixelSize: 16
                            }
                        }

                        ColumnLayout {
                            spacing: 2
                            Text {
                                text: root.currentAgentMode === "era" ? "Master Era Architect & Worldbuilder" : "AI Character Architect & Co-Pilot"
                                font.bold: true
                                font.pixelSize: 13
                                color: "#f8fafc"
                            }
                            Text {
                                text: root.currentAgentMode === "era" ? "Paired World Architecture & Quality Linter • Multi-Partner & Sole Partner" : "Interactive multi-turn AI co-writer • Real-time concept evolution"
                                font.pixelSize: 10
                                color: root.currentAgentMode === "era" ? "#c084fc" : "#94a3b8"
                            }
                        }

                        Item { Layout.fillWidth: true }

                        // Reset Chat Button
                        Button {
                            id: resetAgentChatBtn
                            height: 28
                            implicitWidth: resetTxt.implicitWidth + 18
                            background: Rectangle {
                                radius: 6
                                color: resetAgentChatBtn.hovered ? "#450a0a" : "#1f1315"
                                border.color: "#dc2626"
                                border.width: 1
                            }
                            contentItem: RowLayout {
                                id: resetTxt
                                anchors.centerIn: parent
                                spacing: 4
                                Text { text: "🧹"; font.pixelSize: 10 }
                                Text { text: "Reset"; font.pixelSize: 10; font.bold: true; color: "#fca5a5" }
                            }
                            onClicked: {
                                if (typeof backend !== "undefined" && backend) {
                                    backend.resetAgentSession();
                                }
                            }
                        }
                    }

                    // 1b. Agent Persona Selector Dropdown
                    Rectangle {
                        Layout.fillWidth: true
                        height: 36
                        radius: 6
                        color: root.currentAgentMode === "era" ? "#1a102f" : "#111827"
                        border.color: root.currentAgentMode === "era" ? "#a855f7" : "#4f46e5"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 10
                            anchors.rightMargin: 10
                            spacing: 8

                            Text {
                                text: "AGENT PERSONA:"
                                font.bold: true
                                font.pixelSize: 10
                                color: root.currentAgentMode === "era" ? "#d8b4fe" : "#a5b4fc"
                            }

                            ComboBox {
                                id: agentPersonaCombo
                                Layout.fillWidth: true
                                height: 26
                                model: [
                                    "👤 Character Concept Doctor (Psychometrics & Dossier)",
                                    "📜 Era & Setting Architect (Paired Worlds & Quality Linter)"
                                ]
                                currentIndex: root.currentAgentMode === "character" ? 0 : 1
                                onCurrentIndexChanged: {
                                    root.currentAgentMode = currentIndex === 0 ? "character" : "era";
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.agentMode = root.currentAgentMode;
                                    }
                                    refreshAgentChat();
                                }
                                background: Rectangle {
                                    color: "#090d16"
                                    radius: 4
                                    border.color: root.currentAgentMode === "era" ? "#7e22ce" : "#334155"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    leftPadding: 8
                                    rightPadding: 20
                                    text: agentPersonaCombo.displayText
                                    font.pixelSize: 11
                                    font.bold: true
                                    color: root.currentAgentMode === "era" ? "#e9d5ff" : "#f8fafc"
                                    verticalAlignment: Text.AlignVCenter
                                    elide: Text.ElideRight
                                }
                            }
                        }
                    }

                    Button {
                        visible: root.currentAgentMode === "character"
                        Layout.fillWidth: true
                        text: "📥 Load Current CharGen Card"
                        onClicked: if (typeof backend !== "undefined" && backend) backend.loadCurrentCardIntoAgent()
                    }
                    Button {
                        visible: root.currentAgentMode === "character"
                        Layout.fillWidth: true
                        text: "📂 Import PNG / JSON / CharX to Agent"
                        onClicked: agentCardFileDialog.open()
                    }

                    // 2. Quick Steering Directives
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Text {
                            text: root.currentAgentMode === "era"
                                ? "INSPIRATION ERA PRESETS (CLICK TO FORGE SETTING)"
                                : "QUICK STEERING DIRECTIVES (CLICK TO DIRECT AI AGENT)"
                            font.bold: true
                            font.pixelSize: 9
                            color: root.currentAgentMode === "era" ? "#c084fc" : "#818cf8"
                        }

                        Flow {
                            Layout.fillWidth: true
                            spacing: 4

                            Repeater {
                                model: root.currentAgentMode === "era" ? [
                                    { label: "☁️ Sky Island", wish: "Floating Sky-Island Freehold high above the clouds with Aether-Skiff captain, crystal levitation sails, and zero ground watchers." },
                                    { label: "🌋 Hot Springs", wish: "Volcanic Geothermal Hot Springs Sanctuary in secluded obsidian caldera with mineral baths and thermal privacy wards." },
                                    { label: "🌊 Abyssal Trench", wish: "Abyssal Pearl Trench in deep bioluminescent underwater grotto with deep-diver master and siren/mermaid brides." },
                                    { label: "🏜️ Sand Oasis", wish: "Desert Mirage Oasis Estate hidden behind perpetual sand-veil wards with caravan master and silk-tent solariums." },
                                    { label: "🏔️ Alpine Hearth", wish: "Enchanted Alpine Hearth & Ironwood Timber Lodge secluded in snowy mountain pass with master wood-smith." },
                                    { label: "🔮 Astral Spire", wish: "Astral Lighthouse Sanctuary atop a lonely sea-spire with star-navigator master and acoustic silence runes." }
                                ] : [
                                    { label: "🔥 Heighten Friction", wish: "Amplify interpersonal friction, defensive pride, and emotional tension between {{char}} and {{user}}, making interactions more charged and slow-burn." },
                                    { label: "🗣️ Natural Spoken Cadence", wish: "Ensure all dialogue and mannerisms sound completely grounded, spoken aloud by a real human with natural contractions, razor wit, and dry sarcasm—strictly eliminate Spock/thesaurus tropes." },
                                    { label: "🎭 Deepen Contradiction", wish: "Sharpen {{char}}'s central contradiction: the conflict between what she desperately craves vs what her stubborn pride forbids her from asking for." },
                                    { label: "⚡ Crisis Starter", wish: "Rework the opening scenario hook to plunge {{char}} and {{user}} into an active domestic or operational crisis in media res." },
                                    { label: "🛡️ Calibrate Gradient", wish: "Calibrate the reaction gradient: define clear rules, explicit infractions, and tangible disciplinary consequences she secretly responds to." },
                                    { label: "✂️ Trim Purple Prose", wish: "Trim wordiness and purple prose across the premise while preserving sensory grit and authentic psychological stakes." }
                                ]

                                Rectangle {
                                    height: 22
                                    radius: 11
                                    implicitWidth: steerChipTxt.implicitWidth + 14
                                    color: steerChipMa.containsMouse ? "#312e81" : "#1e1b4b"
                                    border.color: steerChipMa.containsMouse ? "#a5b4fc" : "#4338ca"
                                    border.width: 1

                                    Text {
                                        id: steerChipTxt
                                        anchors.centerIn: parent
                                        text: modelData.label
                                        font.pixelSize: 9
                                        font.bold: true
                                        color: steerChipMa.containsMouse ? "#ffffff" : "#c7d2fe"
                                    }

                                    MouseArea {
                                        id: steerChipMa
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            sendAgentChatMessage(modelData.wish);
                                        }
                                    }

                                }
                            }
                        }

                    }

                    // 2b. Agent Tool Call Flow Visualizer (Era Mode) - Scrollable & Collapsible
                    Rectangle {
                        id: eraToolFlowCard
                        Layout.fillWidth: true
                        Layout.preferredHeight: toolFlowExpanded ? Math.min(eraToolFlowCol.implicitHeight + 48, 175) : 38
                        Layout.maximumHeight: toolFlowExpanded ? 180 : 38
                        radius: 8
                        color: "#0f0d1e"
                        border.color: root.isGenerating ? "#a855f7" : "#581c87"
                        border.width: 1
                        visible: root.currentAgentMode === "era" && root.eraToolSteps && root.eraToolSteps.length > 0
                        clip: true

                        property bool toolFlowExpanded: true

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 6

                            // Header (Clickable to Collapse / Expand)
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                Text { text: "🛠️"; font.pixelSize: 13 }
                                Text {
                                    text: "AGENT TOOL CALL EXECUTION FLOW"
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: "#e9d5ff"
                                }
                                Item { Layout.fillWidth: true }

                                Rectangle {
                                    height: 18
                                    radius: 9
                                    implicitWidth: toolStatusTxt.implicitWidth + 12
                                    color: root.isGenerating ? "#581c87" : "#064e3b"
                                    border.color: root.isGenerating ? "#c084fc" : "#10b981"
                                    border.width: 1

                                    Text {
                                        id: toolStatusTxt
                                        anchors.centerIn: parent
                                        text: root.isGenerating ? "EXECUTING PIPELINE ⏳" : "ALL TOOLS COMPLETE ✅"
                                        font.bold: true
                                        font.pixelSize: 9
                                        color: root.isGenerating ? "#f5d0fe" : "#a7f3d0"
                                    }
                                }

                                // Collapse/Expand toggle button
                                Rectangle {
                                    width: 22
                                    height: 22
                                    radius: 4
                                    color: toggleHoverMa.containsMouse ? "#2e1065" : "#1e1b4b"
                                    border.color: "#7e22ce"
                                    border.width: 1

                                    Text {
                                        anchors.centerIn: parent
                                        text: eraToolFlowCard.toolFlowExpanded ? "▲" : "▼"
                                        font.pixelSize: 9
                                        font.bold: true
                                        color: "#c084fc"
                                    }

                                    MouseArea {
                                        id: toggleHoverMa
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            eraToolFlowCard.toolFlowExpanded = !eraToolFlowCard.toolFlowExpanded;
                                        }
                                    }
                                }
                            }

                            // Scrollable Tool Steps Container
                            ScrollView {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                visible: eraToolFlowCard.toolFlowExpanded
                                clip: true
                                ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
                                ScrollBar.vertical.policy: ScrollBar.AsNeeded

                                ColumnLayout {
                                    id: eraToolFlowCol
                                    width: parent.width - 12
                                    spacing: 5

                                    Repeater {
                                        model: root.eraToolSteps

                                        Rectangle {
                                            Layout.fillWidth: true
                                            implicitHeight: stepRow.implicitHeight + 10
                                            radius: 6
                                            color: modelData.status === "running" ? "#241442" : "#140f26"
                                            border.color: modelData.status === "running" ? "#c084fc" : "#3b1e54"
                                            border.width: 1

                                            RowLayout {
                                                id: stepRow
                                                anchors.fill: parent
                                                anchors.margins: 6
                                                spacing: 8

                                                Text {
                                                    text: modelData.icon || "🔧"
                                                    font.pixelSize: 13
                                                }

                                                ColumnLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 1

                                                    RowLayout {
                                                        spacing: 6
                                                        Text {
                                                            text: "tool:" + (modelData.name || "call")
                                                            font.bold: true
                                                            font.pixelSize: 10
                                                            font.family: "Monospace"
                                                            color: "#c084fc"
                                                        }
                                                        Text {
                                                            text: "• " + (modelData.title || "")
                                                            font.pixelSize: 9
                                                            color: "#94a3b8"
                                                        }
                                                    }

                                                    Text {
                                                        Layout.fillWidth: true
                                                        text: modelData.output || modelData.input || ""
                                                        font.pixelSize: 9
                                                        color: modelData.status === "running" ? "#fbcfe8" : "#cbd5e1"
                                                        elide: Text.ElideRight
                                                        wrapMode: Text.Wrap
                                                    }
                                                }

                                                Rectangle {
                                                    height: 16
                                                    radius: 8
                                                    implicitWidth: stepBadgeTxt.implicitWidth + 10
                                                    color: modelData.status === "running" ? "#7e22ce" : "#047857"

                                                    Text {
                                                        id: stepBadgeTxt
                                                        anchors.centerIn: parent
                                                        text: modelData.status === "running" ? "RUNNING" : "DONE"
                                                        font.bold: true
                                                        font.pixelSize: 8
                                                        color: "#ffffff"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 3. Chat Messages Stream Container
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        color: "#0b0f19"
                        border.color: "#1e293b"
                        border.width: 1
                        radius: 8
                        clip: true

                        // Empty State in Chat: Welcome & Starter Prompts
                        ScrollView {
                            anchors.fill: parent
                            contentWidth: availableWidth
                            visible: agentMessagesModel.count === 0
                            clip: true

                            ColumnLayout {
                                width: parent.width - 24
                                anchors.horizontalCenter: parent.horizontalCenter
                                anchors.verticalCenter: parent.verticalCenter
                                spacing: 10

                                Text {
                                    Layout.alignment: Qt.AlignHCenter
                                    text: "🤖"
                                    font.pixelSize: 32
                                }

                                Text {
                                    Layout.alignment: Qt.AlignHCenter
                                    text: "Collaborate with AI Character Architect"
                                    font.bold: true
                                    font.pixelSize: 14
                                    color: "#f8fafc"
                                }

                                Text {
                                    Layout.fillWidth: true
                                    horizontalAlignment: Text.AlignHCenter
                                    wrapMode: Text.Wrap
                                    text: "Chat naturally with the AI to brainstorm, shape, or critique character concepts. The live Weaver psychometric dossier will evolve on the right."
                                    font.pixelSize: 11
                                    color: "#94a3b8"
                                }

                                Flow {
                                    Layout.fillWidth: true
                                    spacing: 5

                                    Repeater {
                                        model: [
                                            { label: "🌸 Flustered Knight", text: "A proud, serious knight lady who acts rigid on duty, but secretly has a massive sweet tooth, leaves honey cakes on my desk, and stammers when I praise her." },
                                            { label: "📚 Grumpy Scholar", text: "A haughty, sleep-deprived academy researcher wife who buries herself in archives, but gets clingy and defenseless whenever thunder storms roll in." },
                                            { label: "🏡 Workaholic Doctor", text: "An overworked surgeon wife of four years who refuses to take a day off until her husband physically drags her to bed and gives her strict resting orders." },
                                            { label: "🚀 Cynical Smuggler", text: "A sharp-tongued space smuggler who claims our marriage is just a tax evasion contract, but bought an absurdly expensive hyperdrive part for my ship." },
                                            { label: "👑 Disgraced Noble", text: "An aristocratic daughter of a fallen rival house married to me in an arranged truce; acts icy and haughty to disguise that she's touch-starved." },
                                            { label: "🍫 Pastry Chef Brat", text: "Perfectionist patisserie owner who manages her kitchen like an army general, but intentionally burns toast at home so her husband will put her over his knee." }
                                        ]

                                        Rectangle {
                                            height: 26
                                            radius: 13
                                            implicitWidth: starterChipLabel2.implicitWidth + 16
                                            color: starterMa2.containsMouse ? "#374151" : "#1e293b"
                                            border.color: starterMa2.containsMouse ? "#c084fc" : "#334155"
                                            border.width: 1

                                            Text {
                                                id: starterChipLabel2
                                                anchors.centerIn: parent
                                                text: modelData.label
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: starterMa2.containsMouse ? "#f3e8ff" : "#cbd5e1"
                                            }

                                            MouseArea {
                                                id: starterMa2
                                                anchors.fill: parent
                                                hoverEnabled: true
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: {
                                                    agentMsgInput.text = modelData.text;
                                                    agentMsgInput.forceActiveFocus();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Message Stream ListView
                        ListView {
                            id: agentChatListView
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 10
                            clip: true
                            visible: agentMessagesModel.count > 0
                            model: agentMessagesModel

                            delegate: ColumnLayout {
                                width: agentChatListView.width
                                spacing: 4

                                RowLayout {
                                    Layout.fillWidth: true
                                    Layout.leftMargin: model.role === "user" ? 40 : 4
                                    Layout.rightMargin: model.role === "user" ? 4 : 40
                                    spacing: 6

                                    Item { Layout.fillWidth: true; visible: model.role === "user" }

                                    Text {
                                        text: model.role === "user" ? "👤 You" : "🤖 AI Architect"
                                        font.bold: true
                                        font.pixelSize: 10
                                        color: model.role === "user" ? "#818cf8" : "#a855f7"
                                    }

                                    Item { Layout.fillWidth: true; visible: model.role !== "user" }
                                }

                                Rectangle {
                                    Layout.alignment: model.role === "user" ? Qt.AlignRight : Qt.AlignLeft
                                    implicitWidth: Math.min(msgText.implicitWidth + 24, agentChatListView.width - 40)
                                    implicitHeight: msgText.implicitHeight + 18
                                    radius: 10
                                    color: model.role === "user" ? "#1e1b4b" : "#111827"
                                    border.color: model.role === "user" ? "#4338ca" : "#2e1065"
                                    border.width: 1

                                    TextEdit {
                                        id: msgText
                                        anchors.fill: parent
                                        anchors.margins: 9
                                        text: model.content
                                        font.pixelSize: 11
                                        color: model.role === "user" ? "#e0e7ff" : "#f1f5f9"
                                        wrapMode: TextEdit.Wrap
                                        readOnly: true
                                        selectByMouse: true
                                    }
                                }
                            }
                        }

                        // Generating Indicator Overlay
                        Rectangle {
                            anchors.bottom: parent.bottom
                            anchors.left: parent.left
                            anchors.right: parent.right
                            height: 30
                            color: "#18181b"
                            opacity: 0.92
                            border.color: "#7c3aed"
                            border.width: 1
                            visible: root.isGenerating

                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text { text: "⏳"; font.pixelSize: 12 }
                                Text {
                                    text: "AI Agent is deliberating & updating dossier (:5001)..."
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#c084fc"
                                }
                            }
                        }
                    }

                    // 4. Chat Input & Send Controls
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        // Queued Agent Instruction Pill (Feature 2)
                        Rectangle {
                            id: queuedInstructionPill
                            Layout.fillWidth: true
                            implicitHeight: 32
                            radius: 6
                            color: "#1e1b4b"
                            border.color: "#818cf8"
                            border.width: 1
                            visible: root.isGenerating && (typeof backend !== "undefined" && backend && backend.queuedAgentInstruction && backend.queuedAgentInstruction.length > 0)

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 10
                                anchors.rightMargin: 10
                                spacing: 8

                                Text {
                                    text: "📥 Queued for next step:"
                                    font.bold: true
                                    font.pixelSize: 10
                                    color: "#a5b4fc"
                                }

                                Text {
                                    Layout.fillWidth: true
                                    text: (typeof backend !== "undefined" && backend && backend.queuedAgentInstruction) ? backend.queuedAgentInstruction : ""
                                    font.pixelSize: 10
                                    color: "#f8fafc"
                                    elide: Text.ElideRight
                                }

                                Button {
                                    implicitWidth: 22
                                    implicitHeight: 22
                                    flat: true
                                    background: Rectangle {
                                        radius: 4
                                        color: parent.hovered ? "#3730a3" : "transparent"
                                    }
                                    contentItem: Text {
                                        text: "✖"
                                        font.pixelSize: 11
                                        font.bold: true
                                        color: "#fca5a5"
                                        anchors.centerIn: parent
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend && backend.clearQueuedAgentInstruction) {
                                            backend.clearQueuedAgentInstruction();
                                        }
                                    }
                                }
                            }
                        }

                        // Quick Directed Rewrite Chips (Feature 8)
                        Flow {
                            Layout.fillWidth: true
                            spacing: 6
                            visible: (root.currentAgentMode === "character" && root.agentIdea !== null) || (root.currentAgentMode === "era" && root.agentEraPair !== null)

                            Repeater {
                                model: root.currentAgentMode === "character" ? [
                                    { label: "🌀 Make Stranger", prompt: "Inject surreal, bizarre, or uncanny psychological traits and unexpected quirks into this character." },
                                    { label: "⚓ Make Grounded", prompt: "Make this character more realistic, domestic, psychologically nuanced, and emotionally grounded." },
                                    { label: "🔥 Escalate Conflict", prompt: "Sharpen the central contradiction, marital tension, and stakes in our relationship." },
                                    { label: "🍯 More Tsundere", prompt: "Amplify her defensive prickliness while making her hidden vulnerability even sweeter." }
                                ] : [
                                    { label: "🌀 Make Stranger", prompt: "Add esoteric ancient rituals, surreal architectural anomalies, or unexplainable local laws to this era." },
                                    { label: "⚓ Make Grounded", prompt: "Anchor the social hierarchy, economic realities, and everyday domestic life of this realm." },
                                    { label: "⚔️ Heighten Stakes", prompt: "Escalate external threats, border rivalries, and internal faction friction within this realm." },
                                    { label: "🌸 Deeper Harmony", prompt: "Refine the interpersonal intimacy, sanctuary rituals, and bonding dynamics between wives." }
                                ]

                                Rectangle {
                                    height: 24
                                    implicitWidth: chipTxt.implicitWidth + 16
                                    radius: 12
                                    color: chipMa.containsMouse ? "#312e81" : "#1e1b4b"
                                    border.color: chipMa.containsMouse ? "#a5b4fc" : "#4338ca"
                                    border.width: 1

                                    Text {
                                        id: chipTxt
                                        anchors.centerIn: parent
                                        text: modelData.label
                                        font.bold: true
                                        font.pixelSize: 10
                                        color: chipMa.containsMouse ? "#ffffff" : "#c7d2fe"
                                    }

                                    MouseArea {
                                        id: chipMa
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            agentMsgInput.text = modelData.prompt;
                                            agentMsgInput.forceActiveFocus();
                                            agentMsgInput.cursorPosition = agentMsgInput.text.length;
                                        }
                                    }
                                }
                            }
                        }

                        ScrollView {
                            id: agentMsgInputScroll
                            Layout.fillWidth: true
                            implicitHeight: Math.min(Math.max(agentMsgInput.contentHeight + 20, 60), 160)
                            clip: true

                            background: Rectangle {
                                color: "#1e293b"
                                radius: 8
                                border.color: agentMsgInput.activeFocus ? "#818cf8" : "#334155"
                                border.width: 1
                            }

                            ScrollBar.vertical: ScrollBar {
                                policy: ScrollBar.AsNeeded
                                contentItem: Rectangle {
                                    implicitWidth: 4
                                    radius: 2
                                    color: "#64748b"
                                }
                            }

                            TextArea {
                                id: agentMsgInput
                                width: agentMsgInputScroll.availableWidth
                                wrapMode: TextArea.Wrap
                                placeholderText: ""
                                font.pixelSize: 11
                                color: "#f8fafc"
                                selectByMouse: true
                                leftPadding: 10
                                rightPadding: 10
                                topPadding: 8
                                bottomPadding: 8
                                background: null

                                Text {
                                    x: parent.leftPadding
                                    y: parent.topPadding
                                    width: parent.width - parent.leftPadding - parent.rightPadding
                                    text: root.currentAgentMode === "era"
                                        ? "Describe your setting (genre, scale, hierarchy, relationship dynamic, tone, or reference existing era)... [Enter sends, Shift+Enter newline]"
                                        : "Tell the AI Agent what to author or evolve (e.g. 'Make her more tsundere', 'Add thunderstorm scene')... [Enter sends, Shift+Enter newline]"
                                    color: "#64748b"
                                    font: parent.font
                                    wrapMode: Text.Wrap
                                    visible: !parent.length && !parent.preeditText
                                }

                                Keys.onReturnPressed: (event) => {
                                    if (event.modifiers & Qt.ShiftModifier) {
                                        event.accepted = false;
                                    } else {
                                        event.accepted = true;
                                        sendAgentBtn.clicked();
                                    }
                                }
                                onTextChanged: {
                                    if (root.agenticEraModeActive) {
                                        root.triggerAgenticEraAutocomplete(text);
                                    } else {
                                        root.clearAgenticEraAutocomplete();
                                    }
                                }
                            }
                        }

                        // Agent Media Attachment Strip (Image or Video)
                        Rectangle {
                            Layout.fillWidth: true
                            height: root.agentAttachedVisionImage.length > 0 ? 54 : 34
                            radius: 6
                            color: agentDropArea.containsDrag ? "#3b0764" : (root.agentAttachedVisionImage ? "#1e1b4b" : "#0f172a")
                            border.color: root.agentAttachedVisionImage ? "#818cf8" : (agentDropArea.containsDrag ? "#c084fc" : "#334155")
                            border.width: root.agentAttachedVisionImage ? 1.5 : 1

                            DropArea {
                                id: agentDropArea
                                anchors.fill: parent
                                onDropped: function(drop) {
                                    if (drop.hasUrls && drop.urls.length > 0) {
                                        root.agentAttachedVisionImage = drop.urls[0];
                                    }
                                }
                            }

                            RowLayout {
                                anchors.fill: parent
                                anchors.margins: 6
                                spacing: 8

                                // Thumbnail preview if attached
                                Rectangle {
                                    visible: root.agentAttachedVisionImage.length > 0
                                    width: 42
                                    height: 42
                                    radius: 4
                                    color: "#030712"
                                    clip: true
                                    Image {
                                        anchors.fill: parent
                                        source: root.agentAttachedVisionImage
                                        fillMode: Image.PreserveAspectCrop
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.previewZoomImageUrl = root.agentAttachedVisionImage
                                    }
                                }

                                Text {
                                    text: root.agentAttachedVisionImage.length > 0
                                        ? (root.isVideoUrl(root.agentAttachedVisionImage) ? "🎬 Video Attached: " : "👁️ Media Attached: ") + root.agentAttachedVisionImage.split("/").pop()
                                        : "📎 Attach or Paste Media Reference (Image/Video)"
                                    font.pixelSize: 10
                                    color: root.agentAttachedVisionImage ? "#38bdf8" : "#94a3b8"
                                    Layout.fillWidth: true
                                    elide: Text.ElideMiddle
                                }

                                // Paste Button
                                Button {
                                    text: "📋 Paste"
                                    implicitHeight: 24
                                    background: Rectangle {
                                        radius: 4
                                        color: parent.hovered ? "#475569" : "#1e293b"
                                        border.color: "#334155"
                                    }
                                    contentItem: Text {
                                        text: parent.text
                                        color: "#f8fafc"
                                        font.pixelSize: 10
                                        font.bold: true
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            var p = backend.pasteMediaFromClipboard();
                                            if (p && p.length > 0) {
                                                root.agentAttachedVisionImage = p;
                                                root.toastText = "📋 Pasted media into Agent!";
                                                toastAnim.restart();
                                            } else {
                                                root.toastText = "⚠️ No image or video in clipboard.";
                                                toastAnim.restart();
                                            }
                                        }
                                    }
                                }

                                // Browse Button
                                Button {
                                    text: root.agentAttachedVisionImage ? "Change" : "Browse"
                                    implicitHeight: 24
                                    background: Rectangle {
                                        radius: 4
                                        color: parent.hovered ? "#475569" : "#1e293b"
                                        border.color: "#334155"
                                    }
                                    contentItem: Text {
                                        text: parent.text
                                        color: "#f8fafc"
                                        font.pixelSize: 10
                                        font.bold: true
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                    onClicked: agentVisionFileDialog.open()
                                }

                                // Clear Button
                                Button {
                                    visible: root.agentAttachedVisionImage.length > 0
                                    text: "✕"
                                    implicitHeight: 24
                                    implicitWidth: 24
                                    background: Rectangle {
                                        radius: 4
                                        color: parent.hovered ? "#991b1b" : "#7f1d1d"
                                    }
                                    contentItem: Text {
                                        text: parent.text
                                        color: "#fecaca"
                                        font.pixelSize: 10
                                        font.bold: true
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                    onClicked: {
                                        root.agentAttachedVisionImage = "";
                                        root.agentAttachedVisionImageNotes = "";
                                    }
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            // Creativity Slider
                            RowLayout {
                                spacing: 4
                                Text { text: "Temp:"; font.pixelSize: 10; color: "#94a3b8" }
                                Slider {
                                    id: agentTempSlider
                                    implicitWidth: 90
                                    from: 0.4
                                    to: 1.2
                                    value: 0.85
                                    stepSize: 0.05
                                }
                                Text { text: agentTempSlider.value.toFixed(2); font.pixelSize: 10; color: "#818cf8"; font.bold: true }
                            }

                            Item { Layout.fillWidth: true }

                            // Send Button
                            Button {
                                id: sendAgentBtn
                                height: 34
                                implicitWidth: sendContent.implicitWidth + 24
                                enabled: agentMsgInput.text.trim().length > 0 || root.agentAttachedVisionImage.length > 0

                                background: Rectangle {
                                    radius: 6
                                    gradient: Gradient {
                                        GradientStop { position: 0.0; color: sendAgentBtn.hovered ? "#4f46e5" : "#4338ca" }
                                        GradientStop { position: 1.0; color: sendAgentBtn.hovered ? "#4338ca" : "#3730a3" }
                                    }
                                    border.color: "#818cf8"
                                    border.width: 1
                                }

                                contentItem: RowLayout {
                                    id: sendContent
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text { text: "💬"; font.pixelSize: 12 }
                                    Text {
                                        text: root.isGenerating ? "Sending..." : "Send to AI Agent"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                    }
                                }

                                onClicked: {
                                    var txt = agentMsgInput.text.trim();
                                    if (txt.length > 0 || root.agentAttachedVisionImage.length > 0) {
                                        sendAgentChatMessage(txt);
                                        agentMsgInput.text = "";
                                    }
                                }
                            }

                            Button {
                                visible: root.isGenerating
                                height: 34
                                implicitWidth: 92
                                text: "Cancel"
                                enabled: root.isGenerating
                                onClicked: backend.cancelGeneration()
                                background: Rectangle {
                                    radius: 6
                                    color: parent.hovered ? "#7f1d1d" : "#451a1a"
                                    border.color: "#ef4444"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    text: parent.text
                                    color: "#fecaca"
                                    font.bold: true
                                    font.pixelSize: 11
                                    horizontalAlignment: Text.AlignHCenter
                                    verticalAlignment: Text.AlignVCenter
                                }
                            }
                        }
                    }

                    // Keep autocomplete in the chat panel so it is not clipped by the dossier.
                    AgentEraAutocomplete {
                        id: agenticEraAutocomplete
                        x: 12
                        y: Math.max(12, parent.height - height - 92)
                    }

                }

                }

                    // ------------------------------------------
                    // RIGHT COLUMN: LIVE CONCEPT DOSSIER (AGENT IDEA)
                    // ------------------------------------------
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        color: "#0b0f19"

                        // Empty State (Character Mode)
                        Rectangle {
                            anchors.centerIn: parent
                            width: 480
                            implicitHeight: agentEmptyCol.implicitHeight + 40
                            radius: 12
                            color: "#111827"
                            border.color: "#1f2937"
                            border.width: 1
                            visible: root.currentAgentMode === "character" && root.agentIdea === null

                    ColumnLayout {
                        id: agentEmptyCol
                        anchors.centerIn: parent
                        spacing: 12
                        width: parent.width - 40

                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "🤖"
                            font.pixelSize: 42
                        }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "AI Agent Co-Pilot Ready"
                            font.bold: true
                            font.pixelSize: 18
                            color: "#f8fafc"
                        }
                        Text {
                            Layout.fillWidth: true
                            horizontalAlignment: Text.AlignHCenter
                            wrapMode: Text.Wrap
                            text: "Chat with the AI Character Architect on the left to brainstorm, direct, or evolve a character. The live dossier will be crafted and updated here in real time."
                            font.pixelSize: 12
                            color: "#94a3b8"
                            lineHeight: 1.4
                        }
                    }
                }

                // Empty State (Era Architect Mode)
                Rectangle {
                    anchors.centerIn: parent
                    width: 480
                    implicitHeight: eraEmptyCol.implicitHeight + 40
                    radius: 12
                    color: "#111827"
                    border.color: "#6b21a8"
                    border.width: 1
                    visible: root.currentAgentMode === "era" && root.agentEraPair === null

                    ColumnLayout {
                        id: eraEmptyCol
                        anchors.centerIn: parent
                        spacing: 12
                        width: parent.width - 40

                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "📜"
                            font.pixelSize: 42
                        }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "Master Era Architect Ready"
                            font.bold: true
                            font.pixelSize: 18
                            color: "#f8fafc"
                        }
                        Text {
                            Layout.fillWidth: true
                            horizontalAlignment: Text.AlignHCenter
                            wrapMode: Text.Wrap
                            text: "Chat with the Era Architect on the left or select an Inspiration Preset. The paired settings (Multi-Partner & Sole Partner), quality audit, and drop-in extension exporter will render here in real time."
                            font.pixelSize: 12
                            color: "#d8b4fe"
                            lineHeight: 1.4
                        }
                    }
                }

                // Populated Concept Dossier (Character Mode)
                ScrollView {
                    anchors.fill: parent
                    contentWidth: availableWidth
                    clip: true
                    visible: root.currentAgentMode === "character" && root.agentIdea !== null

                    ColumnLayout {
                        width: parent.width
                        spacing: 16
                        anchors.margins: 24

                        // Top Action Bar
                        Flow {
                            Layout.fillWidth: true
                            spacing: 10

                            // Send to CharGenUI Button
                            Button {
                                height: 38
                                implicitWidth: agentPushBtnContent.implicitWidth + 24
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#059669" : "#047857"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: agentPushBtnContent
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "🚀"; font.pixelSize: 14 }
                                    Text {
                                        text: "Send to CharGenUI (:3333)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.agentIdea && typeof backend !== "undefined" && backend) {
                                        var ideaCopy = Object.assign({}, root.agentIdea);
                                        if (root.activeStoryArc) {
                                            ideaCopy.story_arc = root.activeStoryArc;
                                        }
                                        if (!ideaCopy.era && root.selectedEra !== "off" && root.getEraData(root.selectedEra)) {
                                            ideaCopy.era = root.getEraData(root.selectedEra).name;
                                        }
                                        backend.pushToCharGenUI(
                                            JSON.stringify(ideaCopy),
                                            root.autoGenerateOnSend
                                        );
                                    }
                                }
                            }

                            // Enqueue for CharGenUI Button
                            Button {
                                id: enqueueAgentBtn
                                height: 38
                                background: Rectangle {
                                    radius: 8
                                    color: enqueueAgentBtn.hovered ? "#065f46" : "#064e3b"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 5
                                    Text { text: "📥"; font.pixelSize: 12 }
                                    Text { text: "Enqueue"; font.bold: true; font.pixelSize: 11; color: "#ecfdf5" }
                                }
                                onClicked: {
                                    if (root.agentIdea && typeof backend !== "undefined" && backend) {
                                        var raw = JSON.stringify(root.agentIdea);
                                        var id = backend.addToGrimoire(raw, "agent");
                                        if (id) backend.enqueueGrimoireItem(id);
                                    }
                                }
                            }

                            // Send to Studio Forge Button
                            Button {
                                height: 38
                                implicitWidth: agentStudioLoadContent.implicitWidth + 20
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#4338ca" : "#3730a3"
                                    border.color: "#818cf8"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: agentStudioLoadContent
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "📥"; font.pixelSize: 14 }
                                    Text {
                                        text: "Load into Studio (Lock & Reroll)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    if (root.agentIdea && typeof backend !== "undefined" && backend) {
                                        root.activeIdea = root.agentIdea;
                                        root.currentTab = 0;
                                        backend.toast("📥 Concept loaded into Studio Forge! Locks and slot-reroll active.");
                                    }
                                }
                            }

                            // Copy Concept Button
                            Button {
                                height: 38
                                implicitWidth: agentCopyBtnContent.implicitWidth + 20
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#334155" : "#1e293b"
                                    border.color: "#475569"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: agentCopyBtnContent
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "📋"; font.pixelSize: 14 }
                                    Text {
                                        text: "Copy Premise"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#cbd5e1"
                                    }
                                }
                                onClicked: {
                                    if (root.agentIdea && typeof backend !== "undefined" && backend) {
                                        var sauce = backend.formatConceptSauce(JSON.stringify(root.agentIdea));
                                        backend.copyToClipboard(sauce || root.agentIdea.premise || "");
                                    }
                                }
                            }

                            // Diff / Compare Toggle Button (Feature 3)
                            Button {
                                visible: root.prevAgentIdea !== null
                                height: 38
                                implicitWidth: agentDiffBtnContent.implicitWidth + 20
                                background: Rectangle {
                                    radius: 8
                                    color: root.showAgentDiffView ? "#7c3aed" : (parent.hovered ? "#2e1065" : "#1e1b4b")
                                    border.color: root.showAgentDiffView ? "#c084fc" : "#6366f1"
                                    border.width: 1
                                }
                                contentItem: RowLayout {
                                    id: agentDiffBtnContent
                                    anchors.centerIn: parent
                                    spacing: 8
                                    Text { text: "👁️"; font.pixelSize: 14 }
                                    Text {
                                        text: root.showAgentDiffView ? "Hide Diff" : "Compare vs Prev Draft"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#ffffff"
                                    }
                                }
                                onClicked: {
                                    root.showAgentDiffView = !root.showAgentDiffView;
                                }
                            }

                            Item { Layout.fillWidth: true }
                        }

                        // Side-by-Side Diff Comparison Panel (Feature 3)
                        Rectangle {
                            visible: root.showAgentDiffView && root.prevAgentIdea !== null
                            Layout.fillWidth: true
                            implicitHeight: diffContentCol.implicitHeight + 28
                            radius: 12
                            color: "#0f172a"
                            border.color: "#818cf8"
                            border.width: 1

                            ColumnLayout {
                                id: diffContentCol
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 10

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "📊 Draft Comparison (Previous vs. Current Evolved)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#a5b4fc"
                                    }
                                    Item { Layout.fillWidth: true }
                                    Button {
                                        height: 24
                                        implicitWidth: 70
                                        background: Rectangle {
                                            radius: 4
                                            color: "#dc2626"
                                        }
                                        contentItem: Text {
                                            text: "⏪ Revert"
                                            font.bold: true
                                            font.pixelSize: 10
                                            color: "#ffffff"
                                            anchors.centerIn: parent
                                        }
                                        onClicked: {
                                            if (root.prevAgentIdea) {
                                                var temp = root.agentIdea;
                                                root.agentIdea = root.prevAgentIdea;
                                                root.prevAgentIdea = temp;
                                                root.toastText = "⏪ Reverted to previous character draft!";
                                                toastAnim.restart();
                                            }
                                        }
                                    }
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 12

                                    // Previous Draft Column
                                    Rectangle {
                                        Layout.fillWidth: true
                                        implicitHeight: prevColLayout.implicitHeight + 16
                                        radius: 8
                                        color: "#18181b"
                                        border.color: "#3f3f46"
                                        border.width: 1

                                        ColumnLayout {
                                            id: prevColLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 6

                                            Text {
                                                text: "⏮️ Previous: " + (root.prevAgentIdea ? (root.prevAgentIdea.name || "Nameless") : "") + " (" + (root.prevAgentIdea ? (root.prevAgentIdea.title || "") : "") + ")"
                                                font.bold: true
                                                font.pixelSize: 11
                                                color: "#f87171"
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }
                                            Text {
                                                text: root.prevAgentIdea ? (root.prevAgentIdea.tagline || "") : ""
                                                font.italic: true
                                                font.pixelSize: 10
                                                color: "#a1a1aa"
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
                                            }
                                            Text {
                                                text: root.prevAgentIdea ? (root.prevAgentIdea.premise || "") : ""
                                                font.pixelSize: 10
                                                color: "#d4d4d8"
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
                                                maximumLineCount: 6
                                                elide: Text.ElideRight
                                            }
                                        }
                                    }

                                    // Current Draft Column
                                    Rectangle {
                                        Layout.fillWidth: true
                                        implicitHeight: currColLayout.implicitHeight + 16
                                        radius: 8
                                        color: "#064e3b"
                                        border.color: "#10b981"
                                        border.width: 1

                                        ColumnLayout {
                                            id: currColLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 6

                                            Text {
                                                text: "✨ Current: " + (root.agentIdea ? (root.agentIdea.name || "Nameless") : "") + " (" + (root.agentIdea ? (root.agentIdea.title || "") : "") + ")"
                                                font.bold: true
                                                font.pixelSize: 11
                                                color: "#34d399"
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }
                                            Text {
                                                text: root.agentIdea ? (root.agentIdea.tagline || "") : ""
                                                font.italic: true
                                                font.pixelSize: 10
                                                color: "#6ee7b7"
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
                                            }
                                            Text {
                                                text: root.agentIdea ? (root.agentIdea.premise || "") : ""
                                                font.pixelSize: 10
                                                color: "#ecfdf5"
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
                                                maximumLineCount: 6
                                                elide: Text.ElideRight
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Character Identity Card
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 12
                            color: "#111827"
                            border.color: "#1f2937"
                            border.width: 1
                            implicitHeight: agentCharHeaderCol.implicitHeight + 36

                            ColumnLayout {
                                id: agentCharHeaderCol
                                anchors.fill: parent
                                anchors.margins: 18
                                spacing: 12

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 12

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 4

                                        RowLayout {
                                            spacing: 10
                                            Text {
                                                text: (root.agentIdea && root.agentIdea.name) ? root.agentIdea.name : "Character Name"
                                                font.bold: true
                                                font.pixelSize: 22
                                                color: "#f8fafc"
                                            }
                                            Rectangle {
                                                height: 22
                                                radius: 11
                                                implicitWidth: agentIntensityBadgeLabel.implicitWidth + 14
                                                color: root.agentIdea ? root.intensityColor(root.agentIdea.intensity || "any") + "22" : "#334155"
                                                border.color: root.agentIdea ? root.intensityColor(root.agentIdea.intensity || "any") : "#64748b"
                                                border.width: 1
                                                Text {
                                                    id: agentIntensityBadgeLabel
                                                    anchors.centerIn: parent
                                                    text: root.agentIdea ? root.intensityTitle(root.agentIdea.intensity || "any") : ""
                                                    font.pixelSize: 10
                                                    font.bold: true
                                                    color: root.agentIdea ? root.intensityColor(root.agentIdea.intensity || "any") : "#cbd5e1"
                                                }
                                            }

                                            // Agent Age Badge
                                            Rectangle {
                                                visible: Boolean(root.agentIdea && root.agentIdea.age)
                                                height: 22
                                                radius: 6
                                                implicitWidth: agentAgeBadgeLabel.implicitWidth + 14
                                                color: "#1e293b"
                                                border.color: "#38bdf8"
                                                border.width: 1
                                                Text {
                                                    id: agentAgeBadgeLabel
                                                    anchors.centerIn: parent
                                                    text: "🎂 " + (root.agentIdea ? (root.agentIdea.age || "") : "")
                                                    font.pixelSize: 10
                                                    font.bold: true
                                                    color: "#38bdf8"
                                                }
                                            }
                                        }

                                        Text {
                                            text: (root.agentIdea && root.agentIdea.title) ? root.agentIdea.title : ""
                                            font.pixelSize: 14
                                            font.italic: true
                                            color: "#c084fc"
                                        }
                                    }

                                    Rectangle {
                                        height: 26
                                        radius: 6
                                        color: "#1f2937"
                                        implicitWidth: agentSourceLabel.implicitWidth + 16
                                        border.color: "#374151"
                                        border.width: 1
                                        Text {
                                            id: agentSourceLabel
                                            anchors.centerIn: parent
                                            text: (root.agentIdea && root.agentIdea.source) ? root.agentIdea.source : "AI Agent"
                                            font.pixelSize: 10
                                            color: "#94a3b8"
                                        }
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.agentIdea && root.agentIdea.tagline) ? root.agentIdea.tagline : ""
                                    font.pixelSize: 12
                                    color: "#cbd5e1"
                                }

                                Flow {
                                    Layout.fillWidth: true
                                    spacing: 6
                                    visible: root.agentIdea && root.agentIdea.tags && root.agentIdea.tags.length > 0
                                    Repeater {
                                        model: (root.agentIdea && root.agentIdea.tags) ? root.agentIdea.tags : []
                                        Rectangle {
                                            height: 22
                                            radius: 11
                                            implicitWidth: agentTagText.implicitWidth + 16
                                            color: "#1e1b4b"
                                            border.color: "#4338ca"
                                            border.width: 1
                                            Text {
                                                id: agentTagText
                                                anchors.centerIn: parent
                                                text: modelData
                                                font.pixelSize: 10
                                                font.bold: true
                                                color: "#c7d2fe"
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // AI Designer Notes
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#18181b"
                            border.color: "#3f3f46"
                            border.width: 1
                            implicitHeight: agentNotesCol.implicitHeight + 24
                            visible: root.agentIdea && Boolean(root.agentIdea.brainstorm_notes)

                            ColumnLayout {
                                id: agentNotesCol
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 6
                                RowLayout {
                                    spacing: 6
                                    Text { text: "🧠"; font.pixelSize: 13 }
                                    Text { text: "AI DESIGNER COMMENTARY"; font.bold: true; font.pixelSize: 10; color: "#a1a1aa" }
                                }
                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: root.agentIdea ? root.agentIdea.brainstorm_notes : ""
                                    font.pixelSize: 11
                                    lineHeight: 1.3
                                    color: "#e4e4e7"
                                }
                            }
                        }

                        // Central Contradiction Box
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#1c1917"
                            border.color: "#78350f"
                            border.width: 1
                            implicitHeight: agentContraCol.implicitHeight + 24
                            visible: root.agentIdea && Boolean(root.agentIdea.central_contradiction)

                            ColumnLayout {
                                id: agentContraCol
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 6
                                RowLayout {
                                    spacing: 6
                                    Text { text: "⚖️"; font.pixelSize: 13 }
                                    Text { text: "CENTRAL CONTRADICTION & TENSION"; font.bold: true; font.pixelSize: 10; color: "#fbbf24" }
                                }
                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: root.agentIdea ? root.agentIdea.central_contradiction : ""
                                    font.pixelSize: 12
                                    font.bold: true
                                    lineHeight: 1.3
                                    color: "#fef3c7"
                                }
                            }
                        }

                        // Reaction Gradient
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 10
                            color: "#111827"
                            border.color: "#1f2937"
                            border.width: 1
                            implicitHeight: agentGradCol.implicitHeight + 24
                            visible: root.agentIdea && Boolean(root.agentIdea.reaction_gradient)

                            ColumnLayout {
                                id: agentGradCol
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 8

                                RowLayout {
                                    spacing: 6
                                    Text { text: "🎭"; font.pixelSize: 13 }
                                    Text { text: "CALIBRATED REACTION GRADIENT"; font.bold: true; font.pixelSize: 10; color: "#94a3b8" }
                                }

                                GridLayout {
                                    columns: 2
                                    rowSpacing: 6
                                    columnSpacing: 10
                                    Layout.fillWidth: true

                                    Text { text: "🛑 WON'T:"; font.bold: true; font.pixelSize: 10; color: "#f87171" }
                                    Text { text: root.agentIdea && root.agentIdea.reaction_gradient ? (root.agentIdea.reaction_gradient.wont || "N/A") : ""; font.pixelSize: 11; color: "#cbd5e1"; Layout.fillWidth: true; wrapMode: Text.Wrap }

                                    Text { text: "💖 CRAVES:"; font.bold: true; font.pixelSize: 10; color: "#f472b6" }
                                    Text { text: root.agentIdea && root.agentIdea.reaction_gradient ? (root.agentIdea.reaction_gradient.craves || "N/A") : ""; font.pixelSize: 11; color: "#cbd5e1"; Layout.fillWidth: true; wrapMode: Text.Wrap }

                                    Text { text: "⚖️ NEUTRAL:"; font.bold: true; font.pixelSize: 10; color: "#94a3b8" }
                                    Text { text: root.agentIdea && root.agentIdea.reaction_gradient ? (root.agentIdea.reaction_gradient.neutral || "N/A") : ""; font.pixelSize: 11; color: "#cbd5e1"; Layout.fillWidth: true; wrapMode: Text.Wrap }

                                    Text { text: "✅ WILL:"; font.bold: true; font.pixelSize: 10; color: "#34d399" }
                                    Text { text: root.agentIdea && root.agentIdea.reaction_gradient ? (root.agentIdea.reaction_gradient.will || "N/A") : ""; font.pixelSize: 11; color: "#cbd5e1"; Layout.fillWidth: true; wrapMode: Text.Wrap }

                                    Text { text: "🔐 TRUST GATE:"; font.bold: true; font.pixelSize: 10; color: "#a78bfa" }
                                    Text { text: root.agentIdea && root.agentIdea.reaction_gradient ? (root.agentIdea.reaction_gradient.trust_gate || "N/A") : ""; font.pixelSize: 11; color: "#cbd5e1"; Layout.fillWidth: true; wrapMode: Text.Wrap }
                                }
                            }
                        }

                        // Playable Premise / Description / Scenario
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 12
                            color: "#111827"
                            border.color: "#1f2937"
                            border.width: 1
                            implicitHeight: agentPremiseCol.implicitHeight + 28

                            ColumnLayout {
                                id: agentPremiseCol
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 10

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: (root.agentIdea && root.agentIdea.description)
                                            ? "📖 CHARACTER DESCRIPTION & SCENARIO"
                                            : "📖 PLAYABLE SCENARIO PREMISE"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#94a3b8"
                                    }
                                }

                                TextEdit {
                                    Layout.fillWidth: true
                                    text: {
                                        if (!root.agentIdea) return "";
                                        if (root.agentIdea.premise) return root.agentIdea.premise;
                                        if (root.agentIdea.description) {
                                            var desc = root.agentIdea.description;
                                            if (root.agentIdea.personality) desc += "\n\n[Personality]\n" + root.agentIdea.personality;
                                            if (root.agentIdea.scenario) desc += "\n\n[Scenario]\n" + root.agentIdea.scenario;
                                            return desc;
                                        }
                                        return root.agentIdea.first_mes || "";
                                    }
                                    font.pixelSize: 13
                                    color: "#f8fafc"
                                    wrapMode: TextEdit.Wrap
                                    readOnly: true
                                    selectByMouse: true
                                }
                            }
                        }

                        // Opening Scenario Hook / First Message
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 12
                            color: "#18181b"
                            border.color: "#3f3f46"
                            border.width: 1
                            implicitHeight: agentHookCol.implicitHeight + 28
                            visible: root.agentIdea && Boolean(root.agentIdea.opening_scenario || root.agentIdea.first_mes || root.activeScenarioHook)

                            ColumnLayout {
                                id: agentHookCol
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 10

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: (root.agentIdea && root.agentIdea.first_mes) ? "🎬 FIRST MESSAGE (GREETING)" : "🎬 OPENING SCENARIO HOOK"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: "#fb923c"
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: (root.activeScenarioHook)
                                        ? root.activeScenarioHook
                                        : ((root.agentIdea && (root.agentIdea.opening_scenario || root.agentIdea.first_mes))
                                            ? (root.agentIdea.opening_scenario || root.agentIdea.first_mes)
                                            : "")
                                    font.pixelSize: 12
                                    lineHeight: 1.45
                                    color: "#fed7aa"
                                }
                            }
                        }
                    }
                }

                // Populated Era Architect Dossier (Era Mode)
                ScrollView {
                    id: eraArchitectScrollView
                    anchors.fill: parent
                    contentWidth: availableWidth
                    clip: true
                    visible: root.currentAgentMode === "era" && root.agentEraPair !== null

                    readonly property var activeEraObj: {
                        if (!root.agentEraPair) return null;
                        return root.agentEraVariant === "monogamy"
                            ? root.agentEraPair.monogamy
                            : root.agentEraPair.polygyny;
                    }

                    readonly property var activeEraComp: {
                        if (!root.agentEraCompliance) return null;
                        return root.agentEraVariant === "monogamy"
                            ? root.agentEraCompliance.monogamy
                            : root.agentEraCompliance.polygyny;
                    }

                    ColumnLayout {
                        width: parent.width
                        spacing: 16
                        anchors.margins: 24

                        // Top Action & Variant Switcher Bar
                        Flow {
                            Layout.fillWidth: true
                            spacing: 8

                            // Polygyny vs Monogamy Switcher
                            RowLayout {
                                spacing: 4

                                Button {
                                    height: 34
                                    background: Rectangle {
                                        radius: 6
                                        color: root.agentEraVariant === "polygyny" ? "#7c3aed" : "#1e1b4b"
                                        border.color: root.agentEraVariant === "polygyny" ? "#c084fc" : "#4338ca"
                                        border.width: 1
                                    }
                                    contentItem: Text {
                                        text: "🌸 Multi-Wife (Polygyny)"
                                        font.bold: root.agentEraVariant === "polygyny"
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                        anchors.centerIn: parent
                                    }
                                    onClicked: root.agentEraVariant = "polygyny"
                                }

                                Button {
                                    height: 34
                                    background: Rectangle {
                                        radius: 6
                                        color: root.agentEraVariant === "monogamy" ? "#7c3aed" : "#1e1b4b"
                                        border.color: root.agentEraVariant === "monogamy" ? "#c084fc" : "#4338ca"
                                        border.width: 1
                                    }
                                    contentItem: Text {
                                        text: "💍 Sole Bride (Monogamy)"
                                        font.bold: root.agentEraVariant === "monogamy"
                                        font.pixelSize: 11
                                        color: "#ffffff"
                                        anchors.centerIn: parent
                                    }
                                    onClicked: root.agentEraVariant = "monogamy"
                                }
                            }

                            // Quality Score Pill
                            Rectangle {
                                height: 32
                                implicitWidth: compTxt.implicitWidth + 18
                                radius: 6
                                color: (eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.compliant) ? "#064e3b" : "#713f12"
                                border.color: (eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.compliant) ? "#10b981" : "#eab308"
                                border.width: 1
                                RowLayout {
                                    id: compTxt
                                    anchors.centerIn: parent
                                    spacing: 4
                                    Text {
                                        text: "🛡️ " + (eraArchitectScrollView.activeEraComp ? eraArchitectScrollView.activeEraComp.score : "100") + "% Validated"
                                        font.bold: true
                                        font.pixelSize: 11
                                        color: (eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.compliant) ? "#34d399" : "#fde047"
                                    }
                                }
                            }

                            // Copy JSON Button
                            Button {
                                height: 34
                                implicitWidth: 80
                                background: Rectangle {
                                    radius: 6
                                    color: "#1e293b"
                                    border.color: "#334155"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    text: "📋 Copy"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#cbd5e1"
                                    anchors.centerIn: parent
                                }
                                onClicked: {
                                    if (root.agentEraPair) {
                                        QGuiApplication.clipboard().setText(JSON.stringify(root.agentEraPair, null, 2));
                                        root.toastText = "📋 Era pair JSON copied to clipboard!";
                                        toastAnim.restart();
                                    }
                                }
                            }

                            // Test in Studio Forge
                            Button {
                                height: 34
                                implicitWidth: 140
                                background: Rectangle {
                                    radius: 6
                                    color: parent.hovered ? "#059669" : "#047857"
                                    border.color: "#10b981"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    text: "⚡ Test in Studio"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#ffffff"
                                    anchors.centerIn: parent
                                }
                                onClicked: {
                                    if (eraArchitectScrollView.activeEraObj) {
                                        var eraObj = eraArchitectScrollView.activeEraObj;
                                        root.selectedEra = eraObj.id || "timeless_fantasy";
                                        root.currentTab = 0;
                                        root.toastText = "⚡ Era '" + (eraObj.short_name || eraObj.name) + "' loaded into Studio Forge!";
                                        toastAnim.restart();
                                    }
                                }
                            }

                            // Save to Extension File
                            Button {
                                height: 34
                                implicitWidth: 160
                                background: Rectangle {
                                    radius: 6
                                    color: parent.hovered ? "#6d28d9" : "#5b21b6"
                                    border.color: "#a855f7"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    text: "💾 Save to Extensions"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#ffffff"
                                    anchors.centerIn: parent
                                }
                                onClicked: {
                                    if (root.agentEraPair && typeof backend !== "undefined" && backend) {
                                        var polyId = (root.agentEraPair.polygyny && root.agentEraPair.polygyny.id) ? root.agentEraPair.polygyny.id : "custom_era";
                                        var fn = polyId.replace("_polygyny", "").replace("_multi_wife", "") + "_eras.json";
                                        var toSave = {};
                                        if (root.agentEraPair.polygyny) toSave[root.agentEraPair.polygyny.id] = root.agentEraPair.polygyny;
                                        if (root.agentEraPair.monogamy) toSave[root.agentEraPair.monogamy.id] = root.agentEraPair.monogamy;
                                        backend.saveEraPairToExtension(fn, JSON.stringify(toSave));
                                        root.toastText = "💾 Saved era pair to data/eras_extensions/" + fn + "!";
                                        toastAnim.restart();
                                    }
                                }
                            }

                            // Evolve Setting Button (Feature 4)
                            Button {
                                height: 34
                                implicitWidth: 140
                                background: Rectangle {
                                    radius: 6
                                    color: parent.hovered ? "#4338ca" : "#312e81"
                                    border.color: "#818cf8"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    text: "✨ Evolve Setting"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#e0e7ff"
                                    anchors.centerIn: parent
                                }
                                onClicked: {
                                    if (eraArchitectScrollView.activeEraObj) {
                                        var eraObj = eraArchitectScrollView.activeEraObj;
                                        var eraName = eraObj.name || "this setting";
                                        var eraRegion = eraObj.region || "this region";
                                        agentMsgInput.text = "Based on the established world of " + eraName + " (" + eraRegion + "), evolve this setting by ";
                                        agentMsgInput.forceActiveFocus();
                                        agentMsgInput.cursorPosition = agentMsgInput.text.length;
                                        root.toastText = "✨ Prompt prefilled with " + eraName + "!";
                                        toastAnim.restart();
                                    }
                                }
                            }

                            // Diff / Compare Toggle Button for Era (Feature 3)
                            Button {
                                visible: root.prevAgentEraPair !== null
                                height: 34
                                implicitWidth: 140
                                background: Rectangle {
                                    radius: 6
                                    color: root.showEraDiffView ? "#7c3aed" : (parent.hovered ? "#2e1065" : "#1e1b4b")
                                    border.color: root.showEraDiffView ? "#c084fc" : "#6366f1"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    text: root.showEraDiffView ? "👁️ Hide Diff" : "👁️ Compare Era Diff"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#ffffff"
                                    anchors.centerIn: parent
                                }
                                onClicked: {
                                    root.showEraDiffView = !root.showEraDiffView;
                                }
                            }
                        }

                        // Era Diff Comparison Panel (Feature 3)
                        Rectangle {
                            visible: root.showEraDiffView && root.prevAgentEraPair !== null
                            Layout.fillWidth: true
                            implicitHeight: eraDiffCol.implicitHeight + 28
                            radius: 12
                            color: "#0f172a"
                            border.color: "#818cf8"
                            border.width: 1

                            ColumnLayout {
                                id: eraDiffCol
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 10

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "📊 Era Comparison (Previous Draft vs. Current Evolved Setting)"
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#a5b4fc"
                                    }
                                    Item { Layout.fillWidth: true }
                                    Button {
                                        height: 24
                                        implicitWidth: 70
                                        background: Rectangle {
                                            radius: 4
                                            color: "#dc2626"
                                        }
                                        contentItem: Text {
                                            text: "⏪ Revert"
                                            font.bold: true
                                            font.pixelSize: 10
                                            color: "#ffffff"
                                            anchors.centerIn: parent
                                        }
                                        onClicked: {
                                            if (root.prevAgentEraPair) {
                                                var tempEra = root.agentEraPair;
                                                root.agentEraPair = root.prevAgentEraPair;
                                                root.prevAgentEraPair = tempEra;
                                                root.toastText = "⏪ Reverted to previous era draft!";
                                                toastAnim.restart();
                                            }
                                        }
                                    }
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 12

                                    // Previous Draft Era Column
                                    Rectangle {
                                        Layout.fillWidth: true
                                        implicitHeight: prevEraColLayout.implicitHeight + 16
                                        radius: 8
                                        color: "#18181b"
                                        border.color: "#3f3f46"
                                        border.width: 1

                                        readonly property var prevObj: {
                                            if (!root.prevAgentEraPair) return null;
                                            return root.agentEraVariant === "monogamy" ? root.prevAgentEraPair.monogamy : root.prevAgentEraPair.polygyny;
                                        }

                                        ColumnLayout {
                                            id: prevEraColLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 6

                                            Text {
                                                text: "⏮️ Previous: " + (parent.parent.prevObj ? parent.parent.prevObj.name : "Nameless")
                                                font.bold: true
                                                font.pixelSize: 11
                                                color: "#f87171"
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }
                                            Text {
                                                text: "Region: " + (parent.parent.prevObj ? (parent.parent.prevObj.region || "") : "") + " | Span: " + (parent.parent.prevObj ? (parent.parent.prevObj.span || "") : "")
                                                font.pixelSize: 10
                                                color: "#a1a1aa"
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }
                                            Text {
                                                text: parent.parent.prevObj ? (parent.parent.prevObj.lore_notes || "") : ""
                                                font.pixelSize: 10
                                                color: "#d4d4d8"
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
                                                maximumLineCount: 6
                                                elide: Text.ElideRight
                                            }
                                        }
                                    }

                                    // Current Draft Era Column
                                    Rectangle {
                                        Layout.fillWidth: true
                                        implicitHeight: currEraColLayout.implicitHeight + 16
                                        radius: 8
                                        color: "#064e3b"
                                        border.color: "#10b981"
                                        border.width: 1

                                        readonly property var currObj: eraArchitectScrollView.activeEraObj

                                        ColumnLayout {
                                            id: currEraColLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 6

                                            Text {
                                                text: "✨ Current: " + (parent.parent.currObj ? parent.parent.currObj.name : "Nameless")
                                                font.bold: true
                                                font.pixelSize: 11
                                                color: "#34d399"
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }
                                            Text {
                                                text: "Region: " + (parent.parent.currObj ? (parent.parent.currObj.region || "") : "") + " | Span: " + (parent.parent.currObj ? (parent.parent.currObj.span || "") : "")
                                                font.pixelSize: 10
                                                color: "#6ee7b7"
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }
                                            Text {
                                                text: parent.parent.currObj ? (parent.parent.currObj.lore_notes || "") : ""
                                                font.pixelSize: 10
                                                color: "#ecfdf5"
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
                                                maximumLineCount: 6
                                                elide: Text.ElideRight
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Era Header Details
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: eraHeaderCol.implicitHeight + 32
                            radius: 12
                            color: "#111827"
                            border.color: "#4c1d95"
                            border.width: 1

                            ColumnLayout {
                                id: eraHeaderCol
                                anchors.fill: parent
                                anchors.margins: 18
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 8
                                    Text {
                                        text: eraArchitectScrollView.activeEraObj ? (eraArchitectScrollView.activeEraObj.name || "Era") : ""
                                        font.bold: true
                                        font.pixelSize: 18
                                        color: "#f8fafc"
                                        Layout.fillWidth: true
                                        wrapMode: Text.Wrap
                                    }
                                }

                                RowLayout {
                                    spacing: 8
                                    Rectangle {
                                        height: 22
                                        implicitWidth: spanLabel.implicitWidth + 14
                                        radius: 4
                                        color: "#1e1b4b"
                                        border.color: "#6366f1"
                                        border.width: 1
                                        Text {
                                            id: spanLabel
                                            anchors.centerIn: parent
                                            text: "📅 " + (eraArchitectScrollView.activeEraObj ? (eraArchitectScrollView.activeEraObj.span || (root.agentEraPair && root.agentEraPair.polygyny ? root.agentEraPair.polygyny.span : "Mythic Age")) : "")
                                            font.pixelSize: 10
                                            color: "#a5b4fc"
                                        }
                                    }
                                    Rectangle {
                                        height: 22
                                        implicitWidth: regLabel.implicitWidth + 14
                                        radius: 4
                                        color: "#1e293b"
                                        border.color: "#334155"
                                        border.width: 1
                                        Text {
                                            id: regLabel
                                            anchors.centerIn: parent
                                            text: "📍 " + (eraArchitectScrollView.activeEraObj ? (eraArchitectScrollView.activeEraObj.region || (root.agentEraPair && root.agentEraPair.polygyny ? root.agentEraPair.polygyny.region : "Unknown Realm")) : "")
                                            font.pixelSize: 10
                                            color: "#cbd5e1"
                                        }
                                    }
                                    Rectangle {
                                        height: 22
                                        implicitWidth: catLabel.implicitWidth + 14
                                        radius: 4
                                        color: "#1e293b"
                                        border.color: "#334155"
                                        border.width: 1
                                        Text {
                                            id: catLabel
                                            anchors.centerIn: parent
                                            text: "Category: " + (eraArchitectScrollView.activeEraObj ? (eraArchitectScrollView.activeEraObj.category || (root.agentEraPair && root.agentEraPair.polygyny ? root.agentEraPair.polygyny.category : "Fantasy")) : "")
                                            font.pixelSize: 10
                                            color: "#94a3b8"
                                        }
                                    }
                                }
                            }
                        }

                        // Social Codes, Privacy & Domestic Dynamics Card
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: socialCol.implicitHeight + 32
                            radius: 12
                            color: "#131b2e"
                            border.color: "#38bdf8"
                            border.width: 1

                            ColumnLayout {
                                id: socialCol
                                anchors.fill: parent
                                anchors.margins: 18
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text { text: "📜 SOCIAL CODES, HIERARCHY & RELATIONSHIP DYNAMICS"; font.bold: true; font.pixelSize: 11; color: "#38bdf8" }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: eraArchitectScrollView.activeEraObj ? (eraArchitectScrollView.activeEraObj.social_codes || "") : ""
                                    font.pixelSize: 12
                                    lineHeight: 1.45
                                    color: "#f0f9ff"
                                }
                            }
                        }

                        // Sensory Visual Aesthetic Card
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: aesCol.implicitHeight + 28
                            radius: 12
                            color: "#18181b"
                            border.color: "#3f3f46"
                            border.width: 1

                            ColumnLayout {
                                id: aesCol
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 6

                                Text { text: "🏛️ SENSORY VISUAL AESTHETIC"; font.bold: true; font.pixelSize: 11; color: "#a1a1aa" }
                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: eraArchitectScrollView.activeEraObj ? (eraArchitectScrollView.activeEraObj.aesthetic || "") : ""
                                    font.pixelSize: 12
                                    lineHeight: 1.4
                                    color: "#e4e4e7"
                                }
                            }
                        }

                        // Tech & Domestic Enchantment Wards Card
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: techCol.implicitHeight + 28
                            radius: 12
                            color: "#18181b"
                            border.color: "#3f3f46"
                            border.width: 1

                            ColumnLayout {
                                id: techCol
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 6

                                Text { text: "🔮 ENCHANTMENTS, PRIVACY WARDS & TECH"; font.bold: true; font.pixelSize: 11; color: "#a1a1aa" }
                                Text {
                                    Layout.fillWidth: true
                                    wrapMode: Text.Wrap
                                    text: eraArchitectScrollView.activeEraObj ? (eraArchitectScrollView.activeEraObj.tech || "") : ""
                                    font.pixelSize: 12
                                    lineHeight: 1.4
                                    color: "#e4e4e7"
                                }
                            }
                        }

                        // Character Archetype Titles & Bride Names Card
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: titlesNamesCol.implicitHeight + 32
                            radius: 12
                            color: "#18181b"
                            border.color: "#3f3f46"
                            border.width: 1

                            ColumnLayout {
                                id: titlesNamesCol
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 10

                                Text { text: "👰 CHARACTER ARCHETYPES & BRIDE TITLES"; font.bold: true; font.pixelSize: 11; color: "#c084fc" }

                                Flow {
                                    Layout.fillWidth: true
                                    spacing: 6
                                    Repeater {
                                        model: (eraArchitectScrollView.activeEraObj && eraArchitectScrollView.activeEraObj.titles) ? eraArchitectScrollView.activeEraObj.titles : []
                                        Rectangle {
                                            height: 24
                                            implicitWidth: tTxt.implicitWidth + 16
                                            radius: 6
                                            color: "#2e1065"
                                            border.color: "#7e22ce"
                                            border.width: 1
                                            Text {
                                                id: tTxt
                                                anchors.centerIn: parent
                                                text: "👤 " + modelData
                                                font.pixelSize: 10
                                                color: "#e9d5ff"
                                            }
                                        }
                                    }
                                }

                                Text { text: "🏷️ TAGS"; font.bold: true; font.pixelSize: 11; color: "#a1a1aa"; Layout.topMargin: 4 }

                                Flow {
                                    Layout.fillWidth: true
                                    spacing: 6
                                    Repeater {
                                        model: (eraArchitectScrollView.activeEraObj && eraArchitectScrollView.activeEraObj.tags) ? eraArchitectScrollView.activeEraObj.tags : []
                                        Rectangle {
                                            height: 22
                                            implicitWidth: tagTxt.implicitWidth + 14
                                            radius: 4
                                            color: "#1e293b"
                                            border.color: "#334155"
                                            border.width: 1
                                            Text {
                                                id: tagTxt
                                                anchors.centerIn: parent
                                                text: "#" + modelData
                                                font.pixelSize: 10
                                                color: "#94a3b8"
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Era Quality & Standards Audit Checklist Card
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: compAuditCol.implicitHeight + 28
                            radius: 12
                            color: "#0f172a"
                            border.color: "#1e293b"
                            border.width: 1

                            ColumnLayout {
                                id: compAuditCol
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 8

                                Text {
                                    text: "🛡️ ERA ARCHITECTURE QUALITY CHECKLIST"
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: "#38bdf8"
                                }

                                GridLayout {
                                    Layout.fillWidth: true
                                    columns: 2
                                    rowSpacing: 6
                                    columnSpacing: 16

                                    Text {
                                        text: "⚔️ Dual-Format Paired (Poly & Mono): " + ((eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.pillars && eraArchitectScrollView.activeEraComp.pillars.dualFormat) ? "✓ PASS" : "⚠️ CHECK")
                                        font.pixelSize: 11
                                        font.bold: true
                                        color: (eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.pillars && eraArchitectScrollView.activeEraComp.pillars.dualFormat) ? "#4ade80" : "#facc15"
                                    }
                                    Text {
                                        text: "🏰 Setting & Aesthetic Depth: " + ((eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.pillars && (eraArchitectScrollView.activeEraComp.pillars.settingDepth ?? eraArchitectScrollView.activeEraComp.pillars.zeroIntruder ?? true)) ? "✓ PASS" : "⚠️ CHECK")
                                        font.pixelSize: 11
                                        font.bold: true
                                        color: (eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.pillars && (eraArchitectScrollView.activeEraComp.pillars.settingDepth ?? eraArchitectScrollView.activeEraComp.pillars.zeroIntruder ?? true)) ? "#4ade80" : "#facc15"
                                    }
                                    Text {
                                        text: "📜 Social Codes & Dynamics: " + ((eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.pillars && (eraArchitectScrollView.activeEraComp.pillars.socialStructure ?? eraArchitectScrollView.activeEraComp.pillars.domesticOrder ?? true)) ? "✓ PASS" : "⚠️ CHECK")
                                        font.pixelSize: 11
                                        font.bold: true
                                        color: (eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.pillars && (eraArchitectScrollView.activeEraComp.pillars.socialStructure ?? eraArchitectScrollView.activeEraComp.pillars.domesticOrder ?? true)) ? "#4ade80" : "#facc15"
                                    }
                                    Text {
                                        text: "📚 Rich Names & Archetypes: " + ((eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.pillars && eraArchitectScrollView.activeEraComp.pillars.contentRichness) ? "✓ PASS" : "⚠️ CHECK")
                                        font.pixelSize: 11
                                        font.bold: true
                                        color: (eraArchitectScrollView.activeEraComp && eraArchitectScrollView.activeEraComp.pillars && eraArchitectScrollView.activeEraComp.pillars.contentRichness) ? "#4ade80" : "#facc15"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ==========================================
        // TAB 3: THE IDEA GRIMOIRE & DISPATCH QUEUE
        // ==========================================
        Item {
            id: grimoireWorkspaceView
            visible: root.currentTab === 3
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignTop
            Layout.minimumHeight: 0

            ScrollView {
                id: grimoireScrollView
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 24
                anchors.topMargin: 16
                anchors.bottomMargin: 16
                contentWidth: availableWidth
                clip: true

                ColumnLayout {
                    width: grimoireScrollView.availableWidth
                    spacing: 16

                    Item { height: 4 }

                // ------------------------------------------
                // 1. BANNER & STATS
                // ------------------------------------------
                Rectangle {
                    Layout.fillWidth: true
                    height: 64
                    radius: 10
                    color: "#18181b"
                    border.color: "#3f3f46"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 12

                        Text { text: "📖"; font.pixelSize: 26 }

                        ColumnLayout {
                            spacing: 2
                            Text {
                                text: "THE IDEA GRIMOIRE & SEQUENTIAL DISPATCH QUEUE"
                                font.bold: true
                                font.pixelSize: 14
                                color: "#f8fafc"
                            }
                            Text {
                                text: "Curate, grade, and annotate concepts, then sequentially dispatch them to CharGenUI (:3333)."
                                font.pixelSize: 11
                                color: "#94a3b8"
                            }
                        }

                        Item { Layout.fillWidth: true }

                        Rectangle {
                            height: 28
                            radius: 14
                            color: "#312e81"
                            border.color: "#6366f1"
                            border.width: 1
                            implicitWidth: grimCountLabel.implicitWidth + 20

                            Text {
                                id: grimCountLabel
                                anchors.centerIn: parent
                                text: root.grimoireList.length + " Concepts Staged"
                                font.pixelSize: 11
                                font.bold: true
                                color: "#c7d2fe"
                            }
                        }
                    }
                }

                // ------------------------------------------
                // 2. SEQUENTIAL DISPATCH QUEUE (CHARGENUI OUTBOX)
                // ------------------------------------------
                Rectangle {
                    Layout.fillWidth: true
                    radius: 12
                    color: "#0f172a"
                    border.color: (root.queueData && root.queueData.active_item) ? "#10b981" : "#3b82f6"
                    border.width: (root.queueData && root.queueData.active_item) ? 2 : 1
                    implicitHeight: queueContentCol.implicitHeight + 28

                    ColumnLayout {
                        id: queueContentCol
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 12

                        // Header Row
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Text { text: "🚀"; font.pixelSize: 15 }
                            Text {
                                text: "CHARGENUI SEQUENTIAL DISPATCH QUEUE"
                                font.bold: true
                                font.pixelSize: 12
                                color: "#f8fafc"
                            }

                            Rectangle {
                                height: 20
                                radius: 10
                                color: (root.queueData && root.queueData.queue && root.queueData.queue.length > 0) ? "#065f46" : "#334155"
                                implicitWidth: queueCountTxt.implicitWidth + 12
                                Text {
                                    id: queueCountTxt
                                    anchors.centerIn: parent
                                    text: (root.queueData && root.queueData.queue ? root.queueData.queue.length : 0) + " in Queue"
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: (root.queueData && root.queueData.queue && root.queueData.queue.length > 0) ? "#6ee7b7" : "#94a3b8"
                                }
                            }

                            Item { Layout.fillWidth: true }

                            Rectangle {
                                height: 24
                                radius: 12
                                color: root.isCharGenOnline ? "#064e3b" : "#450a0a"
                                border.color: root.isCharGenOnline ? "#10b981" : "#ef4444"
                                border.width: 1
                                implicitWidth: queueIpcStatusTxt.implicitWidth + 16

                                Text {
                                    id: queueIpcStatusTxt
                                    anchors.centerIn: parent
                                    text: root.isCharGenOnline ? "● CharGenUI :3333 Connected" : "○ CharGenUI Offline"
                                    font.pixelSize: 10
                                    font.bold: true
                                    color: root.isCharGenOnline ? "#6ee7b7" : "#fca5a5"
                                }
                            }

                            Button {
                                height: 24
                                visible: root.queueData && root.queueData.queue && root.queueData.queue.length > 0
                                background: Rectangle {
                                    radius: 4
                                    color: parent.hovered ? "#450a0a" : "#1e293b"
                                    border.color: "#ef4444"
                                    border.width: 1
                                }
                                contentItem: Text {
                                    anchors.centerIn: parent
                                    text: "Clear Queue"
                                    font.pixelSize: 10
                                    color: "#fca5a5"
                                }
                                onClicked: if (typeof backend !== "undefined" && backend) backend.clearQueue()
                            }
                        }

                        // Active Card / Queue Stage Banner
                        Rectangle {
                            Layout.fillWidth: true
                            radius: 8
                            color: (root.queueData && root.queueData.active_item) ? "#064e3b" : "#1e293b"
                            border.color: (root.queueData && root.queueData.active_item) ? "#10b981" : "#475569"
                            border.width: 1
                            implicitHeight: activeCardContentCol.implicitHeight + 20

                            ColumnLayout {
                                id: activeCardContentCol
                                anchors.fill: parent
                                anchors.margins: 12
                                spacing: 8

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 8

                                    Rectangle {
                                        height: 22
                                        radius: 4
                                        color: (root.queueData && root.queueData.active_item) ? "#10b981" : "#64748b"
                                        implicitWidth: activeCardBadgeTxt.implicitWidth + 12
                                        Text {
                                            id: activeCardBadgeTxt
                                            anchors.centerIn: parent
                                            text: (root.queueData && root.queueData.active_item) ? "● CURRENTLY IN CHARGENUI" : "READY TO SEND"
                                            font.pixelSize: 9
                                            font.bold: true
                                            color: "#ffffff"
                                        }
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        text: (root.queueData && root.queueData.active_item)
                                            ? ((root.queueData.active_item.character.name || "Character") + " — " + (root.queueData.active_item.character.title || ""))
                                            : ((root.queueData && root.queueData.queue && root.queueData.queue.length > 0)
                                                ? ("Up Next: " + (root.queueData.queue[0].character.name || "Character") + " (" + (root.queueData.queue[0].character.title || "") + ")")
                                                : "Queue is empty. Select ideas from the Grimoire below and click '[ ➕ Add to Queue ]'.")
                                        font.bold: true
                                        font.pixelSize: 12
                                        color: "#f8fafc"
                                        elide: Text.ElideRight
                                    }

                                    Rectangle {
                                        height: 20
                                        radius: 4
                                        color: "#451a03"
                                        border.color: "#f59e0b"
                                        border.width: 1
                                        visible: root.queueData && Boolean(root.queueData.active_item && root.queueData.active_item.character && root.queueData.active_item.character.era)
                                        implicitWidth: queueEraBadgeTxt.implicitWidth + 10
                                        Text {
                                            id: queueEraBadgeTxt
                                            anchors.centerIn: parent
                                            text: (root.queueData && root.queueData.active_item && root.queueData.active_item.character && root.queueData.active_item.character.era) ? root.queueData.active_item.character.era : ""
                                            font.pixelSize: 9
                                            font.bold: true
                                            color: "#fbbf24"
                                            elide: Text.ElideRight
                                            maximumLineCount: 1
                                        }
                                    }

                                    // Action buttons for active card
                                    Button {
                                        id: doneAdvanceBtn
                                        height: 30
                                        visible: root.queueData && Boolean(root.queueData.active_item)
                                        background: Rectangle {
                                            radius: 6
                                            color: doneAdvanceBtn.hovered ? "#059669" : "#10b981"
                                        }
                                        contentItem: RowLayout {
                                            anchors.centerIn: parent
                                            spacing: 4
                                            Text { text: "✅"; font.pixelSize: 11 }
                                            Text { text: "Finished in CharGenUI & Send Next"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.completeActiveAndAdvance(true, root.autoGenerateOnSend);
                                            }
                                        }
                                    }

                                    Button {
                                        id: sendNextBtn
                                        height: 30
                                        visible: (!root.queueData || !root.queueData.active_item) && (root.queueData && root.queueData.queue && root.queueData.queue.length > 0)
                                        background: Rectangle {
                                            radius: 6
                                            color: sendNextBtn.hovered ? "#4f46e5" : "#6366f1"
                                        }
                                        contentItem: RowLayout {
                                            anchors.centerIn: parent
                                            spacing: 4
                                            Text { text: "🚀"; font.pixelSize: 11 }
                                            Text { text: "Dispatch Next to CharGenUI"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.sendActiveQueueItem(root.autoGenerateOnSend);
                                            }
                                        }
                                    }

                                    Button {
                                        id: resendBtn
                                        height: 30
                                        visible: root.queueData && Boolean(root.queueData.active_item)
                                        background: Rectangle {
                                            radius: 6
                                            color: resendBtn.hovered ? "#334155" : "#1e293b"
                                            border.color: "#64748b"
                                            border.width: 1
                                        }
                                        contentItem: Text {
                                            anchors.centerIn: parent
                                            text: "🔁 Resend"
                                            font.pixelSize: 10
                                            color: "#cbd5e1"
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.sendActiveQueueItem(root.autoGenerateOnSend);
                                            }
                                        }
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    visible: root.queueData && Boolean(root.queueData.active_item)
                                    text: (root.queueData && root.queueData.active_item) ? (root.queueData.active_item.character.tagline || root.queueData.active_item.character.premise || "") : ""
                                    font.pixelSize: 11
                                    color: "#a7f3d0"
                                    wrapMode: Text.WordWrap
                                    maximumLineCount: 2
                                    elide: Text.ElideRight
                                }
                            }
                        }

                        // Up Next Horizontal Chips
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6
                            visible: root.queueData && root.queueData.queue && root.queueData.queue.length > 1

                            Text {
                                text: "UP NEXT IN QUEUE:"
                                font.bold: true
                                font.pixelSize: 10
                                color: "#94a3b8"
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                Repeater {
                                    model: (root.queueData && root.queueData.queue) ? root.queueData.queue.slice(1, 6) : []
                                    delegate: Rectangle {
                                        height: 32
                                        radius: 6
                                        color: "#1e293b"
                                        border.color: "#334155"
                                        border.width: 1
                                        implicitWidth: qChipRow.implicitWidth + 14

                                        RowLayout {
                                            id: qChipRow
                                            anchors.centerIn: parent
                                            spacing: 6

                                            Text {
                                                text: "#" + (index + 2)
                                                font.bold: true
                                                font.pixelSize: 10
                                                color: "#818cf8"
                                            }
                                            Text {
                                                text: modelData.character.name || "Concept"
                                                font.pixelSize: 11
                                                font.bold: true
                                                color: "#f8fafc"
                                            }
                                            Text {
                                                text: "✕"
                                                font.pixelSize: 10
                                                color: "#94a3b8"
                                                MouseArea {
                                                    anchors.fill: parent
                                                    cursorShape: Qt.PointingHandCursor
                                                    onClicked: {
                                                        if (typeof backend !== "undefined" && backend) {
                                                            backend.dequeueGrimoireItem(modelData.id);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ------------------------------------------
                // 3. SEARCH & FILTER CONTROLS
                // ------------------------------------------
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10

                        TextField {
                            id: grimSearchField
                            Layout.fillWidth: true
                            height: 38
                            placeholderText: "🔍 Filter Grimoire by character name, archetype, dynamic, or tags..."
                            color: "#f8fafc"
                            text: root.grimoireSearch
                            onTextChanged: root.grimoireSearch = text
                            background: Rectangle {
                                color: "#1e293b"
                                radius: 6
                                border.color: grimSearchField.activeFocus ? "#8b5cf6" : "#334155"
                                border.width: 1
                            }
                        }

                        Button {
                            height: 38
                            background: Rectangle {
                                radius: 6
                                color: parent.hovered ? "#450a0a" : "#1e293b"
                                border.color: "#ef4444"
                                border.width: 1
                            }
                            contentItem: Text {
                                anchors.centerIn: parent
                                text: "🧹 Purge Discards"
                                font.pixelSize: 11
                                color: "#fca5a5"
                            }
                            onClicked: {
                                if (typeof backend !== "undefined" && backend) {
                                    backend.clearGrimoire("discard");
                                }
                            }
                        }

                        // Clear Entire Grimoire Button (with safety confirmation)
                        Button {
                            id: clearGrimoireBtn
                            property bool confirming: false
                            height: 38
                            background: Rectangle {
                                radius: 6
                                color: clearGrimoireBtn.confirming ? "#7f1d1d" : (clearGrimoireBtn.hovered ? "#3b0764" : "#1e293b")
                                border.color: clearGrimoireBtn.confirming ? "#f87171" : "#a855f7"
                                border.width: 1
                            }
                            contentItem: RowLayout {
                                anchors.centerIn: parent
                                spacing: 4
                                Text { text: clearGrimoireBtn.confirming ? "⚠️" : "🗑️"; font.pixelSize: 11 }
                                Text {
                                    text: clearGrimoireBtn.confirming ? "Confirm Clear All?" : "Clear Grimoire"
                                    font.bold: clearGrimoireBtn.confirming
                                    font.pixelSize: 11
                                    color: clearGrimoireBtn.confirming ? "#ffffff" : "#d8b4fe"
                                }
                            }
                            Timer {
                                id: resetClearConfirmTimer
                                interval: 3500
                                repeat: false
                                onTriggered: clearGrimoireBtn.confirming = false
                            }
                            onClicked: {
                                if (!confirming) {
                                    confirming = true;
                                    resetClearConfirmTimer.restart();
                                } else {
                                    confirming = false;
                                    resetClearConfirmTimer.stop();
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.clearGrimoire("all");
                                    }
                                }
                            }
                        }
                    }

                    // Filter Chips Row
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Repeater {
                            model: [
                                { "id": "all", "label": "All (" + root.grimoireList.length + ")", "icon": "📚" },
                                { "id": "keeper", "label": "Keepers", "icon": "💎" },
                                { "id": "4star", "label": "Top Rated", "icon": "⭐" },
                                { "id": "refine", "label": "Refine", "icon": "✏️" },
                                { "id": "discard", "label": "Discarded", "icon": "🗑️" }
                            ]
                            delegate: Rectangle {
                                height: 32
                                radius: 6
                                color: root.grimoireFilter === modelData.id ? "#7c3aed" : (fChipMa.containsMouse ? "#334155" : "#1e293b")
                                border.color: root.grimoireFilter === modelData.id ? "#c084fc" : "#475569"
                                border.width: 1
                                implicitWidth: fChipRow.implicitWidth + 16

                                RowLayout {
                                    id: fChipRow
                                    anchors.centerIn: parent
                                    spacing: 4
                                    Text { text: modelData.icon; font.pixelSize: 11 }
                                    Text {
                                        text: modelData.label
                                        font.pixelSize: 11
                                        font.bold: root.grimoireFilter === modelData.id
                                        color: root.grimoireFilter === modelData.id ? "#ffffff" : "#cbd5e1"
                                    }
                                }

                                MouseArea {
                                    id: fChipMa
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: root.grimoireFilter = modelData.id
                                }
                            }
                        }
                        Item { Layout.fillWidth: true }
                    }
                }

                // Empty State Display
                Rectangle {
                    Layout.fillWidth: true
                    height: 140
                    radius: 12
                    color: "#18181b"
                    border.color: "#27272a"
                    visible: root.getFilteredGrimoire().length === 0

                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        Text { Layout.alignment: Qt.AlignHCenter; text: "📖"; font.pixelSize: 28 }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: root.grimoireList.length === 0 ? "Your Grimoire is currently empty." : "No concepts match your filter criteria."
                            font.bold: true
                            font.pixelSize: 13
                            color: "#94a3b8"
                        }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "Generate concepts in Studio Forge, Natural Language, Agent Mode, or Batch Forge to automatically stage them here!"
                            font.pixelSize: 11
                            color: "#64748b"
                        }
                    }
                }

                // ------------------------------------------
                // 4. GRIMOIRE CARDS REPEATER
                // ------------------------------------------
                Repeater {
                    model: root.getFilteredGrimoire()
                    delegate: Rectangle {
                        id: cardRoot
                        Layout.fillWidth: true
                        radius: 12
                        color: "#111827"
                        border.color: (modelData.queue_status === "active") ? "#10b981" : (modelData.triage === "keeper" ? "#059669" : (modelData.triage === "discard" ? "#7f1d1d" : "#1f2937"))
                        border.width: (modelData.queue_status === "active" || modelData.triage === "keeper") ? 2 : 1
                        implicitHeight: cardCol.implicitHeight + 24

                        property bool isExpanded: false

                        ColumnLayout {
                            id: cardCol
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 12

                            // Top Header Row
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                // Source Badge
                                Rectangle {
                                    height: 22
                                    radius: 4
                                    color: "#1e293b"
                                    border.color: "#334155"
                                    border.width: 1
                                    implicitWidth: srcBadgeLabel.implicitWidth + 12
                                    Text {
                                        id: srcBadgeLabel
                                        anchors.centerIn: parent
                                        text: (modelData.source === "batch_forge" ? "🎲 Batch" : (modelData.source === "natural_language" ? "💡 NL AI" : (modelData.source === "agent" ? "🤖 Agent" : "⚙️ Studio")))
                                        font.pixelSize: 9
                                        font.bold: true
                                        color: "#a5b4fc"
                                    }
                                }

                                // Era Badge
                                Rectangle {
                                    height: 22
                                    radius: 4
                                    color: "#451a03"
                                    border.color: "#f59e0b"
                                    border.width: 1
                                    visible: Boolean(modelData.character && modelData.character.era)
                                    implicitWidth: eraBadgeLabel.implicitWidth + 12
                                    Text {
                                        id: eraBadgeLabel
                                        anchors.centerIn: parent
                                        text: (modelData.character && modelData.character.era) ? modelData.character.era : ""
                                        font.pixelSize: 9
                                        font.bold: true
                                        color: "#fbbf24"
                                        elide: Text.ElideRight
                                        maximumLineCount: 1
                                    }
                                }

                                Text {
                                    text: modelData.timestamp || ""
                                    font.pixelSize: 10
                                    color: "#64748b"
                                }

                                Text {
                                    text: modelData.character.name || "Character"
                                    font.bold: true
                                    font.pixelSize: 15
                                    color: "#f8fafc"
                                }

                                Text {
                                    text: modelData.character.title ? ("— " + modelData.character.title) : ""
                                    font.pixelSize: 12
                                    font.italic: true
                                    color: "#c084fc"
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }

                                // Grimoire Age Badge
                                Rectangle {
                                    height: 20
                                    radius: 4
                                    color: "#0f172a"
                                    border.color: "#38bdf8"
                                    border.width: 1
                                    visible: Boolean(modelData.character && modelData.character.age)
                                    implicitWidth: grimAgeLabel.implicitWidth + 10
                                    Text {
                                        id: grimAgeLabel
                                        anchors.centerIn: parent
                                        text: (modelData.character && modelData.character.age) ? ("🎂 " + modelData.character.age) : ""
                                        font.pixelSize: 9
                                        font.bold: true
                                        color: "#38bdf8"
                                        elide: Text.ElideRight
                                    }
                                }

                                // Interactive Star Rating Widget (1 to 5)
                                RowLayout {
                                    spacing: 2
                                    Repeater {
                                        model: 5
                                        delegate: Text {
                                            text: (index < (modelData.rating || 0)) ? "★" : "☆"
                                            font.pixelSize: 16
                                            color: (index < (modelData.rating || 0)) ? "#fbbf24" : "#475569"
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: {
                                                    var newRating = (modelData.rating === (index + 1)) ? 0 : (index + 1);
                                                    if (typeof backend !== "undefined" && backend) {
                                                        backend.updateGrimoireItem(modelData.id, newRating, modelData.triage || "inbox", modelData.notes || "");
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Item { width: 4 }

                                // Triage Selector Chips
                                RowLayout {
                                    spacing: 4

                                    // Keeper
                                    Rectangle {
                                        height: 24
                                        radius: 4
                                        color: modelData.triage === "keeper" ? "#065f46" : "#1e293b"
                                        border.color: modelData.triage === "keeper" ? "#10b981" : "#334155"
                                        border.width: 1
                                        implicitWidth: keeperTxt.implicitWidth + 10
                                        Text {
                                            id: keeperTxt
                                            anchors.centerIn: parent
                                            text: "💎 Keeper"
                                            font.pixelSize: 10
                                            font.bold: modelData.triage === "keeper"
                                            color: modelData.triage === "keeper" ? "#6ee7b7" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                var nextTriage = modelData.triage === "keeper" ? "inbox" : "keeper";
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.updateGrimoireItem(modelData.id, modelData.rating || 0, nextTriage, modelData.notes || "");
                                                }
                                            }
                                        }
                                    }

                                    // Refine
                                    Rectangle {
                                        height: 24
                                        radius: 4
                                        color: modelData.triage === "refine" ? "#78350f" : "#1e293b"
                                        border.color: modelData.triage === "refine" ? "#f59e0b" : "#334155"
                                        border.width: 1
                                        implicitWidth: refineTxt.implicitWidth + 10
                                        Text {
                                            id: refineTxt
                                            anchors.centerIn: parent
                                            text: "✏️ Refine"
                                            font.pixelSize: 10
                                            font.bold: modelData.triage === "refine"
                                            color: modelData.triage === "refine" ? "#fde68a" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                var nextTriage = modelData.triage === "refine" ? "inbox" : "refine";
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.updateGrimoireItem(modelData.id, modelData.rating || 0, nextTriage, modelData.notes || "");
                                                }
                                            }
                                        }
                                    }

                                    // Discard
                                    Rectangle {
                                        height: 24
                                        radius: 4
                                        color: modelData.triage === "discard" ? "#450a0a" : "#1e293b"
                                        border.color: modelData.triage === "discard" ? "#ef4444" : "#334155"
                                        border.width: 1
                                        implicitWidth: discardTxt.implicitWidth + 10
                                        Text {
                                            id: discardTxt
                                            anchors.centerIn: parent
                                            text: "🗑️ Pass"
                                            font.pixelSize: 10
                                            font.bold: modelData.triage === "discard"
                                            color: modelData.triage === "discard" ? "#fca5a5" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                var nextTriage = modelData.triage === "discard" ? "inbox" : "discard";
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.updateGrimoireItem(modelData.id, modelData.rating || 0, nextTriage, modelData.notes || "");
                                                }
                                            }
                                        }
                                    }

                                    // Household / Binder Chip Badge
                                    Rectangle {
                                        height: 24
                                        radius: 4
                                        color: (modelData.household && modelData.household.length > 0) ? "#831843" : "#1e293b"
                                        border.color: (modelData.household && modelData.household.length > 0) ? "#db2777" : "#475569"
                                        border.width: 1
                                        implicitWidth: hhBadgeTxt.implicitWidth + 12
                                        Text {
                                            id: hhBadgeTxt
                                            anchors.centerIn: parent
                                            text: (modelData.household && modelData.household.length > 0) ? ("👑 " + modelData.household) : "👑 Household..."
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: (modelData.household && modelData.household.length > 0) ? "#fbcfe8" : "#94a3b8"
                                        }
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                householdModal.openModal()
                                            }
                                        }
                                    }
                                }
                            }

                            // Tagline & Paradox
                            Text {
                                Layout.fillWidth: true
                                text: modelData.character.tagline ? ("\"" + modelData.character.tagline + "\"") : ""
                                font.pixelSize: 12
                                font.italic: true
                                color: "#cbd5e1"
                                wrapMode: Text.WordWrap
                                visible: Boolean(modelData.character.tagline)
                            }

                            // Central Contradiction Pill
                            Rectangle {
                                Layout.fillWidth: true
                                height: 26
                                radius: 4
                                color: "#18181b"
                                border.color: "#3f3f46"
                                border.width: 1
                                visible: Boolean(modelData.character.central_contradiction)

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 8
                                    anchors.rightMargin: 8
                                    spacing: 6
                                    Text { text: "⚡ Paradox:"; font.bold: true; font.pixelSize: 10; color: "#eab308" }
                                    Text {
                                        Layout.fillWidth: true
                                        text: modelData.character.central_contradiction || ""
                                        font.pixelSize: 11
                                        color: "#fef08a"
                                        elide: Text.ElideRight
                                    }
                                }
                            }

                            // Origin Prompt Display (if available)
                            Rectangle {
                                Layout.fillWidth: true
                                height: originPromptTxt.implicitHeight + 12
                                radius: 4
                                color: "#0f172a"
                                border.color: "#1e3a8a"
                                border.width: 1
                                visible: Boolean(modelData.origin_prompt || (modelData.character && modelData.character.origin_prompt))

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 8
                                    anchors.rightMargin: 8
                                    spacing: 6
                                    Text { text: "💬 NL Prompt:"; font.bold: true; font.pixelSize: 10; color: "#38bdf8" }
                                    Text {
                                        id: originPromptTxt
                                        Layout.fillWidth: true
                                        text: (modelData.origin_prompt || (modelData.character && modelData.character.origin_prompt)) || ""
                                        font.pixelSize: 11
                                        font.italic: true
                                        color: "#bae6fd"
                                        elide: Text.ElideRight
                                    }
                                }
                            }

                            // Premise Excerpt
                            Text {
                                Layout.fillWidth: true
                                text: modelData.character.premise || ""
                                font.pixelSize: 12
                                color: "#94a3b8"
                                wrapMode: Text.WordWrap
                                maximumLineCount: cardRoot.isExpanded ? 100 : 3
                                elide: Text.ElideRight
                            }

                            // Expand / Collapse Premise Link
                            Text {
                                text: cardRoot.isExpanded ? "▲ Collapse full dossier" : "▼ Read full character premise..."
                                font.pixelSize: 11
                                font.bold: true
                                color: "#818cf8"
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: cardRoot.isExpanded = !cardRoot.isExpanded
                                }
                            }

                            // Scratchpad Notes Box
                            Rectangle {
                                Layout.fillWidth: true
                                height: 32
                                radius: 6
                                color: "#18181b"
                                border.color: "#27272a"
                                border.width: 1

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 8
                                    anchors.rightMargin: 8
                                    spacing: 6

                                    Text { text: "📝"; font.pixelSize: 11 }
                                    TextField {
                                        id: noteField
                                        Layout.fillWidth: true
                                        placeholderText: "Add scratchpad notes (e.g. tweak job, increase tension)..."
                                        text: modelData.notes || ""
                                        font.pixelSize: 11
                                        color: "#e2e8f0"
                                        background: Item {}
                                        onEditingFinished: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.updateGrimoireItem(modelData.id, modelData.rating || 0, modelData.triage || "inbox", noteField.text);
                                            }
                                        }
                                    }
                                    Text {
                                        text: "Save"
                                        font.pixelSize: 10
                                        font.bold: true
                                        color: "#818cf8"
                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                if (typeof backend !== "undefined" && backend) {
                                                    backend.updateGrimoireItem(modelData.id, modelData.rating || 0, modelData.triage || "inbox", noteField.text);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Action Buttons Row
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                // Load into Studio
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#4338ca" : "#3730a3"
                                        border.color: "#818cf8"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "👁️"; font.pixelSize: 11 }
                                        Text { text: "Load into Studio"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.loadGrimoireItemIntoStudio(modelData.id);
                                            root.currentTab = 0;
                                        }
                                    }
                                }

                                // Load into Natural Language
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#0284c7" : "#0369a1"
                                        border.color: "#38bdf8"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "🧠"; font.pixelSize: 11 }
                                        Text { text: "Load into NL"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.loadGrimoireItemIntoNaturalLanguage(modelData.id);
                                            var origPrompt = modelData.origin_prompt || (modelData.character && modelData.character.origin_prompt);
                                            if (origPrompt) {
                                                nlPromptArea.text = origPrompt;
                                            }
                                            root.currentTab = 1;
                                        }
                                    }
                                }

                                // Load into Agent
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#059669" : "#047857"
                                        border.color: "#34d399"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "🤖"; font.pixelSize: 11 }
                                        Text { text: "Load into Agent"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.loadGrimoireItemIntoAgent(modelData.id);
                                            root.currentAgentMode = "character";
                                            root.currentTab = 2;
                                        }
                                    }
                                }

                                // Variance Button
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#9333ea" : "#7c3aed"
                                        border.color: "#c084fc"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "🎲"; font.pixelSize: 11 }
                                        Text { text: "Variance..."; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                    }
                                    onClicked: {
                                        var charData = Object.assign({}, modelData.character);
                                        if (modelData.origin_prompt && !charData.origin_prompt) {
                                            charData.origin_prompt = modelData.origin_prompt;
                                        }
                                        varianceModal.openWithCharacter(charData);
                                    }
                                }

                                // Tweak / Modify Aspect Button
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#d97706" : "#b45309"
                                        border.color: "#f59e0b"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "✏️"; font.pixelSize: 11 }
                                        Text { text: "Tweak Aspect..."; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                    }
                                    onClicked: {
                                        var charData = Object.assign({}, modelData.character);
                                        if (modelData.origin_prompt && !charData.origin_prompt) {
                                            charData.origin_prompt = modelData.origin_prompt;
                                        }
                                        tweakModal.openWithCharacter(charData);
                                    }
                                }

                                // Enqueue for CharGenUI
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#065f46" : "#064e3b"
                                        border.color: "#10b981"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: (modelData.queue_status === "queued" || modelData.queue_status === "active") ? "✓" : "➕"; font.pixelSize: 11; color: "#ffffff" }
                                        Text {
                                            text: (modelData.queue_status === "active" ? "In CharGenUI" : ((modelData.queue_status === "queued") ? "Queued (#)" : "Add to Dispatch Queue"))
                                            font.bold: true
                                            font.pixelSize: 11
                                            color: "#ecfdf5"
                                        }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            if (modelData.queue_status === "queued") {
                                                backend.dequeueGrimoireItem(modelData.id);
                                            } else {
                                                backend.enqueueGrimoireItem(modelData.id);
                                            }
                                        }
                                    }
                                }

                                // Direct Push to CharGenUI
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#7c3aed" : "#6d28d9"
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "🚀"; font.pixelSize: 11 }
                                        Text { text: "Send Direct"; font.bold: true; font.pixelSize: 11; color: "#ffffff" }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.pushToCharGenUI(
                                                JSON.stringify(modelData.character),
                                                root.autoGenerateOnSend
                                            );
                                        }
                                    }
                                }

                                Item { Layout.fillWidth: true }

                                // Delete Button
                                Button {
                                    height: 32
                                    background: Rectangle {
                                        radius: 6
                                        color: parent.hovered ? "#450a0a" : "#1e293b"
                                        border.color: "#ef4444"
                                        border.width: 1
                                    }
                                    contentItem: RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Text { text: "🗑️"; font.pixelSize: 10 }
                                        Text { text: "Delete"; font.pixelSize: 11; color: "#fca5a5" }
                                    }
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            backend.deleteGrimoireItem(modelData.id);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Item { height: 20 }
            }
        }
    }


        // ==========================================
        // HISTORY DRAWER (BOTTOM)
        // ==========================================
        Rectangle {
            Layout.fillWidth: true
            height: 110
            color: "#0f172a"
            border.color: "#1e293b"
            border.width: 1
            visible: root.historyList.length > 0 && root.currentTab !== 3

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 10
                spacing: 6

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "SAVED CONCEPTS & HISTORY (" + root.historyList.length + ")"
                        font.bold: true
                        font.pixelSize: 11
                        color: "#94a3b8"
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "Clear All"
                        font.pixelSize: 11
                        color: "#ef4444"
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (typeof backend !== "undefined" && backend) backend.clearHistory()
                        }
                    }
                }

                ListView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    orientation: ListView.Horizontal
                    spacing: 10
                    clip: true
                    model: root.historyList

                    delegate: Rectangle {
                        width: 220
                        height: 56
                        radius: 6
                        color: hMouse.containsMouse ? "#1e293b" : "#131b2e"
                        border.color: "#334155"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 8

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: modelData.name || "Character"
                                    font.bold: true
                                    font.pixelSize: 12
                                    color: "#f8fafc"
                                    elide: Text.ElideRight
                                }
                                Text {
                                    text: modelData.title || ""
                                    font.pixelSize: 10
                                    color: "#94a3b8"
                                    elide: Text.ElideRight
                                }
                            }

                            Text {
                                text: "✕"
                                font.pixelSize: 11
                                color: "#64748b"
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: if (typeof backend !== "undefined" && backend) backend.deleteHistoryItem(index)
                                }
                            }
                        }

                        MouseArea {
                            id: hMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                root.activeIdea = modelData;
                                if (typeof backend !== "undefined" && backend) backend.toast("Loaded " + modelData.name + " from history.");
                            }
                        }
                    }
                }
            }
        }

    }

    // ==========================================
    // ERA PICKER & USER ERA STUDIO MODAL
    // ==========================================
    EraPickerModal {
        id: eraPickerModal
        onEraSelected: function(eraId, eraData) {
            root.selectedEra = eraId;
        }
    }

    // ==========================================
    // MULTI-CHARACTER HOUSEHOLD & COURT MODAL
    // ==========================================
    HouseholdModal {
        id: householdModal
    }

    // ==========================================
    // CONCEPT VARIANCE GUIDANCE MODAL
    // ==========================================
    Rectangle {
        id: varianceModal
        anchors.fill: parent
        color: Qt.rgba(0, 0, 0, 0.75)
        visible: false
        z: 9999

        property var targetCharacter: null

        function openWithCharacter(charObj) {
            targetCharacter = charObj;
            guidanceInput.text = "";
            visible = true;
            guidanceInput.forceActiveFocus();
        }

        function close() {
            visible = false;
            targetCharacter = null;
        }

        function submitVariance() {
            if (targetCharacter && typeof backend !== "undefined" && backend) {
                var guide = guidanceInput.text.trim();
                var raw = JSON.stringify(targetCharacter);
                backend.generateConceptVariance(raw, 0.9, guide);
            }
            close();
        }

        MouseArea {
            anchors.fill: parent
            onClicked: varianceModal.close()
        }

        Rectangle {
            anchors.centerIn: parent
            width: Math.min(560, parent.width - 40)
            height: modalCol.implicitHeight + 40
            radius: 12
            color: "#18181b"
            border.color: "#8b5cf6"
            border.width: 1

            MouseArea {
                anchors.fill: parent
                // absorb clicks inside dialog
            }

            ColumnLayout {
                id: modalCol
                anchors.top: parent.top
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.margins: 20
                spacing: 14

                // Header Row
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Text { text: "🎲"; font.pixelSize: 20 }
                    ColumnLayout {
                        spacing: 2
                        Text {
                            text: "Concept Variance"
                            font.bold: true
                            font.pixelSize: 15
                            color: "#f8fafc"
                        }
                        Text {
                            text: varianceModal.targetCharacter ? ("Synthesize nuanced alternative for: " + (varianceModal.targetCharacter.name || "Concept")) : ""
                            font.pixelSize: 11
                            color: "#c084fc"
                            elide: Text.ElideRight
                        }
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "✕"
                        font.pixelSize: 14
                        color: "#94a3b8"
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: varianceModal.close()
                        }
                    }
                }

                // Description
                Text {
                    Layout.fillWidth: true
                    text: "Generates an evocative, fresh variation maintaining the core species, trope, and relational dynamic while shifting the backstory crucible and psychological contradictions."
                    font.pixelSize: 11
                    color: "#94a3b8"
                    wrapMode: Text.WordWrap
                }

                // Optional Guidance Box
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "🎯 Steering Guidance (Optional):"
                            font.bold: true
                            font.pixelSize: 11
                            color: "#e2e8f0"
                        }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: "Leave blank for freeform variance"
                            font.pixelSize: 10
                            color: "#64748b"
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 90
                        radius: 8
                        color: "#0f172a"
                        border.color: guidanceInput.activeFocus ? "#a855f7" : "#334155"
                        border.width: guidanceInput.activeFocus ? 2 : 1

                        Flickable {
                            anchors.fill: parent
                            anchors.margins: 8
                            contentWidth: width
                            contentHeight: guidanceInput.implicitHeight
                            clip: true

                            TextArea.flickable: TextArea {
                                id: guidanceInput
                                placeholderText: "e.g., 'Make them more reluctant and cold initially', 'Set the meeting during a torrential storm in a tavern cellar', 'Make her a banished former royal guard'..."
                                placeholderTextColor: "#475569"
                                color: "#f8fafc"
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                                background: Item {}
                                Keys.onReturnPressed: function(event) {
                                    if (event.modifiers & Qt.ControlModifier) {
                                        varianceModal.submitVariance();
                                    }
                                }
                            }
                        }
                    }
                }

                // Action Buttons
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    Button {
                        height: 36
                        Layout.fillWidth: true
                        background: Rectangle {
                            radius: 6
                            color: parent.hovered ? "#334155" : "#1e293b"
                            border.color: "#475569"
                            border.width: 1
                        }
                        contentItem: Text {
                            text: "🎲 Surprise Me (No Guidance)"
                            font.pixelSize: 11
                            color: "#cbd5e1"
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: {
                            guidanceInput.text = "";
                            varianceModal.submitVariance();
                        }
                    }

                    Button {
                        height: 36
                        Layout.fillWidth: true
                        background: Rectangle {
                            radius: 6
                            color: parent.hovered ? "#9333ea" : "#7c3aed"
                            border.color: "#c084fc"
                            border.width: 1
                        }
                        contentItem: RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "✨"; font.pixelSize: 12 }
                            Text {
                                text: guidanceInput.text.trim() ? "Synthesize Guided Variance" : "Synthesize Variance"
                                font.bold: true
                                font.pixelSize: 11
                                color: "#ffffff"
                            }
                        }
                        onClicked: varianceModal.submitVariance()
                    }
                }
            }
        }
    }

    // ==========================================
    // TARGETED CONCEPT ASPECT TWEAK MODAL
    // ==========================================
    Rectangle {
        id: tweakModal
        anchors.fill: parent
        color: Qt.rgba(0, 0, 0, 0.75)
        visible: false
        z: 9999

        property var targetCharacter: null

        function openWithCharacter(charObj) {
            targetCharacter = charObj;
            tweakInput.text = "";
            visible = true;
            tweakInput.forceActiveFocus();
        }

        function close() {
            visible = false;
            targetCharacter = null;
        }

        function submitTweak() {
            var instruction = tweakInput.text.trim();
            if (!instruction) {
                if (typeof backend !== "undefined" && backend) backend.toast("⚠️ Please enter what part of the concept you want changed.");
                return;
            }
            if (targetCharacter && typeof backend !== "undefined" && backend) {
                var raw = JSON.stringify(targetCharacter);
                backend.tweakConceptAspect(raw, instruction);
            }
            close();
        }

        MouseArea {
            anchors.fill: parent
            onClicked: tweakModal.close()
        }

        Rectangle {
            anchors.centerIn: parent
            width: Math.min(560, parent.width - 40)
            height: tweakModalCol.implicitHeight + 40
            radius: 12
            color: "#18181b"
            border.color: "#f59e0b"
            border.width: 1

            MouseArea {
                anchors.fill: parent
            }

            ColumnLayout {
                id: tweakModalCol
                anchors.top: parent.top
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.margins: 20
                spacing: 14

                // Header Row
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Text { text: "✏️"; font.pixelSize: 20 }
                    ColumnLayout {
                        spacing: 2
                        Text {
                            text: "Tweak Specific Aspect"
                            font.bold: true
                            font.pixelSize: 15
                            color: "#f8fafc"
                        }
                        Text {
                            text: tweakModal.targetCharacter ? ("Modify specific element of: " + (tweakModal.targetCharacter.name || "Concept")) : ""
                            font.pixelSize: 11
                            color: "#fbbf24"
                            elide: Text.ElideRight
                        }
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "✕"
                        font.pixelSize: 14
                        color: "#94a3b8"
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: tweakModal.close()
                        }
                    }
                }

                // Description
                Text {
                    Layout.fillWidth: true
                    text: "Prompt the AI to modify a specific part of this concept (e.g. change appearance, job, relationship posture, premise location, or inner contradiction) while keeping everything else intact."
                    font.pixelSize: 11
                    color: "#94a3b8"
                    wrapMode: Text.WordWrap
                }

                // Quick Suggestion Chips
                Flow {
                    Layout.fillWidth: true
                    spacing: 6

                    Repeater {
                        model: [
                            "Make them more reluctant and standoffish",
                            "Change species / lineage to Drow",
                            "Give them silver hair and piercing violet eyes",
                            "Relocate setting to an isolated mountain shrine",
                            "Deepen their secret craving for affection"
                        ]

                        Rectangle {
                            height: 24
                            radius: 12
                            color: chipMa.containsMouse ? "#374151" : "#1f2937"
                            border.color: "#4b5563"
                            border.width: 1
                            implicitWidth: chipTxt.implicitWidth + 16

                            Text {
                                id: chipTxt
                                anchors.centerIn: parent
                                text: modelData
                                font.pixelSize: 10
                                color: "#e2e8f0"
                            }

                            MouseArea {
                                id: chipMa
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    tweakInput.text = modelData;
                                    tweakInput.forceActiveFocus();
                                }
                            }
                        }
                    }
                }

                // Modification Instruction Box
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Text {
                        text: "🎯 What would you like to change?"
                        font.bold: true
                        font.pixelSize: 11
                        color: "#fef3c7"
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 90
                        radius: 8
                        color: "#0f172a"
                        border.color: tweakInput.activeFocus ? "#f59e0b" : "#334155"
                        border.width: tweakInput.activeFocus ? 2 : 1

                        Flickable {
                            anchors.fill: parent
                            anchors.margins: 8
                            contentWidth: width
                            contentHeight: tweakInput.implicitHeight
                            clip: true

                            TextArea.flickable: TextArea {
                                id: tweakInput
                                placeholderText: "e.g., 'Change her profession from blacksmith to royal archivist', 'Make her initial attitude much more teasing and mischievous', 'Change the inciting incident to {{user}} finding her injured in the woods'..."
                                placeholderTextColor: "#475569"
                                color: "#f8fafc"
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                                background: Item {}
                                Keys.onReturnPressed: function(event) {
                                    if (event.modifiers & Qt.ControlModifier) {
                                        tweakModal.submitTweak();
                                    }
                                }
                            }
                        }
                    }
                }

                // Action Buttons
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    Button {
                        height: 36
                        Layout.fillWidth: true
                        background: Rectangle {
                            radius: 6
                            color: parent.hovered ? "#334155" : "#1e293b"
                            border.color: "#475569"
                            border.width: 1
                        }
                        contentItem: Text {
                            text: "Cancel"
                            font.pixelSize: 11
                            color: "#cbd5e1"
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: tweakModal.close()
                    }

                    Button {
                        height: 36
                        Layout.fillWidth: true
                        background: Rectangle {
                            radius: 6
                            color: parent.hovered ? "#d97706" : "#b45309"
                            border.color: "#f59e0b"
                            border.width: 1
                        }
                        contentItem: RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "⚡"; font.pixelSize: 12 }
                            Text {
                                text: "Apply Targeted Change"
                                font.bold: true
                                font.pixelSize: 11
                                color: "#ffffff"
                            }
                        }
                        onClicked: tweakModal.submitTweak()
                    }
                }
            }
        }
    }

    // ==========================================
    // TOAST NOTIFICATION
    // ==========================================
    Rectangle {
        id: toastBox
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 30
        height: 38
        implicitWidth: toastLabel.implicitWidth + 32
        radius: 19
        color: "#18181b"
        border.color: "#8b5cf6"
        border.width: 1
        opacity: 0.0

        Text {
            id: toastLabel
            anchors.centerIn: parent
            text: root.toastText
            font.bold: true
            font.pixelSize: 12
            color: "#f8fafc"
        }

        SequentialAnimation {
            id: toastAnim
            NumberAnimation { target: toastBox; property: "opacity"; to: 1.0; duration: 200 }
            PauseAnimation { duration: 2500 }
            NumberAnimation { target: toastBox; property: "opacity"; to: 0.0; duration: 300 }
        }
    }

    FileDialog {
        id: agentCardFileDialog
        title: "Import Character Card into Agent"
        nameFilters: ["Character Cards (*.png *.json *.charx)", "All Files (*)"]
        onAccepted: if (typeof backend !== "undefined" && backend) backend.importCardIntoAgent(selectedFile.toString())
    }

    FileDialog {
        id: nlVisionFileDialog
        title: "Select Character Portrait, Concept Art, or Video"
        nameFilters: ["Media Files (*.png *.jpg *.jpeg *.webp *.avif *.mp4 *.mkv *.webm *.mov *.avi)", "Images (*.png *.jpg *.jpeg *.webp *.avif)", "Videos (*.mp4 *.mkv *.webm *.mov *.avi)", "All Files (*)"]
        onAccepted: {
            root.nlAttachedVisionImage = selectedFile.toString();
        }
    }

    FileDialog {
        id: agentVisionFileDialog
        title: "Select Media Reference for AI Agent"
        nameFilters: ["Media Files (*.png *.jpg *.jpeg *.webp *.avif *.mp4 *.mkv *.webm *.mov *.avi)", "Images (*.png *.jpg *.jpeg *.webp *.avif)", "Videos (*.mp4 *.mkv *.webm *.mov *.avi)", "All Files (*)"]
        onAccepted: {
            root.agentAttachedVisionImage = selectedFile.toString();
        }
    }

    // ==========================================
    // FULLSCREEN IMAGE ZOOM & INSPECT MODAL
    // ==========================================
    Rectangle {
        id: zoomPreviewModal
        anchors.fill: parent
        z: 9999
        visible: root.previewZoomImageUrl.length > 0
        color: "#d9000000" // 85% transparent dark backdrop

        // Close on escape key
        focus: visible
        Keys.onEscapePressed: root.previewZoomImageUrl = ""

        MouseArea {
            anchors.fill: parent
            onClicked: root.previewZoomImageUrl = ""
        }

        // Inner Image Card
        Rectangle {
            anchors.centerIn: parent
            width: Math.min(parent.width - 60, Math.max(400, parent.width * 0.7))
            height: Math.min(parent.height - 60, Math.max(400, parent.height * 0.85))
            radius: 12
            color: "#0f172a"
            border.color: "#8b5cf6"
            border.width: 1.5
            clip: true

            MouseArea {
                // Prevent clicks on the card itself from closing the modal
                anchors.fill: parent
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 10

                // Header with filename and close button
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Text {
                        text: "👁️ Visual Seed Inspection"
                        font.bold: true
                        font.pixelSize: 13
                        color: "#c084fc"
                    }

                    Text {
                        text: root.previewZoomImageUrl ? (root.previewZoomImageUrl.split("/").pop()) : ""
                        font.pixelSize: 11
                        color: "#94a3b8"
                        elide: Text.ElideMiddle
                        Layout.fillWidth: true
                    }

                    Button {
                        text: "✕ Close (Esc)"
                        implicitHeight: 28
                        background: Rectangle {
                            radius: 6
                            color: parent.hovered ? "#475569" : "#1e293b"
                            border.color: "#334155"
                        }
                        contentItem: Text {
                            text: parent.text
                            color: "#f8fafc"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: root.previewZoomImageUrl = ""
                    }
                }

                // Full Preview Image Viewport
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    radius: 8
                    color: "#030712"
                    border.color: "#1e293b"
                    clip: true

                    Image {
                        id: zoomedImage
                        anchors.fill: parent
                        anchors.margins: 8
                        source: root.previewZoomImageUrl
                        fillMode: Image.PreserveAspectFit
                        smooth: true
                        mipmap: true
                    }
                }

                // Additional Visual Seed Details & Context Notes
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    visible: (root.nlAttachedVisionImage.length > 0 && root.previewZoomImageUrl === root.nlAttachedVisionImage) ||
                             (root.agentAttachedVisionImage.length > 0 && root.previewZoomImageUrl === root.agentAttachedVisionImage)

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "📝 Additional Visual Seed Details / Lore Notes (Optional):"
                            font.bold: true
                            font.pixelSize: 11
                            color: "#c084fc"
                        }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: (root.previewZoomImageUrl === root.nlAttachedVisionImage ? root.nlAttachedVisionImageNotes : root.agentAttachedVisionImageNotes).trim().length > 0 ? "Saved with image" : "Unset"
                            font.pixelSize: 10
                            color: (root.previewZoomImageUrl === root.nlAttachedVisionImage ? root.nlAttachedVisionImageNotes : root.agentAttachedVisionImageNotes).trim().length > 0 ? "#34d399" : "#64748b"
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 54
                        radius: 6
                        color: "#0f172a"
                        border.color: imgNotesInput.activeFocus ? "#a855f7" : "#334155"
                        border.width: 1

                        ScrollView {
                            anchors.fill: parent
                            anchors.margins: 6
                            clip: true

                            TextArea {
                                id: imgNotesInput
                                text: root.previewZoomImageUrl === root.nlAttachedVisionImage ? root.nlAttachedVisionImageNotes : root.agentAttachedVisionImageNotes
                                placeholderText: "Specify details about this media (e.g. artist source, specific species markers, hidden scars, era context, weapon names, alternate outfit cues)..."
                                placeholderTextColor: "#64748b"
                                color: "#f8fafc"
                                font.pixelSize: 11
                                wrapMode: TextArea.Wrap
                                selectByMouse: true
                                onTextChanged: {
                                    if (root.previewZoomImageUrl === root.nlAttachedVisionImage) {
                                        root.nlAttachedVisionImageNotes = text;
                                    } else if (root.previewZoomImageUrl === root.agentAttachedVisionImage) {
                                        root.agentAttachedVisionImageNotes = text;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
