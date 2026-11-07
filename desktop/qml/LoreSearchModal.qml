import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    anchors.fill: parent
    color: Qt.rgba(0, 0, 0, 0.78)
    z: 210

    Theme { id: theme }

    property var loreData: null

    signal useInSparkRequested(string concept, string loreText)

    function openModal(defaultQuery) {
        root.visible = true
        if (defaultQuery && defaultQuery.trim().length > 0) {
            queryInput.text = defaultQuery.trim()
        } else if (queryInput.text.trim().length === 0 && bridge.card && bridge.card.name && bridge.card.name !== "New Character") {
            queryInput.text = bridge.card.name
        }
        if (bridge.lastLoreResult && bridge.lastLoreResult.query) {
            root.loreData = bridge.lastLoreResult
        }
    }

    Connections {
        target: bridge
        function onLoreSearchFinished(data) {
            root.loreData = data
        }
    }

    // Modal Card
    Rectangle {
        width: Math.min(parent.width - 48, 920)
        height: Math.min(parent.height - 48, 720)
        anchors.centerIn: parent
        color: theme.bgSecondary
        radius: theme.radiusMd
        border.color: theme.accentCyan
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text {
                    text: "🔎"
                    font.pixelSize: 18
                }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Fandom Lore & Canon/Headcanon Researcher"
                        color: theme.accentCyan
                        font.pixelSize: 15
                        font.bold: true
                    }
                    Text {
                        text: "Dual-pass extraction: Official Wiki lore + Community fan headcanons, mindcanons & tropes"
                        color: theme.textMuted
                        font.pixelSize: 11
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
                        font.pixelSize: 15
                        font.bold: true
                    }
                }
            }

            // Search Bar & Controls Card
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: searchControlsCol.implicitHeight + 16
                color: theme.bgCard
                radius: theme.radiusSm
                border.color: theme.borderMain

                ColumnLayout {
                    id: searchControlsCol
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        TextField {
                            id: queryInput
                            Layout.fillWidth: true
                            implicitHeight: 36
                            placeholderText: "Character name & franchise (e.g. 'Malenia Elden Ring lore weapons', 'Si Arknights', 'Astarion Baldur\'s Gate 3')"
                            color: theme.textMain
                            font.pixelSize: 12
                            placeholderTextColor: theme.textDim
                            background: Rectangle {
                                color: theme.bgInput
                                border.color: queryInput.activeFocus ? theme.accentCyan : theme.borderMain
                                radius: theme.radiusSm
                            }
                            onAccepted: {
                                if (queryInput.text.trim().length > 0 && !bridge.isBusy) {
                                    bridge.searchLore(queryInput.text.trim(), chkHeadcanons.checked, providerBox.currentValue)
                                }
                            }
                        }

                        ComboBox {
                            id: providerBox
                            implicitWidth: 170
                            implicitHeight: 36
                            textRole: "text"
                            valueRole: "value"
                            model: [
                                { text: "DuckDuckGo (Free)", value: "duckduckgo" },
                                { text: "Tavily AI Search", value: "tavily" },
                                { text: "Brave Search", value: "brave" },
                                { text: "SearXNG Instance", value: "searxng" }
                            ]
                            background: Rectangle {
                                color: theme.bgInput
                                border.color: theme.borderMain
                                radius: theme.radiusSm
                            }
                            contentItem: Text {
                                text: providerBox.displayText
                                color: theme.textMain
                                font.pixelSize: 11
                                verticalAlignment: Text.AlignVCenter
                                leftPadding: 8
                            }
                        }

                        Button {
                            id: btnSearch
                            implicitWidth: 130
                            implicitHeight: 36
                            enabled: !bridge.isBusy && queryInput.text.trim().length > 0
                            onClicked: {
                                bridge.searchLore(queryInput.text.trim(), chkHeadcanons.checked, providerBox.currentValue)
                            }
                            background: Rectangle {
                                radius: theme.radiusSm
                                gradient: Gradient {
                                    orientation: Gradient.Horizontal
                                    GradientStop { position: 0.0; color: btnSearch.hovered ? "#0891b2" : "#0e7490" }
                                    GradientStop { position: 1.0; color: btnSearch.hovered ? "#2563eb" : "#1d4ed8" }
                                }
                                border.color: theme.accentCyan
                            }
                            contentItem: RowLayout {
                                anchors.centerIn: parent
                                spacing: 6
                                Text {
                                    text: bridge.taskType === "lore_search" ? "⏳" : "🔎"
                                    font.pixelSize: 12
                                }
                                Text {
                                    text: bridge.taskType === "lore_search" ? "Researching..." : "Search Lore"
                                    color: "#ffffff"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 12

                        CheckBox {
                            id: chkHeadcanons
                            checked: true
                            indicator: Rectangle {
                                implicitWidth: 16
                                implicitHeight: 16
                                x: 0
                                y: Math.round((parent.height - height) / 2)
                                radius: 3
                                color: theme.bgInput
                                border.color: chkHeadcanons.checked ? theme.accentCyan : theme.borderMain
                                border.width: 1

                                Text {
                                    anchors.centerIn: parent
                                    text: "✓"
                                    color: theme.accentCyan
                                    font.pixelSize: 11
                                    font.bold: true
                                    visible: chkHeadcanons.checked
                                }
                            }
                            contentItem: Text {
                                text: "Extract Fan Headcanons, Mindcanons & Dynamic Tropes (Dual-Pass Fandom Wiki)"
                                color: theme.textMuted
                                font.pixelSize: 11
                                leftPadding: chkHeadcanons.indicator.width + 8
                                verticalAlignment: Text.AlignVCenter
                            }
                        }

                        Item { Layout.fillWidth: true }

                        // Active Lore Status Indicator
                        Rectangle {
                            visible: bridge.activeLore.length > 0
                            implicitWidth: activeLoreText.implicitWidth + 14
                            implicitHeight: 22
                            radius: 11
                            color: theme.withAlpha(theme.accentEmerald, 0.2)
                            border.color: theme.accentEmerald
                            border.width: 1
                            Text {
                                id: activeLoreText
                                anchors.centerIn: parent
                                text: "✓ Lore Active (" + bridge.activeLore.length + "c)"
                                color: "#6ee7b7"
                                font.pixelSize: 10
                                font.bold: true
                            }
                        }

                        Button {
                            visible: bridge.activeLore.length > 0
                            text: "✕ Clear Active"
                            implicitHeight: 22
                            onClicked: bridge.clearActiveLore()
                            background: Rectangle {
                                radius: 4
                                color: parent.hovered ? theme.bgHover : "transparent"
                            }
                            contentItem: Text {
                                text: parent.text
                                color: theme.textDim
                                font.pixelSize: 10
                            }
                        }
                    }
                }
            }

            // Results Content
            Item {
                Layout.fillWidth: true
                Layout.fillHeight: true

                // Searching Spinner / Message
                ColumnLayout {
                    anchors.centerIn: parent
                    visible: bridge.taskType === "lore_search"
                    spacing: 12

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "🌐"
                        font.pixelSize: 36
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Querying wikis, fandom databases & community discussions..."
                        color: theme.accentCyan
                        font.pixelSize: 13
                        font.bold: true
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Extracting official background lore and analyzing popular fan headcanons..."
                        color: theme.textDim
                        font.pixelSize: 11
                    }
                }

                // Empty State
                ColumnLayout {
                    anchors.centerIn: parent
                    visible: !root.loreData && bridge.taskType !== "lore_search"
                    spacing: 10

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "📚"
                        font.pixelSize: 36
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Search Any Character or Franchise Lore"
                        color: theme.textMain
                        font.pixelSize: 14
                        font.bold: true
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Type a character name above (e.g. 'Malenia Elden Ring', 'Kafka Honkai Star Rail', 'Astarion') to retrieve\ncanonical wiki background, signature gear, faction stakes, and fan-favorite relationship dynamics."
                        color: theme.textMuted
                        font.pixelSize: 11
                        horizontalAlignment: Text.AlignHCenter
                    }
                }

                // Split Dual View
                RowLayout {
                    anchors.fill: parent
                    visible: root.loreData && bridge.taskType !== "lore_search"
                    spacing: 12

                    // Left Column: Canon Lore
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        color: theme.bgCard
                        radius: theme.radiusSm
                        border.color: theme.borderMain

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "📚 Canon Lore & Wiki Background"
                                    color: theme.accentCyan
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "📋 Copy"
                                    implicitHeight: 22
                                    onClicked: {
                                        bridge.copyToClipboard((root.loreData && root.loreData.canonLore) || "")
                                    }
                                    background: Rectangle {
                                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                                        radius: 4
                                        border.color: theme.borderSubtle
                                    }
                                    contentItem: Text {
                                        text: parent.text
                                        color: theme.textMuted
                                        font.pixelSize: 10
                                    }
                                }
                            }

                            ScrollView {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                clip: true

                                TextArea {
                                    id: canonTextArea
                                    readOnly: true
                                    wrapMode: TextEdit.Wrap
                                    font.pixelSize: 11
                                    color: theme.textMain
                                    text: (root.loreData && root.loreData.canonLore) || "No canon wiki lore found for this query."
                                    background: Rectangle { color: "transparent" }
                                }
                            }
                        }
                    }

                    // Right Column: Fan Headcanons & Tropes
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        color: theme.bgCard
                        radius: theme.radiusSm
                        border.color: theme.withAlpha(theme.accentPink, 0.4)

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 6

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "✨ Fan Headcanons & Community Tropes"
                                    color: "#f472b6"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "📋 Copy"
                                    implicitHeight: 22
                                    onClicked: {
                                        bridge.copyToClipboard((root.loreData && root.loreData.fanHeadcanons) || "")
                                    }
                                    background: Rectangle {
                                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                                        radius: 4
                                        border.color: theme.borderSubtle
                                    }
                                    contentItem: Text {
                                        text: parent.text
                                        color: theme.textMuted
                                        font.pixelSize: 10
                                    }
                                }
                            }

                            ScrollView {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                clip: true

                                TextArea {
                                    id: headcanonTextArea
                                    readOnly: true
                                    wrapMode: TextEdit.Wrap
                                    font.pixelSize: 11
                                    color: theme.textMain
                                    text: (root.loreData && root.loreData.fanHeadcanons) || "No fan headcanons or tropes found for this query."
                                    background: Rectangle { color: "transparent" }
                                }
                            }
                        }
                    }
                }
            }

            // Bottom Actions Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text {
                    visible: root.loreData && root.loreData.results
                    text: "Found " + (root.loreData && root.loreData.results ? root.loreData.results.length : 0) + " wiki & fandom sources"
                    color: theme.textDim
                    font.pixelSize: 11
                }

                Item { Layout.fillWidth: true }

                // Inject into Character Bible
                Button {
                    text: "📚 Inject into Character Bible"
                    enabled: root.loreData && (root.loreData.canonLore || root.loreData.fanHeadcanons)
                    onClicked: {
                        bridge.injectLoreToCharacterBible(
                            (root.loreData && root.loreData.canonLore) || "",
                            (root.loreData && root.loreData.fanHeadcanons) || "",
                            bridge.card.name || queryInput.text
                        )
                    }
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.withAlpha(theme.accentIndigo, 0.35) : theme.withAlpha(theme.accentIndigo, 0.2)
                        border.color: theme.accentIndigo
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#c7d2fe"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }

                // Use in Concept Spark
                Button {
                    text: "🔮 Use in Concept Spark"
                    enabled: root.loreData && (root.loreData.condensedLore || root.loreData.canonLore)
                    onClicked: {
                        var combined = (root.loreData && root.loreData.condensedLore) || ""
                        if (!combined && root.loreData) {
                            var p = []
                            if (root.loreData.canonLore) p.push("=== CANON LORE ===\n" + root.loreData.canonLore)
                            if (root.loreData.fanHeadcanons) p.push("=== FAN HEADCANONS ===\n" + root.loreData.fanHeadcanons)
                            combined = p.join("\n\n")
                        }
                        bridge.setActiveLore(combined)
                        root.useInSparkRequested(queryInput.text.trim(), combined)
                        root.visible = false
                    }
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.withAlpha(theme.accentPurple, 0.35) : theme.withAlpha(theme.accentPurple, 0.2)
                        border.color: theme.accentPurple
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#e9d5ff"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }

                // Copy Combined Lore
                Button {
                    text: "📋 Copy Combined"
                    enabled: root.loreData && (root.loreData.condensedLore || root.loreData.canonLore)
                    onClicked: {
                        var combined = (root.loreData && root.loreData.condensedLore) || ""
                        if (!combined && root.loreData) {
                            var p = []
                            if (root.loreData.canonLore) p.push("=== CANON LORE ===\n" + root.loreData.canonLore)
                            if (root.loreData.fanHeadcanons) p.push("=== FAN HEADCANONS ===\n" + root.loreData.fanHeadcanons)
                            combined = p.join("\n\n")
                        }
                        bridge.copyToClipboard(combined)
                    }
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMuted
                        font.pixelSize: 11
                    }
                }

                Button {
                    text: "Done"
                    onClicked: root.visible = false
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                        border.color: theme.borderMain
                    }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMain
                        font.pixelSize: 11
                    }
                }
            }
        }
    }
}
