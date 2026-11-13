import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5
import QtQuick.Dialogs 6.5

Rectangle {
    id: root
    visible: false
    color: Qt.rgba(0, 0, 0, 0.78)

    Theme { id: theme }

    property var lastPrompt: null

    function openGen() {
        tabBar.currentIndex = 0
        visible = true
    }

    function openQueue() {
        tabBar.currentIndex = 1
        bridge.fetchImageQueue()
        visible = true
    }

    Connections {
        target: bridge
        function onImagePromptReady(res) {
            root.lastPrompt = res
            posPromptInput.text = res.positivePrompt || ""
            negPromptInput.text = res.negativePrompt || ""
        }
    }

    Rectangle {
        id: box
        width: Math.min(840, parent.width - 40)
        height: Math.min(680, parent.height - 40)
        anchors.centerIn: parent
        color: theme.bgSecondary
        radius: theme.radiusMd
        border.color: theme.borderMain
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header Bar
            RowLayout {
                Layout.fillWidth: true
                Text { text: "🖼️"; font.pixelSize: 20 }
                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Image Prompt Generator & Offline Queue"
                        color: theme.textMain
                        font.pixelSize: 15
                        font.bold: true
                    }
                    Text {
                        text: "Generate prompts for multiple characters → Turn off LLM to save VRAM → Run ComfyUI / Flux / Pony"
                        color: theme.textDim
                        font.pixelSize: 10
                    }
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    onClicked: root.visible = false
                    background: Rectangle { color: "transparent" }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMuted
                        font.pixelSize: 14
                        font.bold: true
                    }
                }
            }

            // Tab Bar
            TabBar {
                id: tabBar
                Layout.fillWidth: true
                background: Rectangle { color: "transparent" }

                TabButton {
                    text: "🎨 Prompt Generator"
                    font.pixelSize: 11
                    font.bold: tabBar.currentIndex === 0
                }
                TabButton {
                    text: "📋 Offline Queue (" + (bridge.imageQueue ? bridge.imageQueue.length : 0) + ")"
                    font.pixelSize: 11
                    font.bold: tabBar.currentIndex === 1
                }
                TabButton {
                    text: "⚡ ComfyClient (IPC Socket)"
                    font.pixelSize: 11
                    font.bold: tabBar.currentIndex === 2
                }
            }

            // StackLayout for the 3 Tabs
            StackLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                currentIndex: tabBar.currentIndex

                // TAB 0: Prompt Generator
                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true

                    ColumnLayout {
                        width: parent.width - 12
                        spacing: 10

                        // Target character banner
                        Rectangle {
                            Layout.fillWidth: true
                            height: 32
                            radius: theme.radiusSm
                            color: theme.withAlpha(theme.accentPurple, 0.15)
                            border.color: theme.accentPurple
                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 10
                                anchors.rightMargin: 10
                                Text {
                                    text: "Character Target: "
                                    color: "#e9d5ff"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                                Text {
                                    text: bridge.card.name ? bridge.card.name : "Unnamed Character"
                                    color: "#ffffff"
                                    font.pixelSize: 11
                                }
                            }
                        }

                        // Form grid
                        GridLayout {
                            Layout.fillWidth: true
                            columns: 2
                            rowSpacing: 8
                            columnSpacing: 10

                            ColumnLayout {
                                Layout.fillWidth: true
                                Layout.columnSpan: 2
                                spacing: 4
                                Text { text: "Generation Purpose"; color: theme.accentPurple; font.pixelSize: 10; font.bold: true }
                                ComboBox {
                                    id: purposeCombo
                                    Layout.fillWidth: true
                                    model: ["avatar", "greeting"]
                                    displayText: {
                                        if (currentText === "avatar") return "👤 Character Profile Avatar (Dignified portrait)"
                                        if (currentText === "greeting") return "💬 Greeting / Opening Scene Visualizer (From First Message)"
                                        return currentText
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                Layout.columnSpan: 2
                                spacing: 4
                                Text { text: "Portrait Type / Intent"; color: theme.accentCyan; font.pixelSize: 10; font.bold: true }
                                ComboBox {
                                    id: intentCombo
                                    Layout.fillWidth: true
                                    model: ["standard_avatar", "casual", "action", "sensual_kink"]
                                    displayText: {
                                        if (currentText === "standard_avatar") return "👤 Normal Profile Avatar (Clean, Regular Clothes)"
                                        if (currentText === "casual") return "👕 Casual / Daily Life"
                                        if (currentText === "action") return "⚔️ Action / Combat Stance"
                                        if (currentText === "sensual_kink") return "⛓️ Kink / Restraint Scene (Explicitly Requested)"
                                        return currentText
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                Text { text: "Target Model Architecture"; color: theme.textMuted; font.pixelSize: 10; font.bold: true }
                                ComboBox {
                                    id: modelCombo
                                    Layout.fillWidth: true
                                    model: ["anima", "flux", "pony", "illustrious", "sdxl", "midjourney"]
                                    displayText: {
                                        if (currentText === "anima") return "CircleStone Anima (Cosmos 2B / Qwen3)"
                                        if (currentText === "flux") return "FLUX.1 / SD 3.5 (Natural Language)"
                                        if (currentText === "pony") return "Pony Diffusion V6 / XL (Score Tags)"
                                        if (currentText === "illustrious") return "Illustrious-XL / Animagine (Booru)"
                                        if (currentText === "sdxl") return "SDXL Standard (Quality Tags)"
                                        if (currentText === "midjourney") return "Midjourney V6 (Cinematic Raw)"
                                        return currentText
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                Text { text: "Art Style"; color: theme.textMuted; font.pixelSize: 10; font.bold: true }
                                ComboBox {
                                    id: styleCombo
                                    Layout.fillWidth: true
                                    model: ["anime", "photorealistic", "semi_realistic", "dark_fantasy", "cyberpunk", "oil_painting"]
                                    displayText: {
                                        if (currentText === "anime") return "Anime / Manga Illustration"
                                        if (currentText === "photorealistic") return "Photorealistic / 8k Cinema"
                                        if (currentText === "semi_realistic") return "Semi-Realistic Concept Art"
                                        if (currentText === "dark_fantasy") return "Dark Fantasy / Gothic"
                                        if (currentText === "cyberpunk") return "Cyberpunk / Neon Atmosphere"
                                        if (currentText === "oil_painting") return "Painterly Fine Art"
                                        return currentText
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                Text { text: "Framing & Shot"; color: theme.textMuted; font.pixelSize: 10; font.bold: true }
                                ComboBox {
                                    id: shotCombo
                                    Layout.fillWidth: true
                                    model: ["card_portrait", "full_body", "action_scene", "intimate_close_up"]
                                    displayText: {
                                        if (currentText === "card_portrait") return "Card Portrait (Bust / 2:3)"
                                        if (currentText === "full_body") return "Full Body Standing (9:16)"
                                        if (currentText === "action_scene") return "Action Scene (16:9)"
                                        if (currentText === "intimate_close_up") return "Close-Up Face & Eyes (4:5)"
                                        return currentText
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                Text { text: "Aspect Ratio / Resolution"; color: theme.textMuted; font.pixelSize: 10; font.bold: true }
                                ComboBox {
                                    id: ratioCombo
                                    Layout.fillWidth: true
                                    model: ["2:3", "1:1", "16:9", "9:16", "4:5"]
                                    displayText: {
                                        if (currentText === "2:3") return "2:3 (832x1216 - Card Portrait)"
                                        if (currentText === "1:1") return "1:1 (1024x1024 - Square)"
                                        if (currentText === "16:9") return "16:9 (1216x832 - Landscape)"
                                        if (currentText === "9:16") return "9:16 (768x1344 - Full Height)"
                                        if (currentText === "4:5") return "4:5 (896x1152 - Portrait)"
                                        return currentText
                                    }
                                }
                            }
                        }

                        // Steering Input
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Custom Scene & Outfit Steering (Optional)"; color: theme.textMuted; font.pixelSize: 10; font.bold: true }
                            TextField {
                                id: steeringField
                                Layout.fillWidth: true
                                placeholderText: "e.g. wearing a dark silk corset in a neon rain alley, holding daggers"
                                color: theme.textMain
                                background: Rectangle { color: theme.bgInput; radius: theme.radiusSm; border.color: theme.borderMain }
                            }
                        }

                        // Action Bar: NSFW Switch & Generate Button
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 12
                            CheckBox {
                                id: nsfwSwitch
                                text: "Enable Mature / NSFW Details"
                            }
                            Item { Layout.fillWidth: true }
                            Button {
                                text: "💬 Queue Greeting Image"
                                enabled: !bridge.isBusy
                                onClicked: {
                                    bridge.queueGreetingImage(bridge.card.first_mes || "", shotCombo.currentText)
                                }
                            }
                            Button {
                                text: "⚡ Generate Image Prompt"
                                enabled: !bridge.isBusy
                                onClicked: {
                                    bridge.generateImagePrompt(
                                        modelCombo.currentText,
                                        purposeCombo.currentText,
                                        intentCombo.currentText,
                                        styleCombo.currentText,
                                        shotCombo.currentText,
                                        ratioCombo.currentText,
                                        steeringField.text,
                                        nsfwSwitch.checked
                                    )
                                }
                            }
                        }

                        // Positive Prompt
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            RowLayout {
                                Layout.fillWidth: true
                                Text { text: "Positive Prompt"; color: theme.accentCyan; font.pixelSize: 11; font.bold: true }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "📋 Copy"
                                    onClicked: bridge.copyToClipboard(posPromptInput.text)
                                }
                            }
                            TextArea {
                                id: posPromptInput
                                Layout.fillWidth: true
                                implicitHeight: 90
                                wrapMode: TextArea.Wrap
                                font.pixelSize: 11
                                color: theme.textMain
                                background: Rectangle { color: theme.bgInput; radius: theme.radiusSm; border.color: theme.borderMain }
                            }
                        }

                        // Negative Prompt
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            RowLayout {
                                Layout.fillWidth: true
                                Text { text: "Negative Prompt"; color: theme.accentRed; font.pixelSize: 11; font.bold: true }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "📋 Copy"
                                    onClicked: bridge.copyToClipboard(negPromptInput.text)
                                }
                            }
                            TextArea {
                                id: negPromptInput
                                Layout.fillWidth: true
                                implicitHeight: 65
                                wrapMode: TextArea.Wrap
                                font.pixelSize: 11
                                color: theme.textMain
                                background: Rectangle { color: theme.bgInput; radius: theme.radiusSm; border.color: theme.borderMain }
                            }
                        }

                        // Add to Queue button
                        RowLayout {
                            Layout.fillWidth: true
                            Item { Layout.fillWidth: true }
                            Button {
                                text: "➕ Add to Offline Queue"
                                enabled: posPromptInput.text.length > 0
                                onClicked: {
                                    bridge.addPromptToQueue(posPromptInput.text, negPromptInput.text)
                                    tabBar.currentIndex = 1
                                }
                            }
                        }
                    }
                }

                // TAB 1: Offline Queue
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 8

                    // Queue Action Bar
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8
                        Button {
                            text: "📋 Copy All"
                            onClicked: {
                                var q = bridge.imageQueue || []
                                if (q.length === 0) return
                                var combined = ""
                                for (var i = 0; i < q.length; i++) {
                                    var it = q[i]
                                    combined += "[" + (i + 1) + "] " + it.characterName + " (" + (it.targetModel || "FLUX").toUpperCase() + ")\n"
                                    combined += "POSITIVE:\n" + it.positivePrompt + "\n\nNEGATIVE:\n" + it.negativePrompt + "\n------------------------------------\n\n"
                                }
                                bridge.copyToClipboard(combined)
                            }
                        }
                        Button {
                            text: "💾 Export JSON"
                            onClicked: exportJsonDialog.open()
                        }
                        Button {
                            text: "📄 Export .TXT"
                            onClicked: exportTxtDialog.open()
                        }
                        Item { Layout.fillWidth: true }
                        Button {
                            text: "🧹 Clear Done"
                            onClicked: bridge.clearQueue(true)
                        }
                        Button {
                            text: "🗑️ Clear All"
                            onClicked: bridge.clearQueue(false)
                        }
                    }

                    // Queue List
                    ListView {
                        id: queueListView
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        clip: true
                        spacing: 8
                        model: bridge.imageQueue || []

                        delegate: Rectangle {
                            id: itemDelegate
                            required property var modelData
                            required property int index

                            width: queueListView.width - 10
                            implicitHeight: itemCol.implicitHeight + 20
                            radius: theme.radiusSm
                            color: theme.bgCard
                            border.color: modelData.status === "completed" ? theme.accentEmerald : theme.borderMain
                            border.width: modelData.status === "completed" ? 2 : 1

                            ColumnLayout {
                                id: itemCol
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 6

                                // Item Header
                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: modelData.characterName || "Unnamed"
                                        color: "#ffffff"
                                        font.pixelSize: 13
                                        font.bold: true
                                    }
                                    Rectangle {
                                        radius: 4
                                        color: modelData.imagePurpose === "greeting" ? theme.withAlpha(theme.accentPurple, 0.2) : theme.withAlpha(theme.accentBlue, 0.2)
                                        implicitWidth: pText.implicitWidth + 8
                                        implicitHeight: 18
                                        Text {
                                            id: pText
                                            anchors.centerIn: parent
                                            text: modelData.imagePurpose === "greeting" ? "💬 GREETING" : "👤 AVATAR"
                                            color: modelData.imagePurpose === "greeting" ? "#d8b4fe" : "#93c5fd"
                                            font.pixelSize: 9
                                            font.bold: true
                                        }
                                    }
                                    Rectangle {
                                        radius: 4
                                        color: theme.withAlpha(theme.accentPurple, 0.25)
                                        border.color: theme.accentPurple
                                        implicitWidth: mText.implicitWidth + 8
                                        implicitHeight: 18
                                        Text {
                                            id: mText
                                            anchors.centerIn: parent
                                            text: (modelData.targetModel || "FLUX").toUpperCase()
                                            color: "#e9d5ff"
                                            font.pixelSize: 10
                                            font.bold: true
                                        }
                                    }
                                    Rectangle {
                                        radius: 4
                                        color: modelData.status === "completed" ? theme.withAlpha(theme.accentEmerald, 0.2) : theme.withAlpha(theme.accentAmber, 0.2)
                                        implicitWidth: sText.implicitWidth + 8
                                        implicitHeight: 18
                                        Text {
                                            id: sText
                                            anchors.centerIn: parent
                                            text: (modelData.status || "QUEUED").toUpperCase()
                                            color: modelData.status === "completed" ? "#34d399" : "#fbbf24"
                                            font.pixelSize: 9
                                            font.bold: true
                                        }
                                    }
                                    Item { Layout.fillWidth: true }
                                    Text {
                                        text: (modelData.dimensions ? (modelData.dimensions.width + "x" + modelData.dimensions.height) : "")
                                        color: theme.textDim
                                        font.pixelSize: 10
                                    }
                                }

                                // Prompt Field
                                RowLayout {
                                    Layout.fillWidth: true
                                    Text { text: "Image Prompt:"; color: theme.accentCyan; font.pixelSize: 11; font.bold: true }
                                    Item { Layout.fillWidth: true }
                                    Button {
                                        text: "📋 Copy Prompt"
                                        onClicked: bridge.copyToClipboard(modelData.prompt || modelData.positivePrompt || "")
                                    }
                                    Button {
                                        text: "🖼️ Attach Image"
                                        onClicked: {
                                            root.targetQueueItemId = modelData.id
                                            root.targetQueueItemPurpose = modelData.imagePurpose || "avatar"
                                            attachFileDialog.open()
                                        }
                                    }
                                    Button {
                                        text: modelData.status === "completed" ? "🔄 Re-queue" : "✅ Done"
                                        onClicked: bridge.toggleQueueItemStatus(modelData.id, modelData.status)
                                    }
                                    Button {
                                        text: "✕"
                                        onClicked: bridge.deleteQueueItem(modelData.id)
                                    }
                                }
                                TextArea {
                                    Layout.fillWidth: true
                                    text: modelData.prompt || modelData.positivePrompt || ""
                                    implicitHeight: 56
                                    wrapMode: TextArea.Wrap
                                    font.pixelSize: 10
                                    color: theme.textMain
                                    background: Rectangle { color: theme.bgInput; radius: theme.radiusSm }
                                }

                                // Optional Negative Prompt Field if present
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    visible: !!modelData.negativePrompt
                                    spacing: 2
                                    RowLayout {
                                        Layout.fillWidth: true
                                        Text { text: "Negative Prompt (Optional):"; color: theme.textDim; font.pixelSize: 9 }
                                        Item { Layout.fillWidth: true }
                                        Button {
                                            text: "📋 Copy Neg"
                                            onClicked: bridge.copyToClipboard(modelData.negativePrompt || "")
                                        }
                                    }
                                    TextArea {
                                        Layout.fillWidth: true
                                        text: modelData.negativePrompt || ""
                                        implicitHeight: 32
                                        wrapMode: TextArea.Wrap
                                        font.pixelSize: 9
                                        color: theme.textMuted
                                        background: Rectangle { color: theme.bgInput; radius: theme.radiusSm }
                                    }
                                }
                            }
                        }
                    }
                }

                // TAB 2: ComfyClient (IPC Socket)
                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true

                    ColumnLayout {
                        width: parent.width - 12
                        spacing: 12

                        // ComfyClient IPC Socket Bar
                        Rectangle {
                            Layout.fillWidth: true
                            height: 40
                            radius: theme.radiusSm
                            color: theme.withAlpha(theme.accentEmerald, 0.1)
                            border.color: theme.accentEmerald

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 10
                                anchors.rightMargin: 10
                                spacing: 8

                                Text { text: "Socket Path:"; color: "#6ee7b7"; font.pixelSize: 10; font.bold: true }
                                TextField {
                                    id: comfySocketField
                                    text: "/tmp/comfyclient.sock"
                                    Layout.fillWidth: true
                                    font.pixelSize: 11
                                    color: theme.textMain
                                    background: Rectangle { color: theme.bgInput; radius: 4 }
                                }
                                Button {
                                    text: "🔌 Connect & Test"
                                    onClicked: bridge.testComfyClientIPC(comfySocketField.text)
                                }
                                Text {
                                    id: comfyStatusText
                                    text: "⚪ Untested"
                                    color: theme.textDim
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                            }
                        }

                        // ComfyClient Info Card
                        Rectangle {
                            Layout.fillWidth: true
                            height: 48
                            radius: theme.radiusSm
                            color: theme.withAlpha(theme.accentBlue, 0.1)
                            border.color: theme.accentCyan

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 10
                                anchors.rightMargin: 10
                                spacing: 8
                                Text { text: "⚡"; font.pixelSize: 18 }
                                Text {
                                    text: "Dedicated ComfyClient Socket: Communicates directly with the ComfyClient JSON-RPC daemon via Unix Domain Socket. Long timeouts (up to 3600s) are fully supported without blocking the UI."
                                    color: "#93c5fd"
                                    font.pixelSize: 10
                                    wrapMode: Text.WordWrap
                                    Layout.fillWidth: true
                                }
                            }
                        }

                        // Prompt Queue Dispatch
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text { text: "Queue & Run Specific Prompt Name:"; color: theme.textMain; font.pixelSize: 11; font.bold: true }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "🔄 Refresh Prompts"
                                    onClicked: bridge.fetchComfyClientPrompts()
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                TextField {
                                    id: promptNameField
                                    placeholderText: "e.g. avatar_01 or prompt name from comfyclient"
                                    text: bridge.card.name ? (bridge.card.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() + "_avatar") : "avatar_01"
                                    Layout.fillWidth: true
                                    font.pixelSize: 11
                                    color: theme.textMain
                                    background: Rectangle { color: theme.bgInput; radius: 4; border.color: theme.borderMain }
                                }

                                Button {
                                    text: "🚀 Queue in ComfyClient"
                                    enabled: !bridge.isBusy && promptNameField.text.trim().length > 0
                                    onClicked: {
                                        bridge.runComfyClientPrompt(promptNameField.text, comfySocketField.text)
                                    }
                                }
                            }
                        }

                        // Batch Action Buttons
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 10

                            Button {
                                text: "⚡ Dispatch All Offline Prompts via ComfyClient"
                                enabled: !bridge.isBusy
                                onClicked: {
                                    bridge.dispatchComfyBatch(
                                        "",
                                        "",
                                        "",
                                        "",
                                        true
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Connections {
        target: bridge
        function onComfyStatusChanged(ok, msg) {
            comfyStatusText.text = ok ? "🟢 " + msg : "🔴 " + msg
            comfyStatusText.color = ok ? "#34d399" : "#f87171"
        }
        function onComfyClientStatusChanged(ok, msg) {
            comfyStatusText.text = ok ? "🟢 " + msg : "🔴 " + msg
            comfyStatusText.color = ok ? "#34d399" : "#f87171"
        }
        function onComfyClientPromptsReady(prompts) {
            if (prompts && prompts.length > 0) {
                promptNameField.text = prompts[0]
            }
        }
        function onComfyAnalysisReady(analysis) {
        }
    }

    FileDialog {
        id: exportComfyBatchDialog
        title: "Export ComfyUI Batch Payload as JSON"
        fileMode: FileDialog.SaveFile
        nameFilters: ["JSON Files (*.json)"]
        defaultSuffix: "json"
        onAccepted: bridge.exportComfyBatchJson(workflowField.text, posNodeField.text, negNodeField.text, randSeedCheck.checked, selectedFile.toString())
    }

    // Native Save File Dialogs for Export
    FileDialog {
        id: exportJsonDialog
        title: "Export Prompt Queue as JSON (ComfyUI Batch)"
        fileMode: FileDialog.SaveFile
        nameFilters: ["JSON Files (*.json)"]
        defaultSuffix: "json"
        onAccepted: bridge.exportQueue("json", selectedFile.toString())
    }

    FileDialog {
        id: exportTxtDialog
        title: "Export Prompt Queue as Text Sheet"
        fileMode: FileDialog.SaveFile
        nameFilters: ["Text Files (*.txt)"]
        defaultSuffix: "txt"
        onAccepted: bridge.exportQueue("text", selectedFile.toString())
    }

    property string targetQueueItemId: ""
    property string targetQueueItemPurpose: "avatar"

    FileDialog {
        id: attachFileDialog
        title: "Select Generated Image to Attach to Character"
        nameFilters: ["Images (*.png *.jpg *.jpeg *.webp)"]
        onAccepted: {
            bridge.attachImageToQueueItem(targetQueueItemId, selectedFile.toString(), targetQueueItemPurpose)
        }
    }
}
