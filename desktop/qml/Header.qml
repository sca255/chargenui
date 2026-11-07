import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    height: 56
    color: theme.bgSecondary
    border.color: theme.borderMain
    border.width: 1

    signal openSettings()
    signal openLibrary()
    signal openImageQueue()
    signal triggerImport()
    signal triggerExport()
    signal triggerExportCharx()
    signal openMultiverse()
    signal openAudit()
    signal openLoreSearch()
    signal openAgent()
    signal openReimagine()
    signal openScenarioMatrix()
    signal openHouseholds()

    Theme { id: theme }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 16
        spacing: 12

        // Brand & Badge
        Rectangle {
            width: 88
            height: 24
            radius: theme.radiusSm
            gradient: Gradient {
                orientation: Gradient.Horizontal
                GradientStop { position: 0.0; color: theme.accentCyan }
                GradientStop { position: 1.0; color: theme.accentIndigo }
            }
            Text {
                anchors.centerIn: parent
                text: "UNCENSORED"
                color: "#ffffff"
                font.pixelSize: 10
                font.bold: true
                font.letterSpacing: 1
            }
        }

        Text {
            text: "CHARGEN HARNESS"
            color: theme.textMain
            font.pixelSize: 14
            font.bold: true
            font.letterSpacing: 0.5
        }

        Text {
            text: "/ Desktop Native"
            color: theme.textDim
            font.pixelSize: 11
        }

        // Active Card Pill
        Rectangle {
            Layout.leftMargin: 12
            height: 26
            radius: theme.radiusSm
            color: bridge.activeCardId ? theme.withAlpha(theme.accentEmerald, 0.15) : theme.withAlpha(theme.accentBlue, 0.15)
            border.color: bridge.activeCardId ? theme.accentEmerald : theme.accentBlue
            border.width: 1
            implicitWidth: activeCardText.implicitWidth + 16

            Text {
                id: activeCardText
                anchors.centerIn: parent
                text: (bridge.activeCardId ? "📁 " : "✨ ") + (bridge.card.name || "Untitled")
                color: bridge.activeCardId ? theme.accentEmerald : theme.accentCyan
                font.pixelSize: 11
                font.bold: true
                elide: Text.ElideRight
            }
        }

        Item { Layout.fillWidth: true } // Spacer

        // Quick Actions
        Button {
            text: "📄 Blank"
            onClicked: bridge.newBlankCard()
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

        Button {
            text: "💾 Save"
            onClicked: bridge.saveCard(false)
            background: Rectangle {
                radius: theme.radiusSm
                color: parent.hovered ? theme.withAlpha(theme.accentBlue, 0.3) : theme.withAlpha(theme.accentBlue, 0.15)
                border.color: theme.accentBlue
            }
            contentItem: Text {
                text: parent.text
                color: theme.accentCyan
                font.pixelSize: 11
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        Button {
            text: "📥 Import"
            onClicked: root.triggerImport()
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

        Button {
            text: "📤 PNG"
            onClicked: root.triggerExport()
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

        Button {
            text: "📦 CharX"
            onClicked: root.triggerExportCharx()
            background: Rectangle {
                radius: theme.radiusSm
                color: parent.hovered ? theme.withAlpha(theme.accentEmerald, 0.25) : theme.bgTertiary
                border.color: theme.borderMain
            }
            contentItem: Text {
                text: parent.text
                color: "#6ee7b7"
                font.pixelSize: 11
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        Item { Layout.fillWidth: true } // Spacer

        // Library Pill
        Button {
            id: btnLib
            onClicked: root.openLibrary()
            background: Rectangle {
                radius: theme.radiusSm
                color: parent.hovered ? theme.withAlpha(theme.accentIndigo, 0.3) : theme.withAlpha(theme.accentIndigo, 0.15)
                border.color: theme.accentIndigo
            }
            contentItem: RowLayout {
                spacing: 6
                Text {
                    text: "📚 Library"
                    color: "#c7d2fe"
                    font.pixelSize: 11
                    font.bold: true
                }
                Rectangle {
                    radius: 8
                    color: theme.withAlpha(theme.accentIndigo, 0.4)
                    implicitWidth: countText.implicitWidth + 8
                    implicitHeight: 16
                    Text {
                        id: countText
                        anchors.centerIn: parent
                        text: bridge.library.length.toString()
                        color: "#ffffff"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }
        }

        // Image Queue Pill
        Button {
            id: btnImageQueue
            onClicked: root.openImageQueue()
            background: Rectangle {
                radius: theme.radiusSm
                color: parent.hovered ? theme.withAlpha(theme.accentPurple, 0.3) : theme.withAlpha(theme.accentPurple, 0.15)
                border.color: theme.accentPurple
            }
            contentItem: RowLayout {
                spacing: 6
                Text {
                    text: "🖼️ Image Queue"
                    color: "#e9d5ff"
                    font.pixelSize: 11
                    font.bold: true
                }
                Rectangle {
                    radius: 8
                    color: theme.withAlpha(theme.accentPurple, 0.5)
                    implicitWidth: qCountText.implicitWidth + 8
                    implicitHeight: 16
                    Text {
                        id: qCountText
                        anchors.centerIn: parent
                        text: (bridge.imageQueue ? bridge.imageQueue.length : 0).toString()
                        color: "#ffffff"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }
        }

        // LLM Response Cache Toggle Pill
        Button {
            id: btnLlmCache
            property bool cacheActive: true
            property int cacheCount: 0

            Connections {
                target: bridge
                function onLlmCacheChanged(enabled, count) {
                    btnLlmCache.cacheActive = enabled
                    btnLlmCache.cacheCount = count
                }
            }

            Component.onCompleted: {
                var stats = bridge.getLlmCacheStats()
                if (stats) {
                    btnLlmCache.cacheActive = (stats.enabled !== false)
                    btnLlmCache.cacheCount = stats.totalEntries || 0
                }
            }

            onClicked: {
                bridge.toggleLlmCache(!cacheActive)
            }

            background: Rectangle {
                radius: theme.radiusSm
                color: btnLlmCache.cacheActive ? theme.withAlpha(theme.accentEmerald, 0.15) : theme.withAlpha(theme.textDim, 0.15)
                border.color: btnLlmCache.cacheActive ? theme.accentEmerald : theme.borderMain
            }
            contentItem: RowLayout {
                spacing: 5
                Text {
                    text: btnLlmCache.cacheActive ? "⚡ Cache: ON" : "🚫 Cache: OFF"
                    color: btnLlmCache.cacheActive ? theme.accentEmerald : theme.textDim
                    font.pixelSize: 11
                    font.bold: true
                }
                Rectangle {
                    radius: 8
                    color: btnLlmCache.cacheActive ? theme.withAlpha(theme.accentEmerald, 0.35) : theme.withAlpha(theme.textDim, 0.3)
                    implicitWidth: cacheCountTxt.implicitWidth + 8
                    implicitHeight: 16
                    Text {
                        id: cacheCountTxt
                        anchors.centerIn: parent
                        text: btnLlmCache.cacheCount.toString()
                        color: "#ffffff"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }
            ToolTip.visible: hovered
            ToolTip.text: btnLlmCache.cacheActive
                ? ("⚡ LLM Cache is ACTIVE (" + btnLlmCache.cacheCount + " responses cached). Interrupted runs reuse saved answers instantly!")
                : "🚫 LLM Cache is DISABLED. All prompts will hit the AI API."
            ToolTip.delay: 400
        }

        // Settings / Provider Pill
        Button {
            id: btnSettings
            onClicked: root.openSettings()
            background: Rectangle {
                radius: theme.radiusSm
                color: {
                    var pType = bridge.provider.type || "none"
                    if (pType === "none" && !bridge.provider.apiKey) {
                        return theme.withAlpha(theme.accentRed, 0.15)
                    }
                    return theme.withAlpha(theme.accentEmerald, 0.15)
                }
                border.color: {
                    var pType = bridge.provider.type || "none"
                    if (pType === "none" && !bridge.provider.apiKey) {
                        return theme.accentRed
                    }
                    return theme.accentEmerald
                }
            }
            contentItem: Text {
                text: {
                    var pType = bridge.provider.type || "none"
                    if (pType === "none" && !bridge.provider.apiKey) {
                        return "⚙️ Configure AI"
                    }
                    return "🧠 " + (bridge.provider.model || pType)
                }
                color: {
                    var pType = bridge.provider.type || "none"
                    if (pType === "none" && !bridge.provider.apiKey) {
                        return theme.accentRed
                    }
                    return theme.accentEmerald
                }
                font.pixelSize: 11
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
    }
}
