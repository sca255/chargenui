import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Item {
    id: root

    Theme { id: theme }

    property var loreData: null
    property string activeLoreSubTab: "canon"

    signal useInSparkRequested(string concept, string loreText)

    function setQueryAndSearch(defaultQuery) {
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

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 10
        spacing: 8

        // Header Title
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text { text: "🔎"; font.pixelSize: 16 }

            ColumnLayout {
                spacing: 1
                Text {
                    text: "Fandom Lore & Canon Researcher"
                    color: theme.accentCyan
                    font.pixelSize: 13
                    font.bold: true
                }
                Text {
                    text: "Dual-pass extraction: Official Wiki lore + Community fan headcanons & tropes"
                    color: theme.textMuted
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.maximumWidth: root.width - 40
                }
            }
        }

        // Search Bar & Controls Card
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: searchControlsCol.implicitHeight + 14
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: theme.borderMain

            ColumnLayout {
                id: searchControlsCol
                anchors.fill: parent
                anchors.margins: 8
                spacing: 6

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    TextField {
                        id: queryInput
                        Layout.fillWidth: true
                        implicitHeight: 32
                        placeholderText: "Character & franchise (e.g. 'Malenia Elden Ring', 'Kafka Honkai')..."
                        color: theme.textMain
                        font.pixelSize: 11
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
                        implicitWidth: 120
                        implicitHeight: 32
                        textRole: "text"
                        valueRole: "value"
                        model: [
                            { text: "DuckDuckGo", value: "duckduckgo" },
                            { text: "Tavily AI", value: "tavily" },
                            { text: "Brave", value: "brave" },
                            { text: "SearXNG", value: "searxng" }
                        ]
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: theme.borderMain
                            radius: theme.radiusSm
                        }
                        contentItem: Text {
                            text: providerBox.displayText
                            color: theme.textMain
                            font.pixelSize: 10
                            verticalAlignment: Text.AlignVCenter
                            leftPadding: 6
                            elide: Text.ElideRight
                        }
                    }

                    Button {
                        id: btnSearch
                        implicitWidth: 80
                        implicitHeight: 32
                        enabled: !bridge.isBusy && queryInput.text.trim().length > 0
                        onClicked: {
                            bridge.searchLore(queryInput.text.trim(), chkHeadcanons.checked, providerBox.currentValue)
                        }
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: btnSearch.hovered ? "#0891b2" : "#0e7490"
                        }
                        contentItem: Text {
                            text: bridge.taskType === "lore_search" ? "Searching" : "🔎 Search"
                            color: "#ffffff"
                            font.pixelSize: 10
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    CheckBox {
                        id: chkHeadcanons
                        checked: true
                        text: "Extract Fan Headcanons & Tropes"
                    }

                    Item { Layout.fillWidth: true }

                    // Active Lore Status Indicator
                    Rectangle {
                        visible: bridge.activeLore.length > 0
                        implicitWidth: activeLoreText.implicitWidth + 10
                        implicitHeight: 20
                        radius: 10
                        color: theme.withAlpha(theme.accentEmerald, 0.2)
                        border.color: theme.accentEmerald
                        Text {
                            id: activeLoreText
                            anchors.centerIn: parent
                            text: "✓ Active (" + bridge.activeLore.length + "c)"
                            color: "#6ee7b7"
                            font.pixelSize: 9
                            font.bold: true
                        }
                    }

                    Button {
                        visible: bridge.activeLore.length > 0
                        text: "✕ Clear"
                        implicitHeight: 20
                        onClicked: bridge.clearActiveLore()
                        background: Rectangle { color: "transparent" }
                        contentItem: Text { text: parent.text; color: theme.textDim; font.pixelSize: 9 }
                    }
                }
            }
        }

        // Sub-Tab Switcher: Canon vs Fan Headcanons
        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            Button {
                text: "📚 Canon Wiki Lore"
                Layout.fillWidth: true
                implicitHeight: 28
                checkable: true
                checked: root.activeLoreSubTab === "canon"
                onClicked: root.activeLoreSubTab = "canon"
                background: Rectangle {
                    radius: theme.radiusSm
                    color: root.activeLoreSubTab === "canon" ? theme.withAlpha(theme.accentCyan, 0.25) : theme.bgCard
                    border.color: root.activeLoreSubTab === "canon" ? theme.accentCyan : theme.borderMain
                }
                contentItem: Text {
                    text: parent.text
                    color: root.activeLoreSubTab === "canon" ? "#ffffff" : theme.textMuted
                    font.pixelSize: 10
                    font.bold: root.activeLoreSubTab === "canon"
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                text: "✨ Fan Headcanons & Tropes"
                Layout.fillWidth: true
                implicitHeight: 28
                checkable: true
                checked: root.activeLoreSubTab === "headcanon"
                onClicked: root.activeLoreSubTab = "headcanon"
                background: Rectangle {
                    radius: theme.radiusSm
                    color: root.activeLoreSubTab === "headcanon" ? theme.withAlpha(theme.accentPink, 0.25) : theme.bgCard
                    border.color: root.activeLoreSubTab === "headcanon" ? theme.accentPink : theme.borderMain
                }
                contentItem: Text {
                    text: parent.text
                    color: root.activeLoreSubTab === "headcanon" ? "#ffffff" : theme.textMuted
                    font.pixelSize: 10
                    font.bold: root.activeLoreSubTab === "headcanon"
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        // Results Content Area
        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: root.activeLoreSubTab === "canon" ? theme.borderMain : theme.withAlpha(theme.accentPink, 0.4)

            ScrollView {
                anchors.fill: parent
                anchors.margins: 8
                clip: true

                TextArea {
                    readOnly: true
                    wrapMode: TextEdit.Wrap
                    font.pixelSize: 11
                    color: theme.textMain
                    text: {
                        if (bridge.taskType === "lore_search") {
                            return "Querying wikis, fandom databases & community discussions..."
                        }
                        if (!root.loreData) {
                            return "Search for any character or franchise lore above to extract wiki lore and headcanons."
                        }
                        if (root.activeLoreSubTab === "canon") {
                            return root.loreData.canonLore || "No canon wiki lore found for this query."
                        } else {
                            return root.loreData.fanHeadcanons || "No fan headcanons or tropes found for this query."
                        }
                    }
                    background: Rectangle { color: "transparent" }
                }
            }
        }

        // Action Buttons Row
        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            Button {
                text: "📚 Bible"
                Layout.fillWidth: true
                implicitHeight: 30
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
                    color: theme.withAlpha(theme.accentIndigo, 0.25)
                    border.color: theme.accentIndigo
                }
                contentItem: Text {
                    text: parent.text
                    color: "#c7d2fe"
                    font.pixelSize: 10
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                text: "🔮 Use in Spark"
                Layout.fillWidth: true
                implicitHeight: 30
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
                }
                background: Rectangle {
                    radius: theme.radiusSm
                    color: theme.withAlpha(theme.accentPurple, 0.25)
                    border.color: theme.accentPurple
                }
                contentItem: Text {
                    text: parent.text
                    color: "#e9d5ff"
                    font.pixelSize: 10
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                text: "📖 Companion"
                Layout.fillWidth: true
                implicitHeight: 30
                enabled: root.loreData && (root.loreData.condensedLore || root.loreData.canonLore)
                onClicked: {
                    var combined = (root.loreData && root.loreData.condensedLore) || ""
                    if (!combined && root.loreData) {
                        var p = []
                        if (root.loreData.canonLore) p.push("=== CANON LORE ===\n" + root.loreData.canonLore)
                        if (root.loreData.fanHeadcanons) p.push("=== FAN HEADCANONS ===\n" + root.loreData.fanHeadcanons)
                        combined = p.join("\n\n")
                    }
                    window.openToolTab(8, combined)
                }
                background: Rectangle {
                    radius: theme.radiusSm
                    color: theme.withAlpha(theme.accentGreen, 0.25)
                    border.color: theme.accentGreen
                }
                contentItem: Text {
                    text: parent.text
                    color: "#a7f3d0"
                    font.pixelSize: 10
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                text: "📋 Copy"
                implicitHeight: 30
                implicitWidth: 60
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
                    font.pixelSize: 10
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }
    }
}
