import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    property var theme
    property var stack
    property var altGreetings: []
    property alias scenarioText: scenArea.text
    property alias firstMesText: firstMesArea.text

    ColumnLayout {
        width: root.stack ? (root.stack.width - 20) : (root.width - 20)
        spacing: 10

        Text {
            text: "Scenario Frame (Setting & Scene Objective)"
            color: root.theme.textMuted
            font.pixelSize: 11
            font.bold: true
        }
        TextArea {
            id: scenArea
            Layout.fillWidth: true
            implicitHeight: 100
            text: bridge.card ? (bridge.card.scenario || "") : ""
            wrapMode: TextEdit.Wrap
            font.pixelSize: 12
            color: root.theme.textMain
            background: Rectangle {
                color: root.theme.bgInput
                border.color: scenArea.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                radius: root.theme.radiusSm
            }
            onEditingFinished: bridge.updateCardField("scenario", text)
        }

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "First Message (Opening voiced narration & spoken dialogue)"
                color: root.theme.textMuted
                font.pixelSize: 11
                font.bold: true
                Layout.fillWidth: true
            }
            Button {
                text: "🖼️ Queue Greeting Scene"
                font.pixelSize: 10
                onClicked: bridge.queueGreetingImage(firstMesArea.text, "action_scene", "greeting")
            }
            Button {
                text: "🌄 Queue Chat Background"
                font.pixelSize: 10
                onClicked: bridge.queueGreetingImage(firstMesArea.text, "action_scene", "greeting_bg")
            }
        }
        TextArea {
            id: firstMesArea
            Layout.fillWidth: true
            implicitHeight: 180
            text: bridge.card ? (bridge.card.first_mes || "") : ""
            wrapMode: TextEdit.Wrap
            font.pixelSize: 12
            color: root.theme.textMain
            background: Rectangle {
                color: root.theme.bgInput
                border.color: firstMesArea.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                radius: root.theme.radiusSm
            }
            onEditingFinished: bridge.updateCardField("first_mes", text)
        }

        // Alternate Greetings Section (CCv2/CCv3)
        Text {
            visible: root.altGreetings.length > 0
            text: "Alternate Greetings (" + root.altGreetings.length + ")"
            color: root.theme.accentCyan
            font.pixelSize: 11
            font.bold: true
        }

        Repeater {
            model: root.altGreetings
            delegate: Rectangle {
                id: altCard
                required property string modelData
                required property int index
                Layout.fillWidth: true
                implicitHeight: altCol.implicitHeight + 16
                color: root.theme.bgCard
                border.color: root.theme.borderMain
                radius: root.theme.radiusSm

                ColumnLayout {
                    id: altCol
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 4

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "Alt #" + (altCard.index + 1)
                            color: "#93c5fd"
                            font.pixelSize: 10
                            font.bold: true
                            Layout.fillWidth: true
                        }
                        Button {
                            text: "🖼️ Queue Scene"
                            font.pixelSize: 9
                            onClicked: bridge.queueGreetingImage(altCard.modelData, "action_scene", "greeting")
                        }
                        Button {
                            text: "🌄 Queue BG"
                            font.pixelSize: 9
                            onClicked: bridge.queueGreetingImage(altCard.modelData, "action_scene", "greeting_bg")
                        }
                    }
                    Text {
                        Layout.fillWidth: true
                        text: altCard.modelData
                        color: root.theme.textMain
                        font.pixelSize: 11
                        wrapMode: Text.Wrap
                    }
                }
            }
        }
    }
}
