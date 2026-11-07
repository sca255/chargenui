import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Item {
    id: root
    implicitHeight: layout.implicitHeight

    property var selectedThemes: []
    signal themesUpdated(var themes)

    Theme { id: theme }

    function isBdsm(t) {
        return /bdsm|dom|sub|kink|collar|pet|femdom|maledom|brat|sadis|masoch|bondage|erotic|taboo|switch|sensory/i.test(t)
    }

    function toggleTheme(tag) {
        var copy = selectedThemes.slice(0)
        var idx = copy.indexOf(tag)
        if (idx >= 0) {
            copy.splice(idx, 1)
        } else {
            copy.push(tag)
        }
        selectedThemes = copy
        themesUpdated(copy)
    }

    function addCustomTheme(tag) {
        var trimmed = tag.trim()
        if (!trimmed) return
        var copy = selectedThemes.slice(0)
        if (copy.indexOf(trimmed) < 0) {
            copy.push(trimmed)
            selectedThemes = copy
            themesUpdated(copy)
        }
    }

    function removeTheme(tag) {
        var copy = selectedThemes.filter(function(t) { return t !== tag })
        selectedThemes = copy
        themesUpdated(copy)
    }

    function clearThemes() {
        selectedThemes = []
        themesUpdated([])
    }

    ColumnLayout {
        id: layout
        anchors.left: parent.left
        anchors.right: parent.right
        spacing: 8

        // Header & Clear button
        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "Multi-Theme & Trope Picker"
                color: theme.textMuted
                font.pixelSize: 11
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Button {
                visible: root.selectedThemes.length > 0
                text: "Clear All"
                onClicked: root.clearThemes()
                background: Rectangle { color: "transparent" }
                contentItem: Text {
                    text: parent.text
                    color: theme.accentPink
                    font.pixelSize: 10
                    font.underline: true
                }
            }
        }

        // Active Badges Box
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: Math.max(34, pillFlow.implicitHeight + 12)
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: theme.borderMain
            border.width: 1

            Text {
                visible: root.selectedThemes.length === 0
                anchors.left: parent.left
                anchors.leftMargin: 8
                anchors.verticalCenter: parent.verticalCenter
                text: "Click themes below or type custom tropes to tag..."
                color: theme.textDim
                font.pixelSize: 11
            }

            Flow {
                id: pillFlow
                anchors.fill: parent
                anchors.margins: 6
                spacing: 6

                Repeater {
                    model: root.selectedThemes
                    delegate: Rectangle {
                        id: pill
                        required property string modelData
                        implicitWidth: pillRow.implicitWidth + 14
                        implicitHeight: 22
                        radius: 11
                        color: root.isBdsm(modelData) ? theme.withAlpha(theme.accentPink, 0.25) : theme.withAlpha(theme.accentIndigo, 0.25)
                        border.color: root.isBdsm(modelData) ? theme.accentPink : theme.accentIndigo
                        border.width: 1

                        RowLayout {
                            id: pillRow
                            anchors.centerIn: parent
                            spacing: 5
                            Text {
                                text: pill.modelData
                                color: root.isBdsm(pill.modelData) ? "#fce7f3" : "#e2e8f0"
                                font.pixelSize: 11
                                font.bold: true
                            }
                            Text {
                                text: "×"
                                color: theme.textMuted
                                font.pixelSize: 12
                                font.bold: true
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: root.removeTheme(pill.modelData)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Custom write-in box
        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            TextField {
                id: customInput
                Layout.fillWidth: true
                placeholderText: "Type custom trope (e.g. 'Vampire Mistress', 'Stockholm Syndrome')..."
                font.pixelSize: 11
                color: theme.textMain
                placeholderTextColor: theme.textDim
                background: Rectangle {
                    color: theme.bgInput
                    border.color: customInput.activeFocus ? theme.accentPurple : theme.borderMain
                    radius: theme.radiusSm
                }
                onAccepted: {
                    root.addCustomTheme(text)
                    text = ""
                }
            }

            Button {
                text: "+ Add"
                onClicked: {
                    root.addCustomTheme(customInput.text)
                    customInput.text = ""
                }
                background: Rectangle {
                    radius: theme.radiusSm
                    color: parent.hovered ? theme.withAlpha(theme.accentPurple, 0.3) : theme.withAlpha(theme.accentPurple, 0.15)
                    border.color: theme.accentPurple
                }
                contentItem: Text {
                    text: parent.text
                    color: "#e9d5ff"
                    font.pixelSize: 11
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        // Category 1: Mature / BDSM & Power Exchange
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: cat1Layout.implicitHeight + 12
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: theme.borderMain

            ColumnLayout {
                id: cat1Layout
                anchors.fill: parent
                anchors.margins: 6
                spacing: 6

                Text {
                    text: "⛓️ Mature / BDSM & Power Exchange"
                    color: theme.accentPink
                    font.pixelSize: 10
                    font.bold: true
                    font.letterSpacing: 0.5
                }

                Flow {
                    Layout.fillWidth: true
                    spacing: 5
                    Repeater {
                        model: [
                            "BDSM / Power Exchange", "Dominant / Sadistic", "Submissive / Masochistic",
                            "Femdom / Domme", "Maledom / Master", "Switch",
                            "Bondage / Shibari", "Brat / Brat Tamer", "Petplay & Collaring",
                            "Praise & Degradation", "Taboo & Dark Erotica", "Sensory Deprivation"
                        ]
                        delegate: Rectangle {
                            id: chip
                            required property string modelData
                            property bool isSelected: root.selectedThemes.indexOf(modelData) >= 0

                            implicitWidth: chipText.implicitWidth + 14
                            implicitHeight: 22
                            radius: 11
                            color: isSelected ? theme.withAlpha(theme.accentPink, 0.3) : (chipArea.containsMouse ? theme.withAlpha(theme.accentPink, 0.15) : theme.bgTertiary)
                            border.color: isSelected ? theme.accentPink : theme.borderMain
                            border.width: 1

                            Text {
                                id: chipText
                                anchors.centerIn: parent
                                text: chip.modelData
                                color: chip.isSelected ? "#ffffff" : theme.textMuted
                                font.pixelSize: 10
                                font.bold: chip.isSelected
                            }

                            MouseArea {
                                id: chipArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.toggleTheme(chip.modelData)
                            }
                        }
                    }
                }
            }
        }

        // Category 2: Romance & Relational Tropes
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: cat2Layout.implicitHeight + 12
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: theme.borderMain

            ColumnLayout {
                id: cat2Layout
                anchors.fill: parent
                anchors.margins: 6
                spacing: 6

                Text {
                    text: "❤️ Romance & Relational Tropes"
                    color: "#f472b6"
                    font.pixelSize: 10
                    font.bold: true
                    font.letterSpacing: 0.5
                }

                Flow {
                    Layout.fillWidth: true
                    spacing: 5
                    Repeater {
                        model: [
                            "Slow Burn", "Enemies to Lovers", "Dark Romance",
                            "Tsundere", "Kuudere", "Yandere / Obsessive",
                            "Arranged Marriage", "Forced Proximity", "Forbidden Love", "Mutual Yearning"
                        ]
                        delegate: Rectangle {
                            id: chip2
                            required property string modelData
                            property bool isSelected: root.selectedThemes.indexOf(modelData) >= 0

                            implicitWidth: chip2Text.implicitWidth + 14
                            implicitHeight: 22
                            radius: 11
                            color: isSelected ? theme.withAlpha(theme.accentPurple, 0.3) : (chip2Area.containsMouse ? theme.withAlpha(theme.accentPurple, 0.15) : theme.bgTertiary)
                            border.color: isSelected ? theme.accentPurple : theme.borderMain
                            border.width: 1

                            Text {
                                id: chip2Text
                                anchors.centerIn: parent
                                text: chip2.modelData
                                color: chip2.isSelected ? "#ffffff" : theme.textMuted
                                font.pixelSize: 10
                                font.bold: chip2.isSelected
                            }

                            MouseArea {
                                id: chip2Area
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.toggleTheme(chip2.modelData)
                            }
                        }
                    }
                }
            }
        }

        // Category 3: Tone & Psychological Friction
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: cat3Layout.implicitHeight + 12
            color: theme.bgCard
            radius: theme.radiusSm
            border.color: theme.borderMain

            ColumnLayout {
                id: cat3Layout
                anchors.fill: parent
                anchors.margins: 6
                spacing: 6

                Text {
                    text: "🎭 Tone & Atmosphere"
                    color: "#a78bfa"
                    font.pixelSize: 10
                    font.bold: true
                    font.letterSpacing: 0.5
                }

                Flow {
                    Layout.fillWidth: true
                    spacing: 5
                    Repeater {
                        model: [
                            "Psychological Thriller", "Grimdark & Gritty", "Melancholic & Tragic",
                            "Moral Ambiguity", "Wholesome & Cozy", "Dry Wit & Sarcasm"
                        ]
                        delegate: Rectangle {
                            id: chip3
                            required property string modelData
                            property bool isSelected: root.selectedThemes.indexOf(modelData) >= 0

                            implicitWidth: chip3Text.implicitWidth + 14
                            implicitHeight: 22
                            radius: 11
                            color: isSelected ? theme.withAlpha(theme.accentIndigo, 0.3) : (chip3Area.containsMouse ? theme.withAlpha(theme.accentIndigo, 0.15) : theme.bgTertiary)
                            border.color: isSelected ? theme.accentIndigo : theme.borderMain
                            border.width: 1

                            Text {
                                id: chip3Text
                                anchors.centerIn: parent
                                text: chip3.modelData
                                color: chip3.isSelected ? "#ffffff" : theme.textMuted
                                font.pixelSize: 10
                                font.bold: chip3.isSelected
                            }

                            MouseArea {
                                id: chip3Area
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.toggleTheme(chip3.modelData)
                            }
                        }
                    }
                }
            }
        }
    }
}
