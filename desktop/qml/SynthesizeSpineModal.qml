import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    color: Qt.rgba(0, 0, 0, 0.75)
    property var targetCard: ""

    signal closed()
    signal synthesizeRequested(var params)

    Theme { id: theme }

    Connections {
        target: bridge
        function onErrorOccurred(msg) {
            root.isLoading = false
            root.btnSynthesize.enabled = true
        }
    }

    property bool isLoading: false

    function open() {
        if (targetCard) {
            targetCharLabel.text = targetCard
        }
        conceptField.text = ""
        storyArcField.text = ""
        genreField.text = "Fantasy"
        eraField.text = ""
        themesField.text = ""
        toneField.text = "Atmospheric, psychologically nuanced"
        intensityField.currentIndex = 1 // balanced
        botModeField.currentIndex = 0 // single
        nsfwCheck.checked = true
        visible = true
        isLoading = false
        btnSynthesize.enabled = true
    }

    function close() {
        visible = false
    }

    Rectangle {
        id: modalCard
        width: Math.min(600, parent.width * 0.9)
        height: Math.min(700, parent.height * 0.9)
        anchors.centerIn: parent
        color: theme.bgCard
        border.color: theme.borderMain
        border.width: 1
        radius: theme.radiusMd
        clip: true

        ColumnLayout {
            anchors.fill: parent
            spacing: 0

            // Header
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: 48
                color: theme.bgCardHover
                border.color: theme.borderMain
                border.width: 1
                radius: theme.radiusMd

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8

                    RowLayout {
                        spacing: 6
                        Text { text: "🧬"; font.pixelSize: 18 }
                        ColumnLayout {
                            Text {
                                text: "Synthesize Authoring Spine"
                                color: theme.textMain
                                font.pixelSize: 14
                                font.bold: true
                            }
                            Text {
                                text: "Retroactive psychometric scaffolding from existing card"
                                color: theme.textMuted
                                font.pixelSize: 10
                            }
                        }
                    }

                    Item { Layout.fillWidth: true }

                    Button {
                        id: btnClose
                        implicitWidth: 32
                        implicitHeight: 32
                        flat: true
                        contentItem: Text { text: "✕"; font.pixelSize: 14; color: theme.textMuted }
                        onClicked: root.close()
                    }
                }
            }

            // Body
            Flickable {
                Layout.fillWidth: true
                Layout.fillHeight: true
                contentHeight: contentColumn.implicitHeight + 24
                clip: true

                ColumnLayout {
                    id: contentColumn
                    width: parent.width
                    spacing: 16
                    anchors.margins: 16

                    // Target Character
                    Rectangle {
                        Layout.fillWidth: true
                        color: Qt.rgba(147, 51, 234, 0.1)
                        border.color: Qt.rgba(168, 85, 247, 0.3)
                        border.width: 1
                        radius: theme.radiusSm

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 8

                            Text { text: "🎯"; font.pixelSize: 16 }
                            ColumnLayout {
                                Text {
                                    text: "Target Character"
                                    color: theme.accentPurple
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                                Text {
                                    id: targetCharLabel
                                    text: "(No card selected)"
                                    color: theme.textMain
                                    font.pixelSize: 13
                                    font.bold: true
                                }
                            }
                        }
                    }

                    // Original Concept
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Text {
                            text: "Original Concept / Prompt (Optional but Recommended)"
                            color: theme.textMain
                            font.pixelSize: 11
                            font.bold: true
                        }
                        TextArea {
                            id: conceptField
                            Layout.fillWidth: true
                            implicitHeight: 100
                            placeholderText: "Paste the original concept/seed/trope used to create this character..."
                            wrapMode: TextArea.Wrap
                            font.family: "Monospace"
                            font.pixelSize: 11
                            background: Rectangle {
                                color: theme.bgInput
                                border.color: theme.borderMain
                                border.width: 1
                                radius: theme.radiusSm
                            }
                        }
                        Text {
                            text: "If you have the original prompt, paste it here. If not, the AI will infer from the card fields."
                            color: theme.textDim
                            font.pixelSize: 9
                        }
                    }

                    // Original Story Arc
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Text {
                            text: "Original Story Arc (Optional)"
                            color: theme.textMain
                            font.pixelSize: 11
                            font.bold: true
                        }
                        TextArea {
                            id: storyArcField
                            Layout.fillWidth: true
                            implicitHeight: 80
                            placeholderText: "Paste the story arc (e.g. 'The War of Attrition (Provocative Destruction -> Discovery of Shared Loneliness -> Breaking the Contract through Passionate Truth)')"
                            wrapMode: TextArea.Wrap
                            font.family: "Monospace"
                            font.pixelSize: 11
                            background: Rectangle {
                                color: theme.bgInput
                                border.color: theme.borderMain
                                border.width: 1
                                radius: theme.radiusSm
                            }
                        }
                        Text {
                            text: "This will be stored and used for future 'Regenerate with Spine' enhancer mode."
                            color: theme.textDim
                            font.pixelSize: 9
                        }
                    }

                    // Settings Grid
                    GridLayout {
                        Layout.fillWidth: true
                        columns: 2
                        columnSpacing: 12
                        rowSpacing: 12

                        // Genre
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Genre / Setting"; color: theme.textMain; font.pixelSize: 11; font.bold: true }
                            TextField {
                                id: genreField
                                Layout.fillWidth: true
                                placeholderText: "Fantasy, Cyberpunk, Victorian Gothic..."
                                background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; border.width: 1; radius: theme.radiusSm }
                            }
                        }

                        // Era
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Era (Optional)"; color: theme.textMain; font.pixelSize: 11; font.bold: true }
                            TextField {
                                id: eraField
                                Layout.fillWidth: true
                                placeholderText: "Victorian Gothic, Sengoku Japan..."
                                background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; border.width: 1; radius: theme.radiusSm }
                            }
                        }

                        // Themes
                        ColumnLayout {
                            Layout.fillWidth: true
                            Layout.columnSpan: 2
                            spacing: 4
                            Text { text: "Themes / Tropes (Comma-separated)"; color: theme.textMain; font.pixelSize: 11; font.bold: true }
                            TextField {
                                id: themesField
                                Layout.fillWidth: true
                                placeholderText: "Dark Romance, Power Exchange, Slow Burn..."
                                background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; border.width: 1; radius: theme.radiusSm }
                            }
                        }

                        // Tone
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Tone"; color: theme.textMain; font.pixelSize: 11; font.bold: true }
                            TextField {
                                id: toneField
                                Layout.fillWidth: true
                                placeholderText: "Gritty psychological, flirty teasing..."
                                background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; border.width: 1; radius: theme.radiusSm }
                            }
                        }

                        // Intensity
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Intensity"; color: theme.textMain; font.pixelSize: 11; font.bold: true }
                            ComboBox {
                                id: intensityField
                                Layout.fillWidth: true
                                model: ["subtle", "balanced", "extreme", "unhinged"]
                                currentIndex: 1
                                background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; border.width: 1; radius: theme.radiusSm }
                            }
                        }

                        // Bot Mode
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Bot Mode"; color: theme.textMain; font.pixelSize: 11; font.bold: true }
                            ComboBox {
                                id: botModeField
                                Layout.fillWidth: true
                                model: ["single", "multi_character", "rpg_world"]
                                currentIndex: 0
                                background: Rectangle { color: theme.bgInput; border.color: theme.borderMain; border.width: 1; radius: theme.radiusSm }
                            }
                        }

                        // NSFW
                        ColumnLayout {
                            Layout.fillWidth: true
                            Layout.columnSpan: 2
                            spacing: 4
                            RowLayout {
                                CheckBox {
                                    id: nsfwCheck
                                    checked: true
                                }
                                Text { text: "NSFW / Mature Elements Enabled"; color: theme.textMain; font.pixelSize: 11; font.bold: true }
                            }
                        }
                    }

                    // Loading Indicator
                    Rectangle {
                        id: loadingOverlay
                        Layout.fillWidth: true
                        visible: root.isLoading
                        color: Qt.rgba(0, 0, 0, 0.7)
                        radius: theme.radiusSm

                        ColumnLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            Text { text: "⏳"; font.pixelSize: 28 }
                            Text {
                                text: "Synthesizing Authoring Spine..."
                                color: theme.accentPurple
                                font.pixelSize: 13
                                font.bold: true
                            }
                            Text {
                                text: "Analyzing card profile + original inputs to reconstruct archetype, contradiction, reaction gradient, voice, and scene frame."
                                color: theme.textMuted
                                font.pixelSize: 10
                                width: parent.width * 0.8
                                wrapMode: Text.WordWrap
                                horizontalAlignment: Text.AlignHCenter
                            }
                        }
                    }
                }
            }

            // Footer
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: 56
                color: theme.bgCardHover
                border.color: theme.borderMain
                border.width: 1
                radius: theme.radiusMd

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8

                    Item { Layout.fillWidth: true }

                    Button {
                        id: btnCancelModal
                        implicitHeight: 32
                        text: "Cancel"
                        flat: true
                        contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 11; font.bold: true }
                        onClicked: root.close()
                    }

                    Button {
                        id: btnSynthesize
                        implicitHeight: 32
                        Layout.fillWidth: true
                        enabled: !root.isLoading
                        text: root.isLoading ? "Synthesizing..." : "🧬 Synthesize & Attach Spine"
                        contentItem: Text {
                            text: parent.text
                            color: "#ffffff"
                            font.pixelSize: 12
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: btnSynthesize.hovered && !root.isLoading ? "#5b21b6" : "#6d28d9"
                            border.color: theme.accentPurple
                            border.width: 1
                        }
                        onClicked: {
                            if (root.isLoading) return
                            root.isLoading = true
                            btnSynthesize.enabled = false

                            var params = {
                                targetCard: root.targetCard,
                                originalConcept: conceptField.text.trim(),
                                originalStoryArc: storyArcField.text.trim(),
                                genre: genreField.text.trim(),
                                themes: themesField.text.trim().split(",").map(function(t) { return t.trim() }).filter(Boolean),
                                tone: toneField.text.trim(),
                                intensity: intensityField.currentText,
                                era: eraField.text.trim(),
                                botMode: botModeField.currentText,
                                nsfw: nsfwCheck.checked,
                            }
                            root.synthesizeRequested(params)
                        }
                    }
                }
            }
        }
    }
}