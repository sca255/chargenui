import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    Theme { id: theme }

    property string mode: "redesign"

    Connections {
        target: bridge
        function onReimagineFinished(data) {
            resultBox.visible = true
            resultAgentMsg.text = data.agentMessage || "Card successfully reimagined!"
            resultModeBadge.text = (data.mode || root.mode).toUpperCase()
            if (data.character && data.character.name) {
                resultCharName.text = data.character.name
            }
        }
        function onStoryArcReady(data) {
            if (data.storyArc) {
                arcField.text = data.storyArc
            }
        }
    }

    ColumnLayout {
        width: root.width - 20
        spacing: 12

        // Header Title
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text { text: "✨"; font.pixelSize: 16 }

            ColumnLayout {
                spacing: 1
                Text {
                    text: "Reimagine Current Card"
                    color: theme.accentPurple
                    font.pixelSize: 13
                    font.bold: true
                }
                Text {
                    text: "Cohesive redesign or fresh inspired direction for '" + (bridge.card.name || "Character") + "'"
                    color: theme.textMuted
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.maximumWidth: root.width - 40
                }
            }
        }

        // Mode Selector Buttons (Redesign vs Inspire)
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                id: btnRedesign
                text: "🛠️ Redesign (Polish)"
                Layout.fillWidth: true
                implicitHeight: 36
                checkable: true
                checked: root.mode === "redesign"
                onClicked: root.mode = "redesign"
                background: Rectangle {
                    radius: theme.radiusSm
                    color: root.mode === "redesign" ? theme.withAlpha(theme.accentPurple, 0.35) : theme.bgCard
                    border.color: root.mode === "redesign" ? theme.accentPurple : theme.borderMain
                    border.width: root.mode === "redesign" ? 2 : 1
                }
                contentItem: Text {
                    text: parent.text
                    color: root.mode === "redesign" ? "#ffffff" : theme.textMuted
                    font.pixelSize: 11
                    font.bold: root.mode === "redesign"
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                id: btnInspire
                text: "💡 Inspire (Fresh Spin)"
                Layout.fillWidth: true
                implicitHeight: 36
                checkable: true
                checked: root.mode === "inspire"
                onClicked: root.mode = "inspire"
                background: Rectangle {
                    radius: theme.radiusSm
                    color: root.mode === "inspire" ? theme.withAlpha(theme.accentAmber, 0.35) : theme.bgCard
                    border.color: root.mode === "inspire" ? theme.accentAmber : theme.borderMain
                    border.width: root.mode === "inspire" ? 2 : 1
                }
                contentItem: Text {
                    text: parent.text
                    color: root.mode === "inspire" ? "#ffffff" : theme.textMuted
                    font.pixelSize: 11
                    font.bold: root.mode === "inspire"
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        Text {
            Layout.fillWidth: true
            text: root.mode === "redesign"
                ? "Redesign harmonizes psychological depth, sharpens dialogue, resolves inconsistencies, and polishes the card."
                : "Inspire takes the character's core soul and places them in a surprising new premise, high-tension conflict, or genre spin."
            color: theme.textMuted
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }

        // Quick Preset Inspiration Chips
        ScrollView {
            Layout.fillWidth: true
            implicitHeight: 30
            clip: true

            RowLayout {
                spacing: 6

                Button {
                    text: "🌑 Darker / Grittier"
                    onClicked: promptField.text = "Lean heavily into gritty noir/grimdark consequences, moral compromise, and sensory tension."
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }

                Button {
                    text: "💔 Vulnerable Subtext"
                    onClicked: promptField.text = "Expose raw unsaid vulnerabilities, subtle defensive tells, and intense slow-burn friction."
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }

                Button {
                    text: "⚡ Operational Crisis"
                    onClicked: promptField.text = "Begin immediately during a disastrous operational breach where survival demands immediate cooperation."
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }

                Button {
                    text: "☕ Domestic Slow-Burn"
                    onClicked: promptField.text = "Ground in quiet domestic realism: shared living spaces, quiet late-night conversations, domestic friction."
                    background: Rectangle { radius: 12; color: theme.bgCard; border.color: theme.borderMain }
                    contentItem: Text { text: parent.text; color: theme.textMain; font.pixelSize: 10 }
                }
            }
        }

        // Direction Prompt Input
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            Text {
                text: "Creative prompt or custom direction:"
                color: theme.textMuted
                font.pixelSize: 11
                font.bold: true
            }

            TextArea {
                id: promptField
                Layout.fillWidth: true
                implicitHeight: 90
                wrapMode: TextArea.Wrap
                placeholderText: "e.g. Preserve voice and cynical wit, but place the character in an isolated outpost..."
                font.pixelSize: 11
                color: theme.textMain
                placeholderTextColor: theme.textDim
                background: Rectangle {
                    color: theme.bgInput
                    border.color: promptField.activeFocus ? theme.accentPurple : theme.borderMain
                    radius: theme.radiusSm
                }
            }
        }

        // Story Arc Trajectory Section & Generator
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: arcCol.implicitHeight + 16
            color: theme.bgCard
            border.color: theme.borderMain
            radius: theme.radiusSm

            ColumnLayout {
                id: arcCol
                anchors.fill: parent
                anchors.margins: 8
                spacing: 6

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "📜 Narrative Story Arc"
                        color: theme.accentCyan
                        font.pixelSize: 11
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Button {
                        text: "⚡ Generate Arc"
                        font.pixelSize: 10
                        onClicked: {
                            var hint = arcGuidanceField.text.trim() || promptField.text.trim()
                            var acts = parseInt(actsField.text) || 3
                            bridge.generateStoryArcForReimagine(hint, acts, root.mode)
                        }
                        background: Rectangle { radius: 4; color: theme.bgInput; border.color: theme.accentCyan }
                        contentItem: Text { text: parent.text; color: theme.accentCyan; font.pixelSize: 10; font.bold: true }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    TextField {
                        id: arcGuidanceField
                        Layout.fillWidth: true
                        placeholderText: "Optional story guidance / plot beat..."
                        font.pixelSize: 11
                        color: theme.textMain
                        background: Rectangle { color: theme.bgInput; radius: theme.radiusSm; border.color: theme.borderMain }
                    }
                    Text {
                        text: "Acts:"
                        font.pixelSize: 10
                        color: theme.textMuted
                    }
                    TextField {
                        id: actsField
                        implicitWidth: 44
                        text: "3"
                        font.pixelSize: 11
                        horizontalAlignment: TextInput.AlignHCenter
                        color: theme.textMain
                        background: Rectangle { color: theme.bgInput; radius: theme.radiusSm; border.color: theme.borderMain }
                    }
                }

                TextArea {
                    id: arcField
                    Layout.fillWidth: true
                    implicitHeight: 70
                    wrapMode: TextArea.Wrap
                    placeholderText: "Act 1: Setup...\nAct 2: Complication...\nAct 3: Climax..."
                    font.pixelSize: 11
                    color: theme.textMain
                    background: Rectangle { color: theme.bgInput; radius: theme.radiusSm; border.color: theme.borderMain }
                }
            }
        }

        // Format Selector (BBCode, Prose, Boostyle, W++, Markdown)
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 46
            color: theme.bgCard
            border.color: theme.borderMain
            radius: theme.radiusSm

            RowLayout {
                anchors.fill: parent
                anchors.margins: 8
                spacing: 8

                Text {
                    text: "📝 Format:"
                    color: theme.accentCyan
                    font.pixelSize: 11
                    font.bold: true
                }

                ComboBox {
                    id: formatBox
                    Layout.fillWidth: true
                    model: [
                        { text: "BBCode Tags [b]...[/b] (Categorized & Structured)", value: "bbcode" },
                        { text: "Weaver Tagged Bundle / Natural Prose ([CORE], [ARC]...)", value: "prose" },
                        { text: "Boostyle Pseudocode [Character(\"Name\"){...}]", value: "boostyle" },
                        { text: "W++ Format [character(\"Name\"){...}]", value: "wxx" },
                        { text: "Dense Structured Markdown (### Headers)", value: "markdown" }
                    ]
                    textRole: "text"
                    currentIndex: 0
                    font.pixelSize: 11
                }
            }
        }

        // Action Run Button
        Button {
            id: btnRun
            Layout.fillWidth: true
            implicitHeight: 40
            enabled: !bridge.isBusy
            text: bridge.isBusy && bridge.taskType === "reimagine" ? "✨ Reimagining Character Card..." : "✨ Reimagine Current Card"
            onClicked: {
                var selectedFormat = formatBox.model[formatBox.currentIndex].value || "bbcode"
                bridge.reimagineCard(root.mode, promptField.text, arcField.text, selectedFormat)
            }
            background: Rectangle {
                radius: theme.radiusSm
                color: parent.hovered ? "#7c3aed" : "#6d28d9"
            }
            contentItem: RowLayout {
                anchors.centerIn: parent
                spacing: 8
                Text { text: bridge.isBusy ? "⏳" : "✨"; font.pixelSize: 13 }
                Text {
                    text: btnRun.text
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                }
            }
        }

        // Result Feedback Box
        Rectangle {
            id: resultBox
            visible: false
            Layout.fillWidth: true
            implicitHeight: resCol.implicitHeight + 16
            radius: theme.radiusSm
            color: theme.bgCard
            border.color: theme.accentEmerald

            ColumnLayout {
                id: resCol
                anchors.fill: parent
                anchors.margins: 10
                spacing: 6

                RowLayout {
                    Layout.fillWidth: true
                    Rectangle {
                        radius: 4
                        color: theme.withAlpha(theme.accentEmerald, 0.25)
                        implicitWidth: resultModeBadge.implicitWidth + 8
                        implicitHeight: 18
                        Text {
                            id: resultModeBadge
                            anchors.centerIn: parent
                            text: "REDESIGN"
                            color: theme.accentEmerald
                            font.pixelSize: 9
                            font.bold: true
                        }
                    }
                    Text {
                        id: resultCharName
                        text: bridge.card.name || ""
                        color: theme.textMain
                        font.pixelSize: 11
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text { text: "✓ Saved to Card"; color: theme.accentEmerald; font.pixelSize: 10 }
                }

                Text {
                    id: resultAgentMsg
                    text: ""
                    color: theme.textMuted
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                    Layout.fillWidth: true
                }
            }
        }
    }
}
