import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    Layout.fillWidth: true
    implicitHeight: pinnedCol.implicitHeight + 12
    color: theme.withAlpha(theme.accentPurple, 0.08)
    border.color: theme.withAlpha(theme.accentPurple, 0.4)
    radius: theme.radiusSm

    property var theme
    property var pinnedDirectives: []
    property bool pinnedExpanded: true

    signal addRequested(string rule)
    signal removeRequested(string rule)

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
                        color: root.theme.withAlpha(root.theme.accentPurple, 0.35)
                        implicitWidth: cntTxt.implicitWidth + 8
                        implicitHeight: 16
                        Text {
                            id: cntTxt
                            anchors.centerIn: parent
                            text: (root.pinnedDirectives ? root.pinnedDirectives.length : 0).toString()
                            color: "#ffffff"
                            font.pixelSize: 9
                            font.bold: true
                        }
                    }
                    Item { Layout.fillWidth: true }
                    Text { text: root.pinnedExpanded ? "▲" : "▼"; color: root.theme.textDim; font.pixelSize: 10 }
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
                visible: !root.pinnedDirectives || root.pinnedDirectives.length === 0
                text: "No pinned rules yet. Pin rules like 'Never apologize', 'Keep dialogue under 2 sentences', or 'Enforce gothic cadence'."
                color: root.theme.textDim
                font.pixelSize: 10
                font.italic: true
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }

            // Chips Flow
            Flow {
                visible: Boolean(root.pinnedDirectives && root.pinnedDirectives.length > 0)
                Layout.fillWidth: true
                spacing: 4
                Repeater {
                    model: root.pinnedDirectives
                    delegate: Rectangle {
                        required property string modelData
                        radius: 8
                        color: root.theme.withAlpha(root.theme.accentPurple, 0.25)
                        border.color: root.theme.accentPurple
                        implicitWidth: pinRow.implicitWidth + 10
                        implicitHeight: 20

                        RowLayout {
                            id: pinRow
                            anchors.centerIn: parent
                            spacing: 4
                            Text { text: modelData; color: "#e9d5ff"; font.pixelSize: 10 }
                            Text {
                                text: "✕"
                                color: root.theme.textMuted
                                font.pixelSize: 10
                                MouseArea {
                                    anchors.fill: parent
                                    onClicked: root.removeRequested(modelData)
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
                    color: root.theme.textMain
                    background: Rectangle {
                        color: root.theme.bgInput
                        border.color: root.theme.borderMain
                        radius: root.theme.radiusSm
                    }
                    onAccepted: btnAddPin.clicked()
                }

                Button {
                    id: btnAddPin
                    text: "Pin 📌"
                    implicitHeight: 26
                    onClicked: {
                        if (newPinnedInput.text.trim()) {
                            root.addRequested(newPinnedInput.text.trim())
                            newPinnedInput.text = ""
                        }
                    }
                    background: Rectangle {
                        radius: root.theme.radiusSm
                        color: root.theme.accentPurple
                    }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 10; font.bold: true }
                }
            }
        }
    }
}
