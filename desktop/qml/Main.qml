import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5
import QtQuick.Dialogs 6.5

ApplicationWindow {
    id: window
    visible: true
    width: 1280
    height: 840
    minimumWidth: 980
    minimumHeight: 640
    title: "CharGen Harness - Native Studio (SillyTavern CCv2 & CCv3 Spec)"
    color: theme.bgPrimary

    Theme { id: theme }

    property int currentToolTab: 0

    function openTool(tabIndex) {
        openToolTab(tabIndex, "")
    }

    function openToolTab(tabIndex, param = "") {
        currentToolTab = tabIndex
        if (tabIndex === 1 && param) {
            agentView.sendPresetInstruction(param)
        } else if (tabIndex === 4) {
            multiverseView.refresh()
        } else if (tabIndex === 5) {
            householdView.refresh()
        } else if (tabIndex === 6) {
            cardAuditView.refresh()
        } else if (tabIndex === 7 && param) {
            loreSearchView.setQueryAndSearch(param || "")
        } else if (tabIndex === 8 && param) {
            loreCompanionView.setLoreText(param || "")
        }
    }

    // Toast Notification Banner
    Rectangle {
        id: toastBanner
        z: 999
        anchors.top: parent.top
        anchors.topMargin: 12
        anchors.horizontalCenter: parent.horizontalCenter
        implicitWidth: toastText.implicitWidth + 32
        implicitHeight: 34
        radius: 17
        color: theme.rgba(18, 24, 36, 0.95)
        border.color: theme.accentCyan
        border.width: 1
        opacity: 0.0

        Behavior on opacity { NumberAnimation { duration: 200 } }

        RowLayout {
            anchors.centerIn: parent
            spacing: 8
            Text { text: "🔔"; font.pixelSize: 12 }
            Text {
                id: toastText
                text: ""
                color: "#ffffff"
                font.pixelSize: 11
                font.bold: true
            }
        }

        Timer {
            id: toastTimer
            interval: 3500
            onTriggered: toastBanner.opacity = 0.0
        }

        function show(msg) {
            toastText.text = msg
            toastBanner.opacity = 1.0
            toastTimer.restart()
        }
    }

    Connections {
        target: bridge
        function onNotification(msg) { toastBanner.show(msg) }
        function onErrorOccurred(msg) { toastBanner.show("⚠️ " + msg) }
        function onWeaverQuestionsReady(data) {
            weaverModal.loadInterview(data)
        }
        function onIdeaReceived(concept, archetype, themes, era, eraDataJson) {
            sparkGen.conceptText = concept
            if (themes && themes.length > 0) {
                sparkGen.loadThemes(themes)
            }
            if (era && era.trim() && era.trim().toLowerCase() !== "off") {
                sparkGen.selectedEra = era
                sparkGen.selectedEraName = era
                if (eraDataJson && eraDataJson.trim()) {
                    try {
                        var parsedData = JSON.parse(eraDataJson)
                        if (parsedData && (parsedData.name || parsedData.short_name || parsedData.promptSnippet)) {
                            sparkGen.activeEraData = parsedData
                            if (parsedData.short_name || parsedData.name) {
                                sparkGen.selectedEraName = parsedData.short_name || parsedData.name
                            }
                        }
                    } catch (e) {
                        console.log("Could not parse eraDataJson: " + e)
                    }
                } else if (typeof bridge.getEraInfoJson === "function") {
                    var resolvedJson = bridge.getEraInfoJson(era)
                    if (resolvedJson) {
                        try {
                            var resObj = JSON.parse(resolvedJson)
                            if (resObj && (resObj.era || resObj.promptSnippet)) {
                                var eData = resObj.era || {}
                                eData.promptSnippet = resObj.promptSnippet || ""
                                sparkGen.activeEraData = eData
                                if (eData.short_name || eData.name) {
                                    sparkGen.selectedEraName = eData.short_name || eData.name
                                }
                            }
                        } catch (e2) {}
                    }
                }
            }
            window.openToolTab(0)
        }
    }

    // Main Column Layout
    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Header Navigation Bar
        Header {
            Layout.fillWidth: true
            onOpenSettings: settingsModal.openSettings()
            onOpenLibrary: libraryModal.openLibrary()
            onOpenImageQueue: imageQueueModal.openQueue()
            onTriggerImport: importFileDialog.open()
            onTriggerExport: exportFileDialog.open()
            onTriggerExportCharx: exportCharxFileDialog.open()
            onOpenAgent: window.openToolTab(1)
            onOpenReimagine: window.openToolTab(2)
            onOpenScenarioMatrix: window.openToolTab(3)
            onOpenMultiverse: window.openToolTab(4)
            onOpenHouseholds: window.openToolTab(5)
            onOpenAudit: window.openToolTab(6)
            onOpenLoreSearch: window.openToolTab(7, (bridge.card && bridge.card.name !== "New Character") ? bridge.card.name : "")
        }

        // Central Split View: Left (Workspace Toolbox with Tabs) & Right (Card Editor)
        SplitView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            orientation: Qt.Horizontal
            handle: Rectangle {
                implicitWidth: 4
                color: SplitHandle.pressed ? theme.accentCyan : (SplitHandle.hovered ? theme.accentIndigo : theme.borderMain)
            }

            // Left Side: Workspace Toolbox (Spark & Tool Tabs)
            Rectangle {
                id: leftToolbox
                SplitView.preferredWidth: 460
                SplitView.minimumWidth: 380
                SplitView.maximumWidth: 720
                color: theme.bgSecondary
                border.color: theme.borderMain
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 0

                    // Panel Header: Tools Title + Active Tool Badge
                    Rectangle {
                        Layout.fillWidth: true
                        height: 34
                        color: theme.bgTertiary
                        border.color: theme.borderMain
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 12
                            spacing: 8

                            Text {
                                text: "⚡ WORKSPACE TOOLS"
                                color: theme.textMuted
                                font.pixelSize: 10
                                font.bold: true
                                font.letterSpacing: 0.8
                            }

                            Item { Layout.fillWidth: true }

                            Rectangle {
                                radius: theme.radiusSm
                                color: {
                                    if (window.currentToolTab === 0) return theme.withAlpha(theme.accentCyan, 0.2)
                                    if (window.currentToolTab === 1) return theme.withAlpha(theme.accentPurple, 0.25)
                                    if (window.currentToolTab === 2) return theme.withAlpha(theme.accentPurple, 0.25)
                                    if (window.currentToolTab === 3) return theme.withAlpha(theme.accentAmber, 0.25)
                                    if (window.currentToolTab === 4) return theme.withAlpha(theme.accentBlue, 0.25)
                                    if (window.currentToolTab === 5) return theme.withAlpha(theme.accentPink, 0.25)
                                    if (window.currentToolTab === 6) return theme.withAlpha(theme.accentEmerald, 0.25)
                                    if (window.currentToolTab === 7) return theme.withAlpha(theme.accentCyan, 0.25)
                                    if (window.currentToolTab === 8) return theme.withAlpha(theme.accentGreen, 0.25)
                                    return "transparent"
                                }
                                border.color: {
                                    if (window.currentToolTab === 0) return theme.accentCyan
                                    if (window.currentToolTab === 1) return theme.accentPurple
                                    if (window.currentToolTab === 2) return theme.accentPurple
                                    if (window.currentToolTab === 3) return theme.accentAmber
                                    if (window.currentToolTab === 4) return theme.accentBlue
                                    if (window.currentToolTab === 5) return theme.accentPink
                                    if (window.currentToolTab === 6) return theme.accentEmerald
                                    if (window.currentToolTab === 7) return theme.accentCyan
                                    if (window.currentToolTab === 8) return theme.accentGreen
                                    return "transparent"
                                }
                                border.width: 1
                                implicitWidth: activeToolBadgeText.implicitWidth + 14
                                implicitHeight: 20

                                Text {
                                    id: activeToolBadgeText
                                    anchors.centerIn: parent
                                    text: {
                                        var names = [
                                            "🔮 SPARK GENERATOR",
                                            "🤖 AGENT MODE",
                                            "✨ REIMAGINE",
                                            "🎲 SCENARIO MATRIX",
                                            "🌌 AU FORKER",
                                            "👑 HOUSEHOLDS",
                                            "📊 HEALTH AUDIT",
                                            "🔎 FANDOM LORE",
                                            "📖 LORE COMPANION"
                                        ]
                                        return names[window.currentToolTab] || "TOOLBOX"
                                    }
                                    color: {
                                        if (window.currentToolTab === 0) return theme.accentCyan
                                        if (window.currentToolTab === 1) return "#d8b4fe"
                                        if (window.currentToolTab === 2) return "#d8b4fe"
                                        if (window.currentToolTab === 3) return "#fde68a"
                                        if (window.currentToolTab === 4) return "#7dd3fc"
                                        if (window.currentToolTab === 5) return "#fbcfe8"
                                        if (window.currentToolTab === 6) return "#6ee7b7"
                                        if (window.currentToolTab === 7) return theme.accentCyan
                                        if (window.currentToolTab === 8) return "#6ee7b7"
                                        return "#ffffff"
                                    }
                                    font.pixelSize: 9
                                    font.bold: true
                                }
                            }
                        }
                    }

                    // 2-Row Tab Navigation Bar (Tabs beside Spark)
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: tabsCol.implicitHeight + 10
                        color: theme.bgSecondary
                        border.color: theme.borderMain
                        border.width: 1

                        ColumnLayout {
                            id: tabsCol
                            anchors.fill: parent
                            anchors.margins: 6
                            spacing: 4

                            // Row 1 of Tabs: Spark, Agent, Reimagine
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Tab 0: Spark
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(0)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 0 ? theme.withAlpha(theme.accentCyan, 0.22) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 0 ? theme.accentCyan : theme.borderMain
                                        border.width: window.currentToolTab === 0 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "🔮 Spark"
                                        color: window.currentToolTab === 0 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 0
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }

                                // Tab 1: Agent
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(1)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 1 ? theme.withAlpha(theme.accentPurple, 0.28) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 1 ? theme.accentPurple : theme.borderMain
                                        border.width: window.currentToolTab === 1 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "🤖 Agent"
                                        color: window.currentToolTab === 1 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 1
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }

                                // Tab 2: Reimagine
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(2)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 2 ? theme.withAlpha(theme.accentPurple, 0.28) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 2 ? theme.accentPurple : theme.borderMain
                                        border.width: window.currentToolTab === 2 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "✨ Reimagine"
                                        color: window.currentToolTab === 2 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 2
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }
                            }

                            // Row 2 of Tabs: Matrix, AU Fork, Households
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Tab 3: Matrix
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(3)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 3 ? theme.withAlpha(theme.accentAmber, 0.25) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 3 ? theme.accentAmber : theme.borderMain
                                        border.width: window.currentToolTab === 3 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "🎲 Matrix"
                                        color: window.currentToolTab === 3 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 3
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }

                                // Tab 4: AU Fork
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(4)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 4 ? theme.withAlpha(theme.accentBlue, 0.25) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 4 ? theme.accentBlue : theme.borderMain
                                        border.width: window.currentToolTab === 4 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "🌌 AU Fork"
                                        color: window.currentToolTab === 4 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 4
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }

                                // Tab 5: Households
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(5)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 5 ? theme.withAlpha(theme.accentPink, 0.25) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 5 ? theme.accentPink : theme.borderMain
                                        border.width: window.currentToolTab === 5 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "👑 House"
                                        color: window.currentToolTab === 5 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 5
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }
                            }

                            // Row 3 of Tabs: Audit, Lore, Companion
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                // Tab 6: Audit
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(6)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 6 ? theme.withAlpha(theme.accentEmerald, 0.25) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 6 ? theme.accentEmerald : theme.borderMain
                                        border.width: window.currentToolTab === 6 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "📊 Audit"
                                        color: window.currentToolTab === 6 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 6
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }

                                // Tab 7: Lore
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(7)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 7 ? theme.withAlpha(theme.accentCyan, 0.25) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 7 ? theme.accentCyan : theme.borderMain
                                        border.width: window.currentToolTab === 7 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "🔎 Lore"
                                        color: window.currentToolTab === 7 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 7
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }

                                // Tab 8: Companion
                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    onClicked: window.openToolTab(8)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: window.currentToolTab === 8 ? theme.withAlpha(theme.accentGreen, 0.25) : (parent.hovered ? theme.bgHover : theme.bgCard)
                                        border.color: window.currentToolTab === 8 ? theme.accentGreen : theme.borderMain
                                        border.width: window.currentToolTab === 8 ? 1.5 : 1
                                    }
                                    contentItem: Text {
                                        text: "📖 Companion"
                                        color: window.currentToolTab === 8 ? "#ffffff" : theme.textMuted
                                        font.pixelSize: 11
                                        font.bold: window.currentToolTab === 8
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }
                            }
                        }
                    }

                    // StackLayout Holding the Tool Views
                    StackLayout {
                        id: toolStack
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        currentIndex: window.currentToolTab

                        // 0: Spark
                        SparkGenerator {
                            id: sparkGen
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            onRequestWeaverInterview: (concept, genre, themes, tone, nsfw, botMode, era) => {
                                bridge.fetchWeaverQuestions(
                                    concept,
                                    genre,
                                    themes,
                                    tone,
                                    nsfw,
                                    "",
                                    botMode || sparkGen.botMode || "single",
                                    era || ""
                                )
                            }
                            onOpenLoreSearchRequested: (defaultQ) => {
                                window.openToolTab(7, defaultQ)
                            }
                            onOpenEraPickerRequested: (category) => {
                                eraPickerModal.openModal(category || "All", "", false, sparkGen.selectedEra)
                            }
                        }

                        // 1: Agent Doctor
                        AgentView {
                            id: agentView
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                        }

                        // 2: Reimagine
                        ReimagineView {
                            id: reimagineView
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                        }

                        // 3: Scenario Matrix
                        ScenarioMatrixView {
                            id: scenarioMatrixView
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                        }

                        // 4: Multiverse AU Fork
                        MultiverseView {
                            id: multiverseView
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                        }

                        // 5: Household Binder
                        HouseholdView {
                            id: householdView
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                        }

                        // 6: Health & Psychometric Audit
                        CardAuditView {
                            id: cardAuditView
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            onPrescribeToDoctorRequested: (instruction) => {
                                window.openToolTab(1, instruction)
                            }
                        }

                        // 7: Fandom Lore Researcher
                        LoreSearchView {
                            id: loreSearchView
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            onUseInSparkRequested: (concept, loreText) => {
                                if (!sparkGen.conceptText || sparkGen.conceptText.trim().length === 0) {
                                    sparkGen.conceptText = concept
                                }
                                sparkGen.setLoreQueryAndActive(concept, loreText)
                                window.openToolTab(0)
                                toastBanner.show("✓ Injected lore context into Spark Generator!")
                            }
                        }

                        // 8: Lore Companion
                        LoreCompanionView {
                            id: loreCompanionView
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                        }
                    }
                }
            }

            // Right Side: Multi-Field Card Editor
            Rectangle {
                id: rightEditor
                SplitView.fillWidth: true
                SplitView.minimumWidth: 480
                color: theme.bgPrimary

                CardEditor {
                    id: cardEditor
                    anchors.fill: parent
                    onOpenImagePromptGen: imageQueueModal.openGen()
                    onOpenMultiverseFork: window.openToolTab(4)
                    onOpenHealthAudit: window.openToolTab(6)
                    onOpenLoreSearch: window.openToolTab(7, (bridge.card && bridge.card.name !== "New Character") ? bridge.card.name : "")
                }
            }
        }

        // Bottom Status Bar
        Rectangle {
            Layout.fillWidth: true
            height: 28
            color: theme.bgSecondary
            border.color: theme.borderMain
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 10

                // Connection Dot
                Rectangle {
                    width: 8
                    height: 8
                    radius: 4
                    color: bridge.backendConnected ? theme.accentEmerald : theme.accentRed
                }

                Text {
                    text: bridge.statusText
                    color: theme.textMuted
                    font.pixelSize: 11
                }

                Item { Layout.fillWidth: true }

                Text {
                    text: "SillyTavern V2 & CCv3 Spec Compliant"
                    color: theme.textDim
                    font.pixelSize: 10
                }
            }
        }
    }

    // Native File Dialogs
    FileDialog {
        id: importFileDialog
        title: "Import Character Card (PNG / JSON)"
        nameFilters: ["Character Cards (*.png *.json *.charx)", "All Files (*)"]
        onAccepted: {
            bridge.importCard(selectedFile.toString())
        }
    }

    FileDialog {
        id: exportFileDialog
        title: "Export Character Card as PNG"
        fileMode: FileDialog.SaveFile
        nameFilters: ["PNG Image (*.png)"]
        defaultSuffix: "png"
        currentFile: bridge.card.name ? ("file://" + bridge.card.name.replace(/[^a-zA-Z0-9_-]/g, "_") + ".png") : "file://character.png"
        onAccepted: {
            bridge.exportCardPng(selectedFile.toString())
        }
    }

    FileDialog {
        id: exportCharxFileDialog
        title: "Export Character Card as .charx Container"
        fileMode: FileDialog.SaveFile
        nameFilters: ["CharX Container (*.charx)"]
        defaultSuffix: "charx"
        currentFile: bridge.card.name ? ("file://" + bridge.card.name.replace(/[^a-zA-Z0-9_-]/g, "_") + ".charx") : "file://character.charx"
        onAccepted: {
            bridge.exportCardCharx(selectedFile.toString())
        }
    }

    // Weaver Guided Interview Modal Dialog (Special interactive wizard)
    WeaverModal {
        id: weaverModal
        anchors.fill: parent
        z: 100
        onRequestReroll: (idx, qid, cat, qText, opts) => {
            toastBanner.show("🎲 Rerolling choices for " + cat + "...")
            bridge.rerollWeaverQuestion(
                idx,
                qid,
                cat,
                qText,
                opts,
                sparkGen.conceptText,
                sparkGen.genreValue,
                sparkGen.toneText,
                sparkGen.nsfwEnabled
            )
        }
        onRequestRerollAll: () => {
            toastBanner.show("🎲 Rerolling all interview questions...")
            bridge.fetchWeaverQuestions(
                sparkGen.conceptText,
                sparkGen.genreValue,
                sparkGen.activeThemes,
                sparkGen.toneText,
                sparkGen.nsfwEnabled,
                "",
                sparkGen.botMode || "single",
                sparkGen.selectedEra !== "off" ? (sparkGen.selectedEraName || sparkGen.selectedEra) : ""
            )
        }
        onRequestAskMore: () => {
            toastBanner.show("➕ Weaver is formulating deepening questions...")
            bridge.fetchWeaverQuestions(
                sparkGen.conceptText,
                sparkGen.genreValue,
                sparkGen.activeThemes,
                sparkGen.toneText,
                sparkGen.nsfwEnabled,
                "",
                sparkGen.botMode || "single",
                sparkGen.selectedEra !== "off" ? (sparkGen.selectedEraName || sparkGen.selectedEra) : "",
                weaverModal.questionsData || []
            )
        }
        onForgeRequested: (answers, includeLorebook) => {
            toastBanner.show("🧠 Weaver is forging character from interview...")
            bridge.forgeWeaverCard(
                sparkGen.conceptText,
                sparkGen.genreValue,
                sparkGen.activeThemes,
                sparkGen.toneText,
                sparkGen.formatValue,
                sparkGen.nsfwEnabled,
                answers,
                "",
                includeLorebook || false,
                sparkGen.botMode || "single",
                sparkGen.selectedEra !== "off" ? (sparkGen.selectedEraName || sparkGen.selectedEra) : ""
            )
        }
    }

    // Provider / Settings Modal
    SettingsModal {
        id: settingsModal
        anchors.fill: parent
        z: 90
    }

    // Library Modal
    LibraryModal {
        id: libraryModal
        anchors.fill: parent
        z: 80
    }

    // Image Prompt Generator & Offline Queue Modal
    ImageQueueModal {
        id: imageQueueModal
        anchors.fill: parent
        z: 85
    }

    // Historical & Fantasy Era Discovery Modal
    EraPickerModal {
        id: eraPickerModal
        onEraSelected: function(eraId, eraData) {
            sparkGen.selectedEra = eraId;
            sparkGen.selectedEraName = (eraData && (eraData.short_name || eraData.name)) ? (eraData.short_name || eraData.name) : eraId;
            sparkGen.activeEraData = eraData || null;
            toastBanner.show("🏛️ Era selected: " + sparkGen.selectedEraName);
        }
    }

    // Backward-Compatibility Alias Objects (Redirect modal opens to workspace tabs)
    QtObject {
        id: multiverseModal
        function openMultiverse() { window.openToolTab(4) }
    }

    QtObject {
        id: cardAuditModal
        function openAudit() { window.openToolTab(6) }
    }

    QtObject {
        id: loreSearchModal
        function openModal(defaultQ) { window.openToolTab(7, defaultQ || "") }
    }

    QtObject {
        id: scenarioMatrixModal
        function openModal() { window.openToolTab(3) }
    }

    QtObject {
        id: householdModal
        function openModal() { window.openToolTab(5) }
    }

    QtObject {
        id: agentModal
        function openModal() { window.openToolTab(1) }
    }

    QtObject {
        id: reimagineModal
        function openModal() { window.openToolTab(2) }
    }

    // Spine Synthesis Modal
    SynthesizeSpineModal {
        id: synthesizeSpineModal
        anchors.fill: parent
        z: 85
        onSynthesizeRequested: function(params) {
            bridge.synthesizeSpine(params)
        }
    }
}
