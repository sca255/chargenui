import QtQuick 6.5
import QtQuick.Controls 6.5
import QtQuick.Layouts 6.5

Rectangle {
    id: root
    visible: false
    anchors.fill: parent
    color: Qt.rgba(0, 0, 0, 0.78)
    z: 218

    Theme { id: theme }

    property var selectedHousehold: null

    function openModal() {
        root.visible = true
        bridge.fetchHouseholds()
        bridge.refreshLibrary()
    }

    Connections {
        target: bridge
        function onHouseholdsChanged() {
            if (root.selectedHousehold && bridge.households) {
                for (var i = 0; i < bridge.households.length; i++) {
                    if (bridge.households[i].id === root.selectedHousehold.id) {
                        root.selectedHousehold = bridge.households[i]
                        return
                    }
                }
            }
        }
    }

    // Modal Card
    Rectangle {
        width: Math.min(parent.width - 48, 1020)
        height: Math.min(parent.height - 48, 740)
        anchors.centerIn: parent
        color: theme.bgSecondary
        radius: theme.radiusMd
        border.color: theme.accentPink
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            // Header Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "👑"; font.pixelSize: 20 }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Custom Households & Court Binders"
                        color: theme.accentPink
                        font.pixelSize: 16
                        font.bold: true
                    }
                    Text {
                        text: "Group multiple character cards into a shared household or court, and synthesize multi-companion group encounters."
                        color: theme.textMuted
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "✕"
                    onClicked: root.visible = false
                    background: Rectangle { color: "transparent" }
                    contentItem: Text {
                        text: parent.text
                        color: theme.textMuted
                        font.pixelSize: 15
                        font.bold: true
                    }
                }
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
                    color: theme.bgCard
                    border.color: theme.borderMain
                    radius: theme.radiusSm

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 10

                        Text {
                            text: "Your Binders (" + (bridge.households ? bridge.households.length : 0) + ")"
                            color: theme.accentPink
                            font.pixelSize: 12
                            font.bold: true
                        }

                        // Create New Household Box
                        RowLayout {
                            Layout.fillWidth: true
                            TextField {
                                id: newHhNameInput
                                Layout.fillWidth: true
                                placeholderText: "New Household name..."
                                font.pixelSize: 11
                                color: theme.textMain
                                background: Rectangle {
                                    color: theme.bgInput
                                    border.color: theme.borderMain
                                    radius: theme.radiusSm
                                }
                            }
                            Button {
                                text: "+ Add"
                                onClicked: {
                                    if (newHhNameInput.text.trim().length > 0) {
                                        var newHh = {
                                            name: newHhNameInput.text.trim(),
                                            category: "household",
                                            description: "",
                                            cardIds: []
                                        }
                                        bridge.saveHouseholdJson(JSON.stringify(newHh))
                                        newHhNameInput.text = ""
                                    }
                                }
                                background: Rectangle {
                                    radius: theme.radiusSm
                                    color: parent.hovered ? "#db2777" : "#be185d"
                                }
                                contentItem: Text {
                                    text: parent.text
                                    color: "#ffffff"
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                            }
                        }

                        // Households List
                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true

                            ListView {
                                model: bridge.households || []
                                spacing: 6
                                delegate: Rectangle {
                                    id: hhItem
                                    required property var modelData
                                    width: ListView.view.width
                                    height: 48
                                    radius: theme.radiusSm
                                    color: root.selectedHousehold && root.selectedHousehold.id === hhItem.modelData.id ? theme.withAlpha(theme.accentPink, 0.25) : (hhMouse.containsMouse ? theme.bgHover : theme.bgTertiary)
                                    border.color: root.selectedHousehold && root.selectedHousehold.id === hhItem.modelData.id ? theme.accentPink : theme.borderMain

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.margins: 8
                                        spacing: 8
                                        Text { text: "🏰"; font.pixelSize: 14 }
                                        ColumnLayout {
                                            Layout.fillWidth: true
                                            spacing: 2
                                            Text {
                                                text: hhItem.modelData.name || "Untitled"
                                                color: theme.textMain
                                                font.pixelSize: 12
                                                font.bold: true
                                                elide: Text.ElideRight
                                            }
                                            Text {
                                                text: ((hhItem.modelData.cardIds ? hhItem.modelData.cardIds.length : 0) + " cards")
                                                color: theme.textDim
                                                font.pixelSize: 10
                                            }
                                        }
                                        Button {
                                            text: "🗑️"
                                            background: Rectangle { color: "transparent" }
                                            onClicked: bridge.deleteHousehold(hhItem.modelData.id)
                                        }
                                    }

                                    MouseArea {
                                        id: hhMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        onClicked: root.selectedHousehold = hhItem.modelData
                                    }
                                }
                            }
                        }
                    }
                }

                // Right Panel: Household Details & Group Encounter Forge
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: theme.bgCard
                    border.color: theme.borderMain
                    radius: theme.radiusSm

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 10

                        // Empty notice
                        Text {
                            visible: !root.selectedHousehold
                            text: "Select a household binder on the left or create one to view and orchestrate."
                            color: theme.textDim
                            font.pixelSize: 12
                            Layout.alignment: Qt.AlignCenter
                            Layout.fillWidth: true
                            horizontalAlignment: Text.AlignHCenter
                        }

                        // Selected Household Content
                        ColumnLayout {
                            visible: !!root.selectedHousehold
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            spacing: 10

                            RowLayout {
                                Layout.fillWidth: true
                                Text {
                                    text: "👑 " + (root.selectedHousehold ? root.selectedHousehold.name : "")
                                    color: theme.accentPink
                                    font.pixelSize: 15
                                    font.bold: true
                                }
                                Item { Layout.fillWidth: true }
                                Button {
                                    text: "+ Add Active Card ('" + (bridge.card.name || "Character") + "')"
                                    enabled: !!bridge.activeCardId
                                    onClicked: {
                                        if (root.selectedHousehold && bridge.activeCardId) {
                                            var ids = root.selectedHousehold.cardIds || []
                                            if (ids.indexOf(bridge.activeCardId) === -1) {
                                                ids.push(bridge.activeCardId)
                                                var updated = Object.assign({}, root.selectedHousehold, { cardIds: ids })
                                                bridge.saveHouseholdJson(JSON.stringify(updated))
                                            }
                                        }
                                    }
                                    background: Rectangle {
                                        radius: theme.radiusSm
                                        color: parent.hovered ? "#059669" : "#047857"
                                    }
                                    contentItem: Text {
                                        text: parent.text
                                        color: "#ffffff"
                                        font.pixelSize: 10
                                        font.bold: true
                                    }
                                }
                            }

                            TextField {
                                id: hhDescField
                                Layout.fillWidth: true
                                text: (root.selectedHousehold && root.selectedHousehold.description) ? root.selectedHousehold.description : ""
                                placeholderText: "Household lore, environment, group hierarchy, or court rules..."
                                font.pixelSize: 11
                                color: theme.textMain
                                background: Rectangle {
                                    color: theme.bgInput
                                    border.color: theme.borderMain
                                    radius: theme.radiusSm
                                }
                                onEditingFinished: {
                                    if (root.selectedHousehold) {
                                        var upd = Object.assign({}, root.selectedHousehold, { description: text })
                                        bridge.saveHouseholdJson(JSON.stringify(upd))
                                    }
                                }
                            }

                            // Members in household
                            Text {
                                text: "Household Members:"
                                color: theme.textMuted
                                font.pixelSize: 11
                                font.bold: true
                            }

                            ScrollView {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 120
                                clip: true

                                ListView {
                                    model: (root.selectedHousehold && root.selectedHousehold.cardIds) ? root.selectedHousehold.cardIds : []
                                    spacing: 4
                                    delegate: Rectangle {
                                        id: memberItem
                                        required property string modelData
                                        width: ListView.view.width
                                        height: 32
                                        radius: theme.radiusSm
                                        color: theme.bgTertiary
                                        border.color: theme.borderMain

                                        function getMemberName(cid) {
                                            if (!bridge.library) return cid
                                            for (var i = 0; i < bridge.library.length; i++) {
                                                if (bridge.library[i].id === cid) return bridge.library[i].name || cid
                                            }
                                            return cid
                                        }

                                        RowLayout {
                                            anchors.fill: parent
                                            anchors.margins: 6
                                            Text {
                                                text: "👤 " + memberItem.getMemberName(memberItem.modelData)
                                                color: theme.textMain
                                                font.pixelSize: 11
                                            }
                                            Item { Layout.fillWidth: true }
                                            Button {
                                                text: "✕ Remove"
                                                background: Rectangle { color: "transparent" }
                                                contentItem: Text { text: parent.text; color: theme.accentRed; font.pixelSize: 10 }
                                                onClicked: {
                                                    var ids = (root.selectedHousehold.cardIds || []).filter(function(id) { return id !== memberItem.modelData })
                                                    var upd = Object.assign({}, root.selectedHousehold, { cardIds: ids })
                                                    bridge.saveHouseholdJson(JSON.stringify(upd))
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Group Encounter Forge Box
                            Rectangle {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                color: theme.bgSecondary
                                border.color: theme.accentPink
                                radius: theme.radiusSm

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 8

                                    Text {
                                        text: "⚡ Orchestrate Multi-Companion Group Encounter"
                                        color: theme.accentPink
                                        font.pixelSize: 12
                                        font.bold: true
                                    }

                                    TextField {
                                        id: encounterGoalField
                                        Layout.fillWidth: true
                                        placeholderText: "Encounter premise / crisis goal (e.g. 'Late night courtyard summit', 'Ambush in banquet hall')..."
                                        font.pixelSize: 11
                                        color: theme.textMain
                                        background: Rectangle {
                                            color: theme.bgInput
                                            border.color: theme.borderMain
                                            radius: theme.radiusSm
                                        }
                                    }

                                    CheckBox {
                                        id: saveAltGreetingCheck
                                        text: "Save generated scene to Alternate Greetings of all participating cards"
                                        checked: true
                                    }

                                    Item { Layout.fillHeight: true }

                                    Button {
                                        Layout.fillWidth: true
                                        implicitHeight: 36
                                        text: bridge.isBusy && bridge.taskType === "household_encounter" ? "👑 Orchestrating Group Scene..." : "👑 Forge Group Encounter"
                                        enabled: !bridge.isBusy && (root.selectedHousehold && root.selectedHousehold.cardIds && root.selectedHousehold.cardIds.length > 0)
                                        onClicked: {
                                            bridge.generateHouseholdEncounter(
                                                root.selectedHousehold.id,
                                                encounterGoalField.text,
                                                saveAltGreetingCheck.checked,
                                                root.selectedHousehold.cardIds
                                            )
                                        }
                                        background: Rectangle {
                                            radius: theme.radiusSm
                                            color: parent.hovered ? "#db2777" : "#be185d"
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
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
