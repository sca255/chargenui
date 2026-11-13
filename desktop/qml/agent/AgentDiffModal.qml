import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    anchors.fill: parent
    color: "#d9000000"
    visible: false
    z: 9999

    property var theme
    property string activeFieldName: ""
    property string originalValue: ""
    property string proposedValue: ""

    signal accepted()
    signal rejected()

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
        color: root.theme.bgSecondary
        border.color: root.theme.accentCyan
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 12

            // Header with Field Name & Warning
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: "🔍 Field Diff Inspection: "
                    color: root.theme.textDim
                    font.pixelSize: 13
                }
                Text {
                    text: root.activeFieldName.toUpperCase()
                    color: root.theme.accentCyan
                    font.pixelSize: 13
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕ Close"
                    onClicked: root.rejected()
                    background: Rectangle { color: "transparent" }
                    contentItem: Text { text: parent.text; color: root.theme.textMuted; font.pixelSize: 12 }
                }
            }

            Text {
                text: "Review exact changes before applying to the character sheet. The left pane shows the existing version; the right pane displays the agent's proposed surgical modification."
                color: root.theme.textMuted
                font.pixelSize: 11
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }

            // Split View: Original (Red-tinted) vs Proposed (Green-tinted)
            RowLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 12

                // Left: Current Card State
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: root.theme.bgPrimary
                    border.color: root.theme.rgba(239, 68, 68, 0.4)
                    border.width: 1
                    radius: root.theme.radiusSm

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 6

                        RowLayout {
                            Layout.fillWidth: true
                            Text { text: "🟥 Current Version"; color: "#fca5a5"; font.pixelSize: 11; font.bold: true }
                            Item { Layout.fillWidth: true }
                            Text {
                                text: root.originalValue ? (root.originalValue.length + " chars") : "0 chars"
                                color: root.theme.textDim
                                font.pixelSize: 10
                            }
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true

                            TextEdit {
                                width: parent.width
                                readOnly: true
                                selectByMouse: true
                                text: root.originalValue || "(Empty)"
                                color: "#fecaca"
                                font.pixelSize: 11
                                font.family: "monospace"
                                wrapMode: Text.Wrap
                            }
                        }
                    }
                }

                // Right: Proposed Agent Mutation
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: root.theme.bgPrimary
                    border.color: root.theme.rgba(16, 185, 129, 0.5)
                    border.width: 1
                    radius: root.theme.radiusSm

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 6

                        RowLayout {
                            Layout.fillWidth: true
                            Text { text: "🟩 Proposed Mutation"; color: "#6ee7b7"; font.pixelSize: 11; font.bold: true }
                            Item { Layout.fillWidth: true }
                            Text {
                                text: root.proposedValue ? (root.proposedValue.length + " chars") : "0 chars"
                                color: root.theme.textDim
                                font.pixelSize: 10
                            }
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true

                            TextEdit {
                                width: parent.width
                                readOnly: true
                                selectByMouse: true
                                text: root.proposedValue || "(Empty)"
                                color: "#a7f3d0"
                                font.pixelSize: 11
                                font.family: "monospace"
                                wrapMode: Text.Wrap
                            }
                        }
                    }
                }
            }

            // Footer Action Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "📋 Copy Proposed"
                    onClicked: {
                        diffCopyHelper.text = root.proposedValue
                        diffCopyHelper.selectAll()
                        diffCopyHelper.copy()
                        if (bridge && bridge.notification) bridge.notification.emit("✓ Copied proposed text to clipboard!")
                    }
                    background: Rectangle {
                        radius: root.theme.radiusSm
                        color: parent.hovered ? root.theme.bgHover : root.theme.bgTertiary
                        border.color: root.theme.borderMain
                    }
                    contentItem: Text { text: parent.text; color: root.theme.textMain; font.pixelSize: 11 }
                }

                TextEdit {
                    id: diffCopyHelper
                    visible: false
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "Discard Mutation"
                    onClicked: root.rejected()
                    background: Rectangle {
                        radius: root.theme.radiusSm
                        color: parent.hovered ? root.theme.bgHover : root.theme.bgTertiary
                        border.color: root.theme.borderMain
                    }
                    contentItem: Text { text: parent.text; color: root.theme.textMuted; font.pixelSize: 11 }
                }

                Button {
                    text: "✓ Apply Change to " + root.activeFieldName.toUpperCase()
                    onClicked: root.accepted()
                    background: Rectangle {
                        radius: root.theme.radiusSm
                        color: parent.hovered ? "#059669" : "#10b981"
                    }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                }
            }
        }
    }
}
