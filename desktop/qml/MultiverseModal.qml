import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    anchors.fill: parent
    color: Qt.rgba(0, 0, 0, 0.75)
    z: 200

    Theme { id: theme }

    property string selectedUniverseId: "modern_slice_of_life"
    property var universes: []

    function openMultiverse() {
        root.visible = true
        if (root.universes.length === 0) {
            bridge.fetchMultiverseUniverses()
        }
    }

    Connections {
        target: bridge
        function onMultiverseUniversesReady(list) {
            root.universes = list
        }
        function onMultiverseForkFinished(res) {
            root.visible = false
        }
    }

    // Modal Box
    Rectangle {
        width: Math.min(parent.width - 40, 840)
        height: Math.min(parent.height - 40, 680)
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
                Text {
                    text: "🌌 Multiverse & Alternate Universe (AU) Forker"
                    color: theme.accentCyan
                    font.pixelSize: 15
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    onClicked: root.visible = false
                    background: Rectangle { color: "transparent" }
                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 14 }
                }
            }

            Text {
                Layout.fillWidth: true
                text: "Fork '" + (bridge.card.name || "Character") + "' into a parallel reality. The engine preserves their internal psychometric core (central contradiction, reaction gradient, and vocal cadence) while completely re-clothing them, rebuilding their formative backstory [ARC], and writing a fresh Turn-0 opening."
                color: theme.textMuted
                font.pixelSize: 11
                wrapMode: Text.Wrap
            }

            // Scrollable Universe Grid
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: parent.width - 16
                    spacing: 8

                    Repeater {
                        model: root.universes.length > 0 ? root.universes : [
                            { id: "modern_slice_of_life", icon: "☕", label: "Modern Slice of Life & Domestic", shortDesc: "Corporate desks, rain-slicked city streets, shared apartments, quiet late-night cafes." },
                            { id: "cyberpunk_dystopia", icon: "⚡", label: "Cyberpunk & High-Tech Underworld", shortDesc: "Megacorp towers, neon haze, chrome augments, black-market neural ware, tactical rain." },
                            { id: "dark_fantasy_medieval", icon: "⚔️", label: "Dark Fantasy & Grimdark Feudal", shortDesc: "Crumbling keeps, feudal bloodlines, forbidden sorcery, ironclad armor, mud & blood." },
                            { id: "sci_fi_space_opera", icon: "🚀", label: "Sci-Fi Voidfarers & Deep Space", shortDesc: "Orbital stations, warp drives, planetary colonies, syndicate jumpgates, vacuum isolation." },
                            { id: "supernatural_noir", icon: "🕵️", label: "1940s Supernatural & Occult Noir", shortDesc: "Smoke-filled jazz clubs, rain-washed trench coats, covert vampires, speakeasy secrets." },
                            { id: "role_reversal_subversion", icon: "🔄", label: "Role & Power Inversion (Flipped Dynamic)", shortDesc: "Subvert the dynamic: captor becomes captive, master becomes servant, haughty becomes needy." },
                            { id: "custom", icon: "🌌", label: "Custom Universe / Specific AU", shortDesc: "Author your own specific universe, timeline branch, or milestone crossover." }
                        ]

                        delegate: Rectangle {
                            id: uCard
                            required property var modelData
                            Layout.fillWidth: true
                            implicitHeight: uLayout.implicitHeight + 16
                            radius: theme.radiusSm
                            color: root.selectedUniverseId === modelData.id ? theme.withAlpha(theme.accentCyan, 0.15) : (uArea.containsMouse ? theme.withAlpha(theme.accentCyan, 0.06) : theme.bgCard)
                            border.color: root.selectedUniverseId === modelData.id ? theme.accentCyan : theme.borderMain
                            border.width: root.selectedUniverseId === modelData.id ? 1.5 : 1

                            RowLayout {
                                id: uLayout
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 12

                                Text {
                                    text: uCard.modelData.icon || "🌌"
                                    font.pixelSize: 22
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 3
                                    Text {
                                        text: uCard.modelData.label
                                        color: root.selectedUniverseId === uCard.modelData.id ? "#ffffff" : theme.textMain
                                        font.pixelSize: 12
                                        font.bold: true
                                    }
                                    Text {
                                        Layout.fillWidth: true
                                        text: uCard.modelData.shortDesc
                                        color: theme.textMuted
                                        font.pixelSize: 11
                                        wrapMode: Text.Wrap
                                    }
                                }

                                Rectangle {
                                    width: 16
                                    height: 16
                                    radius: 8
                                    color: root.selectedUniverseId === uCard.modelData.id ? theme.accentCyan : "transparent"
                                    border.color: root.selectedUniverseId === uCard.modelData.id ? theme.accentCyan : theme.textDim
                                    border.width: 1.5
                                    Text {
                                        visible: root.selectedUniverseId === uCard.modelData.id
                                        anchors.centerIn: parent
                                        text: "✓"
                                        color: "#0b0f17"
                                        font.pixelSize: 10
                                        font.bold: true
                                    }
                                }
                            }

                            MouseArea {
                                id: uArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.selectedUniverseId = uCard.modelData.id
                            }
                        }
                    }
                }
            }

            // Custom Nuance Steering
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Text {
                    text: root.selectedUniverseId === "custom" ? "Custom AU Directive (Required):" : "Optional Steering Nuances for this AU:"
                    color: root.selectedUniverseId === "custom" ? theme.accentCyan : theme.textMuted
                    font.pixelSize: 11
                    font.bold: true
                }

                TextField {
                    id: customPromptInput
                    Layout.fillWidth: true
                    placeholderText: root.selectedUniverseId === "custom"
                        ? "Describe the target universe, setting, role, or dynamic..."
                        : "e.g. Set during a snowstorm at an isolated research base; {{char}} is the chief medical officer."
                    font.pixelSize: 11
                    color: theme.textMain
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: customPromptInput.activeFocus ? theme.accentCyan : theme.borderMain
                        radius: theme.radiusSm
                    }
                }
            }

            // Footer Buttons
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Button {
                    text: "Cancel"
                    onClicked: root.visible = false
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: theme.bgTertiary
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
                    id: btnFork
                    text: "⚡ Fork Card into AU"
                    enabled: !bridge.isBusy
                    onClicked: {
                        bridge.forkMultiverse(root.selectedUniverseId, customPromptInput.text)
                    }
                    background: Rectangle {
                        radius: theme.radiusSm
                        color: btnFork.hovered ? "#0891b2" : "#06b6d4"
                    }
                    contentItem: RowLayout {
                        spacing: 6
                        Text { text: "🌌"; font.pixelSize: 12 }
                        Text {
                            text: bridge.isBusy && bridge.taskType === "multiverse_fork" ? "Forking Universe..." : "Fork Card into AU"
                            color: "#0b0f17"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }
                }
            }
        }
    }
}
