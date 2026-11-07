import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    color: Qt.rgba(0.02, 0.04, 0.08, 0.96)
    visible: false

    Theme { id: theme }

    property string mode: "redesign"

    function openModal() {
        visible = true
        promptField.forceActiveFocus()
    }

    function closeModal() {
        visible = false
    }

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
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 760)
        implicitHeight: modalContent.implicitHeight + 40
        radius: 12
        color: theme.bgSecondary
        border.color: theme.accentPurple
        border.width: 1

        ColumnLayout {
            id: modalContent
            anchors.fill: parent
            anchors.margins: 20
            spacing: 14

            // Header Bar matching WebUI
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "✨"; font.pixelSize: 20 }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Reimagine Current Card"
                        color: theme.accentPurple
                        font.pixelSize: 16
                        font.bold: true
                    }
                    Text {
                        text: "Send the active RoleplayCharacter to the agent service for a cohesive redesign or a fresh inspired direction."
                        color: theme.textMuted
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    radius: theme.radiusSm
                    color: theme.withAlpha(theme.accentCyan, 0.15)
                    border.color: theme.accentCyan
                    implicitWidth: cardBadgeText.implicitWidth + 14
                    implicitHeight: 24
                    Text {
                        id: cardBadgeText
                        anchors.centerIn: parent
                        text: bridge.card.name || "No card"
                        color: theme.accentCyan
                        font.pixelSize: 11
                        font.bold: true
                    }
                }

                Button {
                    text: "✕"
                    onClicked: root.closeModal()
                    background: Rectangle { color: "transparent" }
                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 15; font.bold: true }
                }
            }

            // Mode Selector Buttons (Redesign vs Inspire)
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Button {
                    id: btnRedesign
                    text: "🛠️ Redesign (Cohesive Polish & Rebalance)"
                    Layout.fillWidth: true
                    implicitHeight: 38
                    checkable: true
                    checked: root.mode === "redesign"
                    onClicked: root.mode = "redesign"
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: root.mode === "redesign" ? theme.withAlpha(theme.accentPurple, 0.4) : theme.bgCard
                        border.color: root.mode === "redesign" ? theme.accentPurple : theme.borderMain
                        border.width: root.mode === "redesign" ? 2 : 1
                    }
                    contentItem: Text {
                        text: parent.text
                        color: root.mode === "redesign" ? "#ffffff" : theme.textMuted
                        font.pixelSize: 12
                        font.bold: root.mode === "redesign"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Button {
                    id: btnInspire
                    text: "💡 Inspire (Fresh AU / Radical Twist)"
                    Layout.fillWidth: true
                    implicitHeight: 38
                    checkable: true
                    checked: root.mode === "inspire"
                    onClicked: root.mode = "inspire"
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: root.mode === "inspire" ? theme.withAlpha(theme.accentAmber, 0.4) : theme.bgCard
                        border.color: root.mode === "inspire" ? theme.accentAmber : theme.borderMain
                        border.width: root.mode === "inspire" ? 2 : 1
                    }
                    contentItem: Text {
                        text: parent.text
                        color: root.mode === "inspire" ? "#ffffff" : theme.textMuted
                        font.pixelSize: 12
                        font.bold: root.mode === "inspire"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }

            // Direction Prompt Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Text {
                    text: "Optional direction & constraints:"
                    color: theme.textMuted
                    font.pixelSize: 11
                    font.bold: true
                }

                TextArea {
                    id: promptField
                    Layout.fillWidth: true
                    implicitHeight: 90
                    wrapMode: TextArea.Wrap
                    placeholderText: "e.g. Preserve her voice and cynical humor, but move the conflict to a haunted orbital derelict, make the opening more immediate..."
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: promptField.activeFocus ? theme.accentPurple : theme.borderMain
                        radius: theme.radiusSm
                    }
                }
            }

            // Action Run Button
            Button {
                id: btnRun
                Layout.fillWidth: true
                implicitHeight: 42
                enabled: !bridge.isBusy
                text: bridge.isBusy && bridge.taskType === "reimagine" ? "✨ Reimagining Character Card..." : "✨ Reimagine Current Card"
                onClicked: bridge.reimagineCard(root.mode, promptField.text)
                background: Rectangle {
                    radius: theme.radiusSm
                    color: parent.hovered ? "#7c3aed" : "#6d28d9"
                }
                contentItem: RowLayout {
                    anchors.centerIn: parent
                    spacing: 8
                    Text { text: bridge.isBusy ? "⏳" : "✨"; font.pixelSize: 14 }
                    Text {
                        text: btnRun.text
                        color: "#ffffff"
                        font.pixelSize: 13
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
                            id: badgeRect
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
                            font.pixelSize: 12
                            font.bold: true
                        }
                        Item { Layout.fillWidth: true }
                        Text { text: "✓ Saved to Library & Card"; color: theme.accentEmerald; font.pixelSize: 10 }
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
}
