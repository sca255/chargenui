import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5
import QtQuick.Dialogs 6.5
import "spark" as SparkSections

ScrollView {
    id: root
    clip: true

    signal requestWeaverInterview(string concept, string genre, var themes, string tone, bool nsfw, string botMode, string era)
    signal openLoreSearchRequested(string defaultQuery)
    signal openEraPickerRequested(string category)

    Theme { id: theme }

    property alias conceptText: conceptSection.text
    property alias genreValue: genreBox.currentValue
    property alias toneText: toneInput.text
    property alias formatValue: formatBox.currentValue
    property alias nsfwEnabled: nsfwSwitch.checked
    property var activeThemes: themePicker.selectedThemes
    property string botMode: "single" // "single", "multi_character", "rpg_world"
    property string selectedEra: "off"
    property string selectedEraName: ""
    property var activeEraData: null
    property bool promptSnippetExpanded: false
    property string attachedVisionImage: ""
    property string previewZoomImageUrl: ""
    property string activeCardName: (typeof bridge !== "undefined" && bridge.card && bridge.card.name) ? bridge.card.name : ""
    property bool hasStoredSpine: Boolean(typeof bridge !== "undefined" && bridge.card && bridge.card.extensions && bridge.card.extensions.chargenui && bridge.card.extensions.chargenui.spine)

    function loadThemes(themeList) {
        if (!themeList || !themePicker) return
        for (var i = 0; i < themeList.length; i++) {
            themePicker.addCustomTheme(themeList[i])
        }
    }

    function setLoreQueryAndActive(q, lore) {
        if (loreSection) loreSection.setLoreQuery(q)
    }

    ColumnLayout {
        width: root.width - 20
        spacing: 12

        // Section Title
        RowLayout {
            spacing: 8
            Text {
                text: "🔮"
                font.pixelSize: 16
            }
            Text {
                text: root.botMode === "multi_character"
                    ? "Spark Multi-Character Cast"
                    : root.botMode === "rpg_world"
                    ? "Spark RPG World / GM"
                    : "Spark New Character"
                color: theme.accentCyan
                font.pixelSize: 14
                font.bold: true
            }
        }

        // Vision Reference Attachment Dropzone
        SparkSections.SparkVisionDropzone {
            id: visionDropzone
            theme: theme
            attachedImage: root.attachedVisionImage
            onImageChanged: function(p) {
                root.attachedVisionImage = p;
                if (bridge && bridge.setCardAvatar) bridge.setCardAvatar(p);
            }
            onZoomRequested: function(p) {
                root.previewZoomImageUrl = p;
            }
            onBrowseRequested: sparkVisionFileDialog.open()
        }

        // Bot Generation Mode Selector
        SparkSections.SparkBotModeSelector {
            id: botModeSelector
            theme: theme
            botMode: root.botMode
            onModeChanged: function(m) {
                root.botMode = m;
            }
        }

        // Concept Area & Autocomplete
        SparkSections.SparkConceptArea {
            id: conceptSection
            theme: theme
            botMode: root.botMode
        }

        // Primary Setting / Genre
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            Text {
                text: "Primary Setting / Genre"
                color: theme.textMuted
                font.pixelSize: 11
                font.bold: true
            }

            ComboBox {
                id: genreBox
                Layout.fillWidth: true
                textRole: "text"
                valueRole: "value"
                model: [
                    { text: "Dark Fantasy / Grimdark", value: "Dark Fantasy" },
                    { text: "Cyberpunk / Dystopian", value: "Cyberpunk" },
                    { text: "Modern Dark / Noir", value: "Modern Dark / Noir" },
                    { text: "Sci-Fi / Space Opera", value: "Sci-Fi / Space Opera" },
                    { text: "Psychological Horror", value: "Psychological Horror" },
                    { text: "Romance / Slice of Life", value: "Romance / Slice of Life" },
                    { text: "Supernatural / Urban Fantasy", value: "Supernatural / Urban Fantasy" },
                    { text: "Post-Apocalyptic / Survival", value: "Post-Apocalyptic" },
                    { text: "Historical / Period Drama", value: "Historical / Period" },
                    { text: "Gothic / Cosmic Eldritch", value: "Gothic / Cosmic Eldritch" },
                    { text: "Mystery / Crime Thriller", value: "Mystery / Crime Thriller" },
                    { text: "Anime / Action", value: "Anime / Action" }
                ]
                background: Rectangle {
                    color: theme.bgInput
                    border.color: theme.borderMain
                    radius: theme.radiusSm
                }
                contentItem: Text {
                    text: genreBox.displayText
                    color: theme.textMain
                    font.pixelSize: 12
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 10
                }
            }
        }

        // Multi-Theme Picker
        ThemePicker {
            id: themePicker
            Layout.fillWidth: true
        }

        // Tone & Dynamics
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            Text {
                text: "Tone & Dynamics"
                color: theme.textMuted
                font.pixelSize: 11
                font.bold: true
            }

            TextField {
                id: toneInput
                Layout.fillWidth: true
                placeholderText: "e.g. Gritty, melancholic, dry wit, restrained yearning"
                font.pixelSize: 12
                color: theme.textMain
                placeholderTextColor: theme.textDim
                background: Rectangle {
                    color: theme.bgInput
                    border.color: toneInput.activeFocus ? theme.accentCyan : theme.borderMain
                    radius: theme.radiusSm
                }
            }
        }

        // Era & Historical / Setting Timeline Section
        SparkSections.SparkEraSection {
            id: eraSection
            theme: theme
            selectedEra: root.selectedEra
            selectedEraName: root.selectedEraName
            activeEraData: root.activeEraData
            onOpenEraPickerRequested: function(cat) {
                root.openEraPickerRequested(cat);
            }
            onEraSelectionChanged: function(era, name, data) {
                root.selectedEra = era;
                root.selectedEraName = name;
                root.activeEraData = data;
            }
        }

        // Format Preference
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            Text {
                text: "Card Format Preference"
                color: theme.textMuted
                font.pixelSize: 11
                font.bold: true
            }

            ComboBox {
                id: formatBox
                Layout.fillWidth: true
                textRole: "text"
                valueRole: "value"
                model: [
                    { text: "Rich Evocative Prose (Natural & Atmospheric)", value: "prose" },
                    { text: "Boostyle Pseudocode [Character(\"Name\"){...}]", value: "boostyle" },
                    { text: "W++ Format [character(\"Name\"){...}]", value: "wxx" },
                    { text: "Dense Structured Markdown", value: "markdown" }
                ]
                background: Rectangle {
                    color: theme.bgInput
                    border.color: theme.borderMain
                    radius: theme.radiusSm
                }
                contentItem: Text {
                    text: formatBox.displayText
                    color: theme.textMain
                    font.pixelSize: 12
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 10
                }
            }
        }

        // NSFW Checkbox
        RowLayout {
            spacing: 8
            CheckBox {
                id: nsfwSwitch
                checked: true
                indicator: Rectangle {
                    implicitWidth: 16
                    implicitHeight: 16
                    radius: 3
                    color: theme.bgInput
                    border.color: nsfwSwitch.checked ? theme.accentCyan : theme.borderMain
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: "✓"
                        color: theme.accentCyan
                        font.pixelSize: 11
                        font.bold: true
                        visible: nsfwSwitch.checked
                    }
                }
            }
            Text {
                text: "Unrestricted / Mature / NSFW Elements Allowed"
                color: theme.textMuted
                font.pixelSize: 11
            }
        }

        // Web Lore & Fandom Canon Section
        SparkSections.SparkLoreSection {
            id: loreSection
            theme: theme
            fallbackConcept: conceptSection.text
            onOpenLoreSearchRequested: function(q) {
                root.openLoreSearchRequested(q);
            }
        }

        // Dual Actions: Weaver Workshop vs One-Shot
        SparkSections.SparkActionButtons {
            id: actionButtons
            theme: theme
            botMode: root.botMode
            activeCardName: root.activeCardName
            hasStoredSpine: root.hasStoredSpine
            onWeaverRequested: {
                console.log("[SparkGenerator] Weaver Interview requested [" + root.botMode + "] for concept: \"" + conceptSection.text.substring(0, 50) + "...\" era=" + root.selectedEra)
                root.requestWeaverInterview(
                    conceptSection.text,
                    genreBox.currentValue,
                    themePicker.selectedThemes,
                    toneInput.text,
                    nsfwSwitch.checked,
                    root.botMode,
                    root.selectedEra !== "off" ? (root.selectedEraName || root.selectedEra) : ""
                )
            }
            onQuickForgeRequested: {
                console.log("[SparkGenerator] Quick Forge (One-Shot) [" + root.botMode + "] requested for concept: \"" + conceptSection.text.substring(0, 50) + "...\" era=" + root.selectedEra)
                bridge.generateCard(
                    conceptSection.text,
                    genreBox.currentValue,
                    themePicker.selectedThemes,
                    toneInput.text,
                    formatBox.currentValue,
                    nsfwSwitch.checked,
                    "",
                    root.botMode,
                    root.selectedEra !== "off" ? (root.selectedEraName || root.selectedEra) : ""
                )
            }
            onSynthesizeSpineRequested: {
                console.log("[SparkGenerator] Opening Spine Synthesis modal for: " + root.activeCardName)
                if (synthesizeSpineModal) {
                    synthesizeSpineModal.targetCard = root.activeCardName
                    synthesizeSpineModal.open()
                }
            }
            onRegenerateWithSpineRequested: {
                console.log("[SparkGenerator] Regenerate with Spine requested for: " + root.activeCardName)
                bridge.enhanceCharacter("regenerate_with_spine", root.activeCardName, {})
            }
            onCancelRequested: {
                bridge.cancelCurrentTask()
            }
        }

        Item { height: 16 } // Bottom spacer
    }

    FileDialog {
        id: sparkVisionFileDialog
        title: "Select Character Portrait or Visual Reference"
        nameFilters: ["Images (*.png *.jpg *.jpeg *.webp)", "All Files (*)"]
        onAccepted: {
            var sel = selectedFile ? selectedFile.toString() : "";
            root.attachedVisionImage = sel;
            if (bridge && bridge.setCardAvatar) bridge.setCardAvatar(sel);
        }
    }

    // Fullscreen Image Zoom & Inspect Modal
    Rectangle {
        id: zoomPreviewModal
        anchors.fill: parent
        z: 9999
        visible: root.previewZoomImageUrl.length > 0
        color: "#d9000000"

        focus: visible
        Keys.onEscapePressed: root.previewZoomImageUrl = ""

        MouseArea {
            anchors.fill: parent
            onClicked: root.previewZoomImageUrl = ""
        }

        Rectangle {
            anchors.centerIn: parent
            width: Math.min(parent.width - 40, Math.max(360, parent.width * 0.85))
            height: Math.min(parent.height - 40, Math.max(360, parent.height * 0.85))
            radius: theme.radiusMd
            color: theme.bgSecondary
            border.color: theme.accentCyan
            border.width: 1.5
            clip: true

            MouseArea {
                anchors.fill: parent
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 10

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Text {
                        text: "👁️ Visual Reference Inspection"
                        font.bold: true
                        font.pixelSize: 13
                        color: theme.accentCyan
                    }

                    Text {
                        text: root.previewZoomImageUrl ? (String(root.previewZoomImageUrl).split("/").pop()) : ""
                        font.pixelSize: 11
                        color: theme.textMuted
                        elide: Text.ElideMiddle
                        Layout.fillWidth: true
                    }

                    Button {
                        text: "✕ Close (Esc)"
                        implicitHeight: 28
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? theme.bgHover : theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: Text {
                            text: parent.text
                            color: theme.textMain
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: root.previewZoomImageUrl = ""
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    radius: theme.radiusSm
                    color: theme.bgPrimary
                    border.color: theme.borderMain
                    clip: true

                    Image {
                        id: zoomedImage
                        anchors.fill: parent
                        anchors.margins: 8
                        source: root.previewZoomImageUrl ? (String(root.previewZoomImageUrl).startsWith("file:") ? root.previewZoomImageUrl : ("file://" + root.previewZoomImageUrl)) : ""
                        fillMode: Image.PreserveAspectFit
                        smooth: true
                        mipmap: true
                    }
                }
            }
        }
    }
}
