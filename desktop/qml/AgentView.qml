import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Item {
    id: root

    Theme { id: theme }

    property var chatMessages: []
    property var pinnedDirectives: []
    property string activeScope: "auto"
    property bool enforceNaturalVoice: true
    property bool twoTakes: false
    property bool reviewDiffs: true
    property bool pinnedExpanded: false

    // Diff Inspection Modal State
    property bool diffModalOpen: false
    property var activeDiffProposal: null
    property var activeDiffMessage: null

    function openDiffModal(proposal, msg) {
        activeDiffProposal = proposal
        activeDiffMessage = msg
        diffModalOpen = true
    }

    function closeDiffModal() {
        diffModalOpen = false
        activeDiffProposal = null
        activeDiffMessage = null
    }

    Component.onCompleted: {
        ensureInitialized()
    }

    function ensureInitialized() {
        if (chatMessages.length === 0) {
            var nowTime = Qt.formatTime(new Date(), "hh:mm")
            chatMessages = [{
                role: "assistant",
                content: "👋 I'm your interactive Agent Co-Pilot and Card Doctor. You can ask me to rewrite specific sections, deepen psychological nuance, weave subtext, optimize tokens, or critique. I operate with surgical diff inspection.",
                time: nowTime
            }]
        }
    }

    function addPinned(rule) {
        if (!rule || !rule.trim()) return
        var clean = rule.trim()
        if (root.pinnedDirectives.indexOf(clean) === -1) {
            var updated = root.pinnedDirectives.slice()
            updated.push(clean)
            root.pinnedDirectives = updated
        }
    }

    function removePinned(rule) {
        var updated = root.pinnedDirectives.filter(function(r) { return r !== rule })
        root.pinnedDirectives = updated
    }

    function sendPresetInstruction(wish) {
        instructionField.text = wish
        sendBtn.clicked()
    }

    function estimateTokens(text) {
        if (!text) return 0
        return Math.max(1, Math.round(text.length / 3.8))
    }

    // Client-side diagnostic checkup (identical to WebUI runPrescriptionCheckup)
    function runPrescriptionCheckup() {
        var char = bridge.card || {}
        var issues = []

        // 1. Thesaurus / Spock Jargon
        var persAndMes = ((char.personality || "") + " " + (char.mes_example || "")).toLowerCase()
        var roboticTerms = [
            "statistical anomaly", "mathematically unsound", "nutrient density",
            "altering my trajectory", "inefficiency of your chaos", "empirical evidence",
            "probability matrix", "computational", "cognitive faculty"
        ]
        var foundRobotic = []
        for (var i = 0; i < roboticTerms.length; i++) {
            if (persAndMes.indexOf(roboticTerms[i]) !== -1) foundRobotic.push(roboticTerms[i])
        }
        if (foundRobotic.length > 0) {
            issues.push({
                id: "jargon",
                severity: "high",
                title: "Thesaurus / Spock Syndrome Detected (" + foundRobotic.slice(0, 2).join(", ") + ")",
                explanation: "Dialogue or personality uses clinical pseudo-academic jargon for ordinary domestic actions, breaking immersion.",
                prompt: "Purge all robotic, academic, or clinical jargon (such as " + foundRobotic.join(", ") + "). Rewrite personality and dialogue examples so she speaks with natural contractions, razor wit, and realistic spoken cadence.",
                buttonText: "🩺 Fix: Naturalize Spoken Cadence"
            })
        }

        // 2. {{user}} Puppeteering
        var greetings = (char.first_mes || "") + " " + (char.alternate_greetings || []).join(" ")
        var puppeteerRegex = /{{user}}\s+(feels|thinks|gasps|whispers|steps back|shivers|nodded|replied|answers|sighs|realizes|hesitates)/i
        if (puppeteerRegex.test(greetings)) {
            issues.push({
                id: "puppeteering",
                severity: "high",
                title: "{{user}} Puppeteering in Opening Messages",
                explanation: "The character's greeting narrates {{user}}'s actions, feelings, or dialogue, violating player agency.",
                prompt: "Remove all instances of {{user}} puppeteering from first_mes and alternate_greetings. Keep third-person limited perspective strictly focused on {{char}}'s actions and speech.",
                buttonText: "🩺 Fix: Remove {{user}} Puppeteering"
            })
        }

        // 3. Token Bloat in Description
        var descTok = estimateTokens(char.description || "")
        if (descTok > 750) {
            issues.push({
                id: "token_bloat",
                severity: "medium",
                title: "Description Token Bloat (~" + descTok + " tokens)",
                explanation: "Character description exceeds 750 tokens with potential purple prose or redundant exposition.",
                prompt: "Optimize and condense description by ~30% from " + descTok + " tokens to ~450 tokens without sacrificing any core contradictions, physical tells, or sensory anchors.",
                buttonText: "🩺 Fix: Compress Description (~30%)"
            })
        }

        // 4. Missing Spoken Dialogue Contractions
        if (char.first_mes && !/don't|can't|it's|won't|i'm|you're|didn't|doesn't/i.test(char.first_mes)) {
            issues.push({
                id: "no_contractions",
                severity: "medium",
                title: "Stiff / Formal Dialogue Cadence (No Contractions)",
                explanation: "Opening message has zero natural contractions (e.g. 'do not', 'cannot'), making speech sound written instead of spoken aloud.",
                prompt: "Inject natural contractions (don't, can't, it's, won't) and brief reactive pauses into first_mes and dialogue examples to make her speech sound authentically spoken aloud.",
                buttonText: "🩺 Fix: Inject Natural Contractions"
            })
        }

        // 5. Interpersonal Friction & Central Contradiction
        if (char.personality && !/contradiction|friction|conflict|vulnerability|underneath|secretly|guard|tension/i.test(char.personality)) {
            issues.push({
                id: "friction",
                severity: "low",
                title: "Flat Character Tension (Low Interpersonal Friction)",
                explanation: "Personality lacks an explicit internal contradiction or emotional stake to sustain long-term roleplay.",
                prompt: "Heighten the central contradiction in her personality: give her a sharp internal tension between her public facade and a private vulnerability or craving.",
                buttonText: "🩺 Fix: Elevate Psychological Tension"
            })
        }

        if (issues.length === 0) {
            issues.push({
                id: "clean",
                severity: "low",
                title: "Clean Baseline Health",
                explanation: "No major clinical jargon or puppeteering detected. You can further polish sensory tells or amplify scene stakes.",
                prompt: "Add vivid sensory tells, involuntary micro-expressions, and physical mannerisms to personality and first message to make scenes hyper-vivid.",
                buttonText: "✨ Enhance Sensory Tells & Stakes"
            })
        }

        var nowTime = Qt.formatTime(new Date(), "hh:mm")
        var checkupMsg = {
            role: "assistant",
            content: "### 🩺 Diagnostic Health Report for **" + (char.name || "Character") + "**\n\nFound **" + issues.length + " targeted recommendation" + (issues.length !== 1 ? "s" : "") + "**:",
            time: nowTime,
            prescriptions: issues
        }

        var updated = root.chatMessages.slice()
        updated.push(checkupMsg)
        root.chatMessages = updated
    }

    Connections {
        target: bridge
        function onAgentModifyFinished(data) {
            var reply = data.agentMessage || "Agent completed response."
            var nowTime = Qt.formatTime(new Date(), "hh:mm")

            // Process proposals for granular review
            var proposals = []
            if (data.changes && Array.isArray(data.changes) && data.changes.length > 0) {
                for (var i = 0; i < data.changes.length; i++) {
                    var c = data.changes[i]
                    var beforeStr = typeof c.before === "string" ? c.before : JSON.stringify(c.before, null, 2)
                    var afterStr = typeof c.after === "string" ? c.after : JSON.stringify(c.after, null, 2)
                    proposals.push({
                        field: c.field,
                        before: beforeStr,
                        after: afterStr,
                        explanation: c.explanation || "",
                        status: root.reviewDiffs ? "pending" : "accepted"
                    })
                }
            }

            // Creative Takes
            var takes = []
            if (data.takes && Array.isArray(data.takes)) {
                for (var j = 0; j < data.takes.length; j++) {
                    var t = data.takes[j]
                    takes.push({
                        takeId: t.takeId || (j === 0 ? "A" : "B"),
                        title: t.title || "Alternative Direction",
                        field: t.field || "personality",
                        content: t.content || "",
                        explanation: t.explanation || "",
                        status: "pending"
                    })
                }
            }

            var newHistory = root.chatMessages.slice()
            newHistory.push({
                role: "assistant",
                content: reply,
                time: nowTime,
                proposals: proposals,
                takes: takes,
                fullCharacter: data.character || null
            })
            root.chatMessages = newHistory
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 10
        spacing: 8

        // Top Header Info & Actions (Matching WebUI)
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 46
            color: theme.withAlpha(theme.accentIndigo, 0.1)
            border.color: theme.withAlpha(theme.accentIndigo, 0.35)
            radius: theme.radiusSm

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                spacing: 8

                Text { text: "🤖"; font.pixelSize: 18 }

                ColumnLayout {
                    spacing: 1
                    Text {
                        text: "Agent Co-Pilot (Interactive Chat)"
                        color: theme.accentCyan
                        font.pixelSize: 12
                        font.bold: true
                    }
                    Text {
                        text: "Chat to edit, rewrite, critique, or brainstorm changes"
                        color: theme.textMuted
                        font.pixelSize: 10
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "🧹 Reset Chat"
                    implicitHeight: 26
                    onClicked: {
                        var nowTime = Qt.formatTime(new Date(), "hh:mm")
                        root.chatMessages = [{
                            role: "assistant",
                            content: "Conversation thread cleared. How can I assist with '" + (bridge.card.name || "Character") + "'?",
                            time: nowTime
                        }]
                    }
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 10 }
                }

                Button {
                    text: "📂 Import Card"
                    implicitHeight: 26
                    onClicked: importFileDialog.open()
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 10 }
                }
            }
        }

        // Quick Suggestion / Directive Chips (Matching WebUI)
        ScrollView {
            Layout.fillWidth: true
            implicitHeight: 30
            clip: true

            RowLayout {
                spacing: 6

                // 1-Click Prescription Checkup Button
                Button {
                    text: "🩺 Prescription Checkup"
                    onClicked: root.runPrescriptionCheckup()
                    background: Rectangle {
                        radius: 12
                        color: theme.withAlpha(theme.accentEmerald, 0.18)
                        border.color: theme.accentEmerald
                    }
                    contentItem: Text { text: parent.text; color: "#34d399"; font.pixelSize: 10; font.bold: true }
                }

                Button {
                    text: "🗣️ Naturalize Dialogue"
                    onClicked: {
                        instructionField.text = "Purge all robotic, academic, or thesaurus tropes. Rewrite dialogue examples and personality to sound completely natural and grounded in realistic spoken English with contractions and dry sarcasm, while keeping her core character."
                        instructionField.forceActiveFocus()
                    }
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }

                Button {
                    text: "✂️ Token Optimize"
                    onClicked: {
                        instructionField.text = "Trim wordiness and purple prose across description and personality by ~25% to optimize token efficiency without losing sensory depth."
                        instructionField.forceActiveFocus()
                    }
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }

                Button {
                    text: "🔥 Heighten Friction"
                    onClicked: {
                        instructionField.text = "Amplify the central contradiction and interpersonal friction between {{char}} and {{user}}, making interactions more charged and slow-burn."
                        instructionField.forceActiveFocus()
                    }
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }

                Button {
                    text: "👁️ Sensory Tells"
                    onClicked: {
                        instructionField.text = "Add vivid sensory details, physical tells, and involuntary reactions (posture shifts, eye tells, trembling hands) when defensive or emotional."
                        instructionField.forceActiveFocus()
                    }
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }

                Button {
                    text: "⚡ Crisis Starter"
                    onClicked: {
                        instructionField.text = "Make the first message start in media res during an active operational crisis, raising immediate tension."
                        instructionField.forceActiveFocus()
                    }
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }

                Button {
                    text: "📋 Critique Card"
                    onClicked: {
                        instructionField.text = "Review this card: what are its top 3 strengths and top 3 weaknesses or plot holes? Give me concrete recommendations."
                        instructionField.forceActiveFocus()
                    }
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }
            }
        }

        // Pinned Directives / Working Memory Bar (Collapsible with chevron & counter)
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: pinnedCol.implicitHeight + 12
            color: theme.withAlpha(theme.accentPurple, 0.08)
            border.color: theme.withAlpha(theme.accentPurple, 0.4)
            radius: theme.radiusSm

            ColumnLayout {
                id: pinnedCol
                anchors.fill: parent
                anchors.margins: 8
                spacing: 6

                // Collapsible Toggle Header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    MouseArea {
                        Layout.fillWidth: true
                        implicitHeight: 20
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.pinnedExpanded = !root.pinnedExpanded

                        RowLayout {
                            anchors.fill: parent
                            spacing: 6
                            Text { text: "📌 Working Memory & Pinned Rules"; color: "#c084fc"; font.pixelSize: 11; font.bold: true }
                            Rectangle {
                                radius: 8
                                color: theme.withAlpha(theme.accentPurple, 0.35)
                                implicitWidth: cntTxt.implicitWidth + 8
                                implicitHeight: 16
                                Text {
                                    id: cntTxt
                                    anchors.centerIn: parent
                                    text: root.pinnedDirectives.length.toString()
                                    color: "#ffffff"
                                    font.pixelSize: 9
                                    font.bold: true
                                }
                            }
                            Item { Layout.fillWidth: true }
                            Text { text: root.pinnedExpanded ? "▲" : "▼"; color: theme.textDim; font.pixelSize: 10 }
                        }
                    }
                }

                // Collapsible Content
                ColumnLayout {
                    visible: root.pinnedExpanded
                    Layout.fillWidth: true
                    spacing: 6

                    // Empty hint
                    Text {
                        visible: root.pinnedDirectives.length === 0
                        text: "No pinned rules yet. Pin rules like 'Never apologize', 'Keep dialogue under 2 sentences', or 'Enforce gothic cadence'."
                        color: theme.textDim
                        font.pixelSize: 10
                        font.italic: true
                        wrapMode: Text.Wrap
                        Layout.fillWidth: true
                    }

                    // Chips Flow
                    Flow {
                        visible: root.pinnedDirectives.length > 0
                        Layout.fillWidth: true
                        spacing: 4
                        Repeater {
                            model: root.pinnedDirectives
                            delegate: Rectangle {
                                required property string modelData
                                radius: 8
                                color: theme.withAlpha(theme.accentPurple, 0.25)
                                border.color: theme.accentPurple
                                implicitWidth: pinRow.implicitWidth + 10
                                implicitHeight: 20

                                RowLayout {
                                    id: pinRow
                                    anchors.centerIn: parent
                                    spacing: 4
                                    Text { text: modelData; color: "#e9d5ff"; font.pixelSize: 10 }
                                    Text {
                                        text: "✕"
                                        color: theme.textMuted
                                        font.pixelSize: 10
                                        MouseArea {
                                            anchors.fill: parent
                                            onClicked: root.removePinned(modelData)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Input & Add button
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        TextField {
                            id: newPinnedInput
                            Layout.fillWidth: true
                            implicitHeight: 26
                            placeholderText: "Add persistent rule (e.g. 'Never apologize', 'Enforce sarcastic cadence')..."
                            font.pixelSize: 10
                            color: theme.textMain
                            background: Rectangle {
                                color: theme.bgInput
                                border.color: theme.borderMain
                                radius: theme.radiusSm
                            }
                            onAccepted: btnAddPin.clicked()
                        }

                        Button {
                            id: btnAddPin
                            text: "Pin 📌"
                            implicitHeight: 26
                            onClicked: {
                                if (newPinnedInput.text.trim()) {
                                    root.addPinned(newPinnedInput.text.trim())
                                    newPinnedInput.text = ""
                                }
                            }
                            background: Rectangle {
                                radius: theme.radiusSm
                                color: theme.accentPurple
                            }
                            contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 10; font.bold: true }
                        }
                    }
                }
            }
        }

        // Chat Message Stream
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            ListView {
                id: chatListView
                model: root.chatMessages
                spacing: 10

                delegate: Rectangle {
                    id: msgDelegate
                    required property var modelData
                    required property int index
                    width: chatListView.width - 12
                    implicitHeight: msgCol.implicitHeight + 16
                    radius: theme.radiusSm
                    color: msgDelegate.modelData.role === "user" ? theme.withAlpha(theme.accentBlue, 0.16) : theme.bgCard
                    border.color: msgDelegate.modelData.role === "user" ? theme.accentBlue : theme.borderMain

                    ColumnLayout {
                        id: msgCol
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 6

                        // Message Header with Role and Time
                        RowLayout {
                            Layout.fillWidth: true
                            Text {
                                text: msgDelegate.modelData.role === "user" ? "👤 You" : "🤖 Agent Co-Pilot"
                                color: msgDelegate.modelData.role === "user" ? theme.accentCyan : theme.accentPurple
                                font.pixelSize: 11
                                font.bold: true
                            }
                            Item { Layout.fillWidth: true }
                            Text {
                                text: msgDelegate.modelData.time || ""
                                color: theme.textDim
                                font.pixelSize: 9
                            }
                        }

                        // Message Text Body
                        Text {
                            text: msgDelegate.modelData.content || ""
                            color: theme.textMain
                            font.pixelSize: 11
                            wrapMode: Text.Wrap
                            Layout.fillWidth: true
                        }

                        // 1. Proposed Field Revisions / Diff Review (Exact replica of WebUI)
                        Rectangle {
                            visible: !!msgDelegate.modelData.proposals && msgDelegate.modelData.proposals.length > 0
                            Layout.fillWidth: true
                            implicitHeight: diffsCol.implicitHeight + 16
                            radius: theme.radiusSm
                            color: theme.withAlpha(theme.accentPurple, 0.08)
                            border.color: theme.withAlpha(theme.accentPurple, 0.35)

                            ColumnLayout {
                                id: diffsCol
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 8

                                // Diff Review Header Banner
                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "🎛️ Proposed Field Revisions (" + (msgDelegate.modelData.proposals ? msgDelegate.modelData.proposals.length : 0) + " fields):"
                                        color: theme.accentCyan
                                        font.pixelSize: 10
                                        font.bold: true
                                    }
                                    Item { Layout.fillWidth: true }
                                    Button {
                                        text: "✓ Accept All"
                                        implicitHeight: 22
                                        onClicked: {
                                            var props = msgDelegate.modelData.proposals
                                            for (var p = 0; p < props.length; p++) {
                                                if (props[p].status === "pending") {
                                                    bridge.applyFieldDiff(props[p].field, props[p].after)
                                                    props[p].status = "accepted"
                                                }
                                            }
                                            root.chatMessages = root.chatMessages.slice()
                                        }
                                        background: Rectangle { radius: 4; color: "#059669" }
                                        contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 9; font.bold: true }
                                    }
                                    Button {
                                        text: "✕ Discard All"
                                        implicitHeight: 22
                                        onClicked: {
                                            var props = msgDelegate.modelData.proposals
                                            for (var p = 0; p < props.length; p++) {
                                                if (props[p].status === "pending") {
                                                    props[p].status = "discarded"
                                                }
                                            }
                                            root.chatMessages = root.chatMessages.slice()
                                        }
                                        background: Rectangle { radius: 4; color: theme.bgTertiary; border.color: theme.borderMain }
                                        contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 9 }
                                    }
                                }

                                // Repeater of individual field proposals
                                Repeater {
                                    model: msgDelegate.modelData.proposals || []
                                    delegate: Rectangle {
                                        id: propCard
                                        required property var modelData
                                        required property int index
                                        Layout.fillWidth: true
                                        implicitHeight: propCardCol.implicitHeight + 12
                                        radius: 6
                                        color: theme.bgSecondary
                                        border.color: propCard.modelData.status === "accepted"
                                            ? theme.accentEmerald
                                            : (propCard.modelData.status === "discarded" ? theme.borderMain : theme.withAlpha(theme.accentPurple, 0.4))

                                        ColumnLayout {
                                            id: propCardCol
                                            anchors.fill: parent
                                            anchors.margins: 8
                                            spacing: 6

                                            // Field header & accept/discard actions
                                            RowLayout {
                                                Layout.fillWidth: true
                                                Text {
                                                    text: (propCard.modelData.field || "").replace(/_/g, " ").toUpperCase()
                                                    color: theme.accentPurple
                                                    font.pixelSize: 10
                                                    font.bold: true
                                                }
                                                // Token diff badge
                                                Text {
                                                    property int beforeTok: root.estimateTokens(propCard.modelData.before || "")
                                                    property int afterTok: root.estimateTokens(propCard.modelData.after || "")
                                                    property int diff: afterTok - beforeTok
                                                    text: diff > 0 ? ("(+" + diff + " tok)") : (diff < 0 ? ("(" + diff + " tok)") : "(0 tok)")
                                                    color: diff > 0 ? theme.accentAmber : (diff < 0 ? theme.accentEmerald : theme.textDim)
                                                    font.pixelSize: 9
                                                    font.bold: true
                                                }
                                                Item { Layout.fillWidth: true }
                                                // Expand full diff button
                                                Button {
                                                    text: "🔍 Full Diff"
                                                    implicitHeight: 20
                                                    onClicked: root.openDiffModal(propCard.modelData, msgDelegate.modelData)
                                                    background: Rectangle { radius: 3; color: theme.withAlpha(theme.accentCyan, 0.15); border.color: theme.accentCyan }
                                                    contentItem: Text { text: parent.text; color: theme.accentCyan; font.pixelSize: 9; font.bold: true }
                                                }
                                                // Action buttons
                                                RowLayout {
                                                    visible: propCard.modelData.status === "pending"
                                                    spacing: 4
                                                    Button {
                                                        text: "✓ Accept"
                                                        implicitHeight: 20
                                                        onClicked: {
                                                            bridge.applyFieldDiff(propCard.modelData.field, propCard.modelData.after)
                                                            propCard.modelData.status = "accepted"
                                                            root.chatMessages = root.chatMessages.slice()
                                                        }
                                                        background: Rectangle { radius: 3; color: "#059669" }
                                                        contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 9; font.bold: true }
                                                    }
                                                    Button {
                                                        text: "✕ Discard"
                                                        implicitHeight: 20
                                                        onClicked: {
                                                            propCard.modelData.status = "discarded"
                                                            root.chatMessages = root.chatMessages.slice()
                                                        }
                                                        background: Rectangle { radius: 3; color: "#b91c1c" }
                                                        contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 9 }
                                                    }
                                                }
                                                Text {
                                                    visible: propCard.modelData.status === "accepted"
                                                    text: "✓ Applied to Card"
                                                    color: theme.accentEmerald
                                                    font.pixelSize: 9
                                                    font.bold: true
                                                }
                                                Text {
                                                    visible: propCard.modelData.status === "discarded"
                                                    text: "✕ Discarded"
                                                    color: theme.accentRed
                                                    font.pixelSize: 9
                                                }
                                            }

                                            // Explanation
                                            Text {
                                                visible: !!propCard.modelData.explanation
                                                text: propCard.modelData.explanation || ""
                                                color: theme.textMuted
                                                font.pixelSize: 9
                                                font.italic: true
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
                                            }

                                            // Side-by-side or stacked Before / After Diff Boxes
                                            ColumnLayout {
                                                Layout.fillWidth: true
                                                spacing: 4

                                                Rectangle {
                                                    Layout.fillWidth: true
                                                    implicitHeight: Math.min(beforeText.implicitHeight + 14, 80)
                                                    color: theme.bgInput
                                                    border.color: theme.borderMain
                                                    radius: 4
                                                    clip: true
                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 4
                                                        Text { text: "BEFORE (" + root.estimateTokens(propCard.modelData.before || "") + " tok):"; color: theme.textDim; font.pixelSize: 8; font.bold: true }
                                                        Text { id: beforeText; text: propCard.modelData.before || "(empty)"; color: theme.textMuted; font.pixelSize: 9; wrapMode: Text.Wrap; Layout.fillWidth: true }
                                                    }
                                                    MouseArea {
                                                        anchors.fill: parent
                                                        cursorShape: Qt.PointingHandCursor
                                                        onClicked: root.openDiffModal(propCard.modelData, msgDelegate.modelData)
                                                    }
                                                }

                                                Rectangle {
                                                    Layout.fillWidth: true
                                                    implicitHeight: Math.min(afterText.implicitHeight + 14, 100)
                                                    color: theme.bgInput
                                                    border.color: theme.withAlpha(theme.accentEmerald, 0.4)
                                                    radius: 4
                                                    clip: true
                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 4
                                                        Text { text: "AFTER (" + root.estimateTokens(propCard.modelData.after || "") + " tok):"; color: theme.accentEmerald; font.pixelSize: 8; font.bold: true }
                                                        Text { id: afterText; text: propCard.modelData.after || "(empty)"; color: theme.textMain; font.pixelSize: 9; wrapMode: Text.Wrap; Layout.fillWidth: true }
                                                    }
                                                    MouseArea {
                                                        anchors.fill: parent
                                                        cursorShape: Qt.PointingHandCursor
                                                        onClicked: root.openDiffModal(propCard.modelData, msgDelegate.modelData)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // 2. Creative Takes (Takes A vs B choices)
                        Rectangle {
                            visible: !!msgDelegate.modelData.takes && msgDelegate.modelData.takes.length > 0
                            Layout.fillWidth: true
                            implicitHeight: takesCol.implicitHeight + 14
                            radius: theme.radiusSm
                            color: theme.withAlpha(theme.accentCyan, 0.08)
                            border.color: theme.withAlpha(theme.accentCyan, 0.35)

                            ColumnLayout {
                                id: takesCol
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 6

                                Text {
                                    text: "🎲 Creative Alternatives (" + (msgDelegate.modelData.takes ? msgDelegate.modelData.takes.length : 0) + " Takes Generated):"
                                    color: theme.accentCyan
                                    font.pixelSize: 10
                                    font.bold: true
                                }

                                Repeater {
                                    model: msgDelegate.modelData.takes || []
                                    delegate: Rectangle {
                                        id: takeCard
                                        required property var modelData
                                        required property int index
                                        Layout.fillWidth: true
                                        implicitHeight: takeCardCol.implicitHeight + 12
                                        radius: 6
                                        color: theme.bgSecondary
                                        border.color: takeCard.modelData.status === "applied" ? theme.accentEmerald : theme.borderMain

                                        ColumnLayout {
                                            id: takeCardCol
                                            anchors.fill: parent
                                            anchors.margins: 6
                                            spacing: 4

                                            RowLayout {
                                                Layout.fillWidth: true
                                                Rectangle {
                                                    radius: 3
                                                    color: theme.withAlpha(theme.accentIndigo, 0.3)
                                                    implicitWidth: takeBadgeText.implicitWidth + 8
                                                    implicitHeight: 16
                                                    Text {
                                                        id: takeBadgeText
                                                        anchors.centerIn: parent
                                                        text: "Take " + (takeCard.modelData.takeId || (takeCard.index === 0 ? "A" : "B")) + ": " + (takeCard.modelData.title || "")
                                                        color: theme.accentCyan
                                                        font.pixelSize: 9
                                                        font.bold: true
                                                    }
                                                }
                                                Text { text: "Target: " + (takeCard.modelData.field || ""); color: theme.textDim; font.pixelSize: 9 }
                                                Item { Layout.fillWidth: true }
                                                Button {
                                                    visible: takeCard.modelData.status !== "applied"
                                                    text: "✓ Choose Take " + (takeCard.modelData.takeId || (takeCard.index === 0 ? "A" : "B"))
                                                    implicitHeight: 20
                                                    onClicked: {
                                                        bridge.applyFieldDiff(takeCard.modelData.field, takeCard.modelData.content)
                                                        for (var k = 0; k < msgDelegate.modelData.takes.length; k++) {
                                                            msgDelegate.modelData.takes[k].status = (k === takeCard.index ? "applied" : "unselected")
                                                        }
                                                        root.chatMessages = root.chatMessages.slice()
                                                    }
                                                    background: Rectangle { radius: 3; color: theme.accentPurple }
                                                    contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 9; font.bold: true }
                                                }
                                                Text {
                                                    visible: takeCard.modelData.status === "applied"
                                                    text: "✓ Chosen"
                                                    color: theme.accentEmerald
                                                    font.pixelSize: 9
                                                    font.bold: true
                                                }
                                            }

                                            Text {
                                                visible: !!takeCard.modelData.explanation
                                                text: takeCard.modelData.explanation || ""
                                                color: theme.textMuted
                                                font.pixelSize: 9
                                                font.italic: true
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
                                            }

                                            Rectangle {
                                                Layout.fillWidth: true
                                                implicitHeight: Math.min(takeText.implicitHeight + 10, 80)
                                                color: theme.bgInput
                                                border.color: theme.borderMain
                                                radius: 4
                                                clip: true
                                                Text {
                                                    id: takeText
                                                    anchors.fill: parent
                                                    anchors.margins: 4
                                                    text: takeCard.modelData.content || ""
                                                    color: theme.textMain
                                                    font.pixelSize: 9
                                                    font.family: "monospace"
                                                    wrapMode: Text.Wrap
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // 3. Prescription Checkup Box with 1-click action fixes
                        Rectangle {
                            visible: !!msgDelegate.modelData.prescriptions && msgDelegate.modelData.prescriptions.length > 0
                            Layout.fillWidth: true
                            implicitHeight: prescCol.implicitHeight + 14
                            radius: theme.radiusSm
                            color: theme.withAlpha(theme.accentEmerald, 0.08)
                            border.color: theme.withAlpha(theme.accentEmerald, 0.35)

                            ColumnLayout {
                                id: prescCol
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 6

                                Text {
                                    text: "🩺 Doctor's Prescriptions & Targeted Action Fixes:"
                                    color: theme.accentEmerald
                                    font.pixelSize: 10
                                    font.bold: true
                                }

                                Repeater {
                                    model: msgDelegate.modelData.prescriptions || []
                                    delegate: Rectangle {
                                        id: prescItem
                                        required property var modelData
                                        Layout.fillWidth: true
                                        implicitHeight: pItemCol.implicitHeight + 10
                                        radius: 6
                                        color: theme.bgSecondary
                                        border.color: theme.borderMain

                                        ColumnLayout {
                                            id: pItemCol
                                            anchors.fill: parent
                                            anchors.margins: 6
                                            spacing: 4

                                            RowLayout {
                                                Layout.fillWidth: true
                                                Text {
                                                    text: prescItem.modelData.title || ""
                                                    color: theme.accentAmber
                                                    font.pixelSize: 10
                                                    font.bold: true
                                                    Layout.fillWidth: true
                                                    wrapMode: Text.Wrap
                                                }
                                                Button {
                                                    text: prescItem.modelData.buttonText || "Fix"
                                                    implicitHeight: 22
                                                    onClicked: {
                                                        instructionField.text = prescItem.modelData.prompt || ""
                                                        sendBtn.clicked()
                                                    }
                                                    background: Rectangle { radius: 3; color: "#059669" }
                                                    contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 9; font.bold: true }
                                                }
                                            }

                                            Text {
                                                text: prescItem.modelData.explanation || ""
                                                color: theme.textMuted
                                                font.pixelSize: 9
                                                wrapMode: Text.Wrap
                                                Layout.fillWidth: true
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

        // Controls Bar: Scope, Checkboxes (Exact replica of WebUI)
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            RowLayout {
                Layout.fillWidth: true
                spacing: 6

                Text { text: "Scope:"; color: theme.textMuted; font.pixelSize: 10; font.bold: true }

                ComboBox {
                    id: scopeCombo
                    model: [
                        { text: "✨ Auto-Detect (Agent chooses fields)", value: "auto" },
                        { text: "💬 Voice & Dialogue (mes_example + personality)", value: "dialogue" },
                        { text: "📖 Description Only", value: "description" },
                        { text: "🧠 Personality & Triggers Only", value: "personality" },
                        { text: "🎬 Starter & Greetings", value: "first_mes" },
                        { text: "🎭 Scenario / Scene Frame", value: "scenario" },
                        { text: "📜 Post-History Directives", value: "post_history" },
                        { text: "💡 Chat / Advice Only (No Card Edits)", value: "advice_only" }
                    ]
                    textRole: "text"
                    valueRole: "value"
                    Layout.fillWidth: true
                    implicitHeight: 26
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: theme.borderMain
                        radius: theme.radiusSm
                    }
                    contentItem: Text {
                        text: scopeCombo.displayText
                        color: theme.textMain
                        font.pixelSize: 10
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 6
                        elide: Text.ElideRight
                    }
                    onActivated: root.activeScope = currentValue
                }
            }

            // Checkbox options matching WebUI: 2 Takes, Review Diffs, Natural Voice
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                CheckBox {
                    id: twoTakesCheck
                    text: "🎲 2 Takes (A vs B)"
                    checked: root.twoTakes
                    onCheckedChanged: root.twoTakes = checked
                }

                CheckBox {
                    id: reviewDiffsCheck
                    text: "🎛️ Review Diffs"
                    checked: root.reviewDiffs
                    onCheckedChanged: root.reviewDiffs = checked
                }

                CheckBox {
                    id: voiceCheck
                    text: "Natural Voice"
                    checked: root.enforceNaturalVoice
                    onCheckedChanged: root.enforceNaturalVoice = checked
                }
            }
        }

        // Chat Message Input & Send Button (Matching WebUI)
        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            TextArea {
                id: instructionField
                Layout.fillWidth: true
                implicitHeight: 46
                wrapMode: TextArea.Wrap
                placeholderText: "Message Agent: e.g. 'Make her dialogue more sarcastic', 'Critique the first message', 'Trim description' (Enter to send, Shift+Enter for newline)"
                font.pixelSize: 11
                color: theme.textMain
                placeholderTextColor: theme.textDim
                background: Rectangle {
                    color: theme.bgInput
                    border.color: instructionField.activeFocus ? theme.accentPurple : theme.borderMain
                    radius: theme.radiusSm
                }
                Keys.onReturnPressed: (event) => {
                    if (!(event.modifiers & Qt.ShiftModifier)) {
                        event.accepted = true
                        sendBtn.clicked()
                    }
                }
            }

            Button {
                id: sendBtn
                text: bridge.isBusy && bridge.taskType === "agent_modify" ? "Thinking..." : "Send 🚀"
                enabled: !bridge.isBusy && instructionField.text.trim().length > 0
                implicitHeight: 46
                implicitWidth: 80
                onClicked: {
                    var prompt = instructionField.text.trim()
                    if (!prompt) return

                    var nowTime = Qt.formatTime(new Date(), "hh:mm")
                    var history = root.chatMessages.slice()
                    history.push({ role: "user", content: prompt, time: nowTime })
                    root.chatMessages = history

                    var targetFields = ["description", "personality", "first_mes", "scenario"]
                    if (root.activeScope === "dialogue") targetFields = ["mes_example", "personality"]
                    else if (root.activeScope === "description") targetFields = ["description"]
                    else if (root.activeScope === "personality") targetFields = ["personality"]
                    else if (root.activeScope === "first_mes") targetFields = ["first_mes", "alternate_greetings"]
                    else if (root.activeScope === "scenario") targetFields = ["scenario"]
                    else if (root.activeScope === "post_history") targetFields = ["post_history_instructions"]
                    else if (root.activeScope === "advice_only") targetFields = []

                    bridge.executeAgentModify(
                        prompt,
                        targetFields,
                        root.activeScope,
                        root.pinnedDirectives,
                        root.enforceNaturalVoice,
                        root.twoTakes,
                        root.reviewDiffs
                    )
                    instructionField.text = ""
                }
                background: Rectangle {
                    radius: theme.radiusSm
                    color: parent.hovered ? "#7c3aed" : "#6d28d9"
                }
                contentItem: Text {
                    text: parent.text
                    color: "#ffffff"
                    font.pixelSize: 11
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }
    }

    // =========================================================================
    // Large Full-Screen Side-by-Side Diff Modal
    // =========================================================================
    Rectangle {
        id: diffModalOverlay
        anchors.fill: parent
        color: "#d9000000"
        visible: root.diffModalOpen
        z: 9999

        // Prevent click-through
        MouseArea {
            anchors.fill: parent
            onClicked: {}
        }

        Rectangle {
            id: diffModalBox
            width: Math.min(1100, parent.width - 40)
            height: Math.min(800, parent.height - 40)
            anchors.centerIn: parent
            radius: 8
            color: theme.bgSecondary
            border.color: theme.accentCyan
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12

                // Header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Text {
                        text: "🔍 Detailed Diff Inspector: " + (root.activeDiffProposal ? (root.activeDiffProposal.field || "").replace(/_/g, " ").toUpperCase() : "")
                        color: theme.accentCyan
                        font.pixelSize: 15
                        font.bold: true
                    }

                    // Token stats badge
                    Rectangle {
                        radius: 4
                        color: theme.bgInput
                        border.color: theme.borderMain
                        implicitHeight: 24
                        implicitWidth: modalTokDiff.implicitWidth + 12

                        Text {
                            id: modalTokDiff
                            anchors.centerIn: parent
                            property int beforeTok: root.activeDiffProposal ? root.estimateTokens(root.activeDiffProposal.before || "") : 0
                            property int afterTok: root.activeDiffProposal ? root.estimateTokens(root.activeDiffProposal.after || "") : 0
                            property int diff: afterTok - beforeTok
                            text: "Before: " + beforeTok + " tok | After: " + afterTok + " tok (" + (diff >= 0 ? "+" : "") + diff + " tok)"
                            color: diff > 0 ? theme.accentAmber : (diff < 0 ? theme.accentEmerald : theme.textDim)
                            font.pixelSize: 10
                            font.bold: true
                        }
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        text: "✕ Close"
                        implicitHeight: 28
                        onClicked: root.closeDiffModal()
                        background: Rectangle { radius: 4; color: theme.bgTertiary; border.color: theme.borderMain }
                        contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 11; font.bold: true }
                    }
                }

                // Explanation Banner
                Rectangle {
                    visible: root.activeDiffProposal && !!root.activeDiffProposal.explanation
                    Layout.fillWidth: true
                    implicitHeight: modalExplText.implicitHeight + 12
                    radius: 4
                    color: theme.withAlpha(theme.accentPurple, 0.12)
                    border.color: theme.withAlpha(theme.accentPurple, 0.35)

                    Text {
                        id: modalExplText
                        anchors.fill: parent
                        anchors.margins: 6
                        text: root.activeDiffProposal ? (root.activeDiffProposal.explanation || "") : ""
                        color: "#e9d5ff"
                        font.pixelSize: 11
                        font.italic: true
                        wrapMode: Text.Wrap
                    }
                }

                // Central Side-by-Side Comparison
                RowLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 12

                    // LEFT: BEFORE
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        color: theme.bgInput
                        border.color: "#ef4444"
                        border.width: 1
                        radius: 6

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🔴 BEFORE / CURRENT FIELD"
                                    color: "#f87171"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "📋 Copy"
                                    implicitHeight: 20
                                    onClicked: {
                                        if (root.activeDiffProposal) {
                                            bridge.copyToClipboard(root.activeDiffProposal.before || "")
                                            toastBanner.show("Copied BEFORE text to clipboard")
                                        }
                                    }
                                    background: Rectangle { radius: 3; color: theme.bgTertiary }
                                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 9 }
                                }
                            }

                            ScrollView {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                clip: true

                                TextArea {
                                    width: parent.width
                                    text: root.activeDiffProposal ? (root.activeDiffProposal.before || "(empty)") : ""
                                    readOnly: true
                                    wrapMode: Text.Wrap
                                    color: "#cbd5e1"
                                    font.pixelSize: 11
                                    font.family: "Monospace"
                                    background: null
                                    selectByMouse: true
                                }
                            }
                        }
                    }

                    // RIGHT: AFTER
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        color: theme.bgInput
                        border.color: "#10b981"
                        border.width: 1
                        radius: 6

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🟢 AFTER / PROPOSED REVISION"
                                    color: "#34d399"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "📋 Copy"
                                    implicitHeight: 20
                                    onClicked: {
                                        if (root.activeDiffProposal) {
                                            bridge.copyToClipboard(root.activeDiffProposal.after || "")
                                            toastBanner.show("Copied AFTER text to clipboard")
                                        }
                                    }
                                    background: Rectangle { radius: 3; color: theme.bgTertiary }
                                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 9 }
                                }
                            }

                            ScrollView {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                clip: true

                                TextArea {
                                    width: parent.width
                                    text: root.activeDiffProposal ? (root.activeDiffProposal.after || "(empty)") : ""
                                    readOnly: true
                                    wrapMode: Text.Wrap
                                    color: "#ffffff"
                                    font.pixelSize: 11
                                    font.family: "Monospace"
                                    background: null
                                    selectByMouse: true
                                }
                            }
                        }
                    }
                }

                // Modal Footer Actions
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    Text {
                        visible: root.activeDiffProposal && root.activeDiffProposal.status === "accepted"
                        text: "✓ This change has already been accepted and applied to the card."
                        color: theme.accentEmerald
                        font.pixelSize: 11
                        font.bold: true
                    }

                    Text {
                        visible: root.activeDiffProposal && root.activeDiffProposal.status === "discarded"
                        text: "✕ This change was discarded."
                        color: theme.accentRed
                        font.pixelSize: 11
                        font.bold: true
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        visible: root.activeDiffProposal && root.activeDiffProposal.status === "pending"
                        text: "✕ Discard This Field"
                        implicitHeight: 32
                        implicitWidth: 140
                        onClicked: {
                            if (root.activeDiffProposal) {
                                root.activeDiffProposal.status = "discarded"
                                root.chatMessages = root.chatMessages.slice()
                                root.closeDiffModal()
                            }
                        }
                        background: Rectangle { radius: 4; color: "#b91c1c" }
                        contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }

                    Button {
                        visible: root.activeDiffProposal && root.activeDiffProposal.status === "pending"
                        text: "✓ Accept & Apply to Card"
                        implicitHeight: 32
                        implicitWidth: 170
                        onClicked: {
                            if (root.activeDiffProposal) {
                                bridge.applyFieldDiff(root.activeDiffProposal.field, root.activeDiffProposal.after)
                                root.activeDiffProposal.status = "accepted"
                                root.chatMessages = root.chatMessages.slice()
                                toastBanner.show("✓ Applied " + root.activeDiffProposal.field + " revision to active card!")
                                root.closeDiffModal()
                            }
                        }
                        background: Rectangle { radius: 4; color: "#059669" }
                        contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }
                }
            }
        }
    }
}
