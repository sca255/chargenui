import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    property var theme
    property var stack
    property alias creatorNotesText: notesArea.text
    signal previewRequested()

    ColumnLayout {
        width: root.stack ? (root.stack.width - 20) : (root.width - 20)
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "Creator Notes & Roleplay Performance Guidance"
                color: root.theme.textMuted
                font.pixelSize: 11
                font.bold: true
                Layout.fillWidth: true
            }
            Button {
                text: "👁️ Rich HTML Preview"
                font.pixelSize: 10
                onClicked: root.previewRequested()
                background: Rectangle {
                    color: parent.hovered ? "#065f46" : "#064e3b"
                    radius: 4
                    border.color: "#10b981"
                    border.width: 1
                }
                contentItem: Text {
                    text: parent.text
                    color: "#6ee7b7"
                    font.pixelSize: 10
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 8
                    rightPadding: 8
                }
            }
        }
        TextArea {
            id: notesArea
            Layout.fillWidth: true
            implicitHeight: 240
            text: bridge.card ? (bridge.card.creator_notes || "") : ""
            wrapMode: TextEdit.Wrap
            font.pixelSize: 12
            color: root.theme.textMain
            background: Rectangle {
                color: root.theme.bgInput
                border.color: notesArea.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                radius: root.theme.radiusSm
            }
            onEditingFinished: bridge.updateCardField("creator_notes", text)
        }
    }
}
