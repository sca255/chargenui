import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ColumnLayout {
    id: root
    Layout.fillWidth: true
    spacing: 4

    property var theme
    property string botMode: "single"

    signal modeChanged(string newMode)

    Text {
        text: "Bot Generation Mode"
        color: root.theme.textMuted
        font.pixelSize: 11
        font.bold: true
    }

    RowLayout {
        Layout.fillWidth: true
        spacing: 6

        // 1. Single Character
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 32
            radius: root.theme.radiusSm
            color: root.botMode === "single" ? "#2563eb" : (singleMouse.containsMouse ? root.theme.bgCardHover : root.theme.bgCard)
            border.color: root.botMode === "single" ? root.theme.accentBlue : root.theme.borderMain
            border.width: 1

            RowLayout {
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: "👤"
                    font.pixelSize: 11
                }
                Text {
                    text: "Solo Character"
                    color: root.botMode === "single" ? "#ffffff" : root.theme.textMain
                    font.pixelSize: 11
                    font.bold: root.botMode === "single"
                }
            }

            MouseArea {
                id: singleMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: root.modeChanged("single")
            }
        }

        // 2. Multi-Character Cast
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 32
            radius: root.theme.radiusSm
            color: root.botMode === "multi_character" ? "#7c3aed" : (multiMouse.containsMouse ? root.theme.bgCardHover : root.theme.bgCard)
            border.color: root.botMode === "multi_character" ? root.theme.accentPurple : root.theme.borderMain
            border.width: 1

            RowLayout {
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: "👥"
                    font.pixelSize: 11
                }
                Text {
                    text: "Multi Cast"
                    color: root.botMode === "multi_character" ? "#ffffff" : root.theme.textMain
                    font.pixelSize: 11
                    font.bold: root.botMode === "multi_character"
                }
            }

            MouseArea {
                id: multiMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: root.modeChanged("multi_character")
            }
        }

        // 3. RPG World / GM
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 32
            radius: root.theme.radiusSm
            color: root.botMode === "rpg_world" ? "#059669" : (rpgMouse.containsMouse ? root.theme.bgCardHover : root.theme.bgCard)
            border.color: root.botMode === "rpg_world" ? root.theme.accentGreen : root.theme.borderMain
            border.width: 1

            RowLayout {
                anchors.centerIn: parent
                spacing: 4
                Text {
                    text: "🗺️"
                    font.pixelSize: 11
                }
                Text {
                    text: "RPG World"
                    color: root.botMode === "rpg_world" ? "#ffffff" : root.theme.textMain
                    font.pixelSize: 11
                    font.bold: root.botMode === "rpg_world"
                }
            }

            MouseArea {
                id: rpgMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: root.modeChanged("rpg_world")
            }
        }
    }
}
