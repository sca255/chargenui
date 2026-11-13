import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    property var theme
    property var stack
    property alias postHistoryText: postHistArea.text

    ColumnLayout {
        width: root.stack ? (root.stack.width - 20) : (root.width - 20)
        spacing: 12

        // AI Incorporator Box
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: incorpCol.implicitHeight + 20
            color: root.theme.withAlpha(root.theme.accentBlue, 0.08)
            border.color: root.theme.withAlpha(root.theme.accentBlue, 0.35)
            radius: root.theme.radiusSm

            ColumnLayout {
                id: incorpCol
                anchors.fill: parent
                anchors.margins: 12
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "✨"; font.pixelSize: 14 }
                    Text {
                        text: "AI Directive & System Prompt Incorporator"
                        color: root.theme.accentCyan
                        font.pixelSize: 12
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text { text: "🔒 SillyTavern Preset Safe"; color: root.theme.accentEmerald; font.pixelSize: 10; font.bold: true }
                }

                Text {
                    text: "Have a legacy system prompt or raw roleplay directives? Use the LLM to intelligently weave into Post-History, Description, or Both without wiping out your front-end system prompt."
                    color: root.theme.textMuted
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                    Layout.fillWidth: true
                }

                TextArea {
                    id: sysPromptField
                    Layout.fillWidth: true
                    implicitHeight: 80
                    placeholderText: "Paste raw directives or legacy system prompt here..."
                    font.pixelSize: 11
                    font.family: "monospace"
                    color: root.theme.textMain
                    background: Rectangle {
                        color: root.theme.bgInput
                        border.color: sysPromptField.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                        radius: root.theme.radiusSm
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    ComboBox {
                        id: incorpTargetCombo
                        model: ["Both (Description + Post-History)", "Post-History Only", "Description Only"]
                        Layout.preferredWidth: 220
                        background: Rectangle {
                            color: root.theme.bgInput
                            border.color: root.theme.borderMain
                            radius: root.theme.radiusSm
                        }
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        text: "📋 Plain Move"
                        onClicked: {
                            if (sysPromptField.text.trim()) {
                                var current = bridge.card.post_history_instructions || ""
                                var combined = current ? (current + "\n\n" + sysPromptField.text.trim()) : sysPromptField.text.trim()
                                bridge.updateCardField("post_history_instructions", combined)
                                sysPromptField.text = ""
                            }
                        }
                        background: Rectangle {
                            radius: root.theme.radiusSm
                            color: parent.hovered ? root.theme.bgHover : root.theme.bgTertiary
                            border.color: root.theme.borderMain
                        }
                        contentItem: Text { text: parent.text; color: root.theme.textMuted; font.pixelSize: 11 }
                    }

                    Button {
                        text: bridge.isBusy && bridge.taskType === "incorporate_prompt" ? "Incorporating..." : "✨ Incorporate with AI"
                        enabled: !bridge.isBusy && sysPromptField.text.trim().length > 0
                        onClicked: {
                            var t = "both"
                            if (incorpTargetCombo.currentIndex === 1) t = "post_history"
                            else if (incorpTargetCombo.currentIndex === 2) t = "description"
                            bridge.incorporatePrompt(sysPromptField.text, t)
                            sysPromptField.text = ""
                        }
                        background: Rectangle {
                            radius: root.theme.radiusSm
                            color: parent.hovered ? "#2563eb" : "#1d4ed8"
                        }
                        contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                    }
                }
            }
        }

        Text {
            text: "Post-History Instructions (Uncensored Persona Directives & Agency)"
            color: root.theme.accentCyan
            font.pixelSize: 11
            font.bold: true
        }
        Text {
            text: "Appended at context end in SillyTavern — enforces behavioural rules and boundaries without overriding your global preset."
            color: root.theme.textDim
            font.pixelSize: 10
        }
        TextArea {
            id: postHistArea
            Layout.fillWidth: true
            implicitHeight: 220
            text: bridge.card ? (bridge.card.post_history_instructions || "") : ""
            wrapMode: TextEdit.Wrap
            font.pixelSize: 12
            font.family: "monospace"
            color: root.theme.textMain
            background: Rectangle {
                color: root.theme.bgInput
                border.color: postHistArea.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                radius: root.theme.radiusSm
            }
            onEditingFinished: bridge.updateCardField("post_history_instructions", text)
        }
    }
}
