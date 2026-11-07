import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    color: Qt.rgba(0.02, 0.04, 0.08, 0.96)
    visible: false

    Theme { id: theme }

    property var chatMessages: []
    property var pinnedDirectives: []
    property string activeScope: "auto"
    property bool enforceNaturalVoice: true
    property bool twoTakes: false
    property bool reviewDiffs: true

    function openModal() {
        visible = true
        instructionField.forceActiveFocus()
        if (chatMessages.length === 0) {
            chatMessages = [{
                sender: "agent",
                text: "👋 I'm your interactive CharGen Doctor. You can ask me to rewrite specific sections, deepen psychological nuance, weave subtext, optimize tokens, or critique. I operate with surgical diff inspection."
            }]
        }
    }

    function closeModal() {
        visible = false
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

    Connections {
        target: bridge
        function onAgentModifyFinished(data) {
            var reply = data.agentMessage || "Card modified successfully."
            var newHistory = root.chatMessages.slice()
            newHistory.push({
                sender: "agent",
                text: reply,
                diffs: data.diffs || null,
                takes: data.takes || null
            })
            root.chatMessages = newHistory
        }
        function onReimagineFinished(data) {
            var reply = (data.agentMessage || "Reimagined card received.") + "\nMode: " + (data.mode || "redesign")
            var newHistory = root.chatMessages.slice()
            newHistory.push({ sender: "agent", text: reply })
            root.chatMessages = newHistory
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 36, 960)
        height: Math.min(parent.height - 36, 760)
        radius: 12
        color: theme.bgSecondary
        border.color: theme.accentPurple
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 10

            // Header matching WebUI
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Text { text: "🤖"; font.pixelSize: 20 }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Agent Co-Pilot (Interactive Card Doctor)"
                        color: theme.accentPurple
                        font.pixelSize: 15
                        font.bold: true
                    }
                    Text {
                        text: "Chat to edit, rewrite, critique, or brainstorm changes for '" + (bridge.card.name || "Character") + "'"
                        color: theme.textMuted
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "🧹 Reset Chat"
                    onClicked: {
                        root.chatMessages = [{
                            sender: "agent",
                            text: "Chat reset. How can I help refine '" + (bridge.card.name || "Character") + "'?"
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
                    text: "✕"
                    onClicked: root.closeModal()
                    background: Rectangle { color: "transparent" }
                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 15; font.bold: true }
                }
            }

            // Quick Suggestion / Directive Chips (Exact replica of WebUI)
            ScrollView {
                Layout.fillWidth: true
                implicitHeight: 32
                clip: true

                RowLayout {
                    spacing: 6

                    // Prescription Checkup Button
                    Button {
                        text: "🩺 Prescription Checkup"
                        onClicked: root.sendPresetInstruction("Review this card: run a full diagnostic prescription checkup. What are its strengths, weaknesses, and plot holes? Give me concrete recommendations.")
                        background: Rectangle {
                            radius: 14
                            color: theme.withAlpha(theme.accentEmerald, 0.15)
                            border.color: theme.accentEmerald
                        }
                        contentItem: Text { text: parent.text; color: "#34d399"; font.pixelSize: 10; font.bold: true }
                    }

                    Button {
                        text: "🗣️ Naturalize Dialogue"
                        onClicked: root.sendPresetInstruction("Purge all robotic, academic, or thesaurus tropes. Rewrite dialogue examples and personality to sound completely natural and grounded in realistic spoken English with contractions and dry sarcasm, while keeping her core character.")
                        background: Rectangle {
                            radius: 14
                            color: theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                    }

                    Button {
                        text: "✂️ Token Optimize"
                        onClicked: root.sendPresetInstruction("Trim wordiness and purple prose across description and personality by ~25% to optimize token efficiency without losing sensory depth.")
                        background: Rectangle {
                            radius: 14
                            color: theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                    }

                    Button {
                        text: "🔥 Heighten Friction"
                        onClicked: root.sendPresetInstruction("Amplify the central contradiction and interpersonal friction between {{char}} and {{user}}, making interactions more charged and slow-burn.")
                        background: Rectangle {
                            radius: 14
                            color: theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                    }

                    Button {
                        text: "👁️ Sensory Tells"
                        onClicked: root.sendPresetInstruction("Add vivid sensory details, physical tells, and involuntary reactions (posture shifts, eye tells, trembling hands) when defensive or emotional.")
                        background: Rectangle {
                            radius: 14
                            color: theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                    }

                    Button {
                        text: "⚡ Crisis Starter"
                        onClicked: root.sendPresetInstruction("Make the first message start in media res during an active operational crisis, raising immediate tension.")
                        background: Rectangle {
                            radius: 14
                            color: theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                    }

                    Button {
                        text: "📋 Critique Card"
                        onClicked: root.sendPresetInstruction("Review this card: what are its top 3 strengths and top 3 weaknesses or plot holes? Give me concrete recommendations.")
                        background: Rectangle {
                            radius: 14
                            color: theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                    }
                }
            }

            // Pinned Directives / Working Memory Bar
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: pinnedLayout.implicitHeight + 12
                color: theme.withAlpha(theme.accentPurple, 0.08)
                border.color: theme.withAlpha(theme.accentPurple, 0.4)
                radius: theme.radiusSm

                ColumnLayout {
                    id: pinnedLayout
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "📌 Working Memory & Pinned Rules (" + root.pinnedDirectives.length + ")"; color: "#c084fc"; font.pixelSize: 11; font.bold: true }
                        Item { Layout.fillWidth: true }
                        TextField {
                            id: newPinnedInput
                            placeholderText: "Add persistent rule (e.g. 'Never apologize', 'Enforce gothic cadence')..."
                            Layout.preferredWidth: 320
                            font.pixelSize: 10
                            color: theme.textMain
                            background: Rectangle {
                                color: theme.bgInput
                                border.color: theme.borderMain
                                radius: theme.radiusSm
                            }
                            onAccepted: {
                                if (text.trim()) {
                                    root.addPinned(text.trim())
                                    text = ""
                                }
                            }
                        }
                        Button {
                            text: "+ Pin"
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

                    // Pinned chips row
                    RowLayout {
                        visible: root.pinnedDirectives.length > 0
                        spacing: 6
                        Repeater {
                            model: root.pinnedDirectives
                            delegate: Rectangle {
                                required property string modelData
                                radius: 10
                                color: theme.withAlpha(theme.accentPurple, 0.25)
                                border.color: theme.accentPurple
                                implicitWidth: pinRow.implicitWidth + 12
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
                        width: ListView.view.width - 16
                        implicitHeight: msgCol.implicitHeight + 16
                        radius: theme.radiusSm
                        color: msgDelegate.modelData.sender === "user" ? theme.withAlpha(theme.accentBlue, 0.2) : theme.bgCard
                        border.color: msgDelegate.modelData.sender === "user" ? theme.accentBlue : theme.borderMain

                        ColumnLayout {
                            id: msgCol
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: msgDelegate.modelData.sender === "user" ? "👤 You" : "🤖 Agent Doctor"
                                    color: msgDelegate.modelData.sender === "user" ? theme.accentCyan : theme.accentPurple
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                            }

                            Text {
                                text: msgDelegate.modelData.text || ""
                                color: theme.textMain
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                                Layout.fillWidth: true
                            }

                            // Diff review banner if present
                            Rectangle {
                                visible: !!msgDelegate.modelData.diffs
                                Layout.fillWidth: true
                                implicitHeight: 24
                                radius: 4
                                color: theme.withAlpha(theme.accentEmerald, 0.15)
                                border.color: theme.accentEmerald
                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text { text: "✓ Changes automatically applied to card & library"; color: theme.accentEmerald; font.pixelSize: 10; font.bold: true }
                                }
                            }
                        }
                    }
                }
            }

            // Controls Bar: Scope & Guardrails
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "Scope:"; color: theme.textMuted; font.pixelSize: 11; font.bold: true }

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
                    Layout.preferredWidth: 260
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: theme.borderMain
                        radius: theme.radiusSm
                    }
                    onActivated: root.activeScope = currentValue
                }

                CheckBox {
                    id: voiceCheck
                    text: "Natural Voice"
                    checked: root.enforceNaturalVoice
                    onCheckedChanged: root.enforceNaturalVoice = checked
                }

                Item { Layout.fillWidth: true }

                // Quick 1-Shot Reimagine Triggers
                Button {
                    text: "🛠️ Redesign"
                    enabled: !bridge.isBusy
                    onClicked: bridge.reimagineCard("redesign", instructionField.text)
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: theme.withAlpha(theme.accentCyan, 0.2)
                        border.color: theme.accentCyan
                    }
                    contentItem: Text { text: parent.text; color: theme.accentCyan; font.pixelSize: 11; font.bold: true }
                }

                Button {
                    text: "💡 Inspire"
                    enabled: !bridge.isBusy
                    onClicked: bridge.reimagineCard("inspire", instructionField.text)
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: theme.withAlpha(theme.accentAmber, 0.2)
                        border.color: theme.accentAmber
                    }
                    contentItem: Text { text: parent.text; color: theme.accentAmber; font.pixelSize: 11; font.bold: true }
                }
            }

            // Input Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    id: instructionField
                    Layout.fillWidth: true
                    placeholderText: "Message Agent: e.g. 'Make her dialogue more guarded', 'Critique the first message', 'Trim description'..."
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: instructionField.activeFocus ? theme.accentPurple : theme.borderMain
                        radius: theme.radiusSm
                    }
                    onAccepted: sendBtn.clicked()
                }

                Button {
                    id: sendBtn
                    text: bridge.isBusy && bridge.taskType === "agent_modify" ? "Doctoring..." : "Send 🚀"
                    enabled: !bridge.isBusy && instructionField.text.trim().length > 0
                    onClicked: {
                        var prompt = instructionField.text.trim()
                        if (!prompt) return
                        var history = root.chatMessages.slice()
                        history.push({ sender: "user", text: prompt })
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
                            root.enforceNaturalVoice
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
    }
}
