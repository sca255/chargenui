import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    anchors.fill: parent
    color: Qt.rgba(0, 0, 0, 0.78)
    z: 220

    property var selectedHousehold: null

    function openModal() {
        root.visible = true
        if (typeof backend !== "undefined" && backend) {
            backend.fetchHouseholds()
            backend.refreshGrimoire()
        }
    }

    function closeModal() {
        root.visible = false
    }

    Connections {
        target: (typeof backend !== "undefined" && backend) ? backend : null
        function onHouseholdsChanged() {
            if (root.selectedHousehold && backend.households) {
                for (var i = 0; i < backend.households.length; i++) {
                    if (backend.households[i].id === root.selectedHousehold.id) {
                        root.selectedHousehold = backend.households[i]
                        return
                    }
                }
            }
        }
    }

    // Modal Card
    Rectangle {
        width: Math.min(parent.width - 48, 1060)
        height: Math.min(parent.height - 48, 760)
        anchors.centerIn: parent
        color: "#0f172a"
        radius: 12
        border.color: "#db2777"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "👑"; font.pixelSize: 22 }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Multi-Character Binders & Court Encounters"
                        color: "#f472b6"
                        font.pixelSize: 16
                        font.bold: true
                    }
                    Text {
                        text: "Organize concepts into households, courts, and covens. Forge shared multi-companion opening scenes."
                        color: "#94a3b8"
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "✕ Close"
                    implicitHeight: 30
                    background: Rectangle {
                        color: parent.hovered ? "#334155" : "#1e293b"
                        radius: 6
                        border.color: "#475569"
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#e2e8f0"
                        font.pixelSize: 11
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: root.closeModal()
                }
            }

            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: "#334155"
            }

            // Split View: Left (Household list & Create), Right (Household Details & Encounter Gen)
            RowLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 14

                // Left Panel: Households List
                Rectangle {
                    Layout.preferredWidth: 320
                    Layout.fillHeight: true
                    color: "#111827"
                    radius: 8
                    border.color: "#1e293b"

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Text {
                            text: "🏰 Households & Courts"
                            color: "#e2e8f0"
                            font.pixelSize: 12
                            font.bold: true
                        }

                        // Create New Household Box
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            TextField {
                                id: newHhNameField
                                Layout.fillWidth: true
                                implicitHeight: 30
                                placeholderText: "New Household name..."
                                font.pixelSize: 11
                                color: "#f8fafc"
                                background: Rectangle {
                                    color: "#090d16"
                                    border.color: "#334155"
                                    radius: 6
                                }
                            }

                            Button {
                                text: "+ Add"
                                implicitHeight: 30
                                implicitWidth: 60
                                enabled: newHhNameField.text.trim().length > 0
                                onClicked: {
                                    var newHh = {
                                        id: "hh_" + Date.now().toString(36),
                                        name: newHhNameField.text.trim(),
                                        category_label: "Household / Court",
                                        description: "",
                                        user_title: "{{user}}",
                                        rules_and_etiquette: [],
                                        cardIds: []
                                    }
                                    if (typeof backend !== "undefined" && backend) {
                                        backend.saveHouseholdJson(JSON.stringify(newHh))
                                    }
                                    newHhNameField.text = ""
                                    root.selectedHousehold = newHh
                                }
                                background: Rectangle {
                                    radius: 6
                                    color: parent.enabled ? (parent.hovered ? "#db2777" : "#be185d") : "#334155"
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
                        }

                        // Coordinated Group Chat Cast Generator Box
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: groupCastCol.implicitHeight + 16
                            radius: 8
                            color: "#090d16"
                            border.color: "#7c3aed"
                            border.width: 1

                            ColumnLayout {
                                id: groupCastCol
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 6

                                RowLayout {
                                    spacing: 4
                                    Text { text: "👥"; font.pixelSize: 12 }
                                    Text {
                                        text: "Forge Group Chat Cast (Multiple Cards)"
                                        color: "#c084fc"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }
                                }

                                Text {
                                    text: "Generates multiple independent cards with inter-character dynamics ready for SillyTavern group chats."
                                    color: "#94a3b8"
                                    font.pixelSize: 9
                                    wrapMode: Text.WordWrap
                                    Layout.fillWidth: true
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 6

                                    TextField {
                                        id: groupCastPremiseField
                                        Layout.fillWidth: true
                                        implicitHeight: 28
                                        placeholderText: "Premise (e.g. 'Rival inquisitor strike team', 'Coventry witches')..."
                                        font.pixelSize: 10
                                        color: "#f8fafc"
                                        background: Rectangle {
                                            color: "#111827"
                                            border.color: "#334155"
                                            radius: 4
                                        }
                                    }

                                    ComboBox {
                                        id: castSizeCombo
                                        implicitHeight: 28
                                        implicitWidth: 64
                                        model: ["2 cards", "3 cards", "4 cards", "5 cards"]
                                        currentIndex: 1
                                    }
                                }

                                Button {
                                    Layout.fillWidth: true
                                    implicitHeight: 28
                                    text: (typeof backend !== "undefined" && backend && backend.isGenerating) ? "⏳ Forging Ensemble..." : "⚡ Forge Group Chat Cards"
                                    enabled: (typeof backend !== "undefined" && backend && !backend.isGenerating) && groupCastPremiseField.text.trim().length > 0
                                    onClicked: {
                                        if (typeof backend !== "undefined" && backend) {
                                            var count = castSizeCombo.currentIndex + 2;
                                            backend.generateGroupChatCast(
                                                groupCastPremiseField.text.trim(),
                                                count,
                                                "Fantasy",
                                                "medium",
                                                "off",
                                                "off"
                                            );
                                            groupCastPremiseField.text = "";
                                        }
                                    }
                                    background: Rectangle {
                                        radius: 4
                                        color: parent.enabled ? (parent.hovered ? "#9333ea" : "#7c3aed") : "#334155"
                                    }
                                    contentItem: Text {
                                        text: parent.text
                                        color: "#ffffff"
                                        font.pixelSize: 10
                                        font.bold: true
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }
                            }
                        }

                        // Households List
                        ListView {
                            id: hhList
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true
                            spacing: 6
                            model: (typeof backend !== "undefined" && backend && backend.households) ? backend.households : []

                            delegate: Rectangle {
                                id: hhItem
                                width: hhList.width
                                height: 56
                                radius: 6
                                color: root.selectedHousehold && root.selectedHousehold.id === modelData.id ? Qt.rgba(219/255, 39/255, 119/255, 0.25) : (hhMouse.containsMouse ? "#1e293b" : "#18181b")
                                border.color: root.selectedHousehold && root.selectedHousehold.id === modelData.id ? "#db2777" : "#334155"

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 8

                                    Text { text: "👑"; font.pixelSize: 14 }

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2
                                        Text {
                                            text: modelData.name || "Unnamed Household"
                                            color: "#f8fafc"
                                            font.pixelSize: 12
                                            font.bold: true
                                            elide: Text.ElideRight
                                            Layout.fillWidth: true
                                        }
                                        Text {
                                            text: (modelData.cardIds ? modelData.cardIds.length : (modelData.members ? modelData.members.length : 0)) + " member(s)"
                                            color: "#94a3b8"
                                            font.pixelSize: 10
                                        }
                                    }

                                    Button {
                                        text: "🗑"
                                        implicitHeight: 24
                                        implicitWidth: 26
                                        background: Rectangle {
                                            color: parent.hovered ? "#dc2626" : "transparent"
                                            radius: 4
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            color: "#fca5a5"
                                            font.pixelSize: 11
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.deleteHousehold(modelData.id)
                                                if (root.selectedHousehold && root.selectedHousehold.id === modelData.id) {
                                                    root.selectedHousehold = null
                                                }
                                            }
                                        }
                                    }
                                }

                                MouseArea {
                                    id: hhMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    onClicked: root.selectedHousehold = modelData
                                }
                            }
                        }
                    }
                }

                // Right Panel: Household Details & Group Encounter Forge
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: "#111827"
                    radius: 8
                    border.color: "#1e293b"

                    Item {
                        anchors.fill: parent
                        anchors.margins: 14

                        // Empty State
                        ColumnLayout {
                            anchors.centerIn: parent
                            visible: !root.selectedHousehold
                            spacing: 8
                            Text { text: "👑"; font.pixelSize: 36; Layout.alignment: Qt.AlignHCenter }
                            Text {
                                text: "Select or Create a Household Binder"
                                color: "#94a3b8"
                                font.pixelSize: 13
                                Layout.alignment: Qt.AlignHCenter
                            }
                        }

                        // Selected Household Content
                        ScrollView {
                            anchors.fill: parent
                            visible: !!root.selectedHousehold
                            clip: true

                            ColumnLayout {
                                width: parent.width - 12
                                spacing: 12

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 8
                                    Text {
                                        text: "👑 " + (root.selectedHousehold ? root.selectedHousehold.name : "")
                                        color: "#f472b6"
                                        font.pixelSize: 16
                                        font.bold: true
                                        Layout.fillWidth: true
                                    }

                                    // Add Active Studio Character
                                    Button {
                                        implicitHeight: 28
                                        text: "➕ Bind Active Concept"
                                        enabled: (root.selectedHousehold && root.activeIdea && root.activeIdea.name)
                                        onClicked: {
                                            if (root.selectedHousehold && root.activeIdea) {
                                                var name = root.activeIdea.name || "Companion"
                                                var ids = root.selectedHousehold.cardIds || []
                                                if (ids.indexOf(name) === -1) {
                                                    ids.push(name)
                                                    var updated = Object.assign({}, root.selectedHousehold, { cardIds: ids })
                                                    backend.saveHouseholdJson(JSON.stringify(updated))
                                                    root.selectedHousehold = updated
                                                }
                                            }
                                        }
                                        background: Rectangle {
                                            color: parent.hovered ? "#4f46e5" : "#4338ca"
                                            radius: 6
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            color: "#ffffff"
                                            font.pixelSize: 10
                                            font.bold: true
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                    }
                                }

                                // Lore / Description Field
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    Text { text: "Estate Lore / Shared Dynamic:"; color: "#cbd5e1"; font.pixelSize: 11; font.bold: true }
                                    TextArea {
                                        id: hhDescField
                                        Layout.fillWidth: true
                                        implicitHeight: 64
                                        text: (root.selectedHousehold && root.selectedHousehold.description) ? root.selectedHousehold.description : ""
                                        placeholderText: "Household lore, environment, group hierarchy, or court dynamic..."
                                        font.pixelSize: 11
                                        color: "#f8fafc"
                                        wrapMode: Text.WordWrap
                                        background: Rectangle {
                                            color: "#090d16"
                                            border.color: "#334155"
                                            radius: 6
                                        }
                                        onEditingFinished: {
                                            if (root.selectedHousehold) {
                                                var upd = Object.assign({}, root.selectedHousehold, { description: text })
                                                backend.saveHouseholdJson(JSON.stringify(upd))
                                                root.selectedHousehold = upd
                                            }
                                        }
                                    }
                                }

                                // Members List
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    Text {
                                        text: "Bound Companions (" + (root.selectedHousehold && root.selectedHousehold.cardIds ? root.selectedHousehold.cardIds.length : (root.selectedHousehold && root.selectedHousehold.members ? root.selectedHousehold.members.length : 0)) + "):"
                                        color: "#cbd5e1"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }

                                    Flow {
                                        Layout.fillWidth: true
                                        spacing: 6

                                        Repeater {
                                            model: (root.selectedHousehold && root.selectedHousehold.cardIds) ? root.selectedHousehold.cardIds : []
                                            delegate: Rectangle {
                                                height: 30
                                                radius: 15
                                                color: "#1e293b"
                                                border.color: "#db2777"
                                                border.width: 1
                                                implicitWidth: memRow.implicitWidth + 16

                                                RowLayout {
                                                    id: memRow
                                                    anchors.centerIn: parent
                                                    spacing: 6

                                                    Text { text: "🎭"; font.pixelSize: 11 }
                                                    Text {
                                                        text: modelData
                                                        color: "#f8fafc"
                                                        font.pixelSize: 11
                                                        font.bold: true
                                                    }
                                                    Text {
                                                        text: "✕"
                                                        color: "#f87171"
                                                        font.pixelSize: 10
                                                        MouseArea {
                                                            anchors.fill: parent
                                                            cursorShape: Qt.PointingHandCursor
                                                            onClicked: {
                                                                var ids = (root.selectedHousehold.cardIds || []).filter(function(id) { return id !== modelData })
                                                                var upd = Object.assign({}, root.selectedHousehold, { cardIds: ids })
                                                                backend.saveHouseholdJson(JSON.stringify(upd))
                                                                root.selectedHousehold = upd
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 1
                                    color: "#334155"
                                }

                                // Group Encounter Orchestrator
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 8

                                    RowLayout {
                                        spacing: 6
                                        Text { text: "⚔️"; font.pixelSize: 14 }
                                        Text {
                                            text: "Orchestrate Multi-Companion Group Encounter"
                                            color: "#f472b6"
                                            font.pixelSize: 13
                                            font.bold: true
                                        }
                                    }

                                    TextField {
                                        id: encounterGoalField
                                        Layout.fillWidth: true
                                        implicitHeight: 34
                                        placeholderText: "Encounter premise / crisis goal (e.g. 'Late night courtyard summit', 'Ambush in banquet hall')..."
                                        font.pixelSize: 11
                                        color: "#f8fafc"
                                        background: Rectangle {
                                            color: "#090d16"
                                            border.color: "#334155"
                                            radius: 6
                                        }
                                    }

                                    Button {
                                        Layout.fillWidth: true
                                        implicitHeight: 36
                                        text: (typeof backend !== "undefined" && backend && backend.isGenerating) ? "👑 Orchestrating Group Scene..." : "👑 Forge Group Encounter"
                                        enabled: (typeof backend !== "undefined" && backend && !backend.isGenerating) && (root.selectedHousehold && root.selectedHousehold.cardIds && root.selectedHousehold.cardIds.length > 0)
                                        onClicked: {
                                            if (typeof backend !== "undefined" && backend) {
                                                backend.generateHouseholdEncounter(
                                                    root.selectedHousehold.id,
                                                    encounterGoalField.text,
                                                    JSON.stringify(root.selectedHousehold.cardIds)
                                                )
                                            }
                                        }
                                        background: Rectangle {
                                            radius: 6
                                            color: parent.enabled ? (parent.hovered ? "#db2777" : "#be185d") : "#334155"
                                        }
                                        contentItem: Text {
                                            text: parent.text
                                            color: "#ffffff"
                                            font.pixelSize: 12
                                            font.bold: true
                                            horizontalAlignment: Text.AlignHCenter
                                            verticalAlignment: Text.AlignVCenter
                                        }
                                    }

                                    // Display Generated Encounter
                                    Rectangle {
                                        id: encounterBox
                                        Layout.fillWidth: true
                                        implicitHeight: encCol.implicitHeight + 20
                                        radius: 8
                                        color: "#090d16"
                                        border.color: "#db2777"
                                        border.width: 1
                                        visible: root.lastEncounterScenario.length > 0 || root.lastEncounterFirstMes.length > 0

                                        ColumnLayout {
                                            id: encCol
                                            anchors.fill: parent
                                            anchors.margins: 12
                                            spacing: 8

                                            RowLayout {
                                                Layout.fillWidth: true
                                                Text {
                                                    text: "✨ Forged Group Encounter"
                                                    color: "#f472b6"
                                                    font.pixelSize: 12
                                                    font.bold: true
                                                }
                                                Item { Layout.fillWidth: true }
                                                Button {
                                                    text: "📋 Copy Starter"
                                                    implicitHeight: 24
                                                    onClicked: {
                                                        if (typeof backend !== "undefined" && backend) {
                                                            backend.copyToClipboard(root.lastEncounterFirstMes)
                                                        }
                                                    }
                                                    background: Rectangle {
                                                        color: "#1e293b"
                                                        radius: 4
                                                    }
                                                    contentItem: Text {
                                                        text: parent.text
                                                        color: "#cbd5e1"
                                                        font.pixelSize: 10
                                                    }
                                                }
                                            }

                                            Text {
                                                Layout.fillWidth: true
                                                text: root.lastEncounterScenario
                                                color: "#94a3b8"
                                                font.pixelSize: 11
                                                font.italic: true
                                                wrapMode: Text.WordWrap
                                                visible: root.lastEncounterScenario.length > 0
                                            }

                                            Rectangle {
                                                Layout.fillWidth: true
                                                height: 1
                                                color: "#1e293b"
                                                visible: root.lastEncounterScenario.length > 0
                                            }

                                            Text {
                                                Layout.fillWidth: true
                                                text: root.lastEncounterFirstMes
                                                color: "#f8fafc"
                                                font.pixelSize: 12
                                                wrapMode: Text.WordWrap
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
    }

    property string lastEncounterScenario: ""
    property string lastEncounterFirstMes: ""

    Connections {
        target: (typeof backend !== "undefined" && backend) ? backend : null
        function onHouseholdEncounterGenerated(scenario, firstMes) {
            root.lastEncounterScenario = scenario
            root.lastEncounterFirstMes = firstMes
        }
    }
}
