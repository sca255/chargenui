import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    color: Qt.rgba(0, 0, 0, 0.75)

    Theme { id: theme }

    function openSettings() {
        var p = bridge.provider
        var pType = p.type || "none"

        for (var i = 0; i < providerCombo.model.length; i++) {
            if (providerCombo.model[i].value === pType) {
                providerCombo.currentIndex = i
                break
            }
        }
        apiKeyField.text = p.apiKey || ""
        baseUrlField.text = p.baseUrl || ""
        modelField.text = p.model || ""
        tempSlider.value = p.temperature || 0.85
        bridge.fetchPromptProfiles()
        visible = true
    }

    function saveSettings() {
        bridge.updateProvider(
            providerCombo.currentValue,
            apiKeyField.text,
            baseUrlField.text,
            modelField.text,
            tempSlider.value
        )
        if (profileCombo.currentValue) {
            bridge.selectPromptProfile(profileCombo.currentValue)
        }
        visible = false
    }

    Rectangle {
        id: box
        width: Math.min(520, parent.width - 40)
        implicitHeight: layout.implicitHeight + 36
        anchors.centerIn: parent
        color: theme.bgSecondary
        radius: theme.radiusMd
        border.color: theme.borderMain
        border.width: 1

        ColumnLayout {
            id: layout
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header
            RowLayout {
                Layout.fillWidth: true
                Text { text: "⚙️"; font.pixelSize: 18 }
                Text {
                    text: "AI Provider Configuration"
                    color: theme.textMain
                    font.pixelSize: 15
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    onClicked: root.visible = false
                    background: Rectangle { color: "transparent" }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMuted
                        font.pixelSize: 13
                        font.bold: true
                    }
                }
            }

            // Provider Type
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "AI Backend Provider"; color: theme.textMuted; font.pixelSize: 11; font.bold: true }
                ComboBox {
                    id: providerCombo
                    Layout.fillWidth: true
                    textRole: "text"
                    valueRole: "value"
                    model: [
                        { text: "OpenRouter (Recommended - All Cloud Models)", value: "openrouter" },
                        { text: "OpenAI Direct (GPT-4o, o1)", value: "openai" },
                        { text: "Anthropic Direct (Claude 3.5 Sonnet)", value: "anthropic" },
                        { text: "Ollama (Local Models: Qwen, Llama 3)", value: "ollama" },
                        { text: "llama.cpp (Local Server / GGUF)", value: "llamacpp" },
                        { text: "Custom OpenAI-Compatible API", value: "custom" }
                    ]
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: theme.borderMain
                        radius: theme.radiusSm
                    }
                    contentItem: Text {
                        text: providerCombo.displayText
                        color: theme.textMain
                        font.pixelSize: 12
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 10
                    }
                }
            }

            // Prompt Profile Selection (Feature Parity with WebUI)
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Active System Prompt Profile"; color: theme.accentCyan; font.pixelSize: 11; font.bold: true }
                    Item { Layout.fillWidth: true }
                    Text { text: "Controls card synthesis guidelines"; color: theme.textDim; font.pixelSize: 10 }
                }
                ComboBox {
                    id: profileCombo
                    Layout.fillWidth: true
                    textRole: "name"
                    valueRole: "id"
                    model: bridge.promptProfiles || []
                    currentIndex: {
                        if (!bridge.promptProfiles) return 0
                        for (var i = 0; i < bridge.promptProfiles.length; i++) {
                            if (bridge.promptProfiles[i].id === bridge.activePromptProfile) return i
                        }
                        return 0
                    }
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: theme.accentCyan
                        border.width: 1
                        radius: theme.radiusSm
                    }
                    contentItem: Text {
                        text: profileCombo.displayText
                        color: theme.textMain
                        font.pixelSize: 12
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 10
                    }
                }
            }

            // API Key
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "API Key"; color: theme.textMuted; font.pixelSize: 11; font.bold: true }
                TextField {
                    id: apiKeyField
                    Layout.fillWidth: true
                    echoMode: TextInput.Password
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderText: "sk-or-v1-... or your API key"
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: apiKeyField.activeFocus ? theme.accentCyan : theme.borderMain
                        radius: theme.radiusSm
                    }
                }
            }

            // Base URL
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "Base URL (For Ollama, llama.cpp or Custom Proxies)"; color: theme.textMuted; font.pixelSize: 11; font.bold: true }
                TextField {
                    id: baseUrlField
                    Layout.fillWidth: true
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderText: "e.g. http://127.0.0.1:11434 (leave blank for official cloud endpoints)"
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: baseUrlField.activeFocus ? theme.accentCyan : theme.borderMain
                        radius: theme.radiusSm
                    }
                }
            }

            // Model Name
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                Text { text: "Model Name / Identifier"; color: theme.textMuted; font.pixelSize: 11; font.bold: true }
                TextField {
                    id: modelField
                    Layout.fillWidth: true
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderText: "e.g. anthropic/claude-3.5-sonnet, meta-llama/llama-3.3-70b-instruct"
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: modelField.activeFocus ? theme.accentCyan : theme.borderMain
                        radius: theme.radiusSm
                    }
                }
            }

            // Temperature Slider
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4
                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Temperature (Creativity)"; color: theme.textMuted; font.pixelSize: 11; font.bold: true }
                    Item { Layout.fillWidth: true }
                    Text { text: tempSlider.value.toFixed(2); color: theme.accentCyan; font.pixelSize: 11; font.bold: true }
                }
                Slider {
                    id: tempSlider
                    Layout.fillWidth: true
                    from: 0.1
                    to: 1.5
                    stepSize: 0.05
                    value: 0.85
                }
            }

            // Buttons
            RowLayout {
                Layout.fillWidth: true
                Layout.topMargin: 8
                spacing: 10

                Button {
                    text: "Cancel"
                    onClicked: root.visible = false
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMuted
                        font.pixelSize: 11
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "💾 Save Configuration"
                    Layout.preferredWidth: 160
                    implicitHeight: 34
                    onClicked: root.saveSettings()
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? "#2563eb" : "#1d4ed8"
                        border.color: theme.accentBlue
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.pixelSize: 11
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }
}
