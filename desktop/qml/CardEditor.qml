import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5
import QtQuick.Dialogs 6.5
import "editor" as EditorTabs

Rectangle {
    id: root
    color: theme.bgPrimary

    signal openImagePromptGen()
    signal openMultiverseFork()
    signal openHealthAudit()
    signal openLoreSearch()

    Theme { id: theme }

    property var altGreetings: []
    property var bibleEntries: []

    Connections {
        target: bridge
        function onCardChanged() {
            root.syncFromCard()
            if (editorTabBar.currentIndex === 4 && root.bibleEntries.length === 0) {
                editorTabBar.currentIndex = 0
            }
        }
    }

    function syncFromCard() {
        try {
            var c = bridge.card
            if (!c) {
                console.warn("[CardEditor] syncFromCard: bridge.card is null or undefined")
                return
            }

            var cName = (typeof c.name === "string") ? c.name : (c.name ? String(c.name) : "")
            if (nameField && nameField.text !== cName) {
                nameField.text = cName
            }

            var cNick = (typeof c.nickname === "string") ? c.nickname : (c.nickname ? String(c.nickname) : "")
            if (nicknameField && nicknameField.text !== cNick) {
                nicknameField.text = cNick
            }

            var tagsStr = ""
            if (c.tags) {
                if (typeof c.tags === "string") {
                    tagsStr = c.tags
                } else if (typeof c.tags.join === "function") {
                    tagsStr = c.tags.join(", ")
                } else if (typeof c.tags.length === "number") {
                    var tArr = []
                    for (var ti = 0; ti < c.tags.length; ti++) tArr.push(c.tags[ti])
                    tagsStr = tArr.join(", ")
                }
            }
            if (tagsField && tagsField.text !== tagsStr) {
                tagsField.text = tagsStr
            }

            var desc = (typeof c.description === "string") ? c.description : (c.description ? String(c.description) : "")
            if (descArea && descArea.text !== desc) {
                descArea.text = desc
            }

            var pers = (typeof c.personality === "string") ? c.personality : (c.personality ? String(c.personality) : "")
            if (persArea && persArea.text !== pers) {
                persArea.text = pers
            }

            var scen = (typeof c.scenario === "string") ? c.scenario : (c.scenario ? String(c.scenario) : "")
            if (greetingsTab && greetingsTab.scenarioText !== scen) {
                greetingsTab.scenarioText = scen
            }

            var fmes = (typeof c.first_mes === "string") ? c.first_mes : (c.first_mes ? String(c.first_mes) : "")
            if (greetingsTab && greetingsTab.firstMesText !== fmes) {
                greetingsTab.firstMesText = fmes
            }

            var examp = (typeof c.mes_example === "string") ? c.mes_example : (c.mes_example ? String(c.mes_example) : "")
            if (examplesArea && examplesArea.text !== examp) {
                examplesArea.text = examp
            }

            var notes = (typeof c.creator_notes === "string") ? c.creator_notes : (c.creator_notes ? String(c.creator_notes) : "")
            if (notesTab && notesTab.creatorNotesText !== notes) {
                notesTab.creatorNotesText = notes
            }

            var postHist = (typeof c.post_history_instructions === "string") ? c.post_history_instructions : (c.post_history_instructions ? String(c.post_history_instructions) : "")
            if (directivesTab && directivesTab.postHistoryText !== postHist) {
                directivesTab.postHistoryText = postHist
            }

            var alts = []
            if (c.alternate_greetings && typeof c.alternate_greetings.length === "number") {
                for (var ai = 0; ai < c.alternate_greetings.length; ai++) {
                    alts.push(c.alternate_greetings[ai])
                }
            }
            root.altGreetings = alts

            var bEntries = []
            if (c.character_book && c.character_book.entries && typeof c.character_book.entries.length === "number") {
                for (var bi = 0; bi < c.character_book.entries.length; bi++) {
                    bEntries.push(c.character_book.entries[bi])
                }
            }
            root.bibleEntries = bEntries

            console.log("[CardEditor] syncFromCard: synchronized fields for '" + (cName || "Untitled") + "' (" + root.altGreetings.length + " alt greetings, " + root.bibleEntries.length + " bible entries, " + desc.length + " desc chars)")
        } catch (e) {
            console.error("[CardEditor] syncFromCard exception: " + e)
        }
    }

    Component.onCompleted: {
        root.syncFromCard()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 10

        // Character Header: Avatar Slot + Name & Tags + Action Toolbar
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            // Interactive Avatar Slot
            Rectangle {
                id: avatarBox
                width: 62
                height: 62
                radius: theme.radiusSm
                color: theme.bgInput
                border.color: avatarMouseArea.containsMouse ? theme.accentCyan : theme.borderMain
                border.width: 1
                clip: true

                Image {
                    id: avatarImg
                    anchors.fill: parent
                    source: (bridge.card && bridge.card.avatar && bridge.card.avatar.length > 0) ? ("image://avatar/active?" + bridge.avatarTimestamp) : ""
                    fillMode: Image.PreserveAspectCrop
                    visible: Boolean(bridge.card && bridge.card.avatar && bridge.card.avatar.length > 0)
                }

                Text {
                    anchors.centerIn: parent
                    text: "👤"
                    font.pixelSize: 28
                    visible: !avatarImg.visible
                }

                // Hover overlay to change avatar
                Rectangle {
                    anchors.fill: parent
                    color: Qt.rgba(0, 0, 0, 0.65)
                    visible: avatarMouseArea.containsMouse
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "📷"; font.pixelSize: 13; Layout.alignment: Qt.AlignHCenter }
                        Text { text: "Avatar"; color: "#ffffff"; font.pixelSize: 9; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }

                // Remove avatar button
                Rectangle {
                    visible: avatarImg.visible && avatarMouseArea.containsMouse
                    anchors.top: parent.top
                    anchors.right: parent.right
                    anchors.margins: 2
                    width: 16
                    height: 16
                    radius: 8
                    color: theme.rgba(239, 68, 68, 0.9)
                    z: 5

                    Text {
                        anchors.centerIn: parent
                        text: "✕"
                        color: "#ffffff"
                        font.pixelSize: 10
                        font.bold: true
                    }

                    MouseArea {
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            bridge.removeCardAvatar()
                        }
                    }
                }

                MouseArea {
                    id: avatarMouseArea
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: avatarFileDialog.open()
                }
            }

            // Right side: Name row with action buttons, and Tags row
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                // Row 1: Name Field + Tool Actions
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    TextField {
                        id: nameField
                        Layout.fillWidth: true
                        Layout.minimumWidth: 150
                        text: bridge.card ? (bridge.card.name || "") : ""
                        font.pixelSize: 13
                        font.bold: true
                        color: theme.textMain
                        placeholderText: "Character Name"
                        placeholderTextColor: theme.textDim
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: nameField.activeFocus ? theme.accentCyan : theme.borderMain
                            radius: theme.radiusSm
                        }
                        onEditingFinished: {
                            bridge.updateCardField("name", text)
                        }
                    }

                    TextField {
                        id: nicknameField
                        Layout.fillWidth: true
                        Layout.minimumWidth: 120
                        Layout.preferredWidth: 140
                        text: bridge.card ? (bridge.card.nickname || "") : ""
                        font.pixelSize: 12
                        color: theme.textMain
                        placeholderText: "Nickname / In-Chat {{char}}"
                        placeholderTextColor: theme.textDim
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: nicknameField.activeFocus ? theme.accentCyan : theme.borderMain
                            radius: theme.radiusSm
                        }
                        onEditingFinished: {
                            bridge.updateCardField("nickname", text)
                        }
                    }

                    Button {
                        id: btnUploadAvatar
                        onClicked: avatarFileDialog.open()
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? theme.bgHover : theme.bgTertiary
                            border.color: theme.borderMain
                        }
                        contentItem: RowLayout {
                            spacing: 4
                            Text { text: "🖼️"; font.pixelSize: 11 }
                            Text {
                                text: "Avatar"
                                color: theme.textMuted
                                font.pixelSize: 11
                            }
                        }
                    }

                    Button {
                        id: btnMultiverse
                        onClicked: root.openMultiverseFork()
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? theme.withAlpha(theme.accentCyan, 0.3) : theme.withAlpha(theme.accentCyan, 0.15)
                            border.color: theme.accentCyan
                        }
                        contentItem: RowLayout {
                            spacing: 4
                            Text { text: "🌌"; font.pixelSize: 11 }
                            Text {
                                text: "AU Forker"
                                color: "#bae6fd"
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }
                    }

                    Button {
                        id: btnHealthAudit
                        onClicked: root.openHealthAudit()
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? theme.withAlpha(theme.accentEmerald, 0.3) : theme.withAlpha(theme.accentEmerald, 0.15)
                            border.color: theme.accentEmerald
                        }
                        contentItem: RowLayout {
                            spacing: 4
                            Text { text: "📊"; font.pixelSize: 11 }
                            Text {
                                text: "Audit"
                                color: "#a7f3d0"
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }
                    }

                    Button {
                        id: btnImgPrompt
                        onClicked: root.openImagePromptGen()
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? theme.withAlpha(theme.accentPurple, 0.3) : theme.withAlpha(theme.accentPurple, 0.15)
                            border.color: theme.accentPurple
                        }
                        contentItem: RowLayout {
                            spacing: 4
                            Text { text: "🎨"; font.pixelSize: 11 }
                            Text {
                                text: "Img Prompt"
                                color: "#e9d5ff"
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }
                    }

                    Button {
                        id: btnLoreSearch
                        onClicked: root.openLoreSearch()
                        background: Rectangle {
                            radius: theme.radiusSm
                            color: parent.hovered ? theme.withAlpha(theme.accentCyan, 0.3) : theme.withAlpha(theme.accentCyan, 0.15)
                            border.color: theme.accentCyan
                        }
                        contentItem: RowLayout {
                            spacing: 4
                            Text { text: "🔎"; font.pixelSize: 11 }
                            Text {
                                text: "Lore & Fancanon"
                                color: "#7dd3fc"
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }
                    }
                }

                // Row 2: Full-width Tags Field
                TextField {
                    id: tagsField
                    Layout.fillWidth: true
                    text: (bridge.card && Array.isArray(bridge.card.tags)) ? bridge.card.tags.join(", ") : (bridge.card && typeof bridge.card.tags === "string" ? bridge.card.tags : "")
                    font.pixelSize: 11
                    color: theme.textMain
                    placeholderText: "Tags (comma separated, e.g. Fantasy, Tsundere, BDSM / Power Exchange)"
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: tagsField.activeFocus ? theme.accentPurple : theme.borderMain
                        radius: theme.radiusSm
                    }
                    onEditingFinished: {
                        bridge.updateCardField("tags", text)
                    }
                }
            }
        }

        FileDialog {
            id: avatarFileDialog
            title: "Select Character Avatar Image"
            nameFilters: ["Image files (*.png *.jpg *.jpeg *.webp)"]
            onAccepted: {
                bridge.setCardAvatar(selectedFile)
            }
        }

        // Editor Tabs Header
        TabBar {
            id: editorTabBar
            Layout.fillWidth: true
            background: Rectangle { color: "transparent" }

            Repeater {
                model: [
                    "📝 Description",
                    "🧠 Personality",
                    "🎬 Scenario & First Message",
                    "💬 Examples (Ali:Chat)",
                    "📖 Character Book (Bible)",
                    "🎙️ Voice Spec (TTS)",
                    "📜 Post-History & Directives",
                    "⚙️ Creator Notes"
                ]
                delegate: TabButton {
                    id: tBtn
                    required property string modelData
                    required property int index

                    text: modelData
                    font.pixelSize: 11
                    font.bold: editorTabBar.currentIndex === index

                    background: Rectangle {
                        color: editorTabBar.currentIndex === tBtn.index ? theme.bgSecondary : "transparent"
                        border.color: editorTabBar.currentIndex === tBtn.index ? theme.borderMain : "transparent"
                        radius: theme.radiusSm
                        Rectangle {
                            visible: editorTabBar.currentIndex === tBtn.index
                            anchors.bottom: parent.bottom
                            anchors.left: parent.left
                            anchors.right: parent.right
                            height: 2
                            color: theme.accentCyan
                        }
                    }

                    contentItem: Text {
                        text: tBtn.text
                        font: tBtn.font
                        color: editorTabBar.currentIndex === tBtn.index ? theme.textMain : theme.textMuted
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }

        // Tab Content Views
        StackLayout {
            id: stack
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: editorTabBar.currentIndex

            // TAB 0: Description
            ScrollView {
                clip: true
                TextArea {
                    id: descArea
                    text: bridge.card ? (bridge.card.description || "") : ""
                    wrapMode: TextEdit.Wrap
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderText: "Character Description (Core identity, silhouette, appearance, formative crucible, temperament & boundaries naturally woven in prose)..."
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: descArea.activeFocus ? theme.accentCyan : theme.borderMain
                        radius: theme.radiusSm
                    }
                    onEditingFinished: bridge.updateCardField("description", text)
                }
            }

            // TAB 1: Personality
            ScrollView {
                clip: true
                TextArea {
                    id: persArea
                    text: bridge.card ? (bridge.card.personality || "") : ""
                    wrapMode: TextEdit.Wrap
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderText: "Personality & Behavioral Spec (Vocal idiolect, mannerisms, physical tells, and performative IF-THEN triggers)..."
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: persArea.activeFocus ? theme.accentPurple : theme.borderMain
                        radius: theme.radiusSm
                    }
                    onEditingFinished: bridge.updateCardField("personality", text)
                }
            }

            // TAB 2: Scenario, First Message & Alternate Greetings
            EditorTabs.CardGreetingsTab {
                id: greetingsTab
                theme: theme
                stack: stack
                altGreetings: root.altGreetings
            }

            // TAB 3: Example Dialogues
            ScrollView {
                clip: true
                TextArea {
                    id: examplesArea
                    text: bridge.card ? (bridge.card.mes_example || "") : ""
                    wrapMode: TextEdit.Wrap
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderText: "Ali:Chat example dialogues formatted with <START> blocks..."
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: examplesArea.activeFocus ? theme.accentCyan : theme.borderMain
                        radius: theme.radiusSm
                    }
                    onEditingFinished: bridge.updateCardField("mes_example", text)
                }
            }

            // TAB 4: Character Book (Weaver Authoring Bible Lorebook & World Nodes)
            EditorTabs.CardBibleTab {
                id: bibleTab
                theme: theme
                stack: stack
                bibleEntries: root.bibleEntries
            }

            // TAB 5: Voice Spec (TTS Stamping - Qwen3-TTS / Kokoro / ElevenLabs)
            EditorTabs.CardVoiceTab {
                id: voiceTab
                theme: theme
                stack: stack
            }

            // TAB 6: Post-History Instructions & AI Incorporator
            EditorTabs.CardDirectivesTab {
                id: directivesTab
                theme: theme
                stack: stack
            }

            // TAB 7: Creator Notes & Performance Guidance
            EditorTabs.CardNotesTab {
                id: notesTab
                theme: theme
                stack: stack
                onPreviewRequested: creatorNotesModal.open()
            }
        }
    }

    // Modal Dialog for Creator Notes Rich HTML Preview
    Dialog {
        id: creatorNotesModal
        anchors.centerIn: parent
        width: Math.min(parent.width * 0.85, 750)
        height: Math.min(parent.height * 0.8, 550)
        modal: true
        title: "👁️ Creator Notes (Rich HTML Preview)"
        background: Rectangle {
            color: theme.bgCard
            border.color: theme.borderMain
            border.width: 1
            radius: theme.radiusMd
        }
        contentItem: ColumnLayout {
            spacing: 12
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                TextArea {
                    width: parent.width
                    readOnly: true
                    textFormat: TextEdit.RichText
                    text: (notesTab && notesTab.creatorNotesText && notesTab.creatorNotesText.trim()) ? notesTab.creatorNotesText : "<i>Creator notes are empty.</i>"
                    color: theme.textMain
                    font.pixelSize: 12
                    wrapMode: TextEdit.Wrap
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: theme.borderMain
                        radius: theme.radiusSm
                    }
                }
            }
            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button {
                    text: "Close"
                    onClicked: creatorNotesModal.close()
                    background: Rectangle {
                        color: theme.bgElevated
                        border.color: theme.borderMain
                        radius: theme.radiusSm
                    }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMain
                        font.pixelSize: 11
                        leftPadding: 12
                        rightPadding: 12
                    }
                }
            }
        }
    }
}
