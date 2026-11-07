import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#e6030712"
    visible: isOpen
    z: 9999

    // State properties
    property bool isOpen: false
    property string searchQuery: ""
    property string selectedCategory: "All"
    property string selectedRegion: "All"
    property bool isUserOnly: false
    property int activeTab: 0 // 0 = Search & Discovery, 1 = Create / Edit User Era Form
    property var searchResults: []
    property string editingEraId: ""
    property string selectedEraId: ""

    // Form fields for Custom Era Creator
    property string formName: ""
    property string formShortName: ""
    property string formSpan: ""
    property string formCategory: "Medieval"
    property string formRegion: "Western Europe"
    property string formAesthetic: ""
    property string formTech: ""
    property string formSocial: ""
    property string formNames: ""
    property string formTitles: ""
    property string formTags: ""

    // Signal emitted when an era is picked
    signal eraSelected(string eraId, var eraData)

    // Open discovery modal
    function openModal(category, initialQuery, userOnly, currentSelectedId) {
        activeTab = 0;
        selectedCategory = category || "All";
        selectedRegion = "All";
        isUserOnly = (userOnly === true) || (category === "User Eras");
        searchQuery = initialQuery || "";
        if (currentSelectedId !== undefined) {
            selectedEraId = currentSelectedId;
        }
        isOpen = true;
        performSearch();
        searchField.forceActiveFocus();
    }

    function closeModal() {
        isOpen = false;
        editingEraId = "";
        activeTab = 0;
    }

    // Execute semantic search via backend / bridge
    function performSearch() {
        var bridgeObj = (typeof bridge !== "undefined" && bridge) ? bridge : ((typeof backend !== "undefined" && backend) ? backend : null);
        if (bridgeObj) {
            try {
                var catFilter = selectedCategory === "All" ? "" : selectedCategory;
                var regFilter = selectedRegion === "All" ? "" : selectedRegion;
                var onlyUser = isUserOnly || (selectedCategory === "User Eras");
                var raw = bridgeObj.searchEras(searchQuery, catFilter, regFilter, onlyUser);
                var items = JSON.parse(raw);
                if (Array.isArray(items)) {
                    var seen = {};
                    var deduped = [];
                    for (var i = 0; i < items.length; i++) {
                        var it = items[i];
                        if (!it) continue;
                        var key = (it.name || it.id || "").trim().toLowerCase();
                        if (!key || seen[key]) continue;
                        seen[key] = true;
                        deduped.push(it);
                    }
                    searchResults = deduped;
                } else {
                    searchResults = [];
                }
            } catch(e) {
                console.error("Era search error: " + e);
                searchResults = [];
            }
        }
    }

    // Open form to create a new custom era or edit existing
    function openCreateForm(existingData) {
        if (existingData) {
            editingEraId = existingData.id || "";
            formName = existingData.name || "";
            formShortName = existingData.short_name || "";
            formSpan = existingData.span || "";
            formCategory = existingData.category || "Medieval";
            formRegion = existingData.region || "Custom Setting";
            formAesthetic = existingData.aesthetic || "";
            formTech = existingData.tech || "";
            formSocial = existingData.social_codes || "";
            formNames = (existingData.names && existingData.names.join) ? existingData.names.join(", ") : (existingData.names || "");
            formTitles = (existingData.titles && existingData.titles.join) ? existingData.titles.join(", ") : (existingData.titles || "");
            formTags = (existingData.tags && existingData.tags.join) ? existingData.tags.join(", ") : (existingData.tags || "");
        } else {
            editingEraId = "";
            formName = searchQuery.length > 2 ? ("⚔️ " + searchQuery.trim() + " Epoch") : "";
            formShortName = searchQuery.length > 2 ? searchQuery.trim() : "";
            formSpan = "c. 1200 – 1350 CE";
            formCategory = (selectedCategory !== "All" && selectedCategory !== "User Eras") ? selectedCategory : "Medieval";
            formRegion = selectedRegion !== "All" ? selectedRegion : "Western Europe";
            formAesthetic = "";
            formTech = "";
            formSocial = "";
            formNames = "";
            formTitles = "";
            formTags = "";
        }
        activeTab = 1;
    }

    // Save user custom era
    function saveCustomEra() {
        var bridgeObj = (typeof bridge !== "undefined" && bridge) ? bridge : ((typeof backend !== "undefined" && backend) ? backend : null);
        if (!formName || formName.trim().length === 0) {
            if (bridgeObj) {
                if (bridgeObj.notification) bridgeObj.notification.emit("⚠️ Please provide a name for your era template.");
                else if (bridgeObj.toast) bridgeObj.toast("⚠️ Please provide a name for your era template.");
            }
            return;
        }

        var eraObj = {
            "id": editingEraId ? editingEraId : "new",
            "name": formName.trim(),
            "short_name": formShortName.trim() ? formShortName.trim() : formName.trim(),
            "span": formSpan.trim() ? formSpan.trim() : "Custom Epoch",
            "category": formCategory.trim() ? formCategory.trim() : "User Eras",
            "region": formRegion.trim() ? formRegion.trim() : "Custom Setting",
            "aesthetic": formAesthetic.trim(),
            "tech": formTech.trim(),
            "social_codes": formSocial.trim(),
            "names": formNames,
            "titles": formTitles,
            "tags": formTags,
            "is_user_era": true
        };

        if (bridgeObj) {
            var res = bridgeObj.saveUserEra(JSON.stringify(eraObj));
            if (res && res.length > 0) {
                var saved = JSON.parse(res);
                if (typeof root !== "undefined" && root && root.refreshHistoricalEras) {
                    root.refreshHistoricalEras();
                }
                modalRoot.selectedEraId = saved.id;
                eraSelected(saved.id, saved);
                closeModal();
            }
        }
    }

    function deleteCustomEra(eraId) {
        var bridgeObj = (typeof bridge !== "undefined" && bridge) ? bridge : ((typeof backend !== "undefined" && backend) ? backend : null);
        if (bridgeObj) {
            var ok = bridgeObj.deleteUserEra(eraId);
            if (ok) {
                if (typeof root !== "undefined" && root && root.refreshHistoricalEras) {
                    root.refreshHistoricalEras();
                }
                if (modalRoot.selectedEraId === eraId) {
                    modalRoot.selectedEraId = "off";
                }
                performSearch();
            }
        }
    }

    // Backdrop click area to dismiss modal
    MouseArea {
        anchors.fill: parent
        onClicked: modalRoot.closeModal()
    }

    // Modal Card
    Rectangle {
        id: dialogCard
        anchors.centerIn: parent
        width: Math.min(1080, parent.width - 48)
        height: Math.min(780, parent.height - 48)
        color: "#0f172a"
        border.color: "#334155"
        border.width: 1
        radius: 14
        clip: true

        // Consume click inside card so backdrop doesn't close it
        MouseArea {
            anchors.fill: parent
            onClicked: {}
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // ==========================================
            // MODAL HEADER
            // ==========================================
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    RowLayout {
                        spacing: 8
                        Text {
                            text: "🏛️ Historical & Custom Era Discovery Studio"
                            font.bold: true
                            font.pixelSize: 18
                            color: "#f8fafc"
                        }
                        Rectangle {
                            height: 20
                            width: countLabel.width + 12
                            radius: 10
                            color: "#1e293b"
                            border.color: "#475569"
                            border.width: 1
                            Text {
                                id: countLabel
                                anchors.centerIn: parent
                                text: modalRoot.searchResults.length + " Eras"
                                font.pixelSize: 10
                                font.bold: true
                                color: "#38bdf8"
                            }
                        }
                    }

                    Text {
                        text: "Semantic meaning search across 80+ country-specific eras (50+ medieval templates) or build custom templates."
                        font.pixelSize: 11
                        color: "#94a3b8"
                    }
                }

                // Tab Switcher Pills
                RowLayout {
                    spacing: 6

                    Rectangle {
                        height: 32
                        width: 130
                        radius: 8
                        color: modalRoot.activeTab === 0 ? "#1e293b" : "#090d16"
                        border.color: modalRoot.activeTab === 0 ? "#38bdf8" : "#334155"
                        border.width: modalRoot.activeTab === 0 ? 2 : 1

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text {
                                text: "🔍 Search & Discover"
                                font.pixelSize: 11
                                font.bold: modalRoot.activeTab === 0
                                color: modalRoot.activeTab === 0 ? "#38bdf8" : "#94a3b8"
                            }
                        }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                modalRoot.activeTab = 0;
                                modalRoot.performSearch();
                            }
                        }
                    }

                    Rectangle {
                        height: 32
                        width: 140
                        radius: 8
                        color: modalRoot.activeTab === 1 ? "#064e3b" : "#090d16"
                        border.color: modalRoot.activeTab === 1 ? "#10b981" : "#047857"
                        border.width: modalRoot.activeTab === 1 ? 2 : 1

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text {
                                text: "➕ Create Custom Era"
                                font.pixelSize: 11
                                font.bold: modalRoot.activeTab === 1
                                color: modalRoot.activeTab === 1 ? "#34d399" : "#10b981"
                            }
                        }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: modalRoot.openCreateForm(null)
                        }
                    }
                }

                // Close Button
                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: closeMouse.containsMouse ? "#ef4444" : "#1e293b"
                    border.color: "#334155"

                    Text {
                        anchors.centerIn: parent
                        text: "✕"
                        font.pixelSize: 14
                        font.bold: true
                        color: closeMouse.containsMouse ? "#ffffff" : "#94a3b8"
                    }

                    MouseArea {
                        id: closeMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: modalRoot.closeModal()
                    }
                }
            }

            // Divider
            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: "#1e293b"
            }

            // ==========================================
            // VIEW 1: SEARCH & DISCOVERY LIST / GRID
            // ==========================================
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                visible: modalRoot.activeTab === 0
                spacing: 10

                // Search Input Bar
                Rectangle {
                    Layout.fillWidth: true
                    height: 42
                    radius: 8
                    color: "#090d16"
                    border.color: searchField.activeFocus ? "#38bdf8" : "#334155"
                    border.width: searchField.activeFocus ? 2 : 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 8

                        Text {
                            text: "🔍"
                            font.pixelSize: 14
                            color: "#64748b"
                        }

                        TextInput {
                            id: searchField
                            Layout.fillWidth: true
                            text: modalRoot.searchQuery
                            color: "#f8fafc"
                            font.pixelSize: 13
                            clip: true
                            verticalAlignment: TextInput.AlignVCenter

                            Text {
                                text: "Search by meaning, keyword, country, century (e.g., 'knights', 'samurai', '14th century', 'desert', 'highlands', 'noir')..."
                                color: "#475569"
                                font.pixelSize: 12
                                visible: !searchField.text && !searchField.activeFocus
                                anchors.verticalCenter: parent.verticalCenter
                            }

                            onTextChanged: {
                                modalRoot.searchQuery = text;
                                modalRoot.performSearch();
                            }
                        }

                        // Clear search button
                        Rectangle {
                            width: 20
                            height: 20
                            radius: 10
                            color: "#1e293b"
                            visible: searchField.text.length > 0

                            Text {
                                anchors.centerIn: parent
                                text: "✕"
                                font.pixelSize: 10
                                color: "#94a3b8"
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    searchField.text = "";
                                    searchField.forceActiveFocus();
                                }
                            }
                        }
                    }
                }

                // Category Filter Pills
                ScrollView {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 34
                    clip: true
                    ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
                    ScrollBar.vertical.policy: ScrollBar.AlwaysOff

                    Row {
                        spacing: 6

                        Repeater {
                            model: [
                                { "id": "All", "label": "🌐 All Eras" },
                                { "id": "Extensions", "label": "📁 Extensions (Packs)" },
                                { "id": "Medieval", "label": "⚔️ Medieval (51)" },
                                { "id": "Antiquity", "label": "🏛️ Antiquity" },
                                { "id": "Renaissance", "label": "🎨 Renaissance" },
                                { "id": "Enlightenment", "label": "🕯️ Enlightenment" },
                                { "id": "Victorian", "label": "🎩 Victorian & Frontier" },
                                { "id": "20th Century", "label": "📻 20th Century" },
                                { "id": "Fantasy", "label": "🌌 Fantasy" },
                                { "id": "User Eras", "label": "✏️ User Eras (Custom)" }
                            ]

                            delegate: Rectangle {
                                height: 28
                                width: catText.contentWidth + 20
                                radius: 14
                                color: modalRoot.selectedCategory === modelData.id ? "#38bdf8" : (catMouse.containsMouse ? "#1e293b" : "#090d16")
                                border.color: modalRoot.selectedCategory === modelData.id ? "#38bdf8" : "#334155"
                                border.width: 1

                                Text {
                                    id: catText
                                    anchors.centerIn: parent
                                    text: modelData.label
                                    font.pixelSize: 11
                                    font.bold: modalRoot.selectedCategory === modelData.id
                                    color: modalRoot.selectedCategory === modelData.id ? "#090d16" : "#cbd5e1"
                                }

                                MouseArea {
                                    id: catMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        modalRoot.selectedCategory = modelData.id;
                                        modalRoot.isUserOnly = (modelData.id === "User Eras");
                                        modalRoot.performSearch();
                                    }
                                }
                            }
                        }
                    }
                }

                // Region Filter Pills
                ScrollView {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 30
                    clip: true
                    ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
                    ScrollBar.vertical.policy: ScrollBar.AlwaysOff

                    Row {
                        spacing: 6

                        Repeater {
                            model: [
                                { "id": "All", "label": "All Regions" },
                                { "id": "British Isles", "label": "🇬🇧 British Isles" },
                                { "id": "France", "label": "🇫🇷 France" },
                                { "id": "Central Europe", "label": "🇩🇪 Central Europe" },
                                { "id": "Mediterranean", "label": "🇮🇹 Italy & Med" },
                                { "id": "Western Europe", "label": "🇪🇺 Western Europe" },
                                { "id": "East Asia", "label": "🇯🇵 East Asia" },
                                { "id": "South Asia", "label": "🇮🇳 South Asia" },
                                { "id": "Middle East", "label": "🌙 Middle East" },
                                { "id": "Eastern Europe", "label": "🇷🇺 Eastern Europe & Rus" },
                                { "id": "Africa & Global", "label": "🌍 Africa" },
                                { "id": "Americas", "label": "🌎 Americas" },
                                { "id": "Mythic Realms", "label": "🌌 Mythic" }
                            ]

                            delegate: Rectangle {
                                height: 24
                                width: regText.contentWidth + 16
                                radius: 12
                                color: modalRoot.selectedRegion === modelData.id ? "#818cf8" : (regMouse.containsMouse ? "#1e293b" : "#0f172a")
                                border.color: modalRoot.selectedRegion === modelData.id ? "#818cf8" : "#1e293b"
                                border.width: 1

                                Text {
                                    id: regText
                                    anchors.centerIn: parent
                                    text: modelData.label
                                    font.pixelSize: 10
                                    font.bold: modalRoot.selectedRegion === modelData.id
                                    color: modalRoot.selectedRegion === modelData.id ? "#ffffff" : "#94a3b8"
                                }

                                MouseArea {
                                    id: regMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        modalRoot.selectedRegion = modelData.id;
                                        modalRoot.performSearch();
                                    }
                                }
                            }
                        }
                    }
                }

                // Results Container
                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded

                    ListView {
                        id: resultsListView
                        width: parent.width
                        model: modalRoot.searchResults
                        spacing: 10

                        delegate: Rectangle {
                            id: cardRect
                            width: resultsListView.width - 12
                            height: contentCol.height + 24
                            radius: 10
                            color: cardMouse.containsMouse ? "#1e293b" : "#131c2e"
                            border.color: {
                                if (modelData.id === modalRoot.selectedEraId) return "#38bdf8";
                                if (modelData.is_user_era) return "#10b981";
                                if (modelData.category === "Fantasy") return "#a855f7";
                                if (modelData.category === "Medieval") return "#b45309";
                                return "#334155";
                            }
                            border.width: (modelData.id === modalRoot.selectedEraId) ? 2 : 1

                            ColumnLayout {
                                id: contentCol
                                anchors.top: parent.top
                                anchors.left: parent.left
                                anchors.right: parent.right
                                anchors.margins: 12
                                spacing: 8

                                // Top row: Title, Badges, Select Button
                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 8

                                    Text {
                                        Layout.fillWidth: true
                                        text: modelData.name || "Historical Era"
                                        font.bold: true
                                        font.pixelSize: 14
                                        color: modelData.is_user_era ? "#34d399" : "#f8fafc"
                                        elide: Text.ElideRight
                                    }

                                    // Span Badge
                                    Rectangle {
                                        height: 20
                                        width: spanLabel.contentWidth + 10
                                        radius: 4
                                        color: "#0f172a"
                                        border.color: "#475569"
                                        Text {
                                            id: spanLabel
                                            anchors.centerIn: parent
                                            text: modelData.span || "Custom Epoch"
                                            font.pixelSize: 10
                                            color: "#cbd5e1"
                                        }
                                    }

                                    // Region Badge
                                    Rectangle {
                                        height: 20
                                        width: regLabel.contentWidth + 10
                                        radius: 4
                                        color: "#0f172a"
                                        border.color: "#38bdf8"
                                        visible: Boolean(modelData && modelData.region && modelData.region !== "Global / Any")
                                        Text {
                                            id: regLabel
                                            anchors.centerIn: parent
                                            text: modelData.region || ""
                                            font.pixelSize: 10
                                            color: "#38bdf8"
                                        }
                                    }

                                    // User Era Badge
                                    Rectangle {
                                        height: 20
                                        width: 80
                                        radius: 4
                                        color: "#064e3b"
                                        border.color: "#10b981"
                                        visible: modelData.is_user_era === true
                                        Text {
                                            anchors.centerIn: parent
                                            text: "✏️ Custom"
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: "#34d399"
                                        }
                                    }

                                    // Relevance score badge (if searching)
                                    Rectangle {
                                        height: 20
                                        width: scoreLabel.contentWidth + 8
                                        radius: 4
                                        color: "#312e81"
                                        border.color: "#6366f1"
                                        visible: modalRoot.searchQuery.length > 0 && modelData.relevance_score > 0
                                        Text {
                                            id: scoreLabel
                                            anchors.centerIn: parent
                                            text: "★ " + modelData.relevance_score
                                            font.pixelSize: 10
                                            font.bold: true
                                            color: "#a5b4fc"
                                        }
                                    }

                                    // Action Buttons Row for User Era (Edit/Delete)
                                    RowLayout {
                                        spacing: 4
                                        visible: modelData.is_user_era === true

                                        Rectangle {
                                            width: 26
                                            height: 24
                                            radius: 4
                                            color: editMouse.containsMouse ? "#2563eb" : "#1e293b"
                                            border.color: "#3b82f6"
                                            Text {
                                                anchors.centerIn: parent
                                                text: "✏️"
                                                font.pixelSize: 10
                                            }
                                            MouseArea {
                                                id: editMouse
                                                anchors.fill: parent
                                                hoverEnabled: true
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: modalRoot.openCreateForm(modelData)
                                            }
                                        }

                                        Rectangle {
                                            width: 26
                                            height: 24
                                            radius: 4
                                            color: delMouse.containsMouse ? "#dc2626" : "#1e293b"
                                            border.color: "#ef4444"
                                            Text {
                                                anchors.centerIn: parent
                                                text: "🗑️"
                                                font.pixelSize: 10
                                            }
                                            MouseArea {
                                                id: delMouse
                                                anchors.fill: parent
                                                hoverEnabled: true
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: modalRoot.deleteCustomEra(modelData.id)
                                            }
                                        }
                                    }

                                    // Select Era Button
                                    Rectangle {
                                        height: 26
                                        width: 90
                                        radius: 6
                                        color: (modelData.id === modalRoot.selectedEraId) ? "#10b981" : (selectMouse.containsMouse ? "#2563eb" : "#3b82f6")

                                        Text {
                                            anchors.centerIn: parent
                                            text: (modelData.id === modalRoot.selectedEraId) ? "✓ Selected" : "Select Era"
                                            font.pixelSize: 11
                                            font.bold: true
                                            color: "#ffffff"
                                        }

                                        MouseArea {
                                            id: selectMouse
                                            anchors.fill: parent
                                            hoverEnabled: true
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                modalRoot.selectedEraId = modelData.id;
                                                modalRoot.eraSelected(modelData.id, modelData);
                                                var b = (typeof bridge !== "undefined" && bridge) ? bridge : ((typeof backend !== "undefined" && backend) ? backend : null);
                                                if (b && b.notification) {
                                                    b.notification.emit("🏛️ Era activated: " + (modelData.short_name || modelData.name));
                                                } else if (b && b.toast) {
                                                    b.toast("🏛️ Era activated: " + (modelData.short_name || modelData.name));
                                                }
                                                modalRoot.closeModal();
                                            }
                                        }
                                    }
                                }

                                // Aesthetic Description
                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.aesthetic || ""
                                    font.pixelSize: 11
                                    color: "#cbd5e1"
                                    wrapMode: Text.Wrap
                                    elide: Text.ElideRight
                                    maximumLineCount: 2
                                }

                                // Tech & Social Snippets
                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 12

                                    Text {
                                        Layout.fillWidth: true
                                        text: "⚙️ <b>Tech Limits:</b> " + (modelData.tech || "Standard era constraints")
                                        font.pixelSize: 10
                                        color: "#94a3b8"
                                        wrapMode: Text.Wrap
                                        elide: Text.ElideRight
                                        maximumLineCount: 1
                                    }

                                    Text {
                                        Layout.fillWidth: true
                                        text: "📜 <b>Etiquette:</b> " + (modelData.social_codes || "Standard hierarchy")
                                        font.pixelSize: 10
                                        color: "#94a3b8"
                                        wrapMode: Text.Wrap
                                        elide: Text.ElideRight
                                        maximumLineCount: 1
                                    }
                                }

                                // Tags Row
                                Flow {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    Repeater {
                                        model: modelData.tags || []
                                        delegate: Rectangle {
                                            height: 18
                                            width: tagText.contentWidth + 10
                                            radius: 9
                                            color: "#0f172a"
                                            border.color: "#334155"

                                            Text {
                                                id: tagText
                                                anchors.centerIn: parent
                                                text: modelData
                                                font.pixelSize: 9
                                                color: "#94a3b8"
                                            }
                                        }
                                    }
                                }
                            }

                            MouseArea {
                                id: cardMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    modalRoot.selectedEraId = modelData.id;
                                    modalRoot.eraSelected(modelData.id, modelData);
                                    var b = (typeof bridge !== "undefined" && bridge) ? bridge : ((typeof backend !== "undefined" && backend) ? backend : null);
                                    if (b && b.notification) {
                                        b.notification.emit("🏛️ Era activated: " + (modelData.short_name || modelData.name));
                                    } else if (b && b.toast) {
                                        b.toast("🏛️ Era activated: " + (modelData.short_name || modelData.name));
                                    }
                                    modalRoot.closeModal();
                                }
                            }
                        }
                    }
                }

                // Empty State if no eras matched
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: "transparent"
                    visible: modalRoot.searchResults.length === 0

                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 12

                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "🔎"
                            font.pixelSize: 36
                        }

                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "No historical or custom eras found matching \"" + modalRoot.searchQuery + "\""
                            font.bold: true
                            font.pixelSize: 14
                            color: "#f8fafc"
                        }

                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "Try searching 'knights', 'samurai', '14th century', 'desert', 'highlands', or create this template below."
                            font.pixelSize: 12
                            color: "#94a3b8"
                        }

                        Rectangle {
                            Layout.alignment: Qt.AlignHCenter
                            height: 36
                            width: 240
                            radius: 8
                            color: "#059669"

                            Text {
                                anchors.centerIn: parent
                                text: "➕ Create Custom Era with this Name"
                                font.pixelSize: 12
                                font.bold: true
                                color: "#ffffff"
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: modalRoot.openCreateForm(null)
                            }
                        }
                    }
                }
            }

            // ==========================================
            // VIEW 2: CREATE / EDIT CUSTOM ERA TEMPLATE FORM
            // ==========================================
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                visible: modalRoot.activeTab === 1
                spacing: 12

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Text {
                        text: modalRoot.editingEraId ? "✏️ Edit Custom Era Template" : "➕ Create New Era Template"
                        font.bold: true
                        font.pixelSize: 16
                        color: "#34d399"
                    }

                    Item { Layout.fillWidth: true }

                    Rectangle {
                        height: 28
                        width: 140
                        radius: 6
                        color: "#1e293b"
                        border.color: "#475569"

                        Text {
                            anchors.centerIn: parent
                            text: "← Back to Discovery"
                            font.pixelSize: 11
                            color: "#cbd5e1"
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                modalRoot.activeTab = 0;
                                modalRoot.performSearch();
                            }
                        }
                    }
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded

                    ColumnLayout {
                        width: parent.width - 20
                        spacing: 12

                        // Row 1: Name & Short Name
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 12

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                Text { text: "Template Display Name (with emoji):"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                                Rectangle {
                                    Layout.fillWidth: true; height: 36; radius: 6; color: "#090d16"; border.color: "#334155"
                                    TextInput {
                                        anchors.fill: parent; anchors.margins: 8; color: "#f8fafc"; font.pixelSize: 12; verticalAlignment: TextInput.AlignVCenter
                                        text: modalRoot.formName
                                        onTextChanged: modalRoot.formName = text
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.preferredWidth: 260
                                spacing: 4
                                Text { text: "Short Name (Sidebar Label):"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                                Rectangle {
                                    Layout.fillWidth: true; height: 36; radius: 6; color: "#090d16"; border.color: "#334155"
                                    TextInput {
                                        anchors.fill: parent; anchors.margins: 8; color: "#f8fafc"; font.pixelSize: 12; verticalAlignment: TextInput.AlignVCenter
                                        text: modalRoot.formShortName
                                        onTextChanged: modalRoot.formShortName = text
                                    }
                                }
                            }
                        }

                        // Row 2: Span, Category, Region
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 12

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                Text { text: "Historical / Temporal Span (Dates):"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                                Rectangle {
                                    Layout.fillWidth: true; height: 36; radius: 6; color: "#090d16"; border.color: "#334155"
                                    TextInput {
                                        anchors.fill: parent; anchors.margins: 8; color: "#f8fafc"; font.pixelSize: 12; verticalAlignment: TextInput.AlignVCenter
                                        text: modalRoot.formSpan
                                        onTextChanged: modalRoot.formSpan = text
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.preferredWidth: 200
                                spacing: 4
                                Text { text: "Category:"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                                Rectangle {
                                    Layout.fillWidth: true; height: 36; radius: 6; color: "#090d16"; border.color: "#334155"
                                    TextInput {
                                        anchors.fill: parent; anchors.margins: 8; color: "#f8fafc"; font.pixelSize: 12; verticalAlignment: TextInput.AlignVCenter
                                        text: modalRoot.formCategory
                                        onTextChanged: modalRoot.formCategory = text
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.preferredWidth: 200
                                spacing: 4
                                Text { text: "Region / Realm:"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                                Rectangle {
                                    Layout.fillWidth: true; height: 36; radius: 6; color: "#090d16"; border.color: "#334155"
                                    TextInput {
                                        anchors.fill: parent; anchors.margins: 8; color: "#f8fafc"; font.pixelSize: 12; verticalAlignment: TextInput.AlignVCenter
                                        text: modalRoot.formRegion
                                        onTextChanged: modalRoot.formRegion = text
                                    }
                                }
                            }
                        }

                        // Aesthetic & Atmosphere
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Aesthetic, Atmosphere & Sensory Textures:"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                            Rectangle {
                                Layout.fillWidth: true; height: 60; radius: 6; color: "#090d16"; border.color: "#334155"
                                ScrollView {
                                    anchors.fill: parent; anchors.margins: 6; clip: true
                                    TextArea {
                                        text: modalRoot.formAesthetic
                                        color: "#f8fafc"; font.pixelSize: 11; wrapMode: TextArea.Wrap
                                        onTextChanged: modalRoot.formAesthetic = text
                                    }
                                }
                            }
                        }

                        // Technology & Material Limitations
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Technological & Material Limitations (prohibited anachronisms):"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                            Rectangle {
                                Layout.fillWidth: true; height: 50; radius: 6; color: "#090d16"; border.color: "#334155"
                                ScrollView {
                                    anchors.fill: parent; anchors.margins: 6; clip: true
                                    TextArea {
                                        text: modalRoot.formTech
                                        color: "#f8fafc"; font.pixelSize: 11; wrapMode: TextArea.Wrap
                                        onTextChanged: modalRoot.formTech = text
                                    }
                                }
                            }
                        }

                        // Social Propriety & Power Dynamics
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Social Propriety, Honor Codes & Hierarchy Dynamics:"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                            Rectangle {
                                Layout.fillWidth: true; height: 50; radius: 6; color: "#090d16"; border.color: "#334155"
                                ScrollView {
                                    anchors.fill: parent; anchors.margins: 6; clip: true
                                    TextArea {
                                        text: modalRoot.formSocial
                                        color: "#f8fafc"; font.pixelSize: 11; wrapMode: TextArea.Wrap
                                        onTextChanged: modalRoot.formSocial = text
                                    }
                                }
                            }
                        }

                        // Sample Names & Titles
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 12

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                Text { text: "Sample Authentic Character Names (comma-separated):"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                                Rectangle {
                                    Layout.fillWidth: true; height: 36; radius: 6; color: "#090d16"; border.color: "#334155"
                                    TextInput {
                                        anchors.fill: parent; anchors.margins: 8; color: "#f8fafc"; font.pixelSize: 12; verticalAlignment: TextInput.AlignVCenter
                                        text: modalRoot.formNames
                                        onTextChanged: modalRoot.formNames = text
                                    }
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4
                                Text { text: "Sample Honorific Titles (comma-separated):"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                                Rectangle {
                                    Layout.fillWidth: true; height: 36; radius: 6; color: "#090d16"; border.color: "#334155"
                                    TextInput {
                                        anchors.fill: parent; anchors.margins: 8; color: "#f8fafc"; font.pixelSize: 12; verticalAlignment: TextInput.AlignVCenter
                                        text: modalRoot.formTitles
                                        onTextChanged: modalRoot.formTitles = text
                                    }
                                }
                            }
                        }

                        // Thematic Tags
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Text { text: "Thematic Search Tags (comma-separated, e.g. 'Grimdark, Ironlands, Feudal'):"; font.pixelSize: 11; font.bold: true; color: "#cbd5e1" }
                            Rectangle {
                                Layout.fillWidth: true; height: 36; radius: 6; color: "#090d16"; border.color: "#334155"
                                TextInput {
                                    anchors.fill: parent; anchors.margins: 8; color: "#f8fafc"; font.pixelSize: 12; verticalAlignment: TextInput.AlignVCenter
                                    text: modalRoot.formTags
                                    onTextChanged: modalRoot.formTags = text
                                }
                            }
                        }

                        // Form Action Buttons
                        RowLayout {
                            Layout.fillWidth: true
                            Layout.topMargin: 10
                            spacing: 12

                            Rectangle {
                                height: 38
                                width: 220
                                radius: 8
                                color: saveMouse.containsMouse ? "#047857" : "#059669"

                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text {
                                        text: "💾 Save Era Template & Select"
                                        font.pixelSize: 12
                                        font.bold: true
                                        color: "#ffffff"
                                    }
                                }

                                MouseArea {
                                    id: saveMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: modalRoot.saveCustomEra()
                                }
                            }

                            Rectangle {
                                height: 38
                                width: 120
                                radius: 8
                                color: "#1e293b"
                                border.color: "#475569"

                                Text {
                                    anchors.centerIn: parent
                                    text: "Cancel"
                                    font.pixelSize: 12
                                    color: "#cbd5e1"
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        modalRoot.activeTab = 0;
                                        modalRoot.performSearch();
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
