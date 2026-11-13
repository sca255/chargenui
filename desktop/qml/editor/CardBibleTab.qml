import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    property var theme
    property var bibleEntries: []
    property var stack

    ColumnLayout {
        width: root.stack ? (root.stack.width - 20) : (root.width - 20)
        spacing: 12

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "📖 Character Bible & World-Building Lorebook"
                color: root.theme.accentCyan
                font.pixelSize: 13
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Text {
                text: (root.bibleEntries.length) + " entries embedded"
                color: root.theme.accentEmerald
                font.pixelSize: 11
                font.bold: true
            }
            Button {
                visible: root.bibleEntries.length > 0
                implicitHeight: 24
                text: "🗑️ Clear Lorebook"
                onClicked: bridge.clearCharacterBook()
                background: Rectangle {
                    radius: root.theme.radiusSm
                    color: parent.hovered ? root.theme.rgba(239, 68, 68, 0.25) : root.theme.bgTertiary
                    border.color: root.theme.rgba(239, 68, 68, 0.4)
                }
                contentItem: Text {
                    text: parent.text
                    color: root.theme.accentRed
                    font.pixelSize: 10
                    font.bold: true
                    verticalAlignment: Text.AlignVCenter
                    horizontalAlignment: Text.AlignHCenter
                }
            }
        }

        // World Nodes AI Synthesizer Bar
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: worldNodesBarLayout.implicitHeight + 14
            radius: root.theme.radiusSm
            color: root.theme.bgCard
            border.color: root.theme.withAlpha(root.theme.accentCyan, 0.4)

            ColumnLayout {
                id: worldNodesBarLayout
                anchors.fill: parent
                anchors.margins: 8
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Text {
                        text: "⚡ AI World Nodes Synthesizer:"
                        color: root.theme.accentCyan
                        font.pixelSize: 11
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "Auto-generates lorebook entries with keywords"
                        color: root.theme.textDim
                        font.pixelSize: 10
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    TextField {
                        id: worldNodeContextInput
                        Layout.fillWidth: true
                        placeholderText: "Optional custom focus (e.g. 'Private quarters, the Silver Syndicate, her broken oath')..."
                        font.pixelSize: 11
                        color: root.theme.textMain
                        placeholderTextColor: root.theme.textDim
                        background: Rectangle {
                            color: root.theme.bgInput
                            border.color: worldNodeContextInput.activeFocus ? root.theme.accentCyan : root.theme.borderMain
                            radius: root.theme.radiusSm
                        }
                    }

                    Button {
                        text: "📍 Locations"
                        enabled: !bridge.isBusy
                        onClicked: bridge.generateWorldNodes("locations", worldNodeContextInput.text)
                        background: Rectangle {
                            radius: root.theme.radiusSm
                            color: parent.hovered ? root.theme.withAlpha(root.theme.accentBlue, 0.3) : root.theme.bgTertiary
                            border.color: root.theme.accentBlue
                        }
                        contentItem: Text { text: parent.text; color: "#93c5fd"; font.pixelSize: 10; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }

                    Button {
                        text: "👥 NPCs / Rivals"
                        enabled: !bridge.isBusy
                        onClicked: bridge.generateWorldNodes("npcs_factions", worldNodeContextInput.text)
                        background: Rectangle {
                            radius: root.theme.radiusSm
                            color: parent.hovered ? root.theme.withAlpha(root.theme.accentPurple, 0.3) : root.theme.bgTertiary
                            border.color: root.theme.accentPurple
                        }
                        contentItem: Text { text: parent.text; color: "#d8b4fe"; font.pixelSize: 10; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }

                    Button {
                        text: "🔒 Secrets / Triggers"
                        enabled: !bridge.isBusy
                        onClicked: bridge.generateWorldNodes("secrets_triggers", worldNodeContextInput.text)
                        background: Rectangle {
                            radius: root.theme.radiusSm
                            color: parent.hovered ? root.theme.withAlpha(root.theme.accentPink, 0.3) : root.theme.bgTertiary
                            border.color: root.theme.accentPink
                        }
                        contentItem: Text { text: parent.text; color: "#f472b6"; font.pixelSize: 10; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }

                    Button {
                        text: "⚔️ Relics & Gear"
                        enabled: !bridge.isBusy
                        onClicked: bridge.generateWorldNodes("relics_gear", worldNodeContextInput.text)
                        background: Rectangle {
                            radius: root.theme.radiusSm
                            color: parent.hovered ? root.theme.withAlpha(root.theme.accentAmber, 0.3) : root.theme.bgTertiary
                            border.color: root.theme.accentAmber
                        }
                        contentItem: Text { text: parent.text; color: "#fcd34d"; font.pixelSize: 10; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    }
                }
            }
        }

        // Manual Add Entry Form Row
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: manualEntryLayout.implicitHeight + 12
            radius: root.theme.radiusSm
            color: root.theme.withAlpha(root.theme.bgCard, 0.6)
            border.color: root.theme.borderMain

            RowLayout {
                id: manualEntryLayout
                anchors.fill: parent
                anchors.margins: 8
                spacing: 8

                TextField {
                    id: manualEntryTitle
                    Layout.preferredWidth: 160
                    placeholderText: "Title (e.g. Weapon: Rapier)"
                    font.pixelSize: 11
                    color: root.theme.textMain
                    background: Rectangle { color: root.theme.bgInput; radius: 4; border.color: root.theme.borderMain }
                }

                TextField {
                    id: manualEntryKeys
                    Layout.preferredWidth: 180
                    placeholderText: "Keys (comma separated)"
                    font.pixelSize: 11
                    color: root.theme.textMain
                    background: Rectangle { color: root.theme.bgInput; radius: 4; border.color: root.theme.borderMain }
                }

                TextField {
                    id: manualEntryContent
                    Layout.fillWidth: true
                    placeholderText: "Factual lore content..."
                    font.pixelSize: 11
                    color: root.theme.textMain
                    background: Rectangle { color: root.theme.bgInput; radius: 4; border.color: root.theme.borderMain }
                }

                Button {
                    text: "➕ Add Entry"
                    onClicked: {
                        if (manualEntryTitle.text.trim() || manualEntryContent.text.trim()) {
                            bridge.addBibleEntry(manualEntryTitle.text, manualEntryKeys.text, manualEntryContent.text, "before_char")
                            manualEntryTitle.text = ""
                            manualEntryKeys.text = ""
                            manualEntryContent.text = ""
                        }
                    }
                    background: Rectangle {
                        radius: 4
                        color: root.theme.withAlpha(root.theme.accentEmerald, 0.25)
                        border.color: root.theme.accentEmerald
                    }
                    contentItem: Text { text: parent.text; color: "#a7f3d0"; font.pixelSize: 10; font.bold: true }
                }
            }
        }

        Text {
            visible: root.bibleEntries.length === 0
            text: "No Character Bible entries yet. Use the AI World Nodes synthesizer above or forge a card in Weaver mode!"
            color: root.theme.textDim
            font.pixelSize: 12
        }

        Repeater {
            model: root.bibleEntries
            delegate: Rectangle {
                id: entryCard
                required property var modelData
                required property int index

                Layout.fillWidth: true
                implicitHeight: entryLayout.implicitHeight + 16
                color: root.theme.bgCard
                radius: root.theme.radiusSm
                border.color: root.theme.borderMain

                ColumnLayout {
                    id: entryLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: entryCard.modelData.comment || ("Entry #" + (entryCard.index + 1))
                            color: "#93c5fd"
                            font.pixelSize: 12
                            font.bold: true
                        }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: "Keys: " + (entryCard.modelData.keys || []).join(", ")
                            color: root.theme.textDim
                            font.pixelSize: 10
                        }
                        Button {
                            text: "🗑️"
                            onClicked: {
                                bridge.deleteBibleEntry(entryCard.modelData.id)
                            }
                            background: Rectangle { color: "transparent" }
                            contentItem: Text { text: parent.text; font.pixelSize: 11 }
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: contentText.implicitHeight + 12
                        color: root.theme.bgInput
                        radius: root.theme.radiusSm
                        border.color: root.theme.borderMain

                        Text {
                            id: contentText
                            anchors.fill: parent
                            anchors.margins: 6
                            text: entryCard.modelData.content || ""
                            color: root.theme.textMuted
                            font.pixelSize: 11
                            font.family: "monospace"
                            wrapMode: Text.Wrap
                        }
                    }
                }
            }
        }
    }
}
