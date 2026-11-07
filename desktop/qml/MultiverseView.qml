import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    Theme { id: theme }

    property string selectedUniverseId: "modern_slice_of_life"
    property var universes: []

    Component.onCompleted: {
        refresh()
    }

    function refresh() {
        if (root.universes.length === 0) {
            bridge.fetchMultiverseUniverses()
        }
    }

    Connections {
        target: bridge
        function onMultiverseUniversesReady(list) {
            root.universes = list
        }
    }

    ColumnLayout {
        width: root.width - 20
        spacing: 12

        // Header Title
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text { text: "🌌"; font.pixelSize: 16 }

            ColumnLayout {
                spacing: 1
                Text {
                    text: "Multiverse & AU Forker"
                    color: theme.accentCyan
                    font.pixelSize: 13
                    font.bold: true
                }
                Text {
                    text: "Fork '" + (bridge.card.name || "Character") + "' into a parallel reality preserving core psychometrics."
                    color: theme.textMuted
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.maximumWidth: root.width - 40
                }
            }
        }

        // Universe Selection List
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6

            Repeater {
                model: root.universes.length > 0 ? root.universes : [
                    { id: "modern_slice_of_life", icon: "☕", label: "Modern Slice of Life & Domestic", shortDesc: "Corporate desks, rain-slicked city streets, shared apartments, quiet cafes." },
                    { id: "cyberpunk_dystopia", icon: "⚡", label: "Cyberpunk & High-Tech Underworld", shortDesc: "Megacorp towers, neon haze, chrome augments, black-market neural ware." },
                    { id: "dark_fantasy_medieval", icon: "⚔️", label: "Dark Fantasy & Grimdark Feudal", shortDesc: "Crumbling keeps, feudal bloodlines, forbidden sorcery, mud & iron." },
                    { id: "sci_fi_space_opera", icon: "🚀", label: "Sci-Fi Voidfarers & Deep Space", shortDesc: "Orbital stations, warp drives, planetary colonies, vacuum isolation." },
                    { id: "supernatural_noir", icon: "🕵️", label: "1940s Supernatural & Occult Noir", shortDesc: "Smoke-filled jazz clubs, rain-washed trench coats, covert vampires." },
                    { id: "role_reversal_subversion", icon: "🔄", label: "Role & Power Inversion (Flipped Dynamic)", shortDesc: "Subvert the dynamic: captor becomes captive, master becomes servant." },
                    { id: "custom", icon: "🌌", label: "Custom Universe / Specific AU", shortDesc: "Author your own specific universe, timeline branch, or crossover." }
                ]

                delegate: Rectangle {
                    id: uCard
                    required property var modelData
                    Layout.fillWidth: true
                    implicitHeight: uLayout.implicitHeight + 14
                    radius: theme.radiusSm
                    color: root.selectedUniverseId === modelData.id ? theme.withAlpha(theme.accentCyan, 0.16) : (uArea.containsMouse ? theme.withAlpha(theme.accentCyan, 0.06) : theme.bgCard)
                    border.color: root.selectedUniverseId === modelData.id ? theme.accentCyan : theme.borderMain
                    border.width: root.selectedUniverseId === modelData.id ? 1.5 : 1

                    RowLayout {
                        id: uLayout
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 10

                        Text {
                            text: uCard.modelData.icon || "🌌"
                            font.pixelSize: 18
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            Text {
                                text: uCard.modelData.label
                                color: root.selectedUniverseId === uCard.modelData.id ? "#ffffff" : theme.textMain
                                font.pixelSize: 11
                                font.bold: true
                            }
                            Text {
                                Layout.fillWidth: true
                                text: uCard.modelData.shortDesc
                                color: theme.textMuted
                                font.pixelSize: 10
                                wrapMode: Text.Wrap
                            }
                        }

                        Rectangle {
                            width: 14
                            height: 14
                            radius: 7
                            color: root.selectedUniverseId === uCard.modelData.id ? theme.accentCyan : "transparent"
                            border.color: root.selectedUniverseId === uCard.modelData.id ? theme.accentCyan : theme.textDim
                            border.width: 1.5
                            Text {
                                visible: root.selectedUniverseId === uCard.modelData.id
                                anchors.centerIn: parent
                                text: "✓"
                                color: "#0b0f17"
                                font.pixelSize: 9
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

        // Custom Steering Nuances
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            Text {
                text: root.selectedUniverseId === "custom" ? "Custom AU Directive (Required):" : "Optional Steering Nuances for this AU:"
                color: root.selectedUniverseId === "custom" ? theme.accentCyan : theme.textMuted
                font.pixelSize: 10
                font.bold: true
            }

            TextField {
                id: customPromptInput
                Layout.fillWidth: true
                implicitHeight: 34
                placeholderText: root.selectedUniverseId === "custom"
                    ? "Describe target universe, setting, role, or dynamic..."
                    : "e.g. Set during a snowstorm at an isolated research base; {{char}} is chief medic."
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

        // Fork Button
        Button {
            id: btnFork
            Layout.fillWidth: true
            implicitHeight: 38
            enabled: !bridge.isBusy
            onClicked: {
                bridge.forkMultiverse(root.selectedUniverseId, customPromptInput.text)
            }
            background: Rectangle {
                radius: theme.radiusSm
                color: btnFork.hovered ? "#0891b2" : "#06b6d4"
            }
            contentItem: RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "🌌"; font.pixelSize: 13 }
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
