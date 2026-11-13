import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ColumnLayout {
    id: root
    Layout.fillWidth: true
    Layout.topMargin: 4
    spacing: 8

    property var theme
    property string botMode: "single"
    property string activeCardName: ""
    property bool hasStoredSpine: false

    signal weaverRequested()
    signal quickForgeRequested()
    signal synthesizeSpineRequested()
    signal regenerateWithSpineRequested()
    signal cancelRequested()

    // Weaver Guided Interview Button
    Button {
        id: btnWeaver
        Layout.fillWidth: true
        implicitHeight: 40
        enabled: !bridge.isBusy
        onClicked: root.weaverRequested()

        background: Rectangle {
            radius: root.theme.radiusSm
            gradient: Gradient {
                orientation: Gradient.Horizontal
                GradientStop { position: 0.0; color: btnWeaver.hovered ? "#4f46e5" : "#4338ca" }
                GradientStop { position: 1.0; color: btnWeaver.hovered ? "#9333ea" : "#7e22ce" }
            }
            border.color: root.theme.accentPurple
            border.width: 1
        }

        contentItem: RowLayout {
            anchors.centerIn: parent
            spacing: 8
            Text {
                text: (bridge.taskType === "weaver_questions" || bridge.taskType === "weaver_forge") ? "⏳" : "🧠"
                font.pixelSize: 14
            }
            Text {
                text: {
                    if (bridge.taskType === "weaver_questions") return "Analyzing Concept & Formulating Questions..."
                    if (bridge.taskType === "weaver_forge") return "Weaver Synthesizing Bible & Card..."
                    return "Weaver Guided Interview (Q&A Workshop)"
                }
                color: "#ffffff"
                font.pixelSize: 12
                font.bold: true
            }
        }
    }

    Text {
        Layout.alignment: Qt.AlignHCenter
        text: "— OR ONE-SHOT FORGE —"
        color: root.theme.textDim
        font.pixelSize: 10
        font.bold: true
        font.letterSpacing: 0.5
    }

    // Quick Forge Button
    Button {
        id: btnQuickForge
        Layout.fillWidth: true
        implicitHeight: 36
        enabled: !bridge.isBusy
        onClicked: root.quickForgeRequested()

        background: Rectangle {
            radius: root.theme.radiusSm
            color: btnQuickForge.hovered ? "#2563eb" : "#1d4ed8"
            border.color: root.theme.accentBlue
        }

        contentItem: RowLayout {
            anchors.centerIn: parent
            spacing: 8
            Text {
                text: bridge.taskType === "quick_forge" ? "⏳" : "⚡"
                font.pixelSize: 13
            }
            Text {
                text: bridge.taskType === "quick_forge" ? "Engineering Uncensored Card..." : "Quick Forge (One-Shot)"
                color: "#ffffff"
                font.pixelSize: 12
                font.bold: true
            }
        }
    }

    // Synthesize Spine Button (Retroactive)
    Button {
        id: btnSynthesizeSpine
        Layout.fillWidth: true
        implicitHeight: 32
        enabled: !bridge.isBusy
        visible: Boolean(root.activeCardName && root.activeCardName !== "")
        onClicked: root.synthesizeSpineRequested()

        background: Rectangle {
            radius: root.theme.radiusSm
            color: btnSynthesizeSpine.hovered ? "#5b21b6" : "#6d28d9"
            border.color: root.theme.accentPurple
        }

        contentItem: RowLayout {
            anchors.centerIn: parent
            spacing: 6
            Text {
                text: "🧬"
                font.pixelSize: 12
            }
            Text {
                text: "Synthesize Spine (Retroactive)"
                color: "#ffffff"
                font.pixelSize: 11
                font.bold: true
            }
        }
    }

    // Regenerate with Spine Button (Arc-Aware)
    Button {
        id: btnRegenerateWithSpine
        Layout.fillWidth: true
        implicitHeight: 32
        enabled: !bridge.isBusy && root.hasStoredSpine
        visible: root.hasStoredSpine
        onClicked: root.regenerateWithSpineRequested()

        background: Rectangle {
            radius: root.theme.radiusSm
            color: btnRegenerateWithSpine.hovered ? "#4c1d95" : "#581c87"
            border.color: "#a855f7"
        }

        contentItem: RowLayout {
            anchors.centerIn: parent
            spacing: 6
            Text {
                text: "🧬"
                font.pixelSize: 12
            }
            Text {
                text: "Regenerate with Spine (Arc-Aware)"
                color: "#ffffff"
                font.pixelSize: 11
                font.bold: true
            }
        }
    }

    Button {
        id: btnCancel
        visible: bridge.isBusy
        Layout.fillWidth: true
        implicitHeight: 32
        text: "🛑 Cancel current generation"
        onClicked: root.cancelRequested()
        background: Rectangle {
            radius: root.theme.radiusSm
            color: parent.hovered ? "#991b1b" : "#7f1d1d"
            border.color: "#ef4444"
        }
        contentItem: Text {
            text: parent.text
            color: "#fecaca"
            font.pixelSize: 11
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }
}
