import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    property var theme
    property var stack

    ColumnLayout {
        width: root.stack ? (root.stack.width - 20) : (root.width - 20)
        spacing: 12

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "🎙️ TTS Voice Specification & Idiolect Stamping"
                color: root.theme.accentCyan
                font.pixelSize: 13
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Text {
                text: "Tuned for Qwen3-TTS, CosyVoice, Kokoro & ElevenLabs"
                color: root.theme.textDim
                font.pixelSize: 11
            }
        }

        // Auto-Stamp Voice Controller Bar
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: voiceCtrlLayout.implicitHeight + 16
            radius: root.theme.radiusSm
            color: root.theme.bgCard
            border.color: root.theme.withAlpha(root.theme.accentCyan, 0.4)

            ColumnLayout {
                id: voiceCtrlLayout
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                Text {
                    text: "⚡ AI Audio Director & Voice Calibration"
                    color: root.theme.accentCyan
                    font.pixelSize: 11
                    font.bold: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    TextField {
                        id: voicePrefInput
                        Layout.fillWidth: true
                        placeholderText: "Optional vocal preferences (e.g. 'British RP accent, velvety lower register, cynical breathy rasp')..."
                        font.pixelSize: 11
                        color: root.theme.textMain
                        placeholderTextColor: root.theme.textDim
                        background: Rectangle {
                            color: root.theme.bgInput
                            border.color: voicePrefInput.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                            radius: root.theme.radiusSm
                        }
                    }

                    Button {
                        id: btnStampVoice
                        text: "🎙️ Stamp Voice Spec"
                        enabled: !bridge.isBusy
                        onClicked: bridge.stampVoiceSpec(voicePrefInput.text)
                        background: Rectangle {
                            radius: root.theme.radiusSm
                            color: btnStampVoice.hovered ? "#0891b2" : "#06b6d4"
                        }
                        contentItem: RowLayout {
                            spacing: 4
                            Text { text: "🎙️"; font.pixelSize: 11 }
                            Text {
                                text: bridge.isBusy && bridge.taskType === "voice_spec" ? "Analyzing Voice..." : "Stamp Voice Spec"
                                color: "#0b0f17"
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }
                    }
                }
            }
        }

        // Qwen3-TTS & CosyVoice Directives Card
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: qwenCardLayout.implicitHeight + 16
            radius: root.theme.radiusSm
            color: root.theme.bgCard
            border.color: root.theme.borderMain

            ColumnLayout {
                id: qwenCardLayout
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "🤖 Qwen3-TTS & CosyVoice Instruct Specification"
                        color: "#38bdf8"
                        font.pixelSize: 12
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Button {
                        text: "📋 Copy Qwen Prompt"
                        onClicked: {
                            qwenPromptText.selectAll()
                            qwenPromptText.copy()
                            bridge.notification.emit("✓ Copied Qwen-TTS instruct prompt to clipboard!")
                        }
                        background: Rectangle {
                            radius: 4
                            color: root.theme.withAlpha(root.theme.accentCyan, 0.2)
                            border.color: root.theme.accentCyan
                        }
                        contentItem: Text { text: parent.text; color: "#bae6fd"; font.pixelSize: 10; font.bold: true }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: qwenPromptText.implicitHeight + 12
                    color: root.theme.bgInput
                    radius: root.theme.radiusSm
                    border.color: root.theme.borderMain

                    TextEdit {
                        id: qwenPromptText
                        anchors.fill: parent
                        anchors.margins: 8
                        readOnly: true
                        selectByMouse: true
                        text: (bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.qwenInstructPrompt)
                            || (bridge.card.extensions && bridge.card.extensions.chara_tts && bridge.card.extensions.chara_tts.qwen_prompt)
                            || "Click '🎙️ Stamp Voice Spec' above to analyze this character's idiolect and generate an authentic Qwen3-TTS instruct prompt."
                        color: root.theme.textMain
                        font.pixelSize: 11
                        font.family: "monospace"
                        wrapMode: Text.Wrap
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "Reference Dialogue Sample (Voice Warmup / Clone Seed):"
                        color: root.theme.textMuted
                        font.pixelSize: 10
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Button {
                        text: "📋 Copy Dialogue"
                        onClicked: {
                            qwenSampleText.selectAll()
                            qwenSampleText.copy()
                            bridge.notification.emit("✓ Copied sample dialogue to clipboard!")
                        }
                        background: Rectangle {
                            radius: 4
                            color: root.theme.withAlpha(root.theme.accentPurple, 0.2)
                            border.color: root.theme.accentPurple
                        }
                        contentItem: Text { text: parent.text; color: "#e9d5ff"; font.pixelSize: 10; font.bold: true }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: qwenSampleText.implicitHeight + 12
                    color: root.theme.bgInput
                    radius: root.theme.radiusSm
                    border.color: root.theme.borderMain

                    TextEdit {
                        id: qwenSampleText
                        anchors.fill: parent
                        anchors.margins: 8
                        readOnly: true
                        selectByMouse: true
                        text: (bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.qwenSampleDialogue)
                            || (bridge.card.extensions && bridge.card.extensions.chara_tts && bridge.card.extensions.chara_tts.sample_text)
                            || "No sample dialogue generated yet."
                        color: "#fbcfe8"
                        font.pixelSize: 11
                        wrapMode: Text.Wrap
                    }
                }
            }
        }

        // Kokoro & ElevenLabs Preset Cards Row
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            // Kokoro Match
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: kokoroLayout.implicitHeight + 16
                radius: root.theme.radiusSm
                color: root.theme.bgCard
                border.color: root.theme.borderMain

                ColumnLayout {
                    id: kokoroLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 4

                    Text { text: "🍃 Kokoro Voice Match"; color: root.theme.accentEmerald; font.pixelSize: 11; font.bold: true }
                    Text {
                        text: (bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.kokoroVoice)
                            || (bridge.card.extensions && bridge.card.extensions.chara_tts && bridge.card.extensions.chara_tts.voice_id)
                            || "af_bella"
                        color: "#ffffff"
                        font.pixelSize: 14
                        font.bold: true
                    }
                    Text {
                        text: "Compatible with SillyTavern Kokoro extension"
                        color: root.theme.textDim
                        font.pixelSize: 10
                    }
                }
            }

            // ElevenLabs Recommended Sliders
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: elevenLayout.implicitHeight + 16
                radius: root.theme.radiusSm
                color: root.theme.bgCard
                border.color: root.theme.borderMain

                ColumnLayout {
                    id: elevenLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 4

                    Text { text: "🎛️ ElevenLabs Recommended Sliders"; color: root.theme.accentAmber; font.pixelSize: 11; font.bold: true }
                    RowLayout {
                        spacing: 12
                        Text {
                            text: "Stability: " + ((bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.elevenLabs && bridge.card.extensions.chargen.tts_spec.elevenLabs.stability) || 0.65)
                            color: root.theme.textMain
                            font.pixelSize: 10
                        }
                        Text {
                            text: "Similarity: " + ((bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.elevenLabs && bridge.card.extensions.chargen.tts_spec.elevenLabs.similarity) || 0.80)
                            color: root.theme.textMain
                            font.pixelSize: 10
                        }
                        Text {
                            text: "Speed: " + ((bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.elevenLabs && bridge.card.extensions.chargen.tts_spec.elevenLabs.speed) || 1.0) + "x"
                            color: root.theme.textMain
                            font.pixelSize: 10
                        }
                    }
                }
            }
        }
    }
}
