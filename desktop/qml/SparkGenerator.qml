import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

ScrollView {
    id: root
    clip: true

    signal requestWeaverInterview(string concept, string genre, var themes, string tone, bool nsfw, string botMode, string era)
    signal openLoreSearchRequested(string defaultQuery)
    signal openEraPickerRequested(string category)

    Theme { id: theme }

    property alias conceptText: conceptArea.text
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

    function loadThemes(themeList) {
        if (!themeList || !themePicker) return
        for (var i = 0; i < themeList.length; i++) {
            themePicker.addCustomTheme(themeList[i])
        }
    }

    function setLoreQueryAndActive(q, lore) {
        if (q && loreQueryField) loreQueryField.text = q
        if (webLoreCheck) webLoreCheck.checked = true
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

        // Bot Generation Mode Selector (Single, Multi-Character Cast, RPG World / GM)
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            Text {
                text: "Bot Generation Mode"
                color: theme.textMuted
                font.pixelSize: 11
                font.bold: true
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 6

                // 1. Single Character
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 32
                    radius: theme.radiusSm
                    color: root.botMode === "single" ? "#2563eb" : (singleMouse.containsMouse ? theme.bgCardHover : theme.bgCard)
                    border.color: root.botMode === "single" ? theme.accentBlue : theme.borderMain
                    border.width: 1

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        Text {
                            text: "👤"
                            font.pixelSize: 11
                        }
                        Text {
                            text: "Solo Character"
                            color: root.botMode === "single" ? "#ffffff" : theme.textMain
                            font.pixelSize: 11
                            font.bold: root.botMode === "single"
                        }
                    }

                    MouseArea {
                        id: singleMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.botMode = "single"
                    }
                }

                // 2. Multi-Character Cast
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 32
                    radius: theme.radiusSm
                    color: root.botMode === "multi_character" ? "#7c3aed" : (multiMouse.containsMouse ? theme.bgCardHover : theme.bgCard)
                    border.color: root.botMode === "multi_character" ? theme.accentPurple : theme.borderMain
                    border.width: 1

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        Text {
                            text: "👥"
                            font.pixelSize: 11
                        }
                        Text {
                            text: "Multi Cast"
                            color: root.botMode === "multi_character" ? "#ffffff" : theme.textMain
                            font.pixelSize: 11
                            font.bold: root.botMode === "multi_character"
                        }
                    }

                    MouseArea {
                        id: multiMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.botMode = "multi_character"
                    }
                }

                // 3. RPG World / GM
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 32
                    radius: theme.radiusSm
                    color: root.botMode === "rpg_world" ? "#059669" : (rpgMouse.containsMouse ? theme.bgCardHover : theme.bgCard)
                    border.color: root.botMode === "rpg_world" ? theme.accentGreen : theme.borderMain
                    border.width: 1

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        Text {
                            text: "🗺️"
                            font.pixelSize: 11
                        }
                        Text {
                            text: "RPG World"
                            color: root.botMode === "rpg_world" ? "#ffffff" : theme.textMain
                            font.pixelSize: 11
                            font.bold: root.botMode === "rpg_world"
                        }
                    }

                    MouseArea {
                        id: rpgMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.botMode = "rpg_world"
                    }
                }
            }
        }

        // Concept Area
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: root.botMode === "multi_character"
                        ? "Multi-Character Cast / Duo / Household Concept"
                        : root.botMode === "rpg_world"
                        ? "RPG World / Game Master Setting & Inciting Incident"
                        : "Character Concept / Seed / Trope"
                    color: theme.textMuted
                    font.pixelSize: 11
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: "💡 type 'era:' for setting or 'erac:' for category"
                    color: theme.accentCyan
                    font.pixelSize: 10
                    visible: conceptArea.activeFocus
                }
            }

            Item {
                Layout.fillWidth: true
                implicitHeight: 88

                TextArea {
                    id: conceptArea
                    anchors.fill: parent
                    wrapMode: TextEdit.Wrap
                    placeholderText: root.botMode === "multi_character"
                        ? "e.g. Two rival inquisitor partners bound by a blood contract: one ruthless and methodical, the other empathetic and reckless, hunting heretics while hiding their own forbidden pact."
                        : root.botMode === "rpg_world"
                        ? "e.g. The Sunken Citadel of Oakhaven: A flooded gothic kingdom ruled by competing merchant factions, ancient sea cults, and drowned automatons. High-stakes survival and political intrigue."
                        : "e.g. era: desert fortress... A weary inquisitor who broke their sacred oath to protect a heretic child. Cold, formal, scarred, haunted by ghosts they refuse to name."
                    font.pixelSize: 12
                    color: theme.textMain
                    placeholderTextColor: theme.textDim
                    background: Rectangle {
                        color: theme.bgInput
                        border.color: conceptArea.activeFocus ? theme.accentCyan : theme.borderMain
                        radius: theme.radiusSm
                    }
                    onTextChanged: {
                        var matchErac = /(?:^|\s)erac:\s*([^\s]*)$/i.exec(text || "");
                        var matchEra = /(?:^|\s)era:\s*([^\s]*)$/i.exec(text || "");
                        if (matchErac && typeof bridge !== "undefined" && bridge.searchEraCategoriesForAutocomplete) {
                            var qc = matchErac[1] || "";
                            var resc = [];
                            try {
                                resc = JSON.parse(bridge.searchEraCategoriesForAutocomplete(qc, 8));
                            } catch(e) {
                                resc = [];
                            }
                            if (resc.length > 0) {
                                eraAcModel.clear();
                                for (var ic = 0; ic < resc.length; ic++) {
                                    eraAcModel.append(resc[ic]);
                                }
                                eraAcPopup.visible = true;
                            } else {
                                eraAcPopup.visible = false;
                            }
                        } else if (matchEra && typeof bridge !== "undefined" && bridge.searchErasForAutocomplete) {
                            var qe = matchEra[1] || "";
                            var rese = [];
                            try {
                                rese = JSON.parse(bridge.searchErasForAutocomplete(qe, 8));
                            } catch(e) {
                                rese = [];
                            }
                            if (rese.length > 0) {
                                eraAcModel.clear();
                                for (var ie = 0; ie < rese.length; ie++) {
                                    eraAcModel.append(rese[ie]);
                                }
                                eraAcPopup.visible = true;
                            } else {
                                eraAcPopup.visible = false;
                            }
                        } else {
                            eraAcPopup.visible = false;
                        }
                    }
                }

                // Era Autocomplete Dropdown Popup
                Rectangle {
                    id: eraAcPopup
                    visible: false
                    z: 999
                    width: parent.width
                    height: Math.min(eraAcList.contentHeight + 8, 200)
                    anchors.top: parent.bottom
                    anchors.topMargin: 4
                    color: theme.bgCard
                    border.color: theme.accentCyan
                    border.width: 1
                    radius: theme.radiusSm

                    ListModel { id: eraAcModel }

                    ListView {
                        id: eraAcList
                        anchors.fill: parent
                        anchors.margins: 4
                        model: eraAcModel
                        clip: true
                        delegate: Rectangle {
                            width: eraAcList.width
                            height: 32
                            radius: 4
                            color: acItemMa.containsMouse ? theme.withAlpha(theme.accentCyan, 0.15) : "transparent"

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 8
                                spacing: 8

                                Text {
                                    text: model.name || ""
                                    font.bold: true
                                    font.pixelSize: 11
                                    color: theme.textMain
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }

                                Text {
                                    text: model.region ? ("📍 " + model.region) : ""
                                    font.pixelSize: 10
                                    color: theme.textDim
                                    visible: model.region !== ""
                                }

                                Rectangle {
                                    height: 18
                                    implicitWidth: acSrcTxt.implicitWidth + 8
                                    radius: 3
                                    color: model.is_extension ? theme.withAlpha(theme.accentPurple, 0.2) : theme.withAlpha(theme.accentBlue, 0.2)
                                    Text {
                                        id: acSrcTxt
                                        anchors.centerIn: parent
                                        text: model.is_extension ? "Extension" : "Core"
                                        font.pixelSize: 9
                                        color: model.is_extension ? theme.accentPurple : theme.accentCyan
                                    }
                                }
                            }

                            MouseArea {
                                id: acItemMa
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    var eraId = model.id;
                                    var currentText = conceptArea.text;
                                    var markerC = "erac:";
                                    var markerE = "era:";
                                    var idxC = currentText.toLowerCase().lastIndexOf(markerC);
                                    var idxE = currentText.toLowerCase().lastIndexOf(markerE);
                                    if (idxC >= 0 && (idxE < 0 || idxC > idxE)) {
                                        var beforeC = currentText.substring(0, idxC + markerC.length);
                                        conceptArea.text = beforeC + " " + eraId + " ";
                                        conceptArea.cursorPosition = conceptArea.text.length;
                                    } else if (idxE >= 0) {
                                        var beforeE = currentText.substring(0, idxE + markerE.length);
                                        conceptArea.text = beforeE + " " + eraId + " ";
                                        conceptArea.cursorPosition = conceptArea.text.length;
                                    }
                                    eraAcPopup.visible = false;
                                    conceptArea.forceActiveFocus();
                                }
                            }
                        }
                    }
                }
            }
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

        // Era & Historical / Setting Timeline
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "⏳ Era & Historical Setting"
                    color: theme.textMuted
                    font.pixelSize: 11
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "🏛️ Browse Catalog (82+ Eras) ↗"
                    implicitHeight: 22
                    onClicked: root.openEraPickerRequested("All")
                    background: Rectangle {
                        color: parent.hovered ? theme.bgHover : theme.withAlpha(theme.accentPurple, 0.15)
                        radius: theme.radiusSm
                        border.color: theme.accentPurple
                    }
                    contentItem: Text {
                        text: parent.text
                        color: theme.accentPurple
                        font.pixelSize: 10
                        font.bold: true
                        leftPadding: 6
                        rightPadding: 6
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }

            // Quick Category Chips
            RowLayout {
                Layout.fillWidth: true
                spacing: 4

                // 1. Off
                Rectangle {
                    Layout.fillWidth: true
                    height: 26
                    radius: theme.radiusSm
                    color: root.selectedEra === "off" ? "#334155" : theme.bgInput
                    border.color: root.selectedEra === "off" ? "#94a3b8" : theme.borderMain
                    border.width: root.selectedEra === "off" ? 2 : 1
                    Text {
                        anchors.centerIn: parent
                        text: "🚫 Off"
                        font.bold: root.selectedEra === "off"
                        font.pixelSize: 10
                        color: root.selectedEra === "off" ? "#ffffff" : theme.textDim
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            root.selectedEra = "off"
                            root.selectedEraName = ""
                            root.activeEraData = null
                        }
                    }
                }

                // 2. Fantasy
                Rectangle {
                    Layout.fillWidth: true
                    height: 26
                    radius: theme.radiusSm
                    property bool isActive: root.selectedEra === "timeless_fantasy" || (root.selectedEra !== "off" && root.selectedEra.indexOf("fantasy") !== -1)
                    color: isActive ? "#581c87" : theme.bgInput
                    border.color: isActive ? "#c084fc" : theme.borderMain
                    border.width: isActive ? 2 : 1
                    Text {
                        anchors.centerIn: parent
                        text: "🌌 Fantasy"
                        font.bold: parent.isActive
                        font.pixelSize: 10
                        color: parent.isActive ? "#ffffff" : "#c084fc"
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (root.selectedEra !== "timeless_fantasy") {
                                root.selectedEra = "timeless_fantasy"
                                root.selectedEraName = "🌌 Timeless High Fantasy"
                            }
                            root.openEraPickerRequested("Fantasy")
                        }
                    }
                }

                // 3. Medieval
                Rectangle {
                    Layout.fillWidth: true
                    height: 26
                    radius: theme.radiusSm
                    property bool isActive: root.selectedEra.indexOf("medieval") !== -1 || root.selectedEra.indexOf("plantagenet") !== -1 || root.selectedEra.indexOf("feudal") !== -1
                    color: isActive ? "#78350f" : theme.bgInput
                    border.color: isActive ? "#f59e0b" : theme.borderMain
                    border.width: isActive ? 2 : 1
                    Text {
                        anchors.centerIn: parent
                        text: "🏰 Medieval"
                        font.bold: parent.isActive
                        font.pixelSize: 10
                        color: parent.isActive ? "#ffffff" : "#fcd34d"
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.openEraPickerRequested("Medieval")
                    }
                }

                // 4. Antiquity
                Rectangle {
                    Layout.fillWidth: true
                    height: 26
                    radius: theme.radiusSm
                    property bool isActive: root.selectedEra.indexOf("antiquity") !== -1 || root.selectedEra.indexOf("rome") !== -1 || root.selectedEra.indexOf("greece") !== -1 || root.selectedEra.indexOf("egypt") !== -1
                    color: isActive ? "#065f46" : theme.bgInput
                    border.color: isActive ? "#34d399" : theme.borderMain
                    border.width: isActive ? 2 : 1
                    Text {
                        anchors.centerIn: parent
                        text: "🏛️ Antiquity"
                        font.bold: parent.isActive
                        font.pixelSize: 10
                        color: parent.isActive ? "#ffffff" : "#6ee7b7"
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.openEraPickerRequested("Antiquity")
                    }
                }

                // 5. User Custom
                Rectangle {
                    Layout.fillWidth: true
                    height: 26
                    radius: theme.radiusSm
                    property bool isActive: root.selectedEra.indexOf("user_") === 0
                    color: isActive ? "#0f766e" : theme.bgInput
                    border.color: isActive ? "#2dd4bf" : theme.borderMain
                    border.width: isActive ? 2 : 1
                    Text {
                        anchors.centerIn: parent
                        text: "📜 User Eras"
                        font.bold: parent.isActive
                        font.pixelSize: 10
                        color: parent.isActive ? "#ffffff" : "#5eead4"
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.openEraPickerRequested("User Eras")
                    }
                }
            }

            // Active Era Badge & Selection Summary
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: 32
                radius: theme.radiusSm
                color: root.selectedEra !== "off" ? theme.withAlpha(theme.accentPurple, 0.12) : theme.bgInput
                border.color: root.selectedEra !== "off" ? theme.accentPurple : theme.borderMain
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8
                    anchors.rightMargin: 8
                    spacing: 6

                    Text {
                        text: root.selectedEra === "off" ? "🚫 No era constraint applied (Contemporary / Freeform)" : ("⏳ " + (root.selectedEraName || root.selectedEra))
                        color: root.selectedEra === "off" ? theme.textDim : theme.accentPurple
                        font.pixelSize: 11
                        font.bold: root.selectedEra !== "off"
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    Button {
                        visible: root.selectedEra !== "off"
                        text: "✕ Clear"
                        implicitHeight: 20
                        onClicked: {
                            root.selectedEra = "off"
                            root.selectedEraName = ""
                            root.activeEraData = null
                        }
                        background: Rectangle { color: "transparent" }
                        contentItem: Text { text: parent.text; color: theme.textDim; font.pixelSize: 10 }
                    }
                }
            }

            // Detailed Era Dossier & Prompt Directive Preview Card
            Rectangle {
                id: eraDossierCard
                Layout.fillWidth: true
                implicitHeight: eraDossierCol.implicitHeight + 16
                radius: theme.radiusSm
                visible: root.selectedEra !== "off" && root.selectedEra !== ""
                color: {
                    var eraId = (root.selectedEra || "").toLowerCase();
                    if (eraId.indexOf("user_") === 0) return "#022c22";
                    if (eraId.indexOf("fantasy") !== -1 || eraId.indexOf("eldritch") !== -1) return "#240a34";
                    return "#1c1408";
                }
                border.color: {
                    var eraId = (root.selectedEra || "").toLowerCase();
                    if (eraId.indexOf("user_") === 0) return "#10b981";
                    if (eraId.indexOf("fantasy") !== -1 || eraId.indexOf("eldritch") !== -1) return "#a855f7";
                    return "#b45309";
                }
                border.width: 1

                ColumnLayout {
                    id: eraDossierCol
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 6

                    // Header Row: Era Title & Span Tag
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Text {
                            Layout.fillWidth: true
                            text: (root.activeEraData && (root.activeEraData.name || root.activeEraData.short_name))
                                ? (root.activeEraData.name || root.activeEraData.short_name)
                                : (root.selectedEraName || root.selectedEra || "HISTORICAL ERA")
                            font.bold: true
                            font.pixelSize: 11
                            color: {
                                var eraId = (root.selectedEra || "").toLowerCase();
                                if (eraId.indexOf("user_") === 0) return "#34d399";
                                if (eraId.indexOf("fantasy") !== -1 || eraId.indexOf("eldritch") !== -1) return "#c084fc";
                                return "#fbbf24";
                            }
                            elide: Text.ElideRight
                        }

                        Rectangle {
                            height: 18
                            visible: root.activeEraData && root.activeEraData.span ? true : false
                            width: spanDossierTxt.contentWidth + 10
                            radius: 4
                            color: "#0f172a"
                            border.color: "#334155"
                            Text {
                                id: spanDossierTxt
                                anchors.centerIn: parent
                                text: (root.activeEraData && root.activeEraData.span) ? root.activeEraData.span : ""
                                font.pixelSize: 9
                                color: "#cbd5e1"
                            }
                        }
                    }

                    // Aesthetic / Flavor description
                    Text {
                        Layout.fillWidth: true
                        visible: root.activeEraData && root.activeEraData.aesthetic ? true : false
                        text: (root.activeEraData && root.activeEraData.aesthetic) ? root.activeEraData.aesthetic : ""
                        font.pixelSize: 10
                        color: "#cbd5e1"
                        wrapMode: Text.WordWrap
                        maximumLineCount: 3
                        elide: Text.ElideRight
                    }

                    // Tech, Material, & Social Hierarchy highlights
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3
                        visible: root.activeEraData && (root.activeEraData.tech || root.activeEraData.social_codes) ? true : false

                        Text {
                            Layout.fillWidth: true
                            visible: root.activeEraData && root.activeEraData.tech ? true : false
                            text: "⚙️ Tech & Limitations: " + (root.activeEraData ? root.activeEraData.tech : "")
                            font.pixelSize: 9
                            color: "#94a3b8"
                            wrapMode: Text.WordWrap
                            maximumLineCount: 2
                            elide: Text.ElideRight
                        }

                        Text {
                            Layout.fillWidth: true
                            visible: root.activeEraData && root.activeEraData.social_codes ? true : false
                            text: "📜 Social & Hierarchy: " + (root.activeEraData ? root.activeEraData.social_codes : "")
                            font.pixelSize: 9
                            color: "#94a3b8"
                            wrapMode: Text.WordWrap
                            maximumLineCount: 2
                            elide: Text.ElideRight
                        }
                    }

                    // Expandable LLM Prompt Directive Snippet (shows what is injected into system prompt)
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: promptSnippetCol.implicitHeight + 8
                        radius: 4
                        color: "#090d16"
                        border.color: "#1e293b"
                        border.width: 1

                        ColumnLayout {
                            id: promptSnippetCol
                            anchors.fill: parent
                            anchors.margins: 6
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Text {
                                    text: "🤖 Injected Prompt Directive Preview"
                                    font.bold: true
                                    font.pixelSize: 9
                                    color: "#38bdf8"
                                    Layout.fillWidth: true
                                }

                                Text {
                                    text: root.promptSnippetExpanded ? "▲ Collapse" : "▼ Show Prompt"
                                    font.pixelSize: 9
                                    font.bold: true
                                    color: "#818cf8"
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.promptSnippetExpanded = !root.promptSnippetExpanded
                                    }
                                }
                            }

                            Text {
                                Layout.fillWidth: true
                                text: (root.activeEraData && root.activeEraData.promptSnippet)
                                    ? root.activeEraData.promptSnippet
                                    : ("[ERA / SETTING CONSTRAINT: " + (root.selectedEraName || root.selectedEra) + "]\nAll dialogue, attire, social etiquette, technology, and terminology must authentically conform to this historical / setting period. Avoid anachronisms.")
                                font.pixelSize: 9
                                font.family: "Monospace"
                                color: "#94a3b8"
                                wrapMode: Text.WordWrap
                                maximumLineCount: root.promptSnippetExpanded ? 50 : 2
                                elide: root.promptSnippetExpanded ? Text.ElideNone : Text.ElideRight
                            }
                        }
                    }
                }
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
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: loreSectionCol.implicitHeight + 16
            radius: theme.radiusSm
            color: theme.bgCard
            border.color: (bridge.activeLore && bridge.activeLore.length > 0) ? theme.accentCyan : theme.borderSubtle
            border.width: 1

            ColumnLayout {
                id: loreSectionCol
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    CheckBox {
                        id: webLoreCheck
                        Layout.fillWidth: true
                        checked: bridge.activeLore && bridge.activeLore.length > 0
                        indicator: Rectangle {
                            implicitWidth: 16
                            implicitHeight: 16
                            x: 0
                            y: Math.round((parent.height - height) / 2)
                            radius: 3
                            color: theme.bgInput
                            border.color: webLoreCheck.checked ? theme.accentCyan : theme.borderMain
                            border.width: 1

                            Text {
                                anchors.centerIn: parent
                                text: "✓"
                                color: theme.accentCyan
                                font.pixelSize: 11
                                font.bold: true
                                visible: webLoreCheck.checked
                            }
                        }
                        contentItem: Text {
                            leftPadding: webLoreCheck.indicator.width + 8
                            text: "🌐 Fandom Lore & Wikis"
                            color: webLoreCheck.checked ? theme.accentCyan : theme.textMuted
                            font.pixelSize: 11
                            font.bold: webLoreCheck.checked
                            verticalAlignment: Text.AlignVCenter
                            elide: Text.ElideRight
                        }
                    }

                    Button {
                        text: "Researcher ↗"
                        implicitHeight: 24
                        onClicked: {
                            var q = (loreQueryField && loreQueryField.text.trim()) || conceptArea.text.trim().split("\n")[0].substring(0, 50)
                            root.openLoreSearchRequested(q)
                        }
                        background: Rectangle {
                            color: parent.hovered ? theme.bgHover : theme.withAlpha(theme.accentCyan, 0.1)
                            radius: theme.radiusSm
                            border.color: theme.withAlpha(theme.accentCyan, 0.4)
                        }
                        contentItem: Text {
                            text: parent.text
                            color: theme.accentCyan
                            font.pixelSize: 10
                            font.bold: true
                            leftPadding: 6
                            rightPadding: 6
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }

                // Expandable controls when webLoreCheck is checked
                ColumnLayout {
                    Layout.fillWidth: true
                    visible: webLoreCheck.checked
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        TextField {
                            id: loreQueryField
                            Layout.fillWidth: true
                            Layout.minimumWidth: 0
                            implicitHeight: 32
                            placeholderText: "e.g. Malenia Elden Ring lore weapons"
                            font.pixelSize: 11
                            color: theme.textMain
                            placeholderTextColor: theme.textDim
                            background: Rectangle {
                                color: theme.bgInput
                                border.color: loreQueryField.activeFocus ? theme.accentCyan : theme.borderMain
                                radius: theme.radiusSm
                            }
                            onAccepted: {
                                if (text.trim().length > 0) {
                                    bridge.searchLore(text.trim(), headcanonsCheck.checked)
                                }
                            }
                        }

                        Button {
                            id: btnFetchLore
                            implicitWidth: 64
                            implicitHeight: 32
                            enabled: !bridge.isBusy && (loreQueryField.text.trim().length > 0 || conceptArea.text.trim().length > 0)
                            onClicked: {
                                var q = loreQueryField.text.trim()
                                if (!q) {
                                    q = conceptArea.text.trim().split("\n")[0].substring(0, 60)
                                    loreQueryField.text = q
                                }
                                bridge.searchLore(q, headcanonsCheck.checked)
                            }
                            background: Rectangle {
                                radius: theme.radiusSm
                                color: parent.hovered ? theme.withAlpha(theme.accentCyan, 0.3) : theme.withAlpha(theme.accentCyan, 0.15)
                                border.color: theme.accentCyan
                            }
                            contentItem: RowLayout {
                                anchors.centerIn: parent
                                spacing: 4
                                Text {
                                    text: bridge.taskType === "lore_search" ? "⏳" : "🔎"
                                    font.pixelSize: 11
                                }
                                Text {
                                    text: bridge.taskType === "lore_search" ? "..." : "Fetch"
                                    color: "#7dd3fc"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                            }
                        }
                    }

                    CheckBox {
                        id: headcanonsCheck
                        Layout.fillWidth: true
                        checked: true
                        indicator: Rectangle {
                            implicitWidth: 14
                            implicitHeight: 14
                            x: 0
                            y: Math.round((parent.height - height) / 2)
                            radius: 3
                            color: theme.bgInput
                            border.color: headcanonsCheck.checked ? theme.accentCyan : theme.borderMain
                            border.width: 1

                            Text {
                                anchors.centerIn: parent
                                text: "✓"
                                color: theme.accentCyan
                                font.pixelSize: 10
                                font.bold: true
                                visible: headcanonsCheck.checked
                            }
                        }
                        contentItem: Text {
                            leftPadding: headcanonsCheck.indicator.width + 6
                            text: "Extract Fan Headcanons & Tropes"
                            color: theme.textDim
                            font.pixelSize: 10
                            verticalAlignment: Text.AlignVCenter
                            elide: Text.ElideRight
                        }
                    }

                    // Lore Preview Box if lore is active
                    Rectangle {
                        visible: bridge.activeLore && bridge.activeLore.length > 0
                        Layout.fillWidth: true
                        implicitHeight: Math.min(90, lorePreviewText.implicitHeight + 16)
                        radius: theme.radiusSm
                        color: theme.bgSecondary
                        border.color: theme.withAlpha(theme.accentEmerald, 0.5)

                        ScrollView {
                            anchors.fill: parent
                            anchors.margins: 6
                            clip: true

                            Text {
                                id: lorePreviewText
                                width: parent.width
                                wrapMode: Text.Wrap
                                text: bridge.activeLore
                                color: theme.textMuted
                                font.pixelSize: 10
                            }
                        }
                    }

                    RowLayout {
                        visible: bridge.activeLore && bridge.activeLore.length > 0
                        Layout.fillWidth: true
                        Text {
                            text: "✓ Lore active (" + bridge.activeLore.length + "c)"
                            color: theme.accentEmerald
                            font.pixelSize: 10
                            font.bold: true
                        }
                        Item { Layout.fillWidth: true }
                        Button {
                            text: "✕ Clear"
                            implicitHeight: 20
                            onClicked: bridge.clearActiveLore()
                            background: Rectangle { color: "transparent" }
                            contentItem: Text { text: parent.text; color: theme.textDim; font.pixelSize: 10 }
                        }
                    }
                }
            }
        }

        // Dual Actions: Weaver Workshop vs One-Shot
        ColumnLayout {
            Layout.fillWidth: true
            Layout.topMargin: 4
            spacing: 8

            // Weaver Guided Interview Button
            Button {
                id: btnWeaver
                Layout.fillWidth: true
                implicitHeight: 40
                enabled: !bridge.isBusy
                onClicked: {
                    console.log("[SparkGenerator] Weaver Interview requested [" + root.botMode + "] for concept: \"" + conceptArea.text.substring(0, 50) + "...\" era=" + root.selectedEra)
                    root.requestWeaverInterview(
                        conceptArea.text,
                        genreBox.currentValue,
                        themePicker.selectedThemes,
                        toneInput.text,
                        nsfwSwitch.checked,
                        root.botMode,
                        root.selectedEra !== "off" ? (root.selectedEraName || root.selectedEra) : ""
                    )
                }

                background: Rectangle {
                    radius: theme.radiusSm
                    gradient: Gradient {
                        orientation: Gradient.Horizontal
                        GradientStop { position: 0.0; color: btnWeaver.hovered ? "#4f46e5" : "#4338ca" }
                        GradientStop { position: 1.0; color: btnWeaver.hovered ? "#9333ea" : "#7e22ce" }
                    }
                    border.color: theme.accentPurple
                    border.width: 1
                }

                contentItem: RowLayout {
                    anchors.centerIn: parent
                    spacing: 8
                    Text {
                        text: (bridge.taskType === "weaver_questions" || bridge.taskType === "weaver_forge") ? "⏳" : "🧠"
                        font.pixelSize: 14
                    }
                    Text {
                        text: {
                            if (bridge.taskType === "weaver_questions") return "Analyzing Concept & Formulating Questions..."
                            if (bridge.taskType === "weaver_forge") return "Weaver Synthesizing Bible & Card..."
                            return "Weaver Guided Interview (Q&A Workshop)"
                        }
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "— OR ONE-SHOT FORGE —"
                color: theme.textDim
                font.pixelSize: 10
                font.bold: true
                font.letterSpacing: 0.5
            }

            // Quick Forge Button
            Button {
                id: btnQuickForge
                Layout.fillWidth: true
                implicitHeight: 36
                enabled: !bridge.isBusy
                onClicked: {
                    console.log("[SparkGenerator] Quick Forge (One-Shot) [" + root.botMode + "] requested for concept: \"" + conceptArea.text.substring(0, 50) + "...\" era=" + root.selectedEra)
                    bridge.generateCard(
                        conceptArea.text,
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

                background: Rectangle {
                    radius: theme.radiusSm
                    color: btnQuickForge.hovered ? "#2563eb" : "#1d4ed8"
                    border.color: theme.accentBlue
                }

                contentItem: RowLayout {
                    anchors.centerIn: parent
                    spacing: 8
                    Text {
                        text: bridge.taskType === "quick_forge" ? "⏳" : "⚡"
                        font.pixelSize: 13
                    }
                    Text {
                        text: bridge.taskType === "quick_forge" ? "Engineering Uncensored Card..." : "Quick Forge (One-Shot)"
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }
            }

            // Synthesize Spine Button (Retroactive)
            Button {
                id: btnSynthesizeSpine
                Layout.fillWidth: true
                implicitHeight: 32
                enabled: !bridge.isBusy
                visible: root.activeCardName && root.activeCardName !== ""
                onClicked: {
                    console.log("[SparkGenerator] Opening Spine Synthesis modal for: " + root.activeCardName)
                    if (synthesizeSpineModal) {
                        synthesizeSpineModal.targetCard = root.activeCardName
                        synthesizeSpineModal.open()
                    }
                }

                background: Rectangle {
                    radius: theme.radiusSm
                    color: btnSynthesizeSpine.hovered ? "#5b21b6" : "#6d28d9"
                    border.color: theme.accentPurple
                }

                contentItem: RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text {
                        text: "🧬"
                        font.pixelSize: 12
                    }
                    Text {
                        text: "Synthesize Spine (Retroactive)"
                        color: "#ffffff"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }
            }

            // Regenerate with Spine Button (Arc-Aware)
            Button {
                id: btnRegenerateWithSpine
                Layout.fillWidth: true
                implicitHeight: 32
                enabled: !bridge.isBusy && root.hasStoredSpine
                visible: root.hasStoredSpine
                onClicked: {
                    console.log("[SparkGenerator] Regenerate with Spine requested for: " + root.activeCardName)
                    bridge.enhanceCharacter("regenerate_with_spine", root.activeCardName, {})
                }

                background: Rectangle {
                    radius: theme.radiusSm
                    color: btnRegenerateWithSpine.hovered ? "#4c1d95" : "#581c87"
                    border.color: "#a855f7"
                }

                contentItem: RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text {
                        text: "🧬"
                        font.pixelSize: 12
                    }
                    Text {
                        text: "Regenerate with Spine (Arc-Aware)"
                        color: "#ffffff"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }
            }

            Button {
                id: btnCancel
                visible: bridge.isBusy
                Layout.fillWidth: true
                implicitHeight: 32
                text: "🛑 Cancel current generation"
                enabled: bridge.isBusy
                onClicked: bridge.cancelCurrentTask()
                background: Rectangle {
                    radius: theme.radiusSm
                    color: btnCancel.hovered ? "#7f1d1d" : "#451a1a"
                    border.color: "#ef4444"
                }
                contentItem: Text {
                    text: parent.text
                    color: "#fecaca"
                    font.pixelSize: 11
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        Item { height: 16 } // Bottom spacer
    }
}
