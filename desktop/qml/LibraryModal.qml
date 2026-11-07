import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    color: Qt.rgba(0, 0, 0, 0.75)
    z: 220

    Theme { id: theme }

    function openLibrary() {
        bridge.refreshLibrary()
        filterInput.text = ""
        visible = true
    }

    Rectangle {
        id: box
        width: Math.min(740, parent.width - 40)
        height: Math.min(620, parent.height - 40)
        anchors.centerIn: parent
        color: theme.bgSecondary
        radius: theme.radiusMd
        border.color: theme.borderMain
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Text { text: "📚"; font.pixelSize: 18 }
                Text {
                    text: "Character Card Library"
                    color: theme.accentCyan
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
                        font.pixelSize: 14
                        font.bold: true
                    }
                }
            }

            // Search Filter
            TextField {
                id: filterInput
                Layout.fillWidth: true
                placeholderText: "Search saved cards by name or tag..."
                font.pixelSize: 12
                color: theme.textMain
                placeholderTextColor: theme.textDim
                background: Rectangle {
                    color: theme.bgInput
                    border.color: filterInput.activeFocus ? theme.accentCyan : theme.borderMain
                    radius: theme.radiusSm
                }
            }

            // List View
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: box.width - 40
                    spacing: 8

                    Text {
                        visible: bridge.library.length === 0
                        text: "No cards saved in your library yet. Save cards from the editor or forge new ones!"
                        color: theme.textDim
                        font.pixelSize: 12
                    }

                    Repeater {
                        model: {
                            var q = filterInput.text.toLowerCase().trim()
                            if (!q) return bridge.library
                            return bridge.library.filter(function(c) {
                                var name = c.name || (c.character && c.character.name) || ""
                                var tags = c.tags || (c.character && c.character.tags) || []
                                var tagStr = Array.isArray(tags) ? tags.join(" ") : String(tags)
                                return name.toLowerCase().indexOf(q) >= 0 || tagStr.toLowerCase().indexOf(q) >= 0
                            })
                        }
                        delegate: Rectangle {
                            id: cardItem
                            required property var modelData

                            property var cardTags: cardItem.modelData.tags || (cardItem.modelData.character && cardItem.modelData.character.tags) || []
                            property string cardName: cardItem.modelData.name || (cardItem.modelData.character && cardItem.modelData.character.name) || "Untitled Card"
                            property bool isActive: bridge.activeCardId === cardItem.modelData.id

                            Layout.fillWidth: true
                            implicitHeight: itemLayout.implicitHeight + 16
                            color: cardItem.isActive ? theme.withAlpha(theme.accentBlue, 0.15) : theme.bgCard
                            radius: theme.radiusSm
                            border.color: cardItem.isActive ? theme.accentBlue : theme.borderMain
                            border.width: 1

                            RowLayout {
                                id: itemLayout
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 12

                                // Avatar Thumbnail
                                Rectangle {
                                    width: 48
                                    height: 48
                                    radius: theme.radiusSm
                                    color: theme.bgInput
                                    border.color: theme.borderMain
                                    border.width: 1
                                    clip: true

                                    Image {
                                        id: libAvatarImg
                                        anchors.fill: parent
                                        source: cardItem.modelData.hasAvatar ? ("image://avatar/card_" + cardItem.modelData.id) : ""
                                        fillMode: Image.PreserveAspectCrop
                                        visible: cardItem.modelData.hasAvatar
                                    }

                                    Text {
                                        anchors.centerIn: parent
                                        text: "👤"
                                        font.pixelSize: 22
                                        visible: !cardItem.modelData.hasAvatar
                                    }
                                }

                                // Info Column
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4

                                    RowLayout {
                                        spacing: 8
                                        Text {
                                            text: cardItem.cardName
                                            color: theme.textMain
                                            font.pixelSize: 13
                                            font.bold: true
                                        }
                                        Text {
                                            visible: cardItem.isActive
                                            text: "● ACTIVE IN EDITOR"
                                            color: theme.accentEmerald
                                            font.pixelSize: 9
                                            font.bold: true
                                        }
                                        Item { Layout.fillWidth: true }
                                        Text {
                                            visible: cardItem.modelData.tokenCount && cardItem.modelData.tokenCount > 0
                                            text: cardItem.modelData.tokenCount + " tokens"
                                            color: theme.textDim
                                            font.pixelSize: 10
                                        }
                                    }

                                    Text {
                                        text: "Tags: " + (Array.isArray(cardItem.cardTags) && cardItem.cardTags.length > 0 ? cardItem.cardTags.join(", ") : "None")
                                        color: theme.textMuted
                                        font.pixelSize: 11
                                        elide: Text.ElideRight
                                        Layout.fillWidth: true
                                    }
                                }

                                // Actions
                                RowLayout {
                                    spacing: 6

                                    Button {
                                        text: "Load"
                                        onClicked: {
                                            bridge.loadCard(cardItem.modelData.id)
                                            root.visible = false
                                        }
                                        background: Rectangle {
                                            radius: theme.radiusSm
                                            color: parent.hovered ? "#2563eb" : "#1d4ed8"
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

                                    Button {
                                        text: "📋 Copy"
                                        onClicked: bridge.duplicateCard(cardItem.modelData.id)
                                        background: Rectangle {
                                            radius: theme.radiusSm
                                            color: parent.hovered ? theme.bgHover : theme.bgTertiary
                                            border.color: theme.borderMain
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            color: theme.textMuted
                                            font.pixelSize: 10
                                        }
                                    }

                                    Button {
                                        text: "🗑️"
                                        onClicked: bridge.deleteCard(cardItem.modelData.id)
                                        background: Rectangle {
                                            radius: theme.radiusSm
                                            color: parent.hovered ? theme.withAlpha(theme.accentRed, 0.25) : theme.bgTertiary
                                            border.color: theme.borderMain
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            font.pixelSize: 11
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Footer
            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: bridge.library.length + " characters in library"
                    color: theme.textDim
                    font.pixelSize: 11
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "Close"
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
                    }
                }
            }
        }
    }
}
