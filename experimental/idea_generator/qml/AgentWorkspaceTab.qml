import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

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
                            visible: agentMessagesModel.count === 0
                            clip: true

                            ColumnLayout {
                                width: parent.width - 24
                                anchors.centerIn: parent
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
                                enabled: agentMsgInput.text.trim().length > 0

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
                                    if (txt.length > 0) {
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
                        RowLayout {
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
                                        backend.copyToClipboard(root.agentIdea.premise || "");
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
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 10

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

                            Item { Layout.fillWidth: true }

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
