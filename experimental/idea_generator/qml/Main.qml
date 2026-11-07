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
        "name": "Rowena",
        "title": "The Domestic Brat & Household Provocateur",
        "tagline": "Deeply loving and devoted, but has a compulsive need to provoke strict boundaries.",
        "tags": ["Domestic Discipline", "Brat / Brat Tamer", "Married Couple", "Spanking", "Loving & Possessive"],
        "archetype": "The Doting Wife who deliberately acts up to earn physical discipline and reassurance.",
        "intensity": "mild",
        "central_contradiction": "Adores being a devoted wife vs an unbearable physical itch to push buttons until {{user}} takes total physical control.",
        "reaction_gradient": {
            "wont": "Mockery of her competence or cruelty without aftercare",
            "craves": "Being put over his lap, firm boundaries, being ordered to be quiet, deep cuddles afterward",
            "neutral": "Grocery lists, laundry cycles, neighborly small talk",
            "will": "Tearful apologies, total softness, admitting what she actually wanted all along",
            "trust_gate": "Resting her forehead against his chest in absolute stillness after being corrected"
        },
        "vocal_idiolect": "Sly, teasing, and playful when testing limits; breathless, stuttering, and soft when disciplined. Natural contractions.",
        "premise": "Rowena, {{user}}'s sweet, doting wife who genuinely loves taking care of him, but has a compulsive bratty streak designed specifically to push {{user}}'s buttons. She leaves things out of place, talks back with a sly, challenging smirk, and acts defiantly just to hear {{user}}'s tone shift into his stern, commanding voice. She craves being put over {{user}}'s knee, hand-spanked until she's weeping soft apologies, and having her wrists held while {{user}} reminds her who is in charge. Central contradiction: She adores being a good wife, but she gets an unbearable physical itch whenever things are too calm and needs {{user}}'s firm hand to put her in her place.",
        "source": "Ready for Generation"
    })

    // Dramatic Stakes Dial: "any", "mild", "medium", "heavy"
    property string selectedIntensity: "heavy"

    // Power Dynamic & Correction Dial (with Off switch): "off", "any:r", "any:ai", "mild", "correction", "heavy"
    property string selectedCorrectionTier: "correction"

    // Historical Era & Timeline: "off", "timeless_fantasy", or historical era IDs
    property string selectedEra: "off"
    property var historicalErasList: []
    onSelectedEraChanged: {
        if (typeof backend !== "undefined" && backend) {
            backend.currentEra = root.selectedEra;
        }
    }
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
    property string selectedFocusMode: "psychometric"
    property bool isEditingPremise: false
    property string activeScenarioHook: ""
    property bool isGeneratingScenario: false

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
        if (!msg || msg.trim().length === 0 || root.isGenerating) return;
        if (typeof backend !== "undefined" && backend) {
            var temp = (typeof agentTempSlider !== "undefined" && agentTempSlider) ? agentTempSlider.value : 0.85;
            backend.sendAgentMessage(msg.trim(), temp);
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
            if (!success && errorMsg) {
                root.toastText = "⚠️ " + errorMsg;
                toastAnim.restart();
            }
        }

        function onIsGeneratingChanged(val) {
            root.isGenerating = val;
            if (!val) {
                root.isGeneratingScenario = false;
            }
        }

        function onIdeaReceived(ideaJson) {
            root.isGenerating = false;
            root.isGeneratingScenario = false;
            try {
                root.activeIdea = JSON.parse(ideaJson);
                root.isEditingPremise = false;
                root.activeScenarioHook = "";
            } catch(e) {
                console.error("Failed to parse idea JSON: " + e);
            }
        }

        function onNaturalIdeaReceived(ideaJson) {
            root.isGenerating = false;
            root.isGeneratingScenario = false;
            try {
                root.naturalIdea = JSON.parse(ideaJson);
                root.isEditingPremise = false;
                root.activeScenarioHook = "";
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

        function onScenarioHookReceived(hook) {
            root.isGenerating = false;
            root.isGeneratingScenario = false;
            root.activeScenarioHook = hook;
            root.toastText = "⚡ Opening scenario starter generated!";
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
        if (!eraId || !root.historicalErasList) return null;
        for (var i = 0; i < root.historicalErasList.length; i++) {
            if (root.historicalErasList[i].id === eraId) {
                return root.historicalErasList[i];
            }
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

    // Helper for intensity label
    function intensityTitle(val) {
        if (val === "mild") return "🌸 Low Stakes / Cozy";
        if (val === "medium") return "⚖️ Moderate Stakes";
        if (val === "heavy") return "🔥 High Stakes";
        return "✨ Natural / Any";
    }

    function intensityColor(val) {
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
            Layout.preferredHeight: 60
            Layout.minimumHeight: 60
            Layout.maximumHeight: 60
            height: 60
            color: "#111827"
            border.color: "#1f2937"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 16
                spacing: 12

                RowLayout {
                    spacing: 10
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
                            font.pixelSize: 15
                            color: "#f8fafc"
                        }
                        Text {
                            text: "Uncensored Psychometric Character Idea Pipeline"
                            font.pixelSize: 10
                            color: "#94a3b8"
                        }
                    }
                }

                Item { Layout.fillWidth: true }

                // ==========================================
                // TAB SWITCHER
                // ==========================================
                RowLayout {
                    spacing: 6

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
                }

                Item { Layout.fillWidth: true }

                // Right Status Pills Group
                RowLayout {
                    spacing: 8
                    Layout.alignment: Qt.AlignRight

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
        // MODULARIZED TAB VIEWS
        StudioForgeTab {
            id: studioWorkspaceView
            visible: root.currentTab === 0
            Layout.fillWidth: true
            Layout.fillHeight: true
        }

        NaturalLanguageTab {
            id: naturalLanguageWorkspaceView
            visible: root.currentTab === 1
            Layout.fillWidth: true
            Layout.fillHeight: true
        }

        AgentWorkspaceTab {
            id: aiAgentWorkspaceView
            visible: root.currentTab === 2
            Layout.fillWidth: true
            Layout.fillHeight: true
        }

        GrimoireQueueTab {
            id: grimoireWorkspaceView
            visible: root.currentTab === 3
            Layout.fillWidth: true
            Layout.fillHeight: true
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
}

}
