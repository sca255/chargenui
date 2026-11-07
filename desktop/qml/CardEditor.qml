import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5
import QtQuick.Dialogs 6.5

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
            if (scenArea && scenArea.text !== scen) {
                scenArea.text = scen
            }

            var fmes = (typeof c.first_mes === "string") ? c.first_mes : (c.first_mes ? String(c.first_mes) : "")
            if (firstMesArea && firstMesArea.text !== fmes) {
                firstMesArea.text = fmes
            }

            var examp = (typeof c.mes_example === "string") ? c.mes_example : (c.mes_example ? String(c.mes_example) : "")
            if (examplesArea && examplesArea.text !== examp) {
                examplesArea.text = examp
            }

            var notes = (typeof c.creator_notes === "string") ? c.creator_notes : (c.creator_notes ? String(c.creator_notes) : "")
            if (notesArea && notesArea.text !== notes) {
                notesArea.text = notes
            }

            var postHist = (typeof c.post_history_instructions === "string") ? c.post_history_instructions : (c.post_history_instructions ? String(c.post_history_instructions) : "")
            if (postHistArea && postHistArea.text !== postHist) {
                postHistArea.text = postHist
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
                        Layout.minimumWidth: 160
                        text: bridge.card.name || ""
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
                    text: Array.isArray(bridge.card.tags) ? bridge.card.tags.join(", ") : (typeof bridge.card.tags === "string" ? bridge.card.tags : "")
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
                    text: bridge.card.description || ""
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
                    text: bridge.card.personality || ""
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

            // TAB 2: Scenario & First Message
            ScrollView {
                clip: true
                ColumnLayout {
                    width: stack.width - 20
                    spacing: 10

                    Text {
                        text: "Scenario Frame (Setting & Scene Objective)"
                        color: theme.textMuted
                        font.pixelSize: 11
                        font.bold: true
                    }
                    TextArea {
                        id: scenArea
                        Layout.fillWidth: true
                        implicitHeight: 100
                        text: bridge.card.scenario || ""
                        wrapMode: TextEdit.Wrap
                        font.pixelSize: 12
                        color: theme.textMain
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: scenArea.activeFocus ? theme.accentCyan : theme.borderMain
                            radius: theme.radiusSm
                        }
                        onEditingFinished: bridge.updateCardField("scenario", text)
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "First Message (Opening voiced narration & spoken dialogue)"
                            color: theme.textMuted
                            font.pixelSize: 11
                            font.bold: true
                            Layout.fillWidth: true
                        }
                        Button {
                            text: "🖼️ Queue Greeting Scene"
                            font.pixelSize: 10
                            onClicked: bridge.queueGreetingImage(firstMesArea.text, "action_scene", "greeting")
                        }
                        Button {
                            text: "🌄 Queue Chat Background"
                            font.pixelSize: 10
                            onClicked: bridge.queueGreetingImage(firstMesArea.text, "action_scene", "greeting_bg")
                        }
                    }
                    TextArea {
                        id: firstMesArea
                        Layout.fillWidth: true
                        implicitHeight: 180
                        text: bridge.card.first_mes || ""
                        wrapMode: TextEdit.Wrap
                        font.pixelSize: 12
                        color: theme.textMain
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: firstMesArea.activeFocus ? theme.accentCyan : theme.borderMain
                            radius: theme.radiusSm
                        }
                        onEditingFinished: bridge.updateCardField("first_mes", text)
                    }

                    // Alternate Greetings Section (CCv2/CCv3)
                    Text {
                        visible: root.altGreetings.length > 0
                        text: "Alternate Greetings (" + root.altGreetings.length + ")"
                        color: theme.accentCyan
                        font.pixelSize: 11
                        font.bold: true
                    }

                    Repeater {
                        model: root.altGreetings
                        delegate: Rectangle {
                            id: altCard
                            required property string modelData
                            required property int index
                            Layout.fillWidth: true
                            implicitHeight: altCol.implicitHeight + 16
                            color: theme.bgCard
                            border.color: theme.borderMain
                            radius: theme.radiusSm

                            ColumnLayout {
                                id: altCol
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 4

                                RowLayout {
                                    Layout.fillWidth: true
                                    Text {
                                        text: "Alt #" + (altCard.index + 1)
                                        color: "#93c5fd"
                                        font.pixelSize: 10
                                        font.bold: true
                                        Layout.fillWidth: true
                                    }
                                    Button {
                                        text: "🖼️ Queue Scene"
                                        font.pixelSize: 9
                                        onClicked: bridge.queueGreetingImage(altCard.modelData, "action_scene", "greeting")
                                    }
                                    Button {
                                        text: "🌄 Queue BG"
                                        font.pixelSize: 9
                                        onClicked: bridge.queueGreetingImage(altCard.modelData, "action_scene", "greeting_bg")
                                    }
                                }
                                Text {
                                    Layout.fillWidth: true
                                    text: altCard.modelData
                                    color: theme.textMain
                                    font.pixelSize: 11
                                    wrapMode: Text.Wrap
                                }
                            }
                        }
                    }
                }
            }

            // TAB 3: Example Dialogues
            ScrollView {
                clip: true
                TextArea {
                    id: examplesArea
                    text: bridge.card.mes_example || ""
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
            ScrollView {
                clip: true
                ColumnLayout {
                    width: stack.width - 20
                    spacing: 12

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "📖 Character Bible & World-Building Lorebook"
                            color: theme.accentCyan
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: (root.bibleEntries.length) + " entries embedded"
                            color: theme.accentEmerald
                            font.pixelSize: 11
                            font.bold: true
                        }
                        Button {
                            visible: root.bibleEntries.length > 0
                            implicitHeight: 24
                            text: "🗑️ Clear Lorebook"
                            onClicked: bridge.clearCharacterBook()
                            background: Rectangle {
                                radius: theme.radiusSm
                                color: parent.hovered ? theme.rgba(239, 68, 68, 0.25) : theme.bgTertiary
                                border.color: theme.rgba(239, 68, 68, 0.4)
                            }
                            contentItem: Text {
                                text: parent.text
                                color: theme.accentRed
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
                        radius: theme.radiusSm
                        color: theme.bgCard
                        border.color: theme.withAlpha(theme.accentCyan, 0.4)

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
                                    color: theme.accentCyan
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Auto-generates lorebook entries with keywords"
                                    color: theme.textDim
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
                                    color: theme.textMain
                                    placeholderTextColor: theme.textDim
                                    background: Rectangle {
                                        color: theme.bgInput
                                        border.color: worldNodeContextInput.activeFocus ? theme.accentCyan : theme.borderMain
                                        radius: theme.radiusSm
                                    }
                                }

                                Button {
                                    text: "📍 Locations"
                                    enabled: !bridge.isBusy
                                    onClicked: bridge.generateWorldNodes("locations", worldNodeContextInput.text)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: parent.hovered ? theme.withAlpha(theme.accentBlue, 0.3) : theme.bgTertiary
                                        border.color: theme.accentBlue
                                    }
                                    contentItem: Text { text: parent.text; color: "#93c5fd"; font.pixelSize: 10; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                }

                                Button {
                                    text: "👥 NPCs / Rivals"
                                    enabled: !bridge.isBusy
                                    onClicked: bridge.generateWorldNodes("npcs_factions", worldNodeContextInput.text)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: parent.hovered ? theme.withAlpha(theme.accentPurple, 0.3) : theme.bgTertiary
                                        border.color: theme.accentPurple
                                    }
                                    contentItem: Text { text: parent.text; color: "#d8b4fe"; font.pixelSize: 10; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                }

                                Button {
                                    text: "🔒 Secrets / Triggers"
                                    enabled: !bridge.isBusy
                                    onClicked: bridge.generateWorldNodes("secrets_triggers", worldNodeContextInput.text)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: parent.hovered ? theme.withAlpha(theme.accentPink, 0.3) : theme.bgTertiary
                                        border.color: theme.accentPink
                                    }
                                    contentItem: Text { text: parent.text; color: "#f472b6"; font.pixelSize: 10; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                }

                                Button {
                                    text: "⚔️ Relics & Gear"
                                    enabled: !bridge.isBusy
                                    onClicked: bridge.generateWorldNodes("relics_gear", worldNodeContextInput.text)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: parent.hovered ? theme.withAlpha(theme.accentAmber, 0.3) : theme.bgTertiary
                                        border.color: theme.accentAmber
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
                        radius: theme.radiusSm
                        color: theme.withAlpha(theme.bgCard, 0.6)
                        border.color: theme.borderMain

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
                                color: theme.textMain
                                background: Rectangle { color: theme.bgInput; radius: 4; border.color: theme.borderMain }
                            }

                            TextField {
                                id: manualEntryKeys
                                Layout.preferredWidth: 180
                                placeholderText: "Keys (comma separated)"
                                font.pixelSize: 11
                                color: theme.textMain
                                background: Rectangle { color: theme.bgInput; radius: 4; border.color: theme.borderMain }
                            }

                            TextField {
                                id: manualEntryContent
                                Layout.fillWidth: true
                                placeholderText: "Factual lore content..."
                                font.pixelSize: 11
                                color: theme.textMain
                                background: Rectangle { color: theme.bgInput; radius: 4; border.color: theme.borderMain }
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
                                    color: theme.withAlpha(theme.accentEmerald, 0.25)
                                    border.color: theme.accentEmerald
                                }
                                contentItem: Text { text: parent.text; color: "#a7f3d0"; font.pixelSize: 10; font.bold: true }
                            }
                        }
                    }

                    Text {
                        visible: root.bibleEntries.length === 0
                        text: "No Character Bible entries yet. Use the AI World Nodes synthesizer above or forge a card in Weaver mode!"
                        color: theme.textDim
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
                            color: theme.bgCard
                            radius: theme.radiusSm
                            border.color: theme.borderMain

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
                                        color: theme.textDim
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
                                    color: theme.bgInput
                                    radius: theme.radiusSm
                                    border.color: theme.borderMain

                                    Text {
                                        id: contentText
                                        anchors.fill: parent
                                        anchors.margins: 6
                                        text: entryCard.modelData.content || ""
                                        color: theme.textMuted
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

            // TAB 5: Voice Spec (TTS Stamping - Qwen3-TTS / Kokoro / ElevenLabs)
            ScrollView {
                clip: true
                ColumnLayout {
                    width: stack.width - 20
                    spacing: 12

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "🎙️ TTS Voice Specification & Idiolect Stamping"
                            color: theme.accentCyan
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: "Tuned for Qwen3-TTS, CosyVoice, Kokoro & ElevenLabs"
                            color: theme.textDim
                            font.pixelSize: 11
                        }
                    }

                    // Auto-Stamp Voice Controller Bar
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: voiceCtrlLayout.implicitHeight + 16
                        radius: theme.radiusSm
                        color: theme.bgCard
                        border.color: theme.withAlpha(theme.accentCyan, 0.4)

                        ColumnLayout {
                            id: voiceCtrlLayout
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8

                            Text {
                                text: "⚡ AI Audio Director & Voice Calibration"
                                color: theme.accentCyan
                                font.pixelSize: 11
                                font.bold: true
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                TextField {
                                    id: voicePrefInput
                                    Layout.fillWidth: true
                                    placeholderText: "Optional vocal preferences (e.g. 'British RP accent, velvety lower register, cynical breathy rasp')..."
                                    font.pixelSize: 11
                                    color: theme.textMain
                                    placeholderTextColor: theme.textDim
                                    background: Rectangle {
                                        color: theme.bgInput
                                        border.color: voicePrefInput.activeFocus ? theme.accentCyan : theme.borderMain
                                        radius: theme.radiusSm
                                    }
                                }

                                Button {
                                    id: btnStampVoice
                                    text: "🎙️ Stamp Voice Spec"
                                    enabled: !bridge.isBusy
                                    onClicked: bridge.stampVoiceSpec(voicePrefInput.text)
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: btnStampVoice.hovered ? "#0891b2" : "#06b6d4"
                                    }
                                    contentItem: RowLayout {
                                        spacing: 4
                                        Text { text: "🎙️"; font.pixelSize: 11 }
                                        Text {
                                            text: bridge.isBusy && bridge.taskType === "voice_spec" ? "Analyzing Voice..." : "Stamp Voice Spec"
                                            color: "#0b0f17"
                                            font.pixelSize: 11
                                            font.bold: true
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Qwen3-TTS & CosyVoice Directives Card
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: qwenCardLayout.implicitHeight + 16
                        radius: theme.radiusSm
                        color: theme.bgCard
                        border.color: theme.borderMain

                        ColumnLayout {
                            id: qwenCardLayout
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "🤖 Qwen3-TTS & CosyVoice Instruct Specification"
                                    color: "#38bdf8"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "📋 Copy Qwen Prompt"
                                    onClicked: {
                                        qwenPromptText.selectAll()
                                        qwenPromptText.copy()
                                        bridge.notification.emit("✓ Copied Qwen-TTS instruct prompt to clipboard!")
                                    }
                                    background: Rectangle {
                                        radius: 4
                                        color: theme.withAlpha(theme.accentCyan, 0.2)
                                        border.color: theme.accentCyan
                                    }
                                    contentItem: Text { text: parent.text; color: "#bae6fd"; font.pixelSize: 10; font.bold: true }
                                }
                            }

                            Rectangle {
                                Layout.fillWidth: true
                                implicitHeight: qwenPromptText.implicitHeight + 12
                                color: theme.bgInput
                                radius: theme.radiusSm
                                border.color: theme.borderMain

                                TextEdit {
                                    id: qwenPromptText
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    readOnly: true
                                    selectByMouse: true
                                    text: (bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.qwenInstructPrompt)
                                        || (bridge.card.extensions && bridge.card.extensions.chara_tts && bridge.card.extensions.chara_tts.qwen_prompt)
                                        || "Click '🎙️ Stamp Voice Spec' above to analyze this character's idiolect and generate an authentic Qwen3-TTS instruct prompt."
                                    color: theme.textMain
                                    font.pixelSize: 11
                                    font.family: "monospace"
                                    wrapMode: Text.Wrap
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "Reference Dialogue Sample (Voice Warmup / Clone Seed):"
                                    color: theme.textMuted
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "📋 Copy Dialogue"
                                    onClicked: {
                                        qwenSampleText.selectAll()
                                        qwenSampleText.copy()
                                        bridge.notification.emit("✓ Copied sample dialogue to clipboard!")
                                    }
                                    background: Rectangle {
                                        radius: 4
                                        color: theme.withAlpha(theme.accentPurple, 0.2)
                                        border.color: theme.accentPurple
                                    }
                                    contentItem: Text { text: parent.text; color: "#e9d5ff"; font.pixelSize: 10; font.bold: true }
                                }
                            }

                            Rectangle {
                                Layout.fillWidth: true
                                implicitHeight: qwenSampleText.implicitHeight + 12
                                color: theme.bgInput
                                radius: theme.radiusSm
                                border.color: theme.borderMain

                                TextEdit {
                                    id: qwenSampleText
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    readOnly: true
                                    selectByMouse: true
                                    text: (bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.qwenSampleDialogue)
                                        || (bridge.card.extensions && bridge.card.extensions.chara_tts && bridge.card.extensions.chara_tts.sample_text)
                                        || "No sample dialogue generated yet."
                                    color: "#fbcfe8"
                                    font.pixelSize: 11
                                    wrapMode: Text.Wrap
                                }
                            }
                        }
                    }

                    // Kokoro & ElevenLabs Preset Cards Row
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 12

                        // Kokoro Match
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: kokoroLayout.implicitHeight + 16
                            radius: theme.radiusSm
                            color: theme.bgCard
                            border.color: theme.borderMain

                            ColumnLayout {
                                id: kokoroLayout
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 4

                                Text { text: "🍃 Kokoro Voice Match"; color: theme.accentEmerald; font.pixelSize: 11; font.bold: true }
                                Text {
                                    text: (bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.kokoroVoice)
                                        || (bridge.card.extensions && bridge.card.extensions.chara_tts && bridge.card.extensions.chara_tts.voice_id)
                                        || "af_bella"
                                    color: "#ffffff"
                                    font.pixelSize: 14
                                    font.bold: true
                                }
                                Text {
                                    text: "Compatible with SillyTavern Kokoro extension"
                                    color: theme.textDim
                                    font.pixelSize: 10
                                }
                            }
                        }

                        // ElevenLabs Recommended Sliders
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: elevenLayout.implicitHeight + 16
                            radius: theme.radiusSm
                            color: theme.bgCard
                            border.color: theme.borderMain

                            ColumnLayout {
                                id: elevenLayout
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 4

                                Text { text: "🎛️ ElevenLabs Recommended Sliders"; color: theme.accentAmber; font.pixelSize: 11; font.bold: true }
                                RowLayout {
                                    spacing: 12
                                    Text {
                                        text: "Stability: " + ((bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.elevenLabs && bridge.card.extensions.chargen.tts_spec.elevenLabs.stability) || 0.65)
                                        color: theme.textMain
                                        font.pixelSize: 10
                                    }
                                    Text {
                                        text: "Similarity: " + ((bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.elevenLabs && bridge.card.extensions.chargen.tts_spec.elevenLabs.similarity) || 0.80)
                                        color: theme.textMain
                                        font.pixelSize: 10
                                    }
                                    Text {
                                        text: "Speed: " + ((bridge.card.extensions && bridge.card.extensions.chargen && bridge.card.extensions.chargen.tts_spec && bridge.card.extensions.chargen.tts_spec.elevenLabs && bridge.card.extensions.chargen.tts_spec.elevenLabs.speed) || 1.0) + "x"
                                        color: theme.textMain
                                        font.pixelSize: 10
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // TAB 6: Post-History Instructions & AI Incorporator
            ScrollView {
                clip: true
                ColumnLayout {
                    width: stack.width - 20
                    spacing: 12

                    // AI Incorporator Box
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: incorpCol.implicitHeight + 20
                        color: theme.withAlpha(theme.accentBlue, 0.08)
                        border.color: theme.withAlpha(theme.accentBlue, 0.35)
                        radius: theme.radiusSm

                        ColumnLayout {
                            id: incorpCol
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true
                                Text { text: "✨"; font.pixelSize: 14 }
                                Text {
                                    text: "AI Directive & System Prompt Incorporator"
                                    color: theme.accentCyan
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Text { text: "🔒 SillyTavern Preset Safe"; color: theme.accentEmerald; font.pixelSize: 10; font.bold: true }
                            }

                            Text {
                                text: "Have a legacy system prompt or raw roleplay directives? Use the LLM to intelligently weave into Post-History, Description, or Both without wiping out your front-end system prompt."
                                color: theme.textMuted
                                font.pixelSize: 11
                                wrapMode: Text.Wrap
                                Layout.fillWidth: true
                            }

                            TextArea {
                                id: sysPromptField
                                Layout.fillWidth: true
                                implicitHeight: 80
                                placeholderText: "Paste raw directives or legacy system prompt here..."
                                font.pixelSize: 11
                                font.family: "monospace"
                                color: theme.textMain
                                background: Rectangle {
                                    color: theme.bgInput
                                    border.color: sysPromptField.activeFocus ? theme.accentCyan : theme.borderMain
                                    radius: theme.radiusSm
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                ComboBox {
                                    id: incorpTargetCombo
                                    model: ["Both (Description + Post-History)", "Post-History Only", "Description Only"]
                                    Layout.preferredWidth: 220
                                    background: Rectangle {
                                        color: theme.bgInput
                                        border.color: theme.borderMain
                                        radius: theme.radiusSm
                                    }
                                }

                                Item { Layout.fillWidth: true }

                                Button {
                                    text: "📋 Plain Move"
                                    onClicked: {
                                        if (sysPromptField.text.trim()) {
                                            var current = bridge.card.post_history_instructions || ""
                                            var combined = current ? (current + "\n\n" + sysPromptField.text.trim()) : sysPromptField.text.trim()
                                            bridge.updateCardField("post_history_instructions", combined)
                                            sysPromptField.text = ""
                                        }
                                    }
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: parent.hovered ? theme.bgHover : theme.bgTertiary
                                        border.color: theme.borderMain
                                    }
                                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 11 }
                                }

                                Button {
                                    text: bridge.isBusy && bridge.taskType === "incorporate_prompt" ? "Incorporating..." : "✨ Incorporate with AI"
                                    enabled: !bridge.isBusy && sysPromptField.text.trim().length > 0
                                    onClicked: {
                                        var t = "both"
                                        if (incorpTargetCombo.currentIndex === 1) t = "post_history"
                                        else if (incorpTargetCombo.currentIndex === 2) t = "description"
                                        bridge.incorporatePrompt(sysPromptField.text, t)
                                        sysPromptField.text = ""
                                    }
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: parent.hovered ? "#2563eb" : "#1d4ed8"
                                    }
                                    contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                                }
                            }
                        }
                    }

                    Text {
                        text: "Post-History Instructions (Uncensored Persona Directives & Agency)"
                        color: theme.accentCyan
                        font.pixelSize: 11
                        font.bold: true
                    }
                    Text {
                        text: "Appended at context end in SillyTavern — enforces behavioural rules and boundaries without overriding your global preset."
                        color: theme.textDim
                        font.pixelSize: 10
                    }
                    TextArea {
                        id: postHistArea
                        Layout.fillWidth: true
                        implicitHeight: 220
                        text: bridge.card.post_history_instructions || ""
                        wrapMode: TextEdit.Wrap
                        font.pixelSize: 12
                        font.family: "monospace"
                        color: theme.textMain
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: postHistArea.activeFocus ? theme.accentCyan : theme.borderMain
                            radius: theme.radiusSm
                        }
                        onEditingFinished: bridge.updateCardField("post_history_instructions", text)
                    }
                }
            }

            // TAB 7: Creator Notes & Performance Guidance
            ScrollView {
                clip: true
                ColumnLayout {
                    width: stack.width - 20
                    spacing: 10

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "Creator Notes & Roleplay Performance Guidance"
                            color: theme.textMuted
                            font.pixelSize: 11
                            font.bold: true
                            Layout.fillWidth: true
                        }
                        Button {
                            text: "👁️ Rich HTML Preview"
                            font.pixelSize: 10
                            onClicked: creatorNotesModal.open()
                            background: Rectangle {
                                color: parent.hovered ? "#065f46" : "#064e3b"
                                radius: 4
                                border.color: "#10b981"
                                border.width: 1
                            }
                            contentItem: Text {
                                text: parent.text
                                color: "#6ee7b7"
                                font.pixelSize: 10
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                                leftPadding: 8
                                rightPadding: 8
                            }
                        }
                    }
                    TextArea {
                        id: notesArea
                        Layout.fillWidth: true
                        implicitHeight: 240
                        text: bridge.card.creator_notes || ""
                        wrapMode: TextEdit.Wrap
                        font.pixelSize: 12
                        color: theme.textMain
                        background: Rectangle {
                            color: theme.bgInput
                            border.color: notesArea.activeFocus ? theme.accentCyan : theme.borderMain
                            radius: theme.radiusSm
                        }
                        onEditingFinished: bridge.updateCardField("creator_notes", text)
                    }
                }
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
                    text: (notesArea && notesArea.text.trim()) ? notesArea.text : "<i>Creator notes are empty.</i>"
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
